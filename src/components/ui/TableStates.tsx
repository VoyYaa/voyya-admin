import type { JSX } from 'react';

export interface SkeletonRowsProps {
  columnCount: number;
  rowCount?: number;
}

export function SkeletonRows({ columnCount, rowCount = 6 }: SkeletonRowsProps): JSX.Element {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <tr key={rowIndex} className="h-row-md border-b border-border">
          {Array.from({ length: columnCount }).map((_unusedColumn, columnIndex) => {
            const widths = ['w-1/2', 'w-3/4', 'w-2/3', 'w-1/3'];
            return (
              <td key={columnIndex} className="px-4 py-2">
                <div
                  className={`h-3 ${widths[columnIndex % widths.length]} animate-pulse rounded-xs bg-bg-shell motion-reduce:animate-none`}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

export interface EmptyPanelProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyPanel({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyPanelProps): JSX.Element {
  return (
    <div className="mx-auto my-12 flex max-w-sm flex-col items-center gap-3 rounded-md border border-border bg-surface-sunken px-6 py-10 text-center">
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
        className="text-text-muted"
      >
        <rect x="8" y="10" width="24" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 18h24" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="14" cy="14" r="1.5" fill="currentColor" />
      </svg>
      <p className="text-body font-medium text-text">{title}</p>
      {description && <p className="text-small text-text-muted">{description}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="focus-ring mt-2 rounded-sm bg-amber px-4 py-2 text-btn font-display text-on-brand hover:bg-amber-deep"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export interface ErrorPanelProps {
  title: string;
  onRetry: () => void;
}

export function ErrorPanel({ title, onRetry }: ErrorPanelProps): JSX.Element {
  return (
    <div
      role="alert"
      className="mx-auto my-12 flex max-w-sm flex-col items-center gap-3 rounded-md border border-border bg-surface-sunken px-6 py-10 text-center"
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
        className="text-danger"
      >
        <circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="1.5" />
        <path d="M20 13v9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="20" cy="27" r="1.4" fill="currentColor" />
      </svg>
      <p className="text-body font-medium text-text">{title}</p>
      <button
        type="button"
        onClick={onRetry}
        className="focus-ring rounded-sm border border-border px-4 py-2 text-btn font-display text-text hover:bg-bg-shell"
      >
        Reintentar
      </button>
    </div>
  );
}
