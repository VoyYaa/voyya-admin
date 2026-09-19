import {
  AdminError,
  CreateDriverDTO,
  CreatedDriver,
  FleetQuota,
  ResendDriverPinResponse,
  UploadedDocument,
} from '@voyyaa/shared';
import { apiRequest, apiUpload } from './http-client';

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

export function getFleetQuota(): Promise<FleetQuota> {
  return apiRequest({ method: 'GET', path: '/admin/fleet-quota' }, FleetQuota, AdminError);
}

export function uploadDriverDocument(file: File): Promise<UploadedDocument> {
  return apiUpload({ path: '/admin/drivers/documents', file }, UploadedDocument, AdminError);
}
