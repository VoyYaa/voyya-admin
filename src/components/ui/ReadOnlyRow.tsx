import type { JSX, ReactNode } from 'react';

export interface ReadOnlyRowProps {
  label: string;
  helper?: string;
  children: ReactNode;
}

export function ReadOnlyRow({ label, helper, children }: ReadOnlyRowProps): JSX.Element {
  return (
    <div className="flex min-h-row-lg items-center justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <dt>
        <span className="text-body text-text">{label}</span>
        {helper && <span className="block text-small text-text-muted">{helper}</span>}
      </dt>
      <dd className="text-right text-numeric text-body font-bold text-text">{children}</dd>
    </div>
  );
}
