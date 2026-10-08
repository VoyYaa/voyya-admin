import type { JSX } from 'react';

export function Wordmark(): JSX.Element {
  return (
    <>
      <span
        aria-hidden="true"
        className="relative inline-flex h-3 w-3 shrink-0 rounded-full bg-amber shadow-brand-halo"
      />
      <span className="font-display text-title font-black tracking-tight text-frame-text">
        VoyYa
      </span>
    </>
  );
}
