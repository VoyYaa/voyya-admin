import type { JSX } from 'react';
import { STAT_COPY } from '../../copy/common';
import { TONE_DOT_CLASS, type StatusTone } from '../../lib/status-maps';

export interface StatItem {
  key: string;
  label: string;
  value: number | string;
  tone: StatusTone;
  emphasized?: boolean;
}

export interface StatStripProps {
  items: readonly StatItem[];
  loading?: boolean;
  ariaLabel?: string;
}

export function StatStrip({
  items,
  loading = false,
  ariaLabel = STAT_COPY.ariaLabel,
}: StatStripProps): JSX.Element {
  return (
    <dl
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      className="m-0 grid shrink-0 grid-cols-2 divide-x divide-border border-b border-border bg-surface sm:grid-cols-4"
    >
      {items.map((item) => (
        <div key={item.key} className="flex flex-col gap-1 px-6 py-3">
          <dt className="flex items-center gap-2 text-small font-semibold text-text-muted">
            <span
              aria-hidden="true"
              className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT_CLASS[item.tone]}`}
            />
            {item.label}
          </dt>
          <dd className="m-0">
            {loading ? (
              <span
                aria-hidden="true"
                className="vy-skeleton block h-8 w-24 rounded-xs"
                data-testid="stat-skeleton"
              />
            ) : (
              <span
                className={`font-display text-stat tabular-nums text-text ${item.emphasized ? 'underline decoration-amber decoration-4 underline-offset-4' : ''}`}
              >
                {item.value}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
