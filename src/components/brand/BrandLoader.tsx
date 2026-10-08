import type { CSSProperties, JSX } from 'react';
import { COMMON_COPY } from '../../copy/common';
import { useElapsedFlag } from '../../hooks/useElapsedFlag';

const SLOW_AFTER_MS = 4000;

export interface BrandLoaderProps {
  variant?: 'frame' | 'inline';
  size?: number;
  label?: string;
  slowLabel?: string;
}

export function BrandLoader({
  variant = 'inline',
  size = 64,
  label = COMMON_COPY.loading,
  slowLabel = COMMON_COPY.stillLoading,
}: BrandLoaderProps): JSX.Element {
  const slow = useElapsedFlag(true, SLOW_AFTER_MS);
  const markStyle = { '--s': `${size}px` } as CSSProperties;
  const discSize = Math.round(size * 1.5);
  const labelClass = variant === 'frame' ? 'text-frame-text-muted' : 'text-text-muted';

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="brand-loader"
      className="flex flex-col items-center gap-4"
    >
      <span
        aria-hidden="true"
        className={
          variant === 'inline'
            ? 'flex items-center justify-center rounded-full bg-espresso'
            : 'flex items-center justify-center'
        }
        style={variant === 'inline' ? { width: discSize, height: discSize } : undefined}
      >
        <span className="vy-mark" style={markStyle}>
          <i />
        </span>
      </span>
      <p className={`text-small ${labelClass}`}>{slow ? slowLabel : label}</p>
    </div>
  );
}
