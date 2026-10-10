import { START_CODE_MAX_FAILED_ATTEMPTS } from '@voyyaa/shared';

export type StartBlockState = 'blocked' | 'failing' | 'none';

export interface StartBlockSource {
  start_failed_attempts: number;
  start_blocked_at: string | null;
}

export const START_CODE_MAX_ATTEMPTS = START_CODE_MAX_FAILED_ATTEMPTS;

export function startBlockState(source: StartBlockSource): StartBlockState {
  if (source.start_blocked_at !== null) return 'blocked';
  return source.start_failed_attempts > 0 ? 'failing' : 'none';
}
