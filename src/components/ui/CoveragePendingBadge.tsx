import type { JSX } from 'react';
import { COVERAGE_COPY } from '../../copy/coverage';

function PinIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" fill="none" aria-hidden="true">
      <path
        d="M6 11s3.5-3.1 3.5-5.6A3.5 3.5 0 0 0 2.5 5.4C2.5 7.9 6 11 6 11Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <circle cx="6" cy="5.3" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function CoveragePendingBadge(): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber/60 bg-amber/10 px-2 py-0.5 text-small font-medium text-amber-ink dark:text-amber">
      <PinIcon />
      {COVERAGE_COPY.pendingBadge}
    </span>
  );
}
