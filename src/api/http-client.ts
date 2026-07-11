// =============================================================================
// VoyYa Admin — Cliente HTTP tipado
// -----------------------------------------------------------------------------
// Envoltorio fino sobre `fetch` (sin axios, KISS) — mismo patrón que
// apps/passenger|driver (frontend-yavoy) src/api/http-client.ts, adaptado a
// navegador: la sesión vive en localStorage (src/lib/local-storage.ts) en vez de
// expo-secure-store, pero el contrato de este módulo es idéntico a propósito.
//
// Responsabilidad ÚNICA: enviar la request y devolver datos ya validados con un
// esquema Zod — nunca un `any`/`unknown` sin parsear.
//
// Inversión de dependencia (igual que en móvil): este módulo NUNCA importa
// Zustand ni conoce `useSessionStore` directamente — `state/session-store.ts`
// llama a `configureAuthHandlers(...)` una vez al importarse, inyectando cómo
// leer el access token vigente y cómo refrescar la sesión. `skipAuth: true` es
// para los propios endpoints públicos (`/auth/admin/login`, `/auth/refresh`,
// `/auth/logout`, `/health`) — nunca adjuntan el access token vigente ni
// disparan el reintento de refresh en 401.
// =============================================================================

import { z } from 'zod';
import { ErrorAuth } from '../contracts/auth';
import { ApiError } from './errors';

function resolveBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  return typeof fromEnv === 'string' && fromEnv.length > 0 ? fromEnv : 'http://localhost:3000';
}

export interface AuthHandlers {
  /** Access token vigente en memoria (o `null` si no hay sesión). Lectura síncrona. */
  getAccessToken: () => string | null;
  /** Intenta refrescar UNA vez (rota ambos tokens). `null` si no se pudo (ya deja la sesión limpia). */
  refreshAndRetry: () => Promise<string | null>;
  /** El refresh también falló: ya no hay sesión válida (el handler limpia el estado/localStorage). */
  onSessionExpired: () => void;
}

let authHandlers: AuthHandlers | null = null;

/** Inyectado por `state/session-store.ts` al importarse — ver nota de arriba. */
export function configureAuthHandlers(handlers: AuthHandlers): void {
  authHandlers = handlers;
}

interface ApiRequestOptions {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  /** `true` para los endpoints públicos (`/auth/*`, `/health`) que consume esta app. */
  skipAuth?: boolean;
}

const GenericErrorShape = z.object({ codigo: z.string(), mensaje: z.string() });

export function apiRequest<TResponse>(
  options: ApiRequestOptions,
  responseSchema: z.ZodType<TResponse>,
  errorSchema: z.ZodType<z.infer<typeof GenericErrorShape>> = ErrorAuth,
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
    res = await fetch(`${resolveBaseUrl()}${options.path}`, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    // El navegador lanza TypeError ("Failed to fetch") cuando no hay conectividad
    // real con el servidor (CORS bloqueado, servidor caído, DNS, etc.).
    throw new ApiError('network', 'No hay conexión con el servidor.');
  }

  // 401 con sesión activa: UN solo reintento tras refrescar — nunca en cadena
  // (`isRetry` evita que la request reintentada dispare otro refresh).
  if (res.status === 401 && !options.skipAuth && !isRetry && authHandlers) {
    const newToken = await authHandlers.refreshAndRetry();
    if (newToken) {
      return performRequest(options, responseSchema, errorSchema, true);
    }
    authHandlers.onSessionExpired();
  }

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const parsedError = errorSchema.safeParse(json);
    if (parsedError.success) {
      throw new ApiError('http', parsedError.data.mensaje, res.status, parsedError.data.codigo);
    }
    throw new ApiError('http', `Error inesperado del servidor (${res.status}).`, res.status);
  }

  const parsed = responseSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError('validation', 'La respuesta del servidor no tiene el formato esperado.');
  }
  return parsed.data;
}
