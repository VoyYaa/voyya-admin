import { useMemo, useRef, useState, type JSX } from 'react';
import { useSearchParams } from 'react-router-dom';
import { REQUIRED_COMPANY_DOCUMENT_TYPES, type CompanyDocumentType } from '@voyyaa/shared';
import { replaceAffiliationDocument, uploadAffiliationDocument } from '../../api/affiliation.api';
import { domainErrorCode, isNetworkError } from '../../api/errors';
import { PublicPageShell } from '../../components/public/PublicPageShell';
import {
  AFFILIATION_DOCUMENTS_RELOAD_COPY,
  AFFILIATION_ERROR_MESSAGES,
  AFFILIATION_LINK_ERROR_COPY,
} from '../../copy/affiliation';
import { useNetworkOnline } from '../../hooks/useNetworkOnline';
import { readAffiliationToken } from '../../lib/affiliation-token';
import { validateDocumentFileClientSide } from '../../lib/document-slots';
import { COMPANY_DOCUMENT_TYPE_LABELS } from '../../lib/status-maps';

type RowStatus = 'idle' | 'working' | 'saved' | 'error';

interface RowState {
  fileName: string | null;
  status: RowStatus;
  errorMessage: string | null;
}

function initialRows(): Record<CompanyDocumentType, RowState> {
  return REQUIRED_COMPANY_DOCUMENT_TYPES.reduce(
    (acc, type) => {
      acc[type] = { fileName: null, status: 'idle', errorMessage: null };
      return acc;
    },
    {} as Record<CompanyDocumentType, RowState>,
  );
}

function LinkErrorScreen({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <PublicPageShell>
      <div className="mx-auto max-w-lg py-10 text-center">
        <p className="mb-2 text-eyebrow uppercase text-amber-ink dark:text-amber">
          {AFFILIATION_DOCUMENTS_RELOAD_COPY.eyebrow}
        </p>
        <h1 role="alert" className="mb-3 text-title font-display text-text">
          {title}
        </h1>
        <p className="text-body text-text-muted">{body}</p>
      </div>
    </PublicPageShell>
  );
}

export function AffiliationDocumentsPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const online = useNetworkOnline();
  const token = searchParams.get('token');
  const tokenState = useMemo(() => readAffiliationToken(token), [token]);
  const [rows, setRows] = useState<Record<CompanyDocumentType, RowState>>(initialRows);
  const [linkFailure, setLinkFailure] = useState<'AFFILIATION_LINK_INVALID' | 'AFFILIATION_LINK_EXPIRED' | null>(
    null,
  );

  const setRow = (type: CompanyDocumentType, patch: Partial<RowState>): void => {
    setRows((current) => ({ ...current, [type]: { ...current[type], ...patch } }));
  };

  if (linkFailure) {
    const key = linkFailure === 'AFFILIATION_LINK_EXPIRED' ? 'expired' : 'malformed';
    return <LinkErrorScreen {...AFFILIATION_LINK_ERROR_COPY[key]} />;
  }

  if (tokenState.kind !== 'valid') {
    return <LinkErrorScreen {...AFFILIATION_LINK_ERROR_COPY[tokenState.kind]} />;
  }

  const companyId = tokenState.companyId;
  const activeToken = token as string;

  const onFileSelected = async (type: CompanyDocumentType, file: File): Promise<void> => {
    const clientError = validateDocumentFileClientSide(file);
    if (clientError) {
      setRow(type, { status: 'error', errorMessage: clientError, fileName: file.name });
      return;
    }
    setRow(type, { status: 'working', errorMessage: null, fileName: file.name });
    try {
      const uploaded = await uploadAffiliationDocument(file);
      const saved = await replaceAffiliationDocument(companyId, activeToken, {
        type,
        storage_key: uploaded.storage_key,
      });
      setRow(type, { status: 'saved', fileName: saved.file_name, errorMessage: null });
    } catch (error) {
      if (isNetworkError(error)) {
        setRow(type, {
          status: 'error',
          errorMessage: 'Sin conexión · no se pudo subir el archivo.',
        });
        return;
      }
      const code = domainErrorCode(error);
      if (code === 'AFFILIATION_LINK_INVALID' || code === 'AFFILIATION_LINK_EXPIRED') {
        setLinkFailure(code);
        return;
      }
      setRow(type, {
        status: 'error',
        errorMessage:
          (code && AFFILIATION_ERROR_MESSAGES[code as keyof typeof AFFILIATION_ERROR_MESSAGES]) ||
          'No pudimos guardar el documento. Intenta de nuevo.',
      });
    }
  };

  const allSaved = REQUIRED_COMPANY_DOCUMENT_TYPES.every((type) => rows[type].status === 'saved');

  return (
    <PublicPageShell>
      <div className="mx-auto max-w-2xl">
        <p className="mb-1 text-eyebrow uppercase text-amber-ink dark:text-amber">
          {AFFILIATION_DOCUMENTS_RELOAD_COPY.eyebrow}
        </p>
        <h1 className="mb-2 text-display font-display text-text">
          {AFFILIATION_DOCUMENTS_RELOAD_COPY.title}
        </h1>
        <p className="mb-6 max-w-[60ch] text-body text-text-muted">
          {AFFILIATION_DOCUMENTS_RELOAD_COPY.lede}
        </p>

        {!online && (
          <p
            role="alert"
            className="mb-4 rounded-xs bg-danger-tint px-3 py-2 text-body text-danger-ink"
          >
            Sin conexión · no se pueden subir documentos ahora.
          </p>
        )}

        {allSaved && (
          <p
            role="status"
            className="mb-4 rounded-xs bg-success/10 px-3 py-2 text-body text-success-ink dark:text-success-ink-dark"
          >
            {AFFILIATION_DOCUMENTS_RELOAD_COPY.allSaved}
          </p>
        )}

        <div className="space-y-3 rounded-md border border-border bg-surface p-6">
          {REQUIRED_COMPANY_DOCUMENT_TYPES.map((type) => (
            <ReplaceDocumentRow
              key={type}
              documentType={type}
              label={COMPANY_DOCUMENT_TYPE_LABELS[type]}
              row={rows[type]}
              disabled={!online}
              onFileSelected={(file) => void onFileSelected(type, file)}
            />
          ))}
        </div>
      </div>
    </PublicPageShell>
  );
}

interface ReplaceDocumentRowProps {
  documentType: CompanyDocumentType;
  label: string;
  row: RowState;
  disabled: boolean;
  onFileSelected: (file: File) => void;
}

function ReplaceDocumentRow({
  documentType,
  label,
  row,
  disabled,
  onFileSelected,
}: ReplaceDocumentRowProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputId = `${documentType}-file`;

  return (
    <div
      className={`flex items-center gap-3 rounded-item border p-3 ${
        row.status === 'saved'
          ? 'border-success/40 bg-success/10'
          : row.status === 'error'
            ? 'border-danger/40 bg-danger-tint'
            : 'border-dashed border-border-input bg-bg'
      }`}
    >
      <span className="flex-1">
        <p className="text-body font-medium text-text">{label}</p>
        {row.fileName && <p className="text-small text-text-muted">{row.fileName}</p>}
        {row.status === 'working' && <p className="text-small text-text-muted">Subiendo…</p>}
        {row.status === 'saved' && <p className="text-small text-success-ink dark:text-success-ink-dark">Actualizado</p>}
        {row.status === 'error' && row.errorMessage && (
          <p role="alert" className="text-small text-danger-ink dark:text-danger-ink-dark">
            {row.errorMessage}
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
        disabled={disabled || row.status === 'working'}
        onClick={() => inputRef.current?.click()}
        className="focus-ring h-tap shrink-0 rounded-sm border border-border-input bg-surface px-3 text-btn font-display text-text hover:bg-bg-shell disabled:cursor-not-allowed disabled:opacity-60"
      >
        {row.status === 'working'
          ? 'Subiendo…'
          : row.status === 'saved'
            ? 'Reemplazar'
            : row.status === 'error'
              ? 'Reintentar'
              : 'Subir archivo'}
      </button>
    </div>
  );
}
