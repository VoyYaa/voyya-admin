import type { SettlementReportRow } from '@voyyaa/shared';

export type RemittanceState = 'not-applicable' | 'unremitted' | 'partial' | 'remitted';

export function remittanceStateOf(row: SettlementReportRow): RemittanceState {
  const summary = row.remittance;
  if (summary && summary.remitted_amount > 0) {
    return summary.balance > 0 ? 'partial' : 'remitted';
  }
  return row.amount_to_remit > 0 ? 'unremitted' : 'not-applicable';
}

export function expectedRemittanceAmount(row: SettlementReportRow): number {
  return row.remittance ? row.remittance.balance : row.amount_to_remit;
}
