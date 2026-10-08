import type { JSX, ReactNode } from 'react';
import { formatClockTime } from '../../lib/time';

export interface TimelineItem {
  label: string;
  timestamp: string | null;
  id?: string | number;
  done?: boolean;
  detail?: ReactNode;
  formatTimestamp?: (iso: string) => string;
}

export interface TimelineProps {
  items: TimelineItem[];
}

export function Timeline({ items }: TimelineProps): JSX.Element {
  return (
    <ol className="relative pl-6">
      <span
        aria-hidden="true"
        className="vy-draw-line absolute bottom-2 left-[5px] top-2 w-0.5 bg-amber/55"
      />
      {items.map((item) => (
        <li key={item.id ?? item.label} className="relative pb-4 last:pb-0">
          <span
            aria-hidden="true"
            className={`absolute -left-[24px] top-1 h-3 w-3 rounded-full border-2 ${
              item.timestamp || item.done
                ? 'border-success bg-success'
                : 'border-border-control bg-surface'
            }`}
          />
          <p className="text-small text-text-muted">{item.label}</p>
          {item.timestamp && (
            <p className="text-numeric text-body text-text">
              {(item.formatTimestamp ?? formatClockTime)(item.timestamp)}
            </p>
          )}
          {item.detail}
        </li>
      ))}
    </ol>
  );
}
