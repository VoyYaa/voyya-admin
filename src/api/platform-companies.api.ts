import {
  ApproveCompanyDTO,
  CompanyDecisionResponse,
  PlatformCompanyDetail,
  PlatformCompanyListResponse,
  PlatformCompanyQuery,
  PlatformError,
  RejectCompanyDTO,
  RequestCompanyDocumentsDTO,
  ResendCompanyNotificationResponse,
} from '@voyyaa/shared';
import { apiRequest } from './http-client';

export function getPlatformCompanies(
  query: PlatformCompanyQuery,
): Promise<PlatformCompanyListResponse> {
  return apiRequest(
    {
      method: 'GET',
      path: '/platform/companies',
      query: { status: query.status, limit: query.limit },
    },
    PlatformCompanyListResponse,
    PlatformError,
  );
}

export function getPlatformCompanyDetail(companyId: number): Promise<PlatformCompanyDetail> {
  return apiRequest(
    { method: 'GET', path: `/platform/companies/${companyId}` },
    PlatformCompanyDetail,
    PlatformError,
  );
}

export function approveCompany(
  companyId: number,
  dto: ApproveCompanyDTO,
): Promise<CompanyDecisionResponse> {
  const body = ApproveCompanyDTO.parse(dto);
  return apiRequest(
    { method: 'POST', path: `/platform/companies/${companyId}/approve`, body },
    CompanyDecisionResponse,
    PlatformError,
  );
}

export function requestCompanyDocuments(
  companyId: number,
  dto: RequestCompanyDocumentsDTO,
): Promise<CompanyDecisionResponse> {
  const body = RequestCompanyDocumentsDTO.parse(dto);
  return apiRequest(
    { method: 'POST', path: `/platform/companies/${companyId}/request-documents`, body },
    CompanyDecisionResponse,
    PlatformError,
  );
}

export function rejectCompany(
  companyId: number,
  dto: RejectCompanyDTO,
): Promise<CompanyDecisionResponse> {
  const body = RejectCompanyDTO.parse(dto);
  return apiRequest(
    { method: 'POST', path: `/platform/companies/${companyId}/reject`, body },
    CompanyDecisionResponse,
    PlatformError,
  );
}

export function resendCompanyNotification(
  companyId: number,
): Promise<ResendCompanyNotificationResponse> {
  return apiRequest(
    { method: 'POST', path: `/platform/companies/${companyId}/notifications/resend` },
    ResendCompanyNotificationResponse,
    PlatformError,
  );
}
