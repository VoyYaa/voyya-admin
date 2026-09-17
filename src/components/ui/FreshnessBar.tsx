import type { JSX } from 'react';
import { formatRelativeMinutes, formatRelativeSeconds } from '../../lib/time';

export type FreshnessState = 'live' | 'reconnecting' | 'offline' | 'stale';

export interface FreshnessBarProps {
  state: FreshnessState;
  lastUpdatedAtMs?: number | null;
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

export function FreshnessBar({ state, lastUpdatedAtMs }: FreshnessBarProps): JSX.Element {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-small text-text-muted">
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${STATE_DOT_CLASS[state]}`}
        aria-hidden="true"
      />
      <span aria-hidden="true">{buildVisibleLabel(state, lastUpdatedAtMs)}</span>
      <span className="sr-only" role="status" aria-live="polite">
        {ANNOUNCED_LABEL[state]}
      </span>
    </span>
  );
}
