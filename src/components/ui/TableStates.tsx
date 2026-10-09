import type { JSX } from 'react';
import { COMMON_COPY } from '../../copy/common';
import { StateGlyph, type StateGlyphName } from '../brand/StateGlyph';
import { Button } from './Button';
import { ProgressRail } from './ProgressRail';

export interface SkeletonBlockProps {
  className?: string;
}

export function SkeletonBlock({ className = '' }: SkeletonBlockProps): JSX.Element {
  return <div aria-hidden="true" className={`vy-skeleton rounded-xs ${className}`} />;
}

export interface SkeletonRowsProps {
  columnCount: number;
  rowCount?: number;
}

const SKELETON_WIDTHS = ['w-1/2', 'w-3/4', 'w-2/3', 'w-1/3'];

export function SkeletonRows({ columnCount, rowCount = 6 }: SkeletonRowsProps): JSX.Element {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <tr key={rowIndex} className="h-row-lg border-b border-border">
          {Array.from({ length: columnCount }).map((_unusedColumn, columnIndex) => (
            <td key={columnIndex} className="px-4 py-2">
              <SkeletonBlock
                className={`h-3 ${SKELETON_WIDTHS[(columnIndex + rowIndex) % SKELETON_WIDTHS.length]}`}
              />
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
  glyph?: StateGlyphName;
}

export function EmptyPanel({
  title,
  description,
  actionLabel,
  onAction,
  glyph = 'empty',
}: EmptyPanelProps): JSX.Element {
  return (
    <div className="flex w-full flex-col items-center gap-4 bg-surface-sunken px-6 py-14 text-center">
      <StateGlyph glyph={glyph} />
      <div className="flex flex-col gap-1">
        <p className="text-title font-display text-text">{title}</p>
        {description && <p className="text-body text-text-muted">{description}</p>}
      </div>
      {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}

export interface ErrorPanelProps {
  title: string;
  onRetry?: () => void;
  variant?: 'error' | 'offline';
  retryLabel?: string;
}

export function ErrorPanel({
  title,
  onRetry,
  variant = 'error',
  retryLabel = COMMON_COPY.retry,
}: ErrorPanelProps): JSX.Element {
  return (
    <div
      role="alert"
      className="flex w-full flex-col items-center gap-4 bg-surface-sunken px-6 py-14 text-center"
    >
      <StateGlyph glyph={variant} />
      <p className="text-title font-display text-text">{title}</p>
      {onRetry && (
        <Button variant="ghost" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export interface DetailSkeletonProps {
  rows?: number;
}

export function DetailSkeleton({ rows = 5 }: DetailSkeletonProps): JSX.Element {
  return (
    <div role="status" aria-label={COMMON_COPY.loading} className="flex flex-col gap-5">
      <ProgressRail />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <SkeletonBlock className="h-3 w-1/4" />
          <SkeletonBlock className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}
