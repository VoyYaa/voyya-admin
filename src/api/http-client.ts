import { z } from 'zod';
import { AuthError } from '@voyyaa/shared';
import { ApiError } from './errors';

function resolveBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  return typeof fromEnv === 'string' && fromEnv.length > 0 ? fromEnv : 'http://localhost:3000';
}

export interface AuthHandlers {
  getAccessToken: () => string | null;
  refreshAndRetry: () => Promise<string | null>;
  onSessionExpired: () => void;
}

let authHandlers: AuthHandlers | null = null;

export function configureAuthHandlers(handlers: AuthHandlers): void {
  authHandlers = handlers;
}

type ApiQueryValue = string | number | undefined;

interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'PUT';
  path: string;
  body?: unknown;
  query?: Record<string, ApiQueryValue>;
  skipAuth?: boolean;
}

const GenericErrorShape = z.object({
  code: z.string(),
  message: z.string(),
  field: z.string().optional(),
  retry_in_sec: z.number().optional(),
});

function buildUrl(baseUrl: string, path: string, query?: Record<string, ApiQueryValue>): string {
  if (!query) return `${baseUrl}${path}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs.length > 0 ? `${baseUrl}${path}?${qs}` : `${baseUrl}${path}`;
}

async function resolveResponse<TResponse>(
  res: Response,
  responseSchema: z.ZodType<TResponse>,
  errorSchema: z.ZodType<z.infer<typeof GenericErrorShape>>,
): Promise<TResponse> {
  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const parsedError = errorSchema.safeParse(json);
    if (parsedError.success) {
      throw new ApiError(
        'http',
        parsedError.data.message,
        res.status,
        parsedError.data.code,
        parsedError.data.retry_in_sec,
        parsedError.data.field,
        parsedError.data,
      );
    }
    throw new ApiError('http', `Error inesperado del servidor (${res.status}).`, res.status);
  }

  const parsed = responseSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError('validation', 'La respuesta del servidor no tiene el formato esperado.');
  }
  return parsed.data;
}

export function apiRequest<TResponse>(
  options: ApiRequestOptions,
  responseSchema: z.ZodType<TResponse>,
  errorSchema: z.ZodType<z.infer<typeof GenericErrorShape>> = AuthError,
): Promise<TResponse> {
  return performRequest(options, responseSchema, errorSchema, false);
}

async function performRequest<TResponse>(
  options: ApiRequestOptions,
  responseSchema: z.ZodType<TResponse>,
  errorSchema: z.ZodType<z.infer<typeof GenericErrorShape>>,
  isRetry: boolean,
): Promise<TResponse> {
  const accessToken = options.skipAuth ? null : (authHandlers?.getAccessToken() ?? null);

  let res: Response;
  try {
    res = await fetch(buildUrl(resolveBaseUrl(), options.path, options.query), {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError('network', 'No hay conexión con el servidor.');
  }

  if (res.status === 401 && !options.skipAuth && !isRetry && authHandlers) {
    const newToken = await authHandlers.refreshAndRetry();
    if (newToken) {
      return performRequest(options, responseSchema, errorSchema, true);
    }
    authHandlers.onSessionExpired();
  }

  return resolveResponse(res, responseSchema, errorSchema);
}

interface ApiUploadOptions {
  path: string;
  file: File;
  skipAuth?: boolean;
}

export function apiUpload<TResponse>(
  options: ApiUploadOptions,
  responseSchema: z.ZodType<TResponse>,
  errorSchema: z.ZodType<z.infer<typeof GenericErrorShape>> = AuthError,
): Promise<TResponse> {
  return performUpload(options, responseSchema, errorSchema, false);
}

async function performUpload<TResponse>(
  options: ApiUploadOptions,
  responseSchema: z.ZodType<TResponse>,
  errorSchema: z.ZodType<z.infer<typeof GenericErrorShape>>,
  isRetry: boolean,
): Promise<TResponse> {
  const accessToken = options.skipAuth ? null : (authHandlers?.getAccessToken() ?? null);
  const formData = new FormData();
  formData.append('file', options.file);

  let res: Response;
  try {
    res = await fetch(`${resolveBaseUrl()}${options.path}`, {
      method: 'POST',
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: formData,
    });
  } catch {
    throw new ApiError('network', 'No hay conexión con el servidor.');
  }

  if (res.status === 401 && !options.skipAuth && !isRetry && authHandlers) {
    const newToken = await authHandlers.refreshAndRetry();
    if (newToken) {
      return performUpload(options, responseSchema, errorSchema, true);
    }
    authHandlers.onSessionExpired();
  }

  return resolveResponse(res, responseSchema, errorSchema);
}
