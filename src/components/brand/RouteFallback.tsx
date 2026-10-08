import type { JSX } from 'react';
import { BrandLoader } from './BrandLoader';

export interface RouteFallbackProps {
  variant?: 'frame' | 'inline';
}

export function RouteFallback({ variant = 'frame' }: RouteFallbackProps): JSX.Element {
  if (variant === 'inline') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <BrandLoader />
      </div>
    );
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-frame-bg">
      <BrandLoader variant="frame" size={72} />
    </div>
  );
}
