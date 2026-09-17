import type { JSX } from 'react';
import { formatClockTime } from '../../lib/time';

export interface TimelineItem {
  label: string;
  timestamp: string | null;
}

export interface TimelineProps {
  items: TimelineItem[];
}

export function Timeline({ items }: TimelineProps): JSX.Element {
  return (
    <ol className="relative border-l-2 border-border pl-4">
      {items.map((item) => (
        <li key={item.label} className="relative pb-4 last:pb-0">
          <span
            aria-hidden="true"
            className={`absolute -left-[21px] top-0.5 h-3 w-3 rounded-full border-2 ${
              item.timestamp ? 'border-success bg-success' : 'border-border bg-surface'
            }`}
          />
          <p className="text-small text-text-muted">{item.label}</p>
          {item.timestamp && (
            <p className="text-numeric text-body text-text">{formatClockTime(item.timestamp)}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
