import * as Dialog from '@radix-ui/react-dialog';
import type { JSX, ReactNode } from 'react';
import { useRestoreFocus } from '../../hooks/useRestoreFocus';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmDisabled?: boolean;
  confirmTone?: 'primary' | 'danger';
  confirming?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  confirmDisabled = false,
  confirmTone = 'primary',
  confirming = false,
}: ConfirmDialogProps): JSX.Element {
  const restoreFocus = useRestoreFocus(open);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="vy-overlay fixed inset-0 z-50 bg-espresso/60" />
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={restoreFocus}
          className="vy-dialog fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-sm border border-border-input border-t-rail border-t-amber bg-surface p-6 focus:outline-none"
        >
          <Dialog.Title className="mb-3 font-display text-title text-text">{title}</Dialog.Title>
          <div className="mb-6 text-body text-text">{children}</div>
          <div className="flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="ghost">{cancelLabel}</Button>
            </Dialog.Close>
            <Button
              variant={confirmTone}
              onClick={onConfirm}
              disabled={confirmDisabled}
              loading={confirming}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
