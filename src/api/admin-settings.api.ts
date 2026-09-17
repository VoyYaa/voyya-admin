import { AdminError, ConsoleSettings, UpdateConsoleSettingsDTO } from '@voyyaa/shared';
import { apiRequest } from './http-client';

export function getConsoleSettings(): Promise<ConsoleSettings> {
  return apiRequest({ method: 'GET', path: '/admin/settings' }, ConsoleSettings, AdminError);
}

export function updateConsoleSettings(dto: UpdateConsoleSettingsDTO): Promise<ConsoleSettings> {
  const body = UpdateConsoleSettingsDTO.parse(dto);
  return apiRequest({ method: 'PUT', path: '/admin/settings', body }, ConsoleSettings, AdminError);
}
