import type { JSX } from 'react';
import type { SettlementReportTotals } from '@voyyaa/shared';
import { SETTLEMENT_COPY } from '../../copy/settlement';
import { formatCop } from '../../lib/settlement';
import { Notice } from '../ui/Notice';
import { StatStrip, type StatItem } from '../ui/StatStrip';

export interface SettlementSummaryProps {
  totals: SettlementReportTotals | null;
}

function statItems(totals: SettlementReportTotals | null): StatItem[] {
  const copy = SETTLEMENT_COPY.stats;
  return [
    { key: 'trips', label: copy.trips, value: totals?.trip_count ?? 0, tone: 'neutral' },
    {
      key: 'cash',
      label: copy.cash,
      value: formatCop(totals?.cash_collected ?? 0),
      tone: 'success',
    },
    {
      key: 'commission',
      label: copy.commission,
      value: formatCop(totals?.commission ?? 0),
      tone: 'brand',
    },
    {
      key: 'to-remit',
      label: copy.toRemit,
      value: formatCop(totals?.amount_to_remit ?? 0),
      tone: 'strong',
      emphasized: true,
    },
  ];
}

export function SettlementSummary({ totals }: SettlementSummaryProps): JSX.Element {
  const pendingCount = totals?.pending_cash_trip_count ?? 0;
  const pendingAmount = formatCop(totals?.pending_cash_amount ?? 0);

  return (
    <div className="print:hidden">
      <StatStrip
        items={statItems(totals)}
        loading={totals === null}
        ariaLabel={SETTLEMENT_COPY.stats.ariaLabel}
      />
      {totals && (
        <p className="border-b border-border bg-surface px-6 py-2 text-small text-text-muted">
          {SETTLEMENT_COPY.stats.driverNet}:{' '}
          <span className="text-numeric text-text">{formatCop(totals.driver_net)}</span>
          {' · '}
          {SETTLEMENT_COPY.stats.pending}:{' '}
          <span className="text-numeric text-text">
            {SETTLEMENT_COPY.pendingStat(pendingCount, pendingAmount)}
          </span>
        </p>
      )}
      {totals && pendingCount > 0 && (
        <div className="px-6 pt-3">
          <Notice tone="warning" role="status">
            {SETTLEMENT_COPY.pendingNotice(pendingCount, pendingAmount)}
          </Notice>
        </div>
      )}
    </div>
  );
}
