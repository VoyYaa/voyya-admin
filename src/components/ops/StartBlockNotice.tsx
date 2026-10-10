import type { JSX } from 'react';
import { START_BLOCKED_COPY } from '../../copy/ops';
import {
  START_CODE_MAX_ATTEMPTS,
  startBlockState,
  type StartBlockSource,
} from '../../lib/start-block';
import { Notice } from '../ui/Notice';

export function StartBlockNotice({ source }: { source: StartBlockSource }): JSX.Element | null {
  const state = startBlockState(source);
  if (state === 'none') return null;
  return (
    <div className="space-y-2">
      {state === 'blocked' ? (
        <Notice tone="danger" role="status">
          <p className="font-bold">{START_BLOCKED_COPY.noticeTitle}</p>
          <p>{START_BLOCKED_COPY.noticeBody(START_CODE_MAX_ATTEMPTS)}</p>
        </Notice>
      ) : (
        <Notice tone="info" role="status">
          {START_BLOCKED_COPY.attemptsNotice(source.start_failed_attempts, START_CODE_MAX_ATTEMPTS)}
        </Notice>
      )}
      <p className="text-small text-text-muted">{START_BLOCKED_COPY.noCodeNote}</p>
    </div>
  );
}
