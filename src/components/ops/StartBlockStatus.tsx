import type { JSX } from 'react';
import { START_BLOCKED_COPY } from '../../copy/ops';
import {
  START_CODE_MAX_ATTEMPTS,
  startBlockState,
  type StartBlockSource,
} from '../../lib/start-block';
import { StatusDot } from '../ui/StatusDot';

export function StartBlockStatus({ source }: { source: StartBlockSource }): JSX.Element | null {
  const state = startBlockState(source);
  if (state === 'none') return null;
  if (state === 'blocked') {
    return (
      <div className="mt-1">
        <StatusDot tone="danger" label={START_BLOCKED_COPY.label} />
      </div>
    );
  }
  return (
    <div className="mt-1 inline-flex items-center gap-2 text-small text-text-muted">
      <span aria-hidden="true" className="inline-flex h-2 w-2 shrink-0 rounded-full bg-amber" />
      <span>
        {START_BLOCKED_COPY.attempts(source.start_failed_attempts, START_CODE_MAX_ATTEMPTS)}
      </span>
    </div>
  );
}
