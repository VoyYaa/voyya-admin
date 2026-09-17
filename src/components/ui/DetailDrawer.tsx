import { useEffect, useRef, type JSX, type ReactNode } from 'react';

export interface DetailDrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function DetailDrawer({
  open,
  title,
  onClose,
  children,
}: DetailDrawerProps): JSX.Element | null {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    titleRef.current?.focus();

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'Tab' && containerRef.current) {
        const focusables = getFocusableElements(containerRef.current);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Cerrar panel"
        onClick={onClose}
        className="absolute inset-0 bg-espresso/30"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-drawer-title"
        className="relative flex h-full w-full max-w-[420px] min-w-[360px] flex-col rounded-l-md bg-surface shadow-overlay-lg"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2
            id="detail-drawer-title"
            ref={titleRef}
            tabIndex={-1}
            className="text-title font-display text-text focus:outline-none"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-sm px-2 py-1 text-small text-text-muted hover:text-text"
          >
            Cerrar
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
