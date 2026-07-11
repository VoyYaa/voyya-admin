// =============================================================================
// VoyYa Admin — Error tipado de la capa API
// -----------------------------------------------------------------------------
// Mismo patrón que apps/passenger|driver (frontend-yavoy) src/api/errors.ts: unifica
// 3 causas de fallo distintas para que la UI decida la presentación correcta
// (network → banner de conectividad; http → mensaje del dominio con `codigo`
// tipado; validation → la respuesta no cumplió el contrato de contracts/auth.ts,
// nunca se debe mostrar como si fuera dato válido).
// =============================================================================

export type ApiErrorKind = 'network' | 'http' | 'validation';

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
    public readonly status?: number,
    public readonly codigo?: string,
    /** Segundos hasta poder reintentar — presente en OTP_RATE_LIMIT/CUENTA_BLOQUEADA_TEMPORAL. */
    public readonly reintentarEnSeg?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** `true` cuando el fallo es de conectividad (fetch no llegó al servidor), no del dominio. */
export function esErrorDeRed(error: unknown): boolean {
  return error instanceof ApiError && error.kind === 'network';
}

/** Extrae el código de dominio (p.ej. `CREDENCIALES_INVALIDAS`) si el error viene del backend. */
export function codigoErrorDominio(error: unknown): string | undefined {
  return error instanceof ApiError && error.kind === 'http' ? error.codigo : undefined;
}
