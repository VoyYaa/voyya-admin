import { useMemo, useState, type JSX } from 'react';
import { useSearchParams } from 'react-router-dom';
import { REQUIRED_COMPANY_DOCUMENT_TYPES, type CompanyDocumentType } from '@voyyaa/shared';
import { replaceAffiliationDocument, uploadAffiliationDocument } from '../../api/affiliation.api';
import { domainErrorCode, isNetworkError } from '../../api/errors';
import { StateGlyph } from '../../components/brand/StateGlyph';
import { DocumentSlotCard } from '../../components/documents/DocumentSlotCard';
import { PublicPageShell } from '../../components/public/PublicPageShell';
import { Notice } from '../../components/ui/Notice';
import {
  AFFILIATION_DOCUMENTS_RELOAD_COPY,
  AFFILIATION_ERROR_MESSAGES,
  AFFILIATION_LINK_ERROR_COPY,
} from '../../copy/affiliation';
import { useNetworkOnline } from '../../hooks/useNetworkOnline';
import { readAffiliationToken } from '../../lib/affiliation-token';
import {
  createInitialDocumentSlot,
  validateDocumentFileClientSide,
  type DocumentSlot,
} from '../../lib/document-slots';
import { COMPANY_DOCUMENT_TYPE_LABELS } from '../../lib/status-maps';

type DocumentSlots = Record<CompanyDocumentType, DocumentSlot>;

function initialSlots(): DocumentSlots {
  return REQUIRED_COMPANY_DOCUMENT_TYPES.reduce((acc, type) => {
    acc[type] = createInitialDocumentSlot();
    return acc;
  }, {} as DocumentSlots);
}

function LinkErrorScreen({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <PublicPageShell
      hero={{ eyebrow: AFFILIATION_DOCUMENTS_RELOAD_COPY.eyebrow, title, role: 'alert' }}
    >
      <div className="mx-auto flex max-w-4xl items-start gap-5">
        <StateGlyph glyph="error" size={72} />
        <p className="max-w-[56ch] pt-2 text-lede text-text-muted">{body}</p>
      </div>
    </PublicPageShell>
  );
}

export function AffiliationDocumentsPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const online = useNetworkOnline();
  const token = searchParams.get('token');
  const tokenState = useMemo(() => readAffiliationToken(token), [token]);
  const [slots, setSlots] = useState<DocumentSlots>(initialSlots);
  const [linkFailure, setLinkFailure] = useState<
    'AFFILIATION_LINK_INVALID' | 'AFFILIATION_LINK_EXPIRED' | null
  >(null);

  const setSlot = (type: CompanyDocumentType, patch: Partial<DocumentSlot>): void => {
    setSlots((current) => ({ ...current, [type]: { ...current[type], ...patch } }));
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
      setSlot(type, { status: 'error', errorMessage: clientError, fileName: file.name });
      return;
    }
    setSlot(type, { status: 'uploading', errorMessage: null, fileName: file.name });
    try {
      const uploaded = await uploadAffiliationDocument(file);
      await replaceAffiliationDocument(companyId, activeToken, {
        type,
        storage_key: uploaded.storage_key,
      });
      setSlot(type, { status: 'uploaded', errorMessage: null });
    } catch (error) {
      if (isNetworkError(error)) {
        setSlot(type, {
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
      setSlot(type, {
        status: 'error',
        errorMessage:
          (code && AFFILIATION_ERROR_MESSAGES[code as keyof typeof AFFILIATION_ERROR_MESSAGES]) ||
          'No pudimos guardar el documento. Intenta de nuevo.',
      });
    }
  };

  const allSaved = REQUIRED_COMPANY_DOCUMENT_TYPES.every(
    (type) => slots[type].status === 'uploaded',
  );

  return (
    <PublicPageShell
      hero={{
        eyebrow: AFFILIATION_DOCUMENTS_RELOAD_COPY.eyebrow,
        title: AFFILIATION_DOCUMENTS_RELOAD_COPY.title,
        lede: AFFILIATION_DOCUMENTS_RELOAD_COPY.lede,
      }}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        {!online && (
          <Notice tone="info" role="alert" leading={<StateGlyph glyph="offline" size={28} />}>
            Sin conexión · no se pueden subir documentos ahora.
          </Notice>
        )}

        {allSaved && (
          <Notice
            tone="success"
            role="status"
            leading={<StateGlyph glyph="success" size={28} animate />}
          >
            {AFFILIATION_DOCUMENTS_RELOAD_COPY.allSaved}
          </Notice>
        )}

        <div className="grid grid-cols-1 gap-3 border-t border-border pt-4 md:grid-cols-2">
          {REQUIRED_COMPANY_DOCUMENT_TYPES.map((type) => (
            <DocumentSlotCard
              key={type}
              documentType={type}
              label={COMPANY_DOCUMENT_TYPE_LABELS[type]}
              slot={slots[type]}
              disabled={!online}
              expiryMode="hidden"
              uploadedNote="Actualizado"
              errorActionLabel="Reintentar"
              onFileSelected={(file) => void onFileSelected(type, file)}
            />
          ))}
        </div>
      </div>
    </PublicPageShell>
  );
}
