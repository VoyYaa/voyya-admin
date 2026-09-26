import type { JSX } from 'react';
import { useToastStore } from '../../state/toast-store';

export function ToastViewport(): JSX.Element {
  const toasts = useToastStore((s) => s.toasts);
  const dismissToast = useToastStore((s) => s.dismissToast);

  return (
    <div
      role="region"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 rounded-md border-t border-r border-b border-l-[3px] border-t-border-input border-r-border-input border-b-border-input bg-surface px-4 py-3 text-body text-text ${
            toast.tone === 'success' ? 'border-l-success' : 'border-l-danger'
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 shrink-0 rounded-full ${
              toast.tone === 'success' ? 'bg-success' : 'bg-danger'
            }`}
          />
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Cerrar aviso"
            className="focus-ring rounded-sm text-small text-text-muted hover:text-text"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
