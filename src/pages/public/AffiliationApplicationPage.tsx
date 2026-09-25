import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useState, type JSX } from 'react';
import { useForm, type UseFormRegister } from 'react-hook-form';
import { z } from 'zod';
import {
  CompanyLegalForm,
  CreateAffiliationApplicationDTO,
  REQUIRED_COMPANY_DOCUMENT_TYPES,
  type AffiliationDocumentInput,
  type AffiliationErrorCode,
  type CompanyDocumentType,
} from '@voyyaa/shared';
import { getAffiliationMunicipalities, submitAffiliationApplication, uploadAffiliationDocument } from '../../api/affiliation.api';
import { domainErrorCode, domainErrorDetails, isNetworkError } from '../../api/errors';
import { DocumentSlotCard } from '../../components/documents/DocumentSlotCard';
import { PublicPageShell } from '../../components/public/PublicPageShell';
import {
  AFFILIATION_CONFLICT_FIELD_MAP,
  AFFILIATION_ERROR_MESSAGES,
  AFFILIATION_FORM_COPY,
  PRIVACY_CONSENT_COPY,
} from '../../copy/affiliation';
import { useAsync } from '../../hooks/useAsync';
import { useNetworkOnline } from '../../hooks/useNetworkOnline';
import { createInitialDocumentSlot, validateDocumentFileClientSide, type DocumentSlot } from '../../lib/document-slots';
import { COMPANY_DOCUMENT_TYPE_LABELS, COMPANY_LEGAL_FORM_LABELS } from '../../lib/status-maps';

const CompanyDetailsDTO = CreateAffiliationApplicationDTO.omit({ documents: true });
type CompanyDetailsForm = z.infer<typeof CompanyDetailsDTO>;

type DocumentSlots = Record<CompanyDocumentType, DocumentSlot>;

function initialSlots(): DocumentSlots {
  return REQUIRED_COMPANY_DOCUMENT_TYPES.reduce((acc, type) => {
    acc[type] = createInitialDocumentSlot();
    return acc;
  }, {} as DocumentSlots);
}

function buildDocumentsPayload(slots: DocumentSlots): AffiliationDocumentInput[] | null {
  const complete = REQUIRED_COMPANY_DOCUMENT_TYPES.every(
    (type) => slots[type].status === 'uploaded' && slots[type].storageKey,
  );
  if (!complete) return null;
  return REQUIRED_COMPANY_DOCUMENT_TYPES.map((type) => {
    const slot = slots[type];
    return {
      type,
      storage_key: slot.storageKey as string,
      issued_at: slot.issuedAt.trim().length > 0 ? slot.issuedAt.trim() : undefined,
      expires_at: slot.expiresAt.trim().length > 0 ? slot.expiresAt.trim() : undefined,
    };
  });
}

const PRIVACY_POLICY_URL = import.meta.env.VITE_PRIVACY_POLICY_URL;

export function AffiliationApplicationPage(): JSX.Element {
  const online = useNetworkOnline();
  const [slots, setSlots] = useState<DocumentSlots>(initialSlots);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  const municipalitiesFetcher = useCallback(() => getAffiliationMunicipalities(), []);
  const {
    data: municipalities,
    status: municipalitiesStatus,
    isInitialLoading: municipalitiesInitialLoading,
    refetch: refetchMunicipalities,
  } = useAsync(municipalitiesFetcher);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isValid },
  } = useForm<CompanyDetailsForm>({
    resolver: zodResolver(CompanyDetailsDTO),
    mode: 'onChange',
    defaultValues: {
      legal_name: '',
      tax_id: '',
      contact_first_name: '',
      contact_last_name: '',
      contact_email: '',
      contact_phone: '',
    },
  });

  const setSlot = (type: CompanyDocumentType, patch: Partial<DocumentSlot>): void => {
    setSlots((current) => ({ ...current, [type]: { ...current[type], ...patch } }));
  };

  const onFileSelected = async (type: CompanyDocumentType, file: File): Promise<void> => {
    setDocumentsError(null);
    const clientError = validateDocumentFileClientSide(file);
    if (clientError) {
      setSlot(type, { status: 'error', errorMessage: clientError, fileName: file.name });
      return;
    }
    setSlot(type, { status: 'uploading', errorMessage: null, fileName: file.name });
    try {
      const uploaded = await uploadAffiliationDocument(file);
      setSlot(type, {
        status: 'uploaded',
        storageKey: uploaded.storage_key,
        fileName: uploaded.file_name,
      });
    } catch (error) {
      const code = domainErrorCode(error);
      const message = isNetworkError(error)
        ? 'Sin conexión · no se pudo subir el archivo.'
        : (code && AFFILIATION_ERROR_MESSAGES[code as AffiliationErrorCode]) ||
          'No pudimos subir el archivo. Intenta de nuevo.';
      setSlot(type, { status: 'error', errorMessage: message });
    }
  };

  const onSubmit = handleSubmit(async (formValues) => {
    setServerError(null);
    setDocumentsError(null);
    setConsentError(null);

    if (!consentAccepted) {
      setConsentError(PRIVACY_CONSENT_COPY.required);
      return;
    }

    const documents = buildDocumentsPayload(slots);
    if (!documents) {
      const missing = REQUIRED_COMPANY_DOCUMENT_TYPES.filter(
        (type) => slots[type].status !== 'uploaded',
      );
      setDocumentsError(
        `Faltan documentos: ${missing.map((type) => COMPANY_DOCUMENT_TYPE_LABELS[type]).join(', ')}.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const created = await submitAffiliationApplication({ ...formValues, documents });
      setSuccessEmail(created.contact_email);
    } catch (error) {
      if (isNetworkError(error)) {
        setServerError('No pudimos enviar la solicitud. Revisa los datos e intenta de nuevo.');
        return;
      }
      const code = domainErrorCode(error);
      const conflict = code ? AFFILIATION_CONFLICT_FIELD_MAP[code as AffiliationErrorCode] : undefined;
      if (conflict) {
        setError(conflict.field, { type: 'server', message: conflict.message });
        return;
      }
      if (code === 'DOCUMENTS_INCOMPLETE') {
        const details = domainErrorDetails<{ missing_documents?: CompanyDocumentType[] }>(error);
        const missing = details?.missing_documents ?? [];
        setDocumentsError(
          missing.length > 0
            ? `Faltan documentos: ${missing.map((type) => COMPANY_DOCUMENT_TYPE_LABELS[type]).join(', ')}.`
            : 'Faltan documentos por cargar.',
        );
        return;
      }
      if (code === 'DOCUMENT_NOT_FOUND') {
        setDocumentsError(AFFILIATION_ERROR_MESSAGES.DOCUMENT_NOT_FOUND);
        return;
      }
      setServerError(
        (code && AFFILIATION_ERROR_MESSAGES[code as AffiliationErrorCode]) ||
          'No pudimos enviar la solicitud. Revisa los datos e intenta de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  });

  if (successEmail) {
    return (
      <PublicPageShell>
        <div className="mx-auto max-w-lg py-10 text-center">
          <p className="mb-2 text-eyebrow uppercase text-amber-ink dark:text-amber">
            {AFFILIATION_FORM_COPY.eyebrow}
          </p>
          <h1 role="status" className="mb-3 text-title font-display text-text">
            {AFFILIATION_FORM_COPY.successTitle}
          </h1>
          <p className="text-body text-text-muted">
            {AFFILIATION_FORM_COPY.successBody(successEmail)}
          </p>
        </div>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell>
      <div className="mx-auto max-w-4xl">
        <p className="mb-1 text-eyebrow uppercase text-amber-ink dark:text-amber">
          {AFFILIATION_FORM_COPY.eyebrow}
        </p>
        <h1 className="mb-2 text-display font-display text-text">{AFFILIATION_FORM_COPY.title}</h1>
        <p className="mb-6 max-w-[70ch] text-body text-text-muted">{AFFILIATION_FORM_COPY.lede}</p>

        {!online && (
          <p
            role="alert"
            className="mb-4 rounded-xs bg-danger-tint px-3 py-2 text-body text-danger-ink"
          >
            Sin conexión · no se puede enviar la solicitud ahora.
          </p>
        )}

        <form onSubmit={onSubmit} noValidate className="space-y-6 pb-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <fieldset
              disabled={submitting}
              className="space-y-4 rounded-md border border-border bg-surface p-6"
            >
              <legend className="mb-2 text-title font-display text-text">Datos de la empresa</legend>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Razón social" htmlFor="legal_name" error={errors.legal_name?.message}>
                  <input
                    id="legal_name"
                    className="focus-ring w-full rounded-xs border border-border-input bg-surface px-3 py-2 text-body text-text outline-none"
                    {...register('legal_name')}
                  />
                </Field>
                <Field label="NIT" htmlFor="tax_id" error={errors.tax_id?.message}>
                  <input
                    id="tax_id"
                    className="focus-ring w-full rounded-xs border border-border-input bg-surface px-3 py-2 text-numeric text-text outline-none"
                    {...register('tax_id')}
                  />
                </Field>
                <Field label="Forma jurídica" htmlFor="legal_form" error={errors.legal_form?.message}>
                  <select
                    id="legal_form"
                    defaultValue=""
                    className="focus-ring h-tap w-full rounded-xs border border-border-input bg-surface px-3 text-body text-text outline-none"
                    {...register('legal_form')}
                  >
                    <option value="" disabled>
                      Elige una opción
                    </option>
                    {CompanyLegalForm.options.map((option) => (
                      <option key={option} value={option}>
                        {COMPANY_LEGAL_FORM_LABELS[option]}
                      </option>
                    ))}
                  </select>
                </Field>
                <MunicipalityField
                  error={errors.municipality_id?.message}
                  status={municipalitiesStatus}
                  isInitialLoading={municipalitiesInitialLoading}
                  rows={municipalities?.rows ?? []}
                  onRetry={refetchMunicipalities}
                  register={register}
                />
                <Field
                  label="Flota declarada (número de vehículos)"
                  htmlFor="vehicle_count"
                  error={errors.vehicle_count?.message}
                >
                  <input
                    id="vehicle_count"
                    type="number"
                    min={1}
                    className="focus-ring w-full rounded-xs border border-border-input bg-surface px-3 py-2 text-numeric text-text outline-none"
                    {...register('vehicle_count', { valueAsNumber: true })}
                  />
                </Field>
              </div>
            </fieldset>

            <fieldset
              disabled={submitting}
              className="space-y-4 rounded-md border border-border bg-surface p-6"
            >
              <legend className="mb-2 text-title font-display text-text">Representante de contacto</legend>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  label="Nombres"
                  htmlFor="contact_first_name"
                  error={errors.contact_first_name?.message}
                >
                  <input
                    id="contact_first_name"
                    className="focus-ring w-full rounded-xs border border-border-input bg-surface px-3 py-2 text-body text-text outline-none"
                    {...register('contact_first_name')}
                  />
                </Field>
                <Field
                  label="Apellidos"
                  htmlFor="contact_last_name"
                  error={errors.contact_last_name?.message}
                >
                  <input
                    id="contact_last_name"
                    className="focus-ring w-full rounded-xs border border-border-input bg-surface px-3 py-2 text-body text-text outline-none"
                    {...register('contact_last_name')}
                  />
                </Field>
                <Field label="Correo" htmlFor="contact_email" error={errors.contact_email?.message}>
                  <input
                    id="contact_email"
                    type="email"
                    className="focus-ring w-full rounded-xs border border-border-input bg-surface px-3 py-2 text-body text-text outline-none"
                    {...register('contact_email')}
                  />
                </Field>
                <Field label="Teléfono" htmlFor="contact_phone" error={errors.contact_phone?.message}>
                  <input
                    id="contact_phone"
                    className="focus-ring w-full rounded-xs border border-border-input bg-surface px-3 py-2 text-numeric text-text outline-none"
                    {...register('contact_phone')}
                  />
                </Field>
              </div>
            </fieldset>
          </div>

          <section className="rounded-md border border-border bg-surface p-6">
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="text-title font-display text-text">Documentos legales</h2>
              <span className="text-small text-text-muted">{AFFILIATION_FORM_COPY.documentsHint}</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {REQUIRED_COMPANY_DOCUMENT_TYPES.map((type) => (
                <DocumentSlotCard
                  key={type}
                  documentType={type}
                  label={COMPANY_DOCUMENT_TYPE_LABELS[type]}
                  slot={slots[type]}
                  disabled={submitting}
                  onFileSelected={(file) => void onFileSelected(type, file)}
                  onDateChange={(field, value) => setSlot(type, { [field]: value })}
                />
              ))}
            </div>
            {documentsError && (
              <p role="alert" className="mt-3 text-small text-danger-ink dark:text-danger-ink-dark">
                {documentsError}
              </p>
            )}
            <p className="mt-3 text-small text-text-muted">
              {REQUIRED_COMPANY_DOCUMENT_TYPES.filter((type) => slots[type].status === 'uploaded').length}{' '}
              de {REQUIRED_COMPANY_DOCUMENT_TYPES.length} documentos cargados
            </p>
          </section>

          <section className="rounded-md border border-border bg-surface p-6">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(event) => {
                  setConsentAccepted(event.target.checked);
                  if (event.target.checked) setConsentError(null);
                }}
                aria-describedby={consentError ? 'consent-error' : undefined}
                className="focus-ring mt-0.5 h-5 w-5 shrink-0 rounded-xs border border-border-input"
              />
              <span className="text-small text-text-muted">
                {PRIVACY_CONSENT_COPY.label}{' '}
                {PRIVACY_POLICY_URL ? (
                  <a
                    href={PRIVACY_POLICY_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring rounded-sm font-medium text-text underline"
                  >
                    {PRIVACY_CONSENT_COPY.linkText}
                  </a>
                ) : null}
              </span>
            </label>
            {consentError && (
              <p id="consent-error" role="alert" className="mt-2 text-small text-danger-ink dark:text-danger-ink-dark">
                {consentError}
              </p>
            )}
          </section>

          {serverError && (
            <p role="alert" className="rounded-xs bg-danger-tint px-3 py-2 text-body text-danger-ink">
              {serverError}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!isValid || submitting || !online}
              className="focus-ring h-tap rounded-sm bg-amber px-6 text-btn font-display text-on-brand hover:bg-amber-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Enviando…' : 'Enviar solicitud'}
            </button>
          </div>
        </form>
      </div>
    </PublicPageShell>
  );
}

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: JSX.Element;
}

function Field({ label, htmlFor, error, children }: FieldProps): JSX.Element {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-body font-medium text-text">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-small text-danger-ink dark:text-danger-ink-dark">
          {error}
        </p>
      )}
    </div>
  );
}

interface MunicipalityFieldProps {
  error?: string;
  status: 'loading' | 'success' | 'error';
  isInitialLoading: boolean;
  rows: Array<{ municipality_id: number; name: string; department: string; already_covered: boolean }>;
  onRetry: () => void;
  register: UseFormRegister<CompanyDetailsForm>;
}

function MunicipalityField({
  error,
  status,
  isInitialLoading,
  rows,
  onRetry,
  register,
}: MunicipalityFieldProps): JSX.Element {
  if (isInitialLoading) {
    return (
      <Field label="Municipio" htmlFor="municipality_id">
        <p className="text-small text-text-muted">Cargando municipios…</p>
      </Field>
    );
  }

  if (status === 'error' && rows.length === 0) {
    return (
      <Field label="Municipio" htmlFor="municipality_id">
        <div className="flex items-center gap-3">
          <p className="text-small text-text-muted">No pudimos cargar los municipios.</p>
          <button
            type="button"
            onClick={onRetry}
            className="focus-ring rounded-sm text-small font-medium text-text hover:underline"
          >
            Reintentar
          </button>
        </div>
      </Field>
    );
  }

  return (
    <Field label="Municipio" htmlFor="municipality_id" error={error}>
      <select
        id="municipality_id"
        defaultValue=""
        className="focus-ring h-tap w-full rounded-xs border border-border-input bg-surface px-3 text-body text-text outline-none"
        {...register('municipality_id', { valueAsNumber: true })}
      >
        <option value="" disabled>
          Elige tu municipio
        </option>
        {rows.map((row) => (
          <option key={row.municipality_id} value={row.municipality_id}>
            {row.name} — {row.department}
            {row.already_covered ? ' (ya tiene una empresa afiliada)' : ''}
          </option>
        ))}
      </select>
    </Field>
  );
}
