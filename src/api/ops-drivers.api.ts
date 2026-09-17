import { AdminError, OpsDriverDetail, OpsDriverListResponse, OpsDriverQuery } from '@voyyaa/shared';
import { apiRequest } from './http-client';

export function getOpsDrivers(query: OpsDriverQuery): Promise<OpsDriverListResponse> {
  return apiRequest(
    {
      method: 'GET',
      path: '/ops/drivers',
      query: { search: query.search, status: query.status, limit: query.limit },
    },
    OpsDriverListResponse,
    AdminError,
  );
}

export function getOpsDriverDetail(driverId: number): Promise<OpsDriverDetail> {
  return apiRequest(
    { method: 'GET', path: `/ops/drivers/${driverId}` },
    OpsDriverDetail,
    AdminError,
  );
}
