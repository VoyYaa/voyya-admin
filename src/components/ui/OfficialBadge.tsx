import type { JSX } from 'react';
import { RATES_COPY } from '../../copy/rates';

export interface OfficialBadgeProps {
  official: boolean;
}

function VerifiedIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 14 14" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.6 7.2l1.7 1.7 3.1-3.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProvisionalIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 14 14" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7 4v3.3l2 1.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OfficialBadge({ official }: OfficialBadgeProps): JSX.Element {
  const tone = official
    ? 'text-success-ink dark:text-success-ink-dark'
    : 'text-amber-ink dark:text-amber';
  const dot = official ? 'bg-success' : 'bg-amber';

  return (
    <span className={`inline-flex items-center gap-1.5 text-small font-bold ${tone}`}>
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      {official ? <VerifiedIcon /> : <ProvisionalIcon />}
      {official ? RATES_COPY.official : RATES_COPY.unofficial}
    </span>
  );
}
