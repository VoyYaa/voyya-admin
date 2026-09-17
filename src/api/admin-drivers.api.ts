import {
  AdminError,
  CreateDriverDTO,
  CreatedDriver,
  ResendDriverPinResponse,
} from '@voyyaa/shared';
import { apiRequest } from './http-client';

export function createDriver(dto: CreateDriverDTO): Promise<CreatedDriver> {
  const body = CreateDriverDTO.parse(dto);
  return apiRequest({ method: 'POST', path: '/admin/drivers', body }, CreatedDriver, AdminError);
}

export function resendDriverPin(driverId: number): Promise<ResendDriverPinResponse> {
  return apiRequest(
    { method: 'POST', path: `/admin/drivers/${driverId}/pin/resend` },
    ResendDriverPinResponse,
    AdminError,
  );
}
