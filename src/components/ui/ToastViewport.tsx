import type { JSX } from 'react';
import { useToastStore, type ToastMessage } from '../../state/toast-store';

const TONE_CLASS: Record<ToastMessage['tone'], { rail: string; dot: string }> = {
  success: { rail: 'border-l-success', dot: 'bg-success' },
  danger: { rail: 'border-l-danger', dot: 'bg-danger' },
  info: { rail: 'border-l-info', dot: 'bg-info' },
};

export function ToastViewport(): JSX.Element {
  const toasts = useToastStore((s) => s.toasts);
  const dismissToast = useToastStore((s) => s.dismissToast);

  return (
    <div
      role="region"
      aria-live="polite"
      className="pointer-events-none print:hidden fixed bottom-4 right-4 z-[60] flex flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`vy-toast pointer-events-auto flex items-center gap-3 rounded-md border border-l-rail border-border-input bg-surface py-1 pl-4 pr-1 text-body text-text ${TONE_CLASS[toast.tone].rail}`}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 shrink-0 rounded-full ${TONE_CLASS[toast.tone].dot}`}
          />
          <span className="py-2">{toast.message}</span>
          <button
            type="button"
            data-compact-chrome
            onClick={() => dismissToast(toast.id)}
            aria-label="Cerrar aviso"
            className="focus-ring flex h-tap-compact w-tap-compact shrink-0 items-center justify-center rounded-sm text-small text-text-muted hover:text-text"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
