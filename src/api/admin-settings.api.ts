import { AdminError, ConsoleSettings } from '@voyyaa/shared';
import { apiRequest } from './http-client';

export function getConsoleSettings(): Promise<ConsoleSettings> {
  return apiRequest({ method: 'GET', path: '/admin/settings' }, ConsoleSettings, AdminError);
}
