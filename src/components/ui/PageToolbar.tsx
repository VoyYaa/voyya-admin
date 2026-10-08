import type { JSX, ReactNode } from 'react';

export interface PageToolbarProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function PageToolbar({ eyebrow, title, subtitle, children }: PageToolbarProps): JSX.Element {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-surface px-6 py-3">
      <div>
        <p className="vy-eyebrow">{eyebrow}</p>
        <h1 className="font-display text-display text-text">{title}</h1>
        {subtitle && <p className="text-small text-text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
