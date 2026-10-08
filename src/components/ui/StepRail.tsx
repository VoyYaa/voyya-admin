import type { JSX } from 'react';
import { STEP_COPY } from '../../copy/common';

export interface StepRailProps {
  steps: readonly string[];
  current: number;
  orientation?: 'horizontal' | 'vertical';
  tone?: 'surface' | 'frame';
}

type StepState = 'done' | 'current' | 'upcoming';

function resolveState(index: number, current: number): StepState {
  if (index < current) return 'done';
  return index === current ? 'current' : 'upcoming';
}

const NODE_CLASS: Record<StepState, string> = {
  done: 'border-amber bg-amber text-on-brand',
  current: 'vy-node-current border-amber bg-espresso text-crema',
  upcoming: 'border-border-control bg-surface text-text-muted',
};

const STATE_HINT: Record<StepState, string> = {
  done: ` (${STEP_COPY.done})`,
  current: ` (${STEP_COPY.current})`,
  upcoming: '',
};

function StepNode({ index, state }: { index: number; state: StepState }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-small font-black ${NODE_CLASS[state]}`}
    >
      {state === 'done' ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M2.5 7.5L5.5 10.5L11.5 3.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        index + 1
      )}
    </span>
  );
}

export function StepRail({
  steps,
  current,
  orientation = 'horizontal',
  tone = 'surface',
}: StepRailProps): JSX.Element {
  const horizontal = orientation === 'horizontal';
  const labelClass = tone === 'frame' ? 'text-frame-text' : 'text-text';

  return (
    <ol
      aria-label={STEP_COPY.railLabel}
      data-orientation={orientation}
      className={`vy-steprail ${horizontal ? 'flex items-start justify-between gap-2' : 'flex flex-col gap-6'}`}
    >
      {steps.map((step, index) => {
        const state = resolveState(index, current);
        return (
          <li
            key={step}
            aria-current={state === 'current' ? 'step' : undefined}
            className={`flex items-center gap-3 ${horizontal ? 'flex-1 flex-col text-center' : ''}`}
          >
            <StepNode index={index} state={state} />
            <span
              className={`text-small ${state === 'current' ? 'font-black' : 'font-semibold'} ${labelClass}`}
            >
              {step}
              <span className="sr-only">{STATE_HINT[state]}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
