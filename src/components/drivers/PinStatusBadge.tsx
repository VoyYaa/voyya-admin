import type { JSX } from 'react';
import type { DriverPinStatus } from '@voyyaa/shared';
import { DRIVER_PIN_STATUS_LABELS, DRIVER_PIN_STATUS_TONES } from '../../lib/status-maps';
import { StatusDot } from '../ui/StatusDot';

export interface PinStatusBadgeProps {
  pinStatus: DriverPinStatus;
}

export function PinStatusBadge({ pinStatus }: PinStatusBadgeProps): JSX.Element {
  if (pinStatus === 'personal') {
    return (
      <>
        <span aria-hidden="true" className="text-text-muted">
          —
        </span>
        <span className="sr-only">{DRIVER_PIN_STATUS_LABELS.personal}</span>
      </>
    );
  }
  return (
    <StatusDot
      tone={DRIVER_PIN_STATUS_TONES[pinStatus]}
      label={DRIVER_PIN_STATUS_LABELS[pinStatus]}
    />
  );
}
