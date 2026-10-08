import type { JSX } from 'react';
import type { SettlementReportResponse } from '@voyyaa/shared';
import { SETTLEMENT_COPY } from '../../copy/settlement';
import { formatLongDate, formatLongDateTimeBogota } from '../../lib/settlement';

export interface SettlementPrintHeaderProps {
  report: SettlementReportResponse;
  companyName: string | null;
}

export function SettlementPrintHeader({
  report,
  companyName,
}: SettlementPrintHeaderProps): JSX.Element {
  return (
    <header className="settlement-print-header hidden print:block">
      <h2 className="text-title font-bold">{SETTLEMENT_COPY.print.heading}</h2>
      {companyName && <p className="text-body font-bold">{companyName}</p>}
      <p className="text-body">
        {SETTLEMENT_COPY.print.period(formatLongDate(report.from), formatLongDate(report.to))}
      </p>
      <p className="text-body">
        {SETTLEMENT_COPY.print.generated(formatLongDateTimeBogota(report.generated_at))}
      </p>
      {report.in_progress && <p className="text-body font-bold">{SETTLEMENT_COPY.print.partial}</p>}
    </header>
  );
}

export function SettlementPrintFooter(): JSX.Element {
  return (
    <p className="settlement-print-footer mt-4 hidden text-small print:block">
      {SETTLEMENT_COPY.print.footer}
    </p>
  );
}
