import * as Dialog from '@radix-ui/react-dialog';
import type { JSX } from 'react';
import { RATES_COPY } from '../../copy/rates';
import { useRestoreFocus } from '../../hooks/useRestoreFocus';
import type { DiffRow } from '../../lib/version-diff';
import { Button } from '../ui/Button';
import { DiffTable } from '../ui/DiffTable';

export interface ConflictDialogProps {
  open: boolean;
  message: string;
  rows: readonly DiffRow[];
  onClose: () => void;
  onUseMine: () => void;
  onDiscardMine: () => void;
}

export function ConflictDialog({
  open,
  message,
  rows,
  onClose,
  onUseMine,
  onDiscardMine,
}: ConflictDialogProps): JSX.Element {
  const restoreFocus = useRestoreFocus(open);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="vy-overlay fixed inset-0 z-50 bg-espresso/60" />
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={restoreFocus}
          className="vy-dialog fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-sm border border-border-input border-t-rail border-t-amber bg-surface p-6 focus:outline-none"
        >
          <Dialog.Title className="mb-3 font-display text-title text-text">
            {RATES_COPY.conflictTitle}
          </Dialog.Title>
          <div className="mb-6 flex flex-col gap-3 text-body text-text">
            <p>{message}</p>
            <DiffTable
              rows={rows}
              beforeLabel={RATES_COPY.currentValues}
              afterLabel={RATES_COPY.yourChanges}
              caption={RATES_COPY.conflictTitle}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="ghost" onClick={onDiscardMine}>
              {RATES_COPY.discardMine}
            </Button>
            <Button onClick={onUseMine}>{RATES_COPY.useMine}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
