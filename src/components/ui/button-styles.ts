export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'md' | 'sm';

const BASE =
  'focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-sm font-body text-btn transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    'border-b-rail border-b-amber-deep bg-amber text-on-brand hover:bg-amber-deep active:translate-y-px motion-reduce:active:translate-y-0',
  secondary:
    'border border-espresso bg-espresso text-crema hover:bg-frame-chip-bg dark:border-border-control',
  danger: 'bg-danger-solid text-white hover:brightness-90',
  ghost: 'border border-border-control bg-transparent text-text hover:bg-bg-shell',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  md: 'h-tap px-4',
  sm: 'h-tap-compact px-3',
};

export function buttonClassName(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra = '',
): string {
  return `${BASE} ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${extra}`.trim();
}
