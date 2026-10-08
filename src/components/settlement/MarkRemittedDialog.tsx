import { useCallback, useEffect, useState, type JSX } from 'react';
import type { RemittanceResult, SettlementReportRow } from '@voyyaa/shared';
import { recordRemittance } from '../../api/settlement.api';
import { domainErrorCode, isNetworkError } from '../../api/errors';
import { SETTLEMENT_COPY } from '../../copy/settlement';
import { expectedRemittanceAmount } from '../../lib/remittance-state';
import { formatCompactRange, formatCop, type DateRange } from '../../lib/settlement';
import { useToastStore } from '../../state/toast-store';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Notice } from '../ui/Notice';

export interface MarkRemittedDialogProps {
  row: SettlementReportRow | null;
  week: DateRange;
  weekStart: string;
  onClose: () => void;
  onRecorded: (result: RemittanceResult) => void;
  onRefreshRequested: () => void;
}

interface DialogFailure {
  message: string;
  stale: boolean;
}

function failureOf(error: unknown): DialogFailure {
  if (isNetworkError(error)) return { message: SETTLEMENT_COPY.remittance.offline, stale: false };
  const code = domainErrorCode(error);
  if (code === 'SETTLEMENT_BALANCE_CHANGED') {
    return { message: SETTLEMENT_COPY.remittance.balanceChanged, stale: true };
  }
  if (code === 'SETTLEMENT_WEEK_IN_PROGRESS') {
    return { message: SETTLEMENT_COPY.remittance.weekInProgress, stale: false };
  }
  if (code === 'DRIVER_NOT_FOUND') {
    return { message: SETTLEMENT_COPY.remittance.driverNotFound, stale: true };
  }
  return { message: SETTLEMENT_COPY.remittance.error, stale: false };
}

export function MarkRemittedDialog({
  row,
  week,
  weekStart,
  onClose,
  onRecorded,
  onRefreshRequested,
}: MarkRemittedDialogProps): JSX.Element {
  const pushToast = useToastStore((state) => state.pushToast);
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState<DialogFailure | null>(null);
  const [lastRow, setLastRow] = useState<SettlementReportRow | null>(row);

  useEffect(() => {
    if (row) {
      setLastRow(row);
      setFailure(null);
    }
  }, [row]);

  const target = row ?? lastRow;
  const amount = target ? expectedRemittanceAmount(target) : 0;

  const confirm = useCallback(async (): Promise<void> => {
    if (!target) return;
    if (failure?.stale) {
      onRefreshRequested();
      return;
    }
    setWorking(true);
    setFailure(null);
    try {
      const result = await recordRemittance({
        driver_id: target.driver_id,
        week_start: weekStart,
        expected_amount: amount,
      });
      if (result.idempotent) {
        pushToast('info', SETTLEMENT_COPY.remittance.idempotent);
      } else {
        pushToast(
          'success',
          SETTLEMENT_COPY.remittance.success(target.driver_name, formatCop(amount)),
        );
      }
      onRecorded(result);
    } catch (error) {
      if (domainErrorCode(error) === 'NOTHING_TO_REMIT') {
        pushToast('info', SETTLEMENT_COPY.remittance.nothingToRemit);
        onRefreshRequested();
      } else {
        setFailure(failureOf(error));
      }
    } finally {
      setWorking(false);
    }
  }, [target, failure, weekStart, amount, pushToast, onRecorded, onRefreshRequested]);

  const confirmLabel = working
    ? SETTLEMENT_COPY.remittance.confirming
    : failure?.stale
      ? SETTLEMENT_COPY.remittance.refreshReport
      : SETTLEMENT_COPY.remittance.confirm;

  return (
    <ConfirmDialog
      open={row !== null}
      title={SETTLEMENT_COPY.remittance.dialogTitle}
      confirmLabel={confirmLabel}
      cancelLabel={SETTLEMENT_COPY.remittance.cancel}
      onConfirm={() => void confirm()}
      onCancel={onClose}
      confirming={working}
    >
      <div className="space-y-3">
        {target && (
          <p>
            {SETTLEMENT_COPY.remittance.dialogBody(
              target.driver_name,
              formatCop(amount),
              formatCompactRange(week),
            )}
          </p>
        )}
        <p className="text-text-muted">{SETTLEMENT_COPY.remittance.dialogAudit}</p>
        {failure && (
          <Notice tone={failure.stale ? 'warning' : 'danger'} role="alert">
            {failure.message}
          </Notice>
        )}
      </div>
    </ConfirmDialog>
  );
}
