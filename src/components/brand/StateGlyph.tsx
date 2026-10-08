import type { JSX } from 'react';

export type StateGlyphName = 'empty' | 'error' | 'offline' | 'success';

export interface StateGlyphProps {
  glyph: StateGlyphName;
  size?: number;
  animate?: boolean;
}

const TONE_CLASS: Record<StateGlyphName, string> = {
  empty: 'text-text-subtle',
  error: 'text-danger-ink dark:text-danger-ink-dark',
  offline: 'text-info-ink dark:text-info-ink-dark',
  success: 'text-success-ink dark:text-success-ink-dark',
};

const RING_PROPS = { cx: 32, cy: 32, r: 24, fill: 'none', stroke: 'currentColor', strokeWidth: 4 };

function GlyphShapes({ glyph, animate }: { glyph: StateGlyphName; animate: boolean }): JSX.Element {
  const strokeClass = animate ? 'vy-stroke' : undefined;
  if (glyph === 'empty') {
    return (
      <>
        <circle {...RING_PROPS} strokeDasharray="5 7" strokeLinecap="round" />
        <circle cx="32" cy="32" r="9" fill="currentColor" opacity="0.45" />
      </>
    );
  }
  if (glyph === 'error') {
    return (
      <>
        <circle
          {...RING_PROPS}
          strokeDasharray="113 38"
          strokeLinecap="round"
          transform="rotate(-60 32 32)"
        />
        <path d="M32 22V35" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <circle cx="32" cy="42" r="2.5" fill="currentColor" />
      </>
    );
  }
  if (glyph === 'offline') {
    return (
      <>
        <circle {...RING_PROPS} />
        <path d="M16 16L48 48" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <circle cx="32" cy="32" r="9" fill="currentColor" opacity="0.45" />
      </>
    );
  }
  return (
    <>
      <circle {...RING_PROPS} pathLength={1} className={strokeClass} />
      <path
        d="M21 33L29 41L44 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className={animate ? 'vy-stroke vy-stroke-late' : undefined}
      />
    </>
  );
}

export function StateGlyph({ glyph, size = 64, animate = false }: StateGlyphProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${TONE_CLASS[glyph]}`}
    >
      <GlyphShapes glyph={glyph} animate={animate} />
    </svg>
  );
}
