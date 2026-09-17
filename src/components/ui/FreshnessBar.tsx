import type { JSX } from 'react';
import { formatRelativeMinutes, formatRelativeSeconds } from '../../lib/time';

export type FreshnessState = 'live' | 'reconnecting' | 'offline' | 'stale';

export interface FreshnessBarProps {
  state: FreshnessState;
  lastUpdatedAtMs?: number | null;
  variant?: 'surface' | 'frame';
}

const STATE_DOT_CLASS: Record<FreshnessState, string> = {
  live: 'bg-success',
  reconnecting: 'bg-amber',
  offline: 'bg-danger',
  stale: 'bg-status-neutral',
};

const ANNOUNCED_LABEL: Record<FreshnessState, string> = {
  live: 'En vivo.',
  reconnecting: 'Reconectando.',
  offline: 'Sin conexión, reintentando.',
  stale: 'Datos actualizados.',
};

function buildVisibleLabel(state: FreshnessState, lastUpdatedAtMs?: number | null): string {
  if (state === 'live') return 'En vivo';
  if (state === 'offline') return 'Sin conexión · reintentando…';
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
      <span aria-hidden="true">{buildVisibleLabel(state, lastUpdatedAtMs)}</span>
      <span className="sr-only" role="status" aria-live="polite">
        {ANNOUNCED_LABEL[state]}
      </span>
    </span>
  );
}
