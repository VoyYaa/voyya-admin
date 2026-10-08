import type { JSX } from 'react';
import { COMMON_COPY } from '../../copy/common';

export interface ProgressRailProps {
  className?: string;
  label?: string;
}

export function ProgressRail({
  className = '',
  label = COMMON_COPY.refreshing,
}: ProgressRailProps): JSX.Element {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuetext={label}
      className={`vy-rail ${className}`}
    />
  );
}
