import {
  AdminError,
  RecordRemittanceDTO,
  RemittanceHistoryResponse,
  RemittanceResult,
  SettlementReportResponse,
  type RemittanceHistoryQuery,
  type SettlementReportQuery,
} from '@voyyaa/shared';
import { apiDownload, apiRequest, type DownloadedFile } from './http-client';

const SETTLEMENT_PATH = '/admin/reports/settlement';

function reportQueryParams(query: SettlementReportQuery): Record<string, string | number> {
  return {
    from: query.from,
    to: query.to,
    ...(query.driver_id !== undefined ? { driver_id: query.driver_id } : {}),
  };
}

export function getSettlementReport(
  query: SettlementReportQuery,
): Promise<SettlementReportResponse> {
  return apiRequest(
    { method: 'GET', path: SETTLEMENT_PATH, query: reportQueryParams(query) },
    SettlementReportResponse,
    AdminError,
  );
}

export function downloadSettlementCsv(query: SettlementReportQuery): Promise<DownloadedFile> {
  return apiDownload(
    { method: 'GET', path: `${SETTLEMENT_PATH}/export`, query: reportQueryParams(query) },
    AdminError,
  );
}

export function recordRemittance(dto: RecordRemittanceDTO): Promise<RemittanceResult> {
  const body = RecordRemittanceDTO.parse(dto);
  return apiRequest(
    { method: 'POST', path: `${SETTLEMENT_PATH}/remittances`, body },
    RemittanceResult,
    AdminError,
  );
}

export function reverseRemittance(remittanceId: number): Promise<RemittanceResult> {
  return apiRequest(
    { method: 'POST', path: `${SETTLEMENT_PATH}/remittances/${remittanceId}/reversal` },
    RemittanceResult,
    AdminError,
  );
}

export function getRemittanceHistory(
  query: RemittanceHistoryQuery,
): Promise<RemittanceHistoryResponse> {
  return apiRequest(
    {
      method: 'GET',
      path: `${SETTLEMENT_PATH}/remittances`,
      query: {
        driver_id: query.driver_id,
        ...(query.week_start !== undefined ? { week_start: query.week_start } : {}),
      },
    },
    RemittanceHistoryResponse,
    AdminError,
  );
}
