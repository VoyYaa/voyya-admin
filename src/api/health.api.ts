import { z } from 'zod';
import { apiRequest } from './http-client';

export const HealthResponse = z.object({
  status: z.literal('ok'),
  service: z.string(),
  ts: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

const HealthError = z.object({ code: z.string(), message: z.string() });

export function getHealth(): Promise<HealthResponse> {
  return apiRequest({ method: 'GET', path: '/health', skipAuth: true }, HealthResponse, HealthError);
}
