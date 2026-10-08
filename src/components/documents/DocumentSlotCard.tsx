import { useRef, type JSX } from 'react';
import { COMMON_COPY } from '../../copy/common';
import type { DocumentSlot } from '../../lib/document-slots';
import { Button } from '../ui/Button';
import { ProgressRail } from '../ui/ProgressRail';

export type ExpiryMode = 'optional' | 'required' | 'hidden';

interface DocumentSlotCardProps {
  documentType: string;
  label: string;
  slot: DocumentSlot;
  disabled: boolean;
  onFileSelected: (file: File) => void;
  onDateChange?: (field: 'issuedAt' | 'expiresAt', value: string) => void;
  expiryMode?: ExpiryMode;
  uploadedNote?: string;
  errorActionLabel?: string;
}

const EXPIRY_LABELS: Record<Exclude<ExpiryMode, 'hidden'>, string> = {
  optional: 'Vence (opcional)',
  required: 'Vence',
};

const SURFACE_CLASS: Record<DocumentSlot['status'], string> = {
  idle: 'border-dashed border-border-control bg-bg',
  uploading: 'border-dashed border-border-control bg-bg',
  uploaded: 'border-success/50 bg-success-tint dark:bg-success/15',
  error: 'border-danger/50 bg-danger-tint dark:bg-danger/15',
};

function actionLabel(slot: DocumentSlot, errorActionLabel: string): string {
  if (slot.status === 'uploaded') return 'Reemplazar';
  if (slot.status === 'uploading') return COMMON_COPY.uploading;
  if (slot.status === 'error') return errorActionLabel;
  return 'Subir archivo';
}

export function DocumentSlotCard({
  documentType,
  label,
  slot,
  disabled,
  onFileSelected,
  onDateChange,
  expiryMode = 'optional',
  uploadedNote,
  errorActionLabel = 'Subir archivo',
}: DocumentSlotCardProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputId = `${documentType}-file`;
  const expiresInputId = `${documentType}-expires`;
  const showExpiry =
    expiryMode !== 'hidden' && (slot.status === 'uploaded' || slot.status === 'error');

  return (
    <div
      className={`flex flex-col gap-2.5 rounded-item border-2 p-3 ${SURFACE_CLASS[slot.status]}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex-1">
          <p className="text-body font-bold text-text">{label}</p>
          {slot.fileName && <p className="text-small text-text-muted">{slot.fileName}</p>}
          {slot.status === 'uploaded' && uploadedNote && (
            <p className="text-small font-semibold text-success-ink dark:text-success-ink-dark">
              {uploadedNote}
            </p>
          )}
          {slot.status === 'error' && slot.errorMessage && (
            <p
              role="alert"
              className="text-small font-semibold text-danger-ink dark:text-danger-ink-dark"
            >
              {slot.errorMessage}
            </p>
          )}
        </span>
        <input
          ref={inputRef}
          id={fileInputId}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFileSelected(file);
            event.target.value = '';
          }}
          aria-label={`Subir archivo de ${label}`}
        />
        <Button
          variant="ghost"
          disabled={disabled || slot.status === 'uploading'}
          onClick={() => inputRef.current?.click()}
        >
          {actionLabel(slot, errorActionLabel)}
        </Button>
      </div>

      {slot.status === 'uploading' && <ProgressRail label={COMMON_COPY.uploading} />}

      {showExpiry && onDateChange && (
        <div className="flex flex-wrap items-center gap-3">
          <label
            className="w-32 shrink-0 text-small font-semibold text-text-muted"
            htmlFor={expiresInputId}
          >
            {EXPIRY_LABELS[expiryMode as Exclude<ExpiryMode, 'hidden'>]}
          </label>
          <input
            id={expiresInputId}
            type="date"
            value={slot.expiresAt}
            disabled={disabled}
            onChange={(event) => onDateChange('expiresAt', event.target.value)}
            className="vy-input w-auto flex-1 text-numeric"
          />
        </div>
      )}
    </div>
  );
}
