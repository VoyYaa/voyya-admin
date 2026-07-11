// =============================================================================
// VoyYa Admin — API de salud del backend (`GET /health`)
// -----------------------------------------------------------------------------
// Endpoint público (sin JWT — ver apps/api/src/health.controller.ts en el
// monorepo VoyYa). Esquema propio (no vive en contracts/auth.ts: no es del
// dominio auth, es un smoke-test de infraestructura).
// =============================================================================

import { z } from 'zod';
import { apiRequest } from './http-client';

export const RespuestaHealth = z.object({
  status: z.literal('ok'),
  service: z.string(),
  ts: z.string(),
});
export type RespuestaHealth = z.infer<typeof RespuestaHealth>;

/** Error genérico mínimo — `/health` en la práctica no debería fallar salvo caída total. */
const ErrorHealth = z.object({ codigo: z.string(), mensaje: z.string() });

export function getHealth(): Promise<RespuestaHealth> {
  return apiRequest({ method: 'GET', path: '/health', skipAuth: true }, RespuestaHealth, ErrorHealth);
}
