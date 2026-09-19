import { AdminError, CompanyProfile } from '@voyyaa/shared';
import { apiRequest } from './http-client';

export function getCompanyProfile(): Promise<CompanyProfile> {
  return apiRequest({ method: 'GET', path: '/admin/company-profile' }, CompanyProfile, AdminError);
}
