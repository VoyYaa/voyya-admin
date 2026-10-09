import {
  CompanyCommission,
  CompanyCommissionHistory,
  MunicipalityFare,
  MunicipalityFareHistory,
  MunicipalityOperationalParams,
  MunicipalityOperationalParamsHistory,
  PlatformCommissionListResponse,
  PlatformServiceConfigListResponse,
  ServiceConfigError,
  UpdateCompanyCommissionDTO,
  UpdateMunicipalityFareDTO,
  UpdateMunicipalityOperationalParamsDTO,
  type ServiceType,
} from '@voyyaa/shared';
import { apiRequest } from './http-client';

export const HISTORY_PAGE_SIZE = 10;

function servicePath(municipalityId: number, serviceType: ServiceType): string {
  return `/platform/municipalities/${municipalityId}/services/${serviceType}`;
}

export function getServiceConfigs(
  municipalityId?: number,
): Promise<PlatformServiceConfigListResponse> {
  return apiRequest(
    {
      method: 'GET',
      path: '/platform/service-configs',
      query: { municipality_id: municipalityId },
    },
    PlatformServiceConfigListResponse,
    ServiceConfigError,
  );
}

export function getFareHistory(
  municipalityId: number,
  serviceType: ServiceType,
  before?: number,
): Promise<MunicipalityFareHistory> {
  return apiRequest(
    {
      method: 'GET',
      path: `${servicePath(municipalityId, serviceType)}/fare`,
      query: { before, limit: HISTORY_PAGE_SIZE },
    },
    MunicipalityFareHistory,
    ServiceConfigError,
  );
}

export function updateFare(
  municipalityId: number,
  serviceType: ServiceType,
  dto: UpdateMunicipalityFareDTO,
): Promise<MunicipalityFare> {
  const body = UpdateMunicipalityFareDTO.parse(dto);
  return apiRequest(
    { method: 'PUT', path: `${servicePath(municipalityId, serviceType)}/fare`, body },
    MunicipalityFare,
    ServiceConfigError,
  );
}

export function getOperationalParamsHistory(
  municipalityId: number,
  serviceType: ServiceType,
  before?: number,
): Promise<MunicipalityOperationalParamsHistory> {
  return apiRequest(
    {
      method: 'GET',
      path: `${servicePath(municipalityId, serviceType)}/operational-params`,
      query: { before, limit: HISTORY_PAGE_SIZE },
    },
    MunicipalityOperationalParamsHistory,
    ServiceConfigError,
  );
}

export function updateOperationalParams(
  municipalityId: number,
  serviceType: ServiceType,
  dto: UpdateMunicipalityOperationalParamsDTO,
): Promise<MunicipalityOperationalParams> {
  const body = UpdateMunicipalityOperationalParamsDTO.parse(dto);
  return apiRequest(
    { method: 'PUT', path: `${servicePath(municipalityId, serviceType)}/operational-params`, body },
    MunicipalityOperationalParams,
    ServiceConfigError,
  );
}

export function getCommissions(): Promise<PlatformCommissionListResponse> {
  return apiRequest(
    { method: 'GET', path: '/platform/commissions' },
    PlatformCommissionListResponse,
    ServiceConfigError,
  );
}

export function getCommissionHistory(
  companyId: number,
  before?: number,
): Promise<CompanyCommissionHistory> {
  return apiRequest(
    {
      method: 'GET',
      path: `/platform/companies/${companyId}/commission`,
      query: { before, limit: HISTORY_PAGE_SIZE },
    },
    CompanyCommissionHistory,
    ServiceConfigError,
  );
}

export function updateCommission(
  companyId: number,
  dto: UpdateCompanyCommissionDTO,
): Promise<CompanyCommission> {
  const body = UpdateCompanyCommissionDTO.parse(dto);
  return apiRequest(
    { method: 'PUT', path: `/platform/companies/${companyId}/commission`, body },
    CompanyCommission,
    ServiceConfigError,
  );
}
