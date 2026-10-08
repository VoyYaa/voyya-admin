import { useCallback, useEffect, useState, type JSX } from 'react';
import {
  OPS_LIST_MAX_LIMIT,
  settlementWeekOf,
  type SettlementReportResponse,
  type SettlementReportRow,
} from '@voyyaa/shared';
import { getOpsDrivers } from '../api/ops-drivers.api';
import { ApiError, isNetworkError } from '../api/errors';
import { getSettlementReport } from '../api/settlement.api';
import {
  RemittanceHistoryDrawer,
  type RemittanceHistoryTarget,
} from '../components/settlement/RemittanceHistoryDrawer';
import { MarkRemittedDialog } from '../components/settlement/MarkRemittedDialog';
import { SettlementControls } from '../components/settlement/SettlementControls';
import {
  SettlementPrintFooter,
  SettlementPrintHeader,
} from '../components/settlement/SettlementPrintHeader';
import { SettlementSummary } from '../components/settlement/SettlementSummary';
import { SettlementTable } from '../components/settlement/SettlementTable';
import { Button } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';
import { PageToolbar } from '../components/ui/PageToolbar';
import { ProgressRail } from '../components/ui/ProgressRail';
import { StatusDot } from '../components/ui/StatusDot';
import { EmptyPanel, ErrorPanel, SkeletonRows } from '../components/ui/TableStates';
import { SETTLEMENT_COPY } from '../copy/settlement';
import { useAsync } from '../hooks/useAsync';
import { useNetworkOnline } from '../hooks/useNetworkOnline';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useSettlementCsvDownload } from '../hooks/useSettlementCsvDownload';
import { useSettlementQuery } from '../hooks/useSettlementQuery';
import {
  formatCompactRange,
  formatCop,
  formatDateTimeBogota,
  reportTitle,
  sameRange,
} from '../lib/settlement';
import { useSessionStore } from '../state/session-store';

const HTTP_FORBIDDEN = 403;
const FLASH_MS = 900;

interface LoadedReport {
  key: string;
  report: SettlementReportResponse;
}

function SettlementSkeleton(): JSX.Element {
  return (
    <table className="w-full table-fixed border-collapse" aria-busy="true">
      <tbody>
        <SkeletonRows columnCount={7} />
      </tbody>
    </table>
  );
}

export function SettlementPage(): JSX.Element {
  const online = useNetworkOnline();
  const reducedMotion = usePrefersReducedMotion();
  const companyName = useSessionStore((s) => s.user?.tenant?.company_name ?? null);
  const state = useSettlementQuery();
  const { query } = state;
  const queryKey = `${query.from}|${query.to}|${query.driver_id ?? ''}`;

  const fetcher = useCallback(
    (): Promise<LoadedReport> =>
      getSettlementReport(query).then((report) => ({ key: queryKey, report })),
    [query, queryKey],
  );
  const { data, status, error, refetch } = useAsync(fetcher);

  const driversFetcher = useCallback(() => getOpsDrivers({ limit: OPS_LIST_MAX_LIMIT }), []);
  const { data: driverList } = useAsync(driversFetcher);

  const csv = useSettlementCsvDownload(query);

  const [markRow, setMarkRow] = useState<SettlementReportRow | null>(null);
  const [historyTarget, setHistoryTarget] = useState<RemittanceHistoryTarget | null>(null);
  const [flashDriverId, setFlashDriverId] = useState<number | null>(null);

  useEffect(() => {
    if (flashDriverId === null) return;
    const timer = window.setTimeout(() => setFlashDriverId(null), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [flashDriverId]);

  const loading = status === 'loading';
  const current = data && data.key === queryKey ? data.report : null;
  const showSkeleton = loading && !current;
  const failed = status === 'error';
  const unreachable = !online || (failed && isNetworkError(error));
  const offlineWithReport = current !== null && unreachable;
  const showError = failed && !offlineWithReport;
  const report = showError || showSkeleton ? null : current;
  const forbidden = error instanceof ApiError && error.status === HTTP_FORBIDDEN;
  const isEmpty = report !== null && report.rows.length === 0;

  const isWeek = sameRange(settlementWeekOf(state.applied.from), state.applied);
  const title = reportTitle(state.applied, isWeek);
  const caption = SETTLEMENT_COPY.caption(`del ${formatCompactRange(state.applied)}`);

  const draftPending = state.customOpen && state.isDraftDirty;
  const canExport = report !== null && !isEmpty && online && !loading && !draftPending;

  const closeMark = useCallback(() => setMarkRow(null), []);
  const onRecorded = useCallback(() => {
    if (markRow) setFlashDriverId(reducedMotion ? null : markRow.driver_id);
    setMarkRow(null);
    refetch();
  }, [markRow, reducedMotion, refetch]);
  const onRefreshRequested = useCallback(() => {
    setMarkRow(null);
    refetch();
  }, [refetch]);

  return (
    <div className="settlement-page flex h-full flex-col">
      <PageToolbar eyebrow={SETTLEMENT_COPY.eyebrow} title={title}>
        <div className="flex-1" />
        {report !== null && !isEmpty && (
          <div className="flex items-center gap-3 print:hidden">
            <Button
              variant="ghost"
              onClick={() => void csv.download()}
              loading={csv.busy}
              disabled={!canExport}
            >
              {csv.busy ? SETTLEMENT_COPY.downloadBusy : SETTLEMENT_COPY.downloadCsv}
            </Button>
            <Button variant="ghost" onClick={() => window.print()}>
              {SETTLEMENT_COPY.printAction}
            </Button>
          </div>
        )}
      </PageToolbar>

      <SettlementControls state={state} drivers={driverList?.rows ?? []} generating={loading} />

      {loading && <ProgressRail className="print:hidden" label={SETTLEMENT_COPY.loadingLabel} />}

      <div className="flex-1 overflow-y-auto bg-surface">
        {report && <SettlementPrintHeader report={report} companyName={companyName} />}

        <div className="flex flex-col gap-3 print:hidden">
          {report && (
            <div className="flex flex-wrap items-center gap-3 px-6 pt-3 text-small text-text-muted">
              <span>{SETTLEMENT_COPY.generatedAt(formatDateTimeBogota(report.generated_at))}</span>
              {report.in_progress && (
                <>
                  <StatusDot tone="info" label={SETTLEMENT_COPY.inProgressBadge} />
                  <span>{SETTLEMENT_COPY.inProgressNote}</span>
                </>
              )}
            </div>
          )}
          {draftPending && (
            <div className="px-6">
              <Notice tone="warning" role="status">
                {SETTLEMENT_COPY.rangeChanged}
              </Notice>
            </div>
          )}
          {offlineWithReport && report && (
            <div className="px-6">
              <Notice tone="info" role="status">
                {SETTLEMENT_COPY.error.staleOffline(formatDateTimeBogota(report.generated_at))}
              </Notice>
            </div>
          )}
          {csv.error && (
            <div className="px-6">
              <Notice
                tone="danger"
                role="alert"
                action={
                  <Button variant="ghost" onClick={() => void csv.download()}>
                    {SETTLEMENT_COPY.csv.retry}
                  </Button>
                }
              >
                {csv.error}
              </Notice>
            </div>
          )}
        </div>

        {!showError && <SettlementSummary totals={report?.totals ?? null} />}

        <p className="sr-only" aria-live="polite">
          {report && !isEmpty
            ? SETTLEMENT_COPY.announceDone(
                report.rows.length,
                formatCop(report.totals.amount_to_remit),
              )
            : ''}
        </p>

        {showSkeleton && <SettlementSkeleton />}

        {showError && (
          <ErrorPanel
            title={
              forbidden
                ? SETTLEMENT_COPY.error.forbidden
                : unreachable
                  ? SETTLEMENT_COPY.error.offlineTitle
                  : SETTLEMENT_COPY.error.title
            }
            variant={unreachable ? 'offline' : 'error'}
            onRetry={forbidden ? undefined : refetch}
          />
        )}

        {report && isEmpty && (
          <EmptyPanel
            title={
              state.driverId !== null
                ? SETTLEMENT_COPY.empty.filteredTitle
                : SETTLEMENT_COPY.empty.title
            }
            description={state.driverId === null ? SETTLEMENT_COPY.empty.description : undefined}
            actionLabel={state.driverId !== null ? SETTLEMENT_COPY.empty.filteredAction : undefined}
            onAction={state.driverId !== null ? () => state.setDriverId(null) : undefined}
          />
        )}

        {report && !isEmpty && (
          <>
            <SettlementTable
              report={report}
              caption={caption}
              online={online}
              flashDriverId={flashDriverId}
              onMark={setMarkRow}
              onHistory={(row) =>
                report.week_start &&
                setHistoryTarget({
                  driverId: row.driver_id,
                  driverName: row.driver_name,
                  weekStart: report.week_start,
                })
              }
            />
            <SettlementPrintFooter />
          </>
        )}
      </div>

      <MarkRemittedDialog
        row={markRow}
        week={settlementWeekOf(report?.week_start ?? state.applied.from)}
        weekStart={report?.week_start ?? state.applied.from}
        onClose={closeMark}
        onRecorded={onRecorded}
        onRefreshRequested={onRefreshRequested}
      />
      <RemittanceHistoryDrawer
        target={historyTarget}
        onClose={() => setHistoryTarget(null)}
        onChanged={refetch}
      />
    </div>
  );
}
