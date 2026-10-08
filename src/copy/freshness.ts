export type FreshnessState = 'live' | 'reconnecting' | 'offline' | 'error' | 'stale';

export const FRESHNESS_ANNOUNCED_LABEL: Record<FreshnessState, string> = {
  live: 'En vivo.',
  reconnecting: 'Reconectando.',
  offline: 'Sin conexión, reintentando.',
  error: 'El servidor no respondió bien, reintentando.',
  stale: 'Datos actualizados.',
};

export const FRESHNESS_OFFLINE_LABEL = 'Sin conexión · reintentando…';
export const FRESHNESS_CONNECTING_LABEL = 'Conectando…';

const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;

export function freshnessErrorLabel(status: number | undefined): string {
  if (status === HTTP_TOO_MANY_REQUESTS) return 'Demasiadas consultas · reintentando…';
  if (status === HTTP_UNAUTHORIZED || status === HTTP_FORBIDDEN) {
    return 'Sin permiso para ver estos datos';
  }
  return 'Error del servidor · reintentando…';
}
