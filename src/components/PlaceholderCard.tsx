import type { JSX } from 'react';

export interface PlaceholderCardProps {
  title: string;
  description: string;
}

export function PlaceholderCard({ title, description }: PlaceholderCardProps): JSX.Element {
  return (
    <div className="rounded-2xl border border-amber/20 bg-white/60 p-5 opacity-80 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-espresso">{title}</h3>
        <span className="whitespace-nowrap rounded-full bg-amber/15 px-2.5 py-0.5 text-xs font-medium text-amber-deep">
          Próximo ciclo
        </span>
      </div>
      <p className="text-sm text-espresso/70">{description}</p>
    </div>
  );
}
