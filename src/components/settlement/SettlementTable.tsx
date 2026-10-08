import type { JSX } from 'react';
import type { SettlementReportResponse, SettlementReportRow } from '@voyyaa/shared';
import { SETTLEMENT_COPY } from '../../copy/settlement';
import { formatCop } from '../../lib/settlement';
import { ROW_CLASS, TABLE_HEAD_CLASS, TH_CLASS, TH_RIGHT_CLASS } from '../ui/table-styles';
import { RemittanceCell } from './RemittanceCell';

export interface SettlementTableProps {
  report: SettlementReportResponse;
  caption: string;
  online: boolean;
  flashDriverId: number | null;
  onMark: (row: SettlementReportRow) => void;
  onHistory: (row: SettlementReportRow) => void;
}

const NUMBER_CELL = 'px-4 py-2 text-right text-numeric text-body text-text whitespace-nowrap';

function PendingCell({ row }: { row: SettlementReportRow }): JSX.Element {
  if (row.pending_cash_trip_count === 0) {
    return <span className="text-text-muted">{SETTLEMENT_COPY.noPending}</span>;
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-numeric">
        {SETTLEMENT_COPY.pendingStat(
          row.pending_cash_trip_count,
          formatCop(row.pending_cash_amount),
        )}
      </span>
      <span className="inline-flex items-center rounded-full border border-amber/60 bg-amber/10 px-2 text-small font-bold text-text print:hidden">
        {SETTLEMENT_COPY.pendingBadge}
      </span>
      <span className="hidden text-small font-bold print:inline">
        {SETTLEMENT_COPY.pendingPrint}
      </span>
    </div>
  );
}

function SettlementRow({
  row,
  showRemittance,
  inProgress,
  online,
  flashing,
  onMark,
  onHistory,
}: {
  row: SettlementReportRow;
  showRemittance: boolean;
  inProgress: boolean;
  online: boolean;
  flashing: boolean;
  onMark: (row: SettlementReportRow) => void;
  onHistory: (row: SettlementReportRow) => void;
}): JSX.Element {
  const hasPending = row.pending_cash_trip_count > 0;
  return (
    <tr className={`${ROW_CLASS} ${flashing ? 'bg-amber/15' : 'hover:bg-bg-shell'}`}>
      <th
        scope="row"
        className={`border-l-rail py-2 pl-[13px] pr-4 text-left font-normal ${hasPending ? 'border-l-amber' : 'border-l-transparent'} sticky left-0 bg-surface`}
      >
        <p className="text-body font-bold text-text">{row.driver_name}</p>
        <p className="text-small text-text-muted">
          <span className="text-numeric">{row.national_id}</span>
          {row.plate && <span> · {row.plate}</span>}
        </p>
      </th>
      <td className={NUMBER_CELL}>{row.trip_count}</td>
      <td className={NUMBER_CELL}>{formatCop(row.cash_collected)}</td>
      <td className={NUMBER_CELL}>{formatCop(row.commission)}</td>
      <td className={NUMBER_CELL}>{formatCop(row.driver_net)}</td>
      <td className={`${NUMBER_CELL} font-black`}>{formatCop(row.amount_to_remit)}</td>
      <td className="px-4 py-2 text-right text-body text-text">
        <PendingCell row={row} />
      </td>
      {showRemittance && (
        <td className="px-4 py-2 text-body text-text print:hidden">
          <RemittanceCell
            row={row}
            inProgress={inProgress}
            online={online}
            onMark={onMark}
            onHistory={onHistory}
          />
        </td>
      )}
    </tr>
  );
}

export function SettlementTable({
  report,
  caption,
  online,
  flashDriverId,
  onMark,
  onHistory,
}: SettlementTableProps): JSX.Element {
  const showRemittance = report.week_start !== null;
  const { totals } = report;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead className={`${TABLE_HEAD_CLASS} print:table-header-group`}>
          <tr>
            <th
              scope="col"
              className="sticky left-0 border-l-rail border-l-transparent bg-surface-sunken py-2 pl-[13px] pr-4 text-left text-table-header uppercase text-text-muted"
            >
              {SETTLEMENT_COPY.columns.driver}
            </th>
            <th scope="col" className={TH_RIGHT_CLASS}>
              {SETTLEMENT_COPY.columns.trips}
            </th>
            <th scope="col" className={TH_RIGHT_CLASS}>
              {SETTLEMENT_COPY.columns.cash}
            </th>
            <th scope="col" className={TH_RIGHT_CLASS}>
              {SETTLEMENT_COPY.columns.commission}
            </th>
            <th scope="col" className={TH_RIGHT_CLASS}>
              {SETTLEMENT_COPY.columns.driverNet}
            </th>
            <th scope="col" className={TH_RIGHT_CLASS}>
              {SETTLEMENT_COPY.columns.toRemit}
            </th>
            <th scope="col" className={TH_RIGHT_CLASS}>
              {SETTLEMENT_COPY.columns.pending}
            </th>
            {showRemittance && (
              <th scope="col" className={`${TH_CLASS} print:hidden`}>
                {SETTLEMENT_COPY.columns.remittance}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {report.rows.map((row) => (
            <SettlementRow
              key={row.driver_id}
              row={row}
              showRemittance={showRemittance}
              inProgress={report.in_progress}
              online={online}
              flashing={flashDriverId === row.driver_id}
              onMark={onMark}
              onHistory={onHistory}
            />
          ))}
        </tbody>
        <tfoot>
          <tr className="h-row-lg border-t-2 border-border-input bg-surface-sunken">
            <th
              scope="row"
              className="sticky left-0 bg-surface-sunken py-2 pl-4 pr-4 text-left text-body font-black text-text"
            >
              {SETTLEMENT_COPY.totals}
            </th>
            <td className={`${NUMBER_CELL} font-black`}>{totals.trip_count}</td>
            <td className={`${NUMBER_CELL} font-black`}>{formatCop(totals.cash_collected)}</td>
            <td className={`${NUMBER_CELL} font-black`}>{formatCop(totals.commission)}</td>
            <td className={`${NUMBER_CELL} font-black`}>{formatCop(totals.driver_net)}</td>
            <td className={`${NUMBER_CELL} font-black`}>{formatCop(totals.amount_to_remit)}</td>
            <td className={`${NUMBER_CELL} font-black`}>
              {totals.pending_cash_trip_count === 0
                ? SETTLEMENT_COPY.noPending
                : SETTLEMENT_COPY.pendingStat(
                    totals.pending_cash_trip_count,
                    formatCop(totals.pending_cash_amount),
                  )}
            </td>
            {showRemittance && <td className="print:hidden" />}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
