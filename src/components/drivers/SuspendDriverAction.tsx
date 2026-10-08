import { useCallback, useState, type JSX } from 'react';
import type { DriverStatus } from '@voyyaa/shared';
import { suspendDriver } from '../../api/admin-drivers.api';
import { domainErrorCode, isNetworkError } from '../../api/errors';
import { SUSPEND_DRIVER_COPY } from '../../copy/drivers';
import { useNetworkOnline } from '../../hooks/useNetworkOnline';
import { useToastStore } from '../../state/toast-store';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export interface SuspendDriverActionProps {
  driverId: number;
  fullName: string;
  status: DriverStatus;
  onSuspended: () => void;
}

function suspendErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return SUSPEND_DRIVER_COPY.offline;
  if (domainErrorCode(error) === 'DRIVER_NOT_FOUND') return SUSPEND_DRIVER_COPY.notFound;
  return SUSPEND_DRIVER_COPY.generic;
}

export function SuspendDriverAction({
  driverId,
  fullName,
  status,
  onSuspended,
}: SuspendDriverActionProps): JSX.Element {
  const online = useNetworkOnline();
  const pushToast = useToastStore((state) => state.pushToast);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const closeDialog = useCallback(() => setConfirmOpen(false), []);

  const onConfirm = useCallback(async (): Promise<void> => {
    setWorking(true);
    setErrorMessage(null);
    try {
      await suspendDriver(driverId, 'suspended');
      setConfirmOpen(false);
      pushToast('success', SUSPEND_DRIVER_COPY.success(fullName));
      onSuspended();
    } catch (error) {
      setConfirmOpen(false);
      setErrorMessage(suspendErrorMessage(error));
    } finally {
      setWorking(false);
    }
  }, [driverId, fullName, onSuspended, pushToast]);

  if (status === 'suspended') {
    return <p className="text-small text-text-muted">{SUSPEND_DRIVER_COPY.alreadySuspended}</p>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setErrorMessage(null);
          setConfirmOpen(true);
        }}
        disabled={!online || working}
        className="focus-ring h-tap rounded-sm border border-danger/50 px-4 text-btn font-display text-danger-ink hover:bg-danger-tint disabled:cursor-not-allowed disabled:opacity-60 dark:text-danger-ink-dark"
      >
        {working ? SUSPEND_DRIVER_COPY.actionBusy : SUSPEND_DRIVER_COPY.action}
      </button>
      {!online && <p className="mt-1 text-small text-text-muted">{SUSPEND_DRIVER_COPY.offline}</p>}
      {errorMessage && (
        <p role="alert" className="mt-1 text-small text-danger-ink dark:text-danger-ink-dark">
          {errorMessage}
        </p>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title={SUSPEND_DRIVER_COPY.dialogTitle}
        confirmLabel={working ? SUSPEND_DRIVER_COPY.actionBusy : SUSPEND_DRIVER_COPY.dialogConfirm}
        cancelLabel={SUSPEND_DRIVER_COPY.dialogCancel}
        onConfirm={() => void onConfirm()}
        onCancel={closeDialog}
        confirmDisabled={working}
      >
        <p>{SUSPEND_DRIVER_COPY.dialogBody(fullName)}</p>
      </ConfirmDialog>
    </div>
  );
}
