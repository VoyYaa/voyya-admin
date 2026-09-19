import type { JSX } from 'react';
import { TONE_DOT_CLASS, type StatusTone } from '../../lib/status-maps';

export interface StatusDotProps {
  tone: StatusTone;
  label: string;
  pulse?: boolean;
}

export function StatusDot({ tone, label, pulse = false }: StatusDotProps): JSX.Element {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden="true">
        {pulse && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:hidden ${TONE_DOT_CLASS[tone]}`}
          />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${TONE_DOT_CLASS[tone]}`} />
      </span>
      <span className="text-body text-text">{label}</span>
    </span>
  );
}
