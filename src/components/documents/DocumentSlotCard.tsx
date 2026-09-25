import { useRef, type JSX } from 'react';
import type { DocumentSlot } from '../../lib/document-slots';

interface DocumentSlotCardProps {
  documentType: string;
  label: string;
  slot: DocumentSlot;
  disabled: boolean;
  onFileSelected: (file: File) => void;
  onDateChange: (field: 'issuedAt' | 'expiresAt', value: string) => void;
}

export function DocumentSlotCard({
  documentType,
  label,
  slot,
  disabled,
  onFileSelected,
  onDateChange,
}: DocumentSlotCardProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputId = `${documentType}-file`;
  const expiresInputId = `${documentType}-expires`;

  return (
    <div
      className={`flex flex-col gap-2.5 rounded-item border p-3 ${
        slot.status === 'uploaded'
          ? 'border-success/40 bg-success/10'
          : slot.status === 'error'
            ? 'border-danger/40 bg-danger-tint'
            : 'border-dashed border-border-input bg-bg'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="flex-1">
          <p className="text-body font-medium text-text">{label}</p>
          {slot.fileName && <p className="text-small text-text-muted">{slot.fileName}</p>}
          {slot.status === 'uploading' && <p className="text-small text-text-muted">Subiendo…</p>}
          {slot.status === 'error' && slot.errorMessage && (
            <p role="alert" className="text-small text-danger-ink dark:text-danger-ink-dark">
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
        <button
          type="button"
          disabled={disabled || slot.status === 'uploading'}
          onClick={() => inputRef.current?.click()}
          className="focus-ring h-tap shrink-0 rounded-sm border border-border-input bg-surface px-3 text-btn font-display text-text hover:bg-bg-shell disabled:cursor-not-allowed disabled:opacity-60"
        >
          {slot.status === 'uploaded'
            ? 'Reemplazar'
            : slot.status === 'uploading'
              ? 'Subiendo…'
              : 'Subir archivo'}
        </button>
      </div>

      {(slot.status === 'uploaded' || slot.status === 'error') && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="w-32 shrink-0 text-small text-text-muted" htmlFor={expiresInputId}>
            Vence (opcional)
          </label>
          <input
            id={expiresInputId}
            type="date"
            value={slot.expiresAt}
            disabled={disabled}
            onChange={(event) => onDateChange('expiresAt', event.target.value)}
            className="focus-ring flex-1 rounded-xs border border-border-input bg-surface px-3 py-1.5 text-numeric text-small text-text outline-none"
          />
        </div>
      )}
    </div>
  );
}
