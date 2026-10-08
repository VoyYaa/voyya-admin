import { useCallback, useState, type JSX } from 'react';
import type { DriverPinStatus } from '@voyyaa/shared';
import { resendDriverPin } from '../../api/admin-drivers.api';
import { domainErrorCode, isNetworkError } from '../../api/errors';
import { PIN_COPY } from '../../copy/drivers';
import { useNetworkOnline } from '../../hooks/useNetworkOnline';
import { formatDateTimeBogota } from '../../lib/settlement';
import { useToastStore } from '../../state/toast-store';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Notice } from '../ui/Notice';

export interface ResendPinActionProps {
  driverId: number;
  fullName: string;
  pinStatus: DriverPinStatus;
  onResent: () => void;
}

function failureMessage(error: unknown): string {
  if (isNetworkError(error)) return PIN_COPY.offline;
  if (domainErrorCode(error) === 'DRIVER_NOT_FOUND') return PIN_COPY.notFound;
  return PIN_COPY.generic;
}

function needsResendConfirmation(pinStatus: DriverPinStatus): boolean {
  return pinStatus !== 'not_delivered';
}

export function ResendPinAction({
  driverId,
  fullName,
  pinStatus,
  onResent,
}: ResendPinActionProps): JSX.Element {
  const online = useNetworkOnline();
  const pushToast = useToastStore((state) => state.pushToast);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const resend = useCallback(async (): Promise<void> => {
    setWorking(true);
    setFailure(null);
    try {
      const result = await resendDriverPin(driverId);
      setConfirmOpen(false);
      if (result.pin_delivery === 'failed') {
        setFailure(PIN_COPY.smsFailed);
      } else {
        pushToast(
          'success',
          PIN_COPY.success(formatDateTimeBogota(result.temporary_pin_expires_at)),
        );
      }
      onResent();
    } catch (error) {
      setConfirmOpen(false);
      setFailure(failureMessage(error));
    } finally {
      setWorking(false);
    }
  }, [driverId, onResent, pushToast]);

  const onPress = (): void => {
    setFailure(null);
    if (needsResendConfirmation(pinStatus)) setConfirmOpen(true);
    else void resend();
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="ghost"
        onClick={onPress}
        loading={working && !confirmOpen}
        disabled={!online || working}
        aria-label={PIN_COPY.resendAria(fullName)}
      >
        {working && !confirmOpen ? PIN_COPY.resending : PIN_COPY.resend}
      </Button>
      {!online && <p className="text-small text-text-muted">{PIN_COPY.offline}</p>}
      {failure && (
        <Notice
          tone="danger"
          role="alert"
          action={
            <Button variant="ghost" onClick={onPress} disabled={!online || working}>
              {PIN_COPY.retry}
            </Button>
          }
        >
          {failure}
        </Notice>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title={PIN_COPY.dialogTitle}
        confirmLabel={working ? PIN_COPY.resending : PIN_COPY.dialogConfirm}
        cancelLabel={PIN_COPY.dialogCancel}
        onConfirm={() => void resend()}
        onCancel={() => setConfirmOpen(false)}
        confirming={working}
      >
        <p>{PIN_COPY.dialogBody(fullName)}</p>
      </ConfirmDialog>
    </div>
  );
}
