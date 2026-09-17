import { AdminError, OpsQueueQuery, OpsQueueResponse, OpsTripDetail } from '@voyyaa/shared';
import { apiRequest } from './http-client';

export function getOpsQueue(query: OpsQueueQuery): Promise<OpsQueueResponse> {
  return apiRequest(
    {
      method: 'GET',
      path: '/ops/trip-requests',
      query: { status: query.status, limit: query.limit },
    },
    OpsQueueResponse,
    AdminError,
  );
}

export function getOpsTripDetail(tripRequestId: number): Promise<OpsTripDetail> {
  return apiRequest(
    { method: 'GET', path: `/ops/trip-requests/${tripRequestId}` },
    OpsTripDetail,
    AdminError,
  );
}
