export type ApiErrorKind = 'network' | 'http' | 'validation';

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly retryInSec?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && error.kind === 'network';
}

export function domainErrorCode(error: unknown): string | undefined {
  return error instanceof ApiError && error.kind === 'http' ? error.code : undefined;
}
