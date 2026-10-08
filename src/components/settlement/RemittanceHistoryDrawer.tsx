import { useCallback, useState, type JSX } from 'react';
import { settlementWeekOf, type SettlementRemittanceEntry } from '@voyyaa/shared';
import { getRemittanceHistory, reverseRemittance } from '../../api/settlement.api';
import { domainErrorCode, isNetworkError } from '../../api/errors';
import { SETTLEMENT_COPY } from '../../copy/settlement';
import { useAsync } from '../../hooks/useAsync';
import { formatCompactRange, formatCop, formatDateTimeBogota } from '../../lib/settlement';
import { useToastStore } from '../../state/toast-store';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DetailDrawer } from '../ui/DetailDrawer';
import { Notice } from '../ui/Notice';
import { DetailSkeleton, EmptyPanel, ErrorPanel } from '../ui/TableStates';
import { Timeline, type TimelineItem } from '../ui/Timeline';

export interface RemittanceHistoryTarget {
  driverId: number;
  driverName: string;
  weekStart: string;
}

export interface RemittanceHistoryDrawerProps {
  target: RemittanceHistoryTarget | null;
  onClose: () => void;
  onChanged: () => void;
}

function undoFailureMessage(error: unknown): string {
  if (isNetworkError(error)) return SETTLEMENT_COPY.history.undoOffline;
  const code = domainErrorCode(error);
  if (code === 'REMITTANCE_NOT_REVERSIBLE') return SETTLEMENT_COPY.history.notReversible;
  if (code === 'REMITTANCE_NOT_FOUND') return SETTLEMENT_COPY.history.notFound;
  return SETTLEMENT_COPY.history.undoError;
}

export function RemittanceHistoryDrawer({
  target,
  onClose,
  onChanged,
}: RemittanceHistoryDrawerProps): JSX.Element {
  const pushToast = useToastStore((state) => state.pushToast);
  const fetcher = useCallback(() => {
    if (!target) return Promise.reject(new Error('No hay conductor seleccionado.'));
    return getRemittanceHistory({ driver_id: target.driverId, week_start: target.weekStart });
  }, [target]);
  const { data, status, refetch } = useAsync(fetcher, target !== null);

  const [undoing, setUndoing] = useState<SettlementRemittanceEntry | null>(null);
  const [working, setWorking] = useState(false);
  const [undoError, setUndoError] = useState<string | null>(null);

  const closeUndo = useCallback(() => {
    setUndoing(null);
    setUndoError(null);
  }, []);

  const confirmUndo = useCallback(async (): Promise<void> => {
    if (!undoing) return;
    setWorking(true);
    setUndoError(null);
    try {
      await reverseRemittance(undoing.remittance_id);
      pushToast('success', SETTLEMENT_COPY.history.undoSuccess(formatCop(undoing.amount)));
      setUndoing(null);
      refetch();
      onChanged();
    } catch (error) {
      setUndoError(undoFailureMessage(error));
      const code = domainErrorCode(error);
      if (code === 'REMITTANCE_NOT_REVERSIBLE' || code === 'REMITTANCE_NOT_FOUND') refetch();
    } finally {
      setWorking(false);
    }
  }, [undoing, pushToast, refetch, onChanged]);

  const weekLabel = target
    ? SETTLEMENT_COPY.history.weekOf(formatCompactRange(settlementWeekOf(target.weekStart)))
    : '';

  const items: TimelineItem[] = (data?.rows ?? []).map((entry) => ({
    id: entry.remittance_id,
    label:
      entry.kind === 'remittance'
        ? SETTLEMENT_COPY.history.entryRemittance(formatCop(entry.amount))
        : SETTLEMENT_COPY.history.entryReversal(formatCop(entry.amount)),
    timestamp: entry.recorded_at,
    formatTimestamp: (iso) =>
      SETTLEMENT_COPY.history.recordedBy(formatDateTimeBogota(iso), entry.recorded_by.name),
    detail:
      entry.kind === 'remittance' && !entry.reversed ? (
        <Button variant="ghost" className="mt-2" onClick={() => setUndoing(entry)}>
          {SETTLEMENT_COPY.history.undo}
        </Button>
      ) : undefined,
  }));

  return (
    <>
      <DetailDrawer
        open={target !== null}
        title={target ? SETTLEMENT_COPY.history.title(target.driverName) : ''}
        onClose={onClose}
      >
        <p className="mb-4 text-small text-text-muted">{weekLabel}</p>
        {status === 'loading' && !data && <DetailSkeleton />}
        {status === 'error' && !data && (
          <ErrorPanel title={SETTLEMENT_COPY.history.error} onRetry={refetch} />
        )}
        {data && data.rows.length === 0 && <EmptyPanel title={SETTLEMENT_COPY.history.empty} />}
        {data && data.rows.length > 0 && <Timeline items={items} />}
      </DetailDrawer>
      <ConfirmDialog
        open={undoing !== null}
        title={SETTLEMENT_COPY.history.undoTitle}
        confirmLabel={
          working ? SETTLEMENT_COPY.history.undoing : SETTLEMENT_COPY.history.undoConfirm
        }
        cancelLabel={SETTLEMENT_COPY.remittance.cancel}
        onConfirm={() => void confirmUndo()}
        onCancel={closeUndo}
        confirming={working}
      >
        <div className="space-y-3">
          {undoing && target && (
            <p>{SETTLEMENT_COPY.history.undoBody(target.driverName, formatCop(undoing.amount))}</p>
          )}
          {undoError && (
            <Notice tone="danger" role="alert">
              {undoError}
            </Notice>
          )}
        </div>
      </ConfirmDialog>
    </>
  );
}
