import type { JSX } from 'react';
import type { SettlementReportRow } from '@voyyaa/shared';
import { SETTLEMENT_COPY } from '../../copy/settlement';
import { formatCop, formatDayMonthBogota } from '../../lib/settlement';
import { expectedRemittanceAmount, remittanceStateOf } from '../../lib/remittance-state';
import { Button } from '../ui/Button';
import { StatusDot } from '../ui/StatusDot';

export interface RemittanceCellProps {
  row: SettlementReportRow;
  inProgress: boolean;
  online: boolean;
  onMark: (row: SettlementReportRow) => void;
  onHistory: (row: SettlementReportRow) => void;
}

export function RemittanceCell({
  row,
  inProgress,
  online,
  onMark,
  onHistory,
}: RemittanceCellProps): JSX.Element {
  const state = remittanceStateOf(row);
  const summary = row.remittance;

  if (state === 'not-applicable') {
    return <span className="text-text-muted">{SETTLEMENT_COPY.noPending}</span>;
  }

  const historyButton = (
    <Button
      variant="ghost"
      onClick={() => onHistory(row)}
      aria-label={SETTLEMENT_COPY.remittance.historyAria(row.driver_name)}
    >
      {SETTLEMENT_COPY.remittance.history}
    </Button>
  );

  const remittedLabel = summary?.last_remitted_at
    ? SETTLEMENT_COPY.remittance.remitted(
        formatCop(summary.remitted_amount),
        formatDayMonthBogota(summary.last_remitted_at),
      )
    : SETTLEMENT_COPY.remittance.remittedNoDate(formatCop(summary?.remitted_amount ?? 0));

  if (state === 'remitted') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <StatusDot tone="success" label={remittedLabel} />
        {historyButton}
      </div>
    );
  }

  const balance = expectedRemittanceAmount(row);
  const markLabel =
    state === 'partial'
      ? SETTLEMENT_COPY.remittance.markBalance(formatCop(balance))
      : SETTLEMENT_COPY.remittance.mark;

  return (
    <div className="flex flex-col items-start gap-2">
      {state === 'partial' && summary ? (
        <StatusDot
          tone="brand"
          label={SETTLEMENT_COPY.remittance.partial(
            formatCop(summary.remitted_amount),
            formatCop(summary.balance),
          )}
        />
      ) : (
        <StatusDot tone="neutral" label={SETTLEMENT_COPY.remittance.none} />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          onClick={() => onMark(row)}
          disabled={inProgress || !online}
          aria-label={
            state === 'partial' ? undefined : SETTLEMENT_COPY.remittance.markAria(row.driver_name)
          }
        >
          {markLabel}
        </Button>
        {summary && (summary.remitted_amount > 0 || summary.last_remitted_at) && historyButton}
      </div>
      {inProgress && (
        <p className="text-small text-text-muted">{SETTLEMENT_COPY.remittance.weekOpen}</p>
      )}
      {!inProgress && !online && (
        <p className="text-small text-text-muted">{SETTLEMENT_COPY.error.offlineHint}</p>
      )}
    </div>
  );
}
