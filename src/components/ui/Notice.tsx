import type { JSX, ReactNode } from 'react';

export type NoticeTone = 'danger' | 'info' | 'warning' | 'success';

export interface NoticeProps {
  tone: NoticeTone;
  children: ReactNode;
  role?: 'alert' | 'status' | 'note';
  action?: ReactNode;
  leading?: ReactNode;
  className?: string;
}

const TONE_CLASS: Record<NoticeTone, string> = {
  danger:
    'border-danger/40 bg-danger-tint text-danger-ink dark:bg-danger/15 dark:text-danger-ink-dark',
  info: 'border-info/40 bg-info-tint text-info-ink dark:bg-info/15 dark:text-info-ink-dark',
  warning: 'border-amber/50 bg-amber/10 text-text',
  success:
    'border-success/40 bg-success-tint text-success-ink dark:bg-success/15 dark:text-success-ink-dark',
};

export function Notice({
  tone,
  children,
  role,
  action,
  leading,
  className = '',
}: NoticeProps): JSX.Element {
  return (
    <div
      role={role}
      className={`flex flex-wrap items-center gap-3 rounded-xs border px-3 py-2.5 text-body ${TONE_CLASS[tone]} ${className}`}
    >
      {leading}
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}
