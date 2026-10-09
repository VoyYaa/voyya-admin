import * as Dialog from '@radix-ui/react-dialog';
import type { JSX, ReactNode } from 'react';
import { COMMON_COPY } from '../../copy/common';
import { useRestoreFocus } from '../../hooks/useRestoreFocus';

export interface DetailDrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function DetailDrawer({ open, title, onClose, children }: DetailDrawerProps): JSX.Element {
  const restoreFocus = useRestoreFocus(open);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="vy-overlay fixed inset-0 z-40 bg-espresso/40" />
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={restoreFocus}
          className="vy-drawer fixed inset-y-0 right-0 z-40 flex w-full min-w-[360px] max-w-[420px] flex-col rounded-l-md border-l-rail border-l-amber bg-surface focus:outline-none"
        >
          <div className="flex items-center justify-between bg-frame-bg px-6 py-4">
            <Dialog.Title className="font-display text-title text-frame-text">{title}</Dialog.Title>
            <Dialog.Close className="focus-ring inline-flex h-tap items-center rounded-sm px-3 text-btn text-frame-text-muted hover:text-frame-text">
              {COMMON_COPY.close}
            </Dialog.Close>
          </div>
          <div tabIndex={0} className="focus-ring flex-1 overflow-y-auto px-6 py-4">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
