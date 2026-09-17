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
          {Array.from({ length: columnCount }).map((_unusedColumn, columnIndex) => (
            <td key={columnIndex} className="px-4 py-2">
              <div className="h-3 w-3/4 animate-pulse rounded-xs bg-bg-shell motion-reduce:animate-none" />
            </td>
          ))}
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
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
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
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center" role="alert">
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
