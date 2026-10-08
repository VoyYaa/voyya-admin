import type { CSSProperties, JSX } from 'react';

export interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 16, className = '' }: SpinnerProps): JSX.Element {
  const style = { '--s': `${size}px` } as CSSProperties;
  return <span aria-hidden="true" className={`vy-spinner ${className}`} style={style} />;
}
