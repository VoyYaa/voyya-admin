import type { JSX } from 'react';
import {
  FRESHNESS_ANNOUNCED_LABEL,
  FRESHNESS_CONNECTING_LABEL,
  FRESHNESS_OFFLINE_LABEL,
  freshnessErrorLabel,
  type FreshnessState,
} from '../../copy/freshness';
import { formatRelativeMinutes, formatRelativeSeconds } from '../../lib/time';

export type { FreshnessState };

export interface FreshnessBarProps {
  state: FreshnessState;
  lastUpdatedAtMs?: number | null;
  errorStatus?: number;
  variant?: 'surface' | 'frame';
}

const STATE_DOT_CLASS: Record<FreshnessState, string> = {
  live: 'bg-success',
  reconnecting: 'bg-amber',
  offline: 'bg-danger',
  error: 'bg-danger',
  stale: 'bg-status-neutral',
};

function buildVisibleLabel(
  state: FreshnessState,
  lastUpdatedAtMs: number | null | undefined,
  errorStatus: number | undefined,
): string {
  if (state === 'live') return 'En vivo';
  if (state === 'offline') return FRESHNESS_OFFLINE_LABEL;
  if (state === 'error') return freshnessErrorLabel(errorStatus);
  if (state === 'reconnecting' && !lastUpdatedAtMs) return FRESHNESS_CONNECTING_LABEL;
  const elapsed = lastUpdatedAtMs ? Date.now() - lastUpdatedAtMs : 0;
  if (state === 'reconnecting') return `Reconectando · datos de ${formatRelativeSeconds(elapsed)}`;
  return `Actualizado ${formatRelativeMinutes(elapsed)}`;
}

const VARIANT_CLASS: Record<'surface' | 'frame', string> = {
  surface: 'border-border bg-surface text-text-muted',
  frame: 'border-frame-chip-border bg-frame-chip-bg text-frame-text-muted',
};

export function FreshnessBar({
  state,
  lastUpdatedAtMs,
  errorStatus,
  variant = 'surface',
}: FreshnessBarProps): JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-small ${VARIANT_CLASS[variant]}`}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full transition-colors duration-300 motion-reduce:transition-none ${STATE_DOT_CLASS[state]}`}
        aria-hidden="true"
      />
      <span aria-hidden="true">{buildVisibleLabel(state, lastUpdatedAtMs, errorStatus)}</span>
      <span className="sr-only" role="status" aria-live="polite">
        {FRESHNESS_ANNOUNCED_LABEL[state]}
      </span>
    </span>
  );
}
