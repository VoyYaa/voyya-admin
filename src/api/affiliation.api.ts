import {
  AffiliationApplicationCreated,
  AffiliationDocument,
  AffiliationError,
  AffiliationMunicipalityListResponse,
  CreateAffiliationApplicationDTO,
  ReplaceAffiliationDocumentDTO,
  UploadedDocument,
} from '@voyyaa/shared';
import { apiRequest, apiUpload } from './http-client';

export function getAffiliationMunicipalities(): Promise<AffiliationMunicipalityListResponse> {
  return apiRequest(
    { method: 'GET', path: '/affiliation/municipalities', skipAuth: true },
    AffiliationMunicipalityListResponse,
    AffiliationError,
  );
}

export function uploadAffiliationDocument(file: File): Promise<UploadedDocument> {
  return apiUpload(
    { path: '/affiliation/documents', file, skipAuth: true },
    UploadedDocument,
    AffiliationError,
  );
}

export function submitAffiliationApplication(
  dto: CreateAffiliationApplicationDTO,
): Promise<AffiliationApplicationCreated> {
  const body = CreateAffiliationApplicationDTO.parse(dto);
  return apiRequest(
    { method: 'POST', path: '/affiliation/applications', body, skipAuth: true },
    AffiliationApplicationCreated,
    AffiliationError,
  );
}

export function replaceAffiliationDocument(
  companyId: number,
  token: string,
  dto: ReplaceAffiliationDocumentDTO,
): Promise<AffiliationDocument> {
  const body = ReplaceAffiliationDocumentDTO.parse(dto);
  return apiRequest(
    {
      method: 'POST',
      path: `/affiliation/applications/${companyId}/documents`,
      query: { token },
      body,
      skipAuth: true,
    },
    AffiliationDocument,
    AffiliationError,
  );
}
