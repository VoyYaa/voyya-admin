import { useCallback, useEffect, useState, type JSX } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  CompanyLegalForm,
  CreateAffiliationApplicationDTO,
  REQUIRED_COMPANY_DOCUMENT_TYPES,
  type AffiliationDocumentInput,
  type AffiliationErrorCode,
  type CompanyDocumentType,
} from '@voyyaa/shared';
import {
  getAffiliationMunicipalities,
  submitAffiliationApplication,
  uploadAffiliationDocument,
} from '../../api/affiliation.api';
import { domainErrorCode, domainErrorDetails, isNetworkError } from '../../api/errors';
import {
  MunicipalityPicker,
  type CatalogLoadState,
} from '../../components/affiliation/MunicipalityPicker';
import { ServiceDeclarationField } from '../../components/affiliation/ServiceDeclarationField';
import { StateGlyph } from '../../components/brand/StateGlyph';
import { DocumentSlotCard } from '../../components/documents/DocumentSlotCard';
import { PublicPageShell } from '../../components/public/PublicPageShell';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Notice } from '../../components/ui/Notice';
import { StepRail } from '../../components/ui/StepRail';
import {
  AFFILIATION_CONFLICT_FIELD_MAP,
  AFFILIATION_ERROR_MESSAGES,
  AFFILIATION_FIELDS_COPY,
  AFFILIATION_FORM_COPY,
  AFFILIATION_SUCCESS_COPY,
  COMPANY_NAMES_COPY,
  MUNICIPALITY_FIELD_COPY,
  PRIVACY_CONSENT_COPY,
  SERVICE_DECLARATION_COPY,
} from '../../copy/affiliation';
import { STEP_COPY } from '../../copy/common';
import { useAsync } from '../../hooks/useAsync';
import { useNetworkOnline } from '../../hooks/useNetworkOnline';
import { useOnReconnect } from '../../hooks/useOnReconnect';
import { spanishZodResolver } from '../../lib/form-resolver';
import {
  createInitialDocumentSlot,
  validateDocumentFileClientSide,
  type DocumentSlot,
} from '../../lib/document-slots';
import { COMPANY_DOCUMENT_TYPE_LABELS, COMPANY_LEGAL_FORM_LABELS } from '../../lib/status-maps';

const CompanyDetailsDTO = CreateAffiliationApplicationDTO.innerType().omit({ documents: true });
type CompanyDetailsForm = z.infer<typeof CompanyDetailsDTO>;

type DocumentSlots = Record<CompanyDocumentType, DocumentSlot>;

const STEP_DATA = 0;
const STEP_DOCUMENTS = 1;
const STEP_REVIEW = 2;
const STEP_ALL_DONE = 3;

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

function resolveCurrentStep(detailsValid: boolean, documentsComplete: boolean): number {
  if (!detailsValid) return STEP_DATA;
  return documentsComplete ? STEP_REVIEW : STEP_DOCUMENTS;
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
    error: municipalitiesError,
    status: municipalitiesStatus,
    isInitialLoading: municipalitiesInitialLoading,
    refetch: refetchMunicipalities,
  } = useAsync(municipalitiesFetcher);

  const {
    register,
    control,
    handleSubmit,
    setError,
    clearErrors,
    trigger,
    setValue,
    getValues,
    resetField,
    setFocus,
    watch,
    formState: { errors, isValid },
  } = useForm<CompanyDetailsForm>({
    resolver: spanishZodResolver(CompanyDetailsDTO),
    mode: 'onChange',
    defaultValues: {
      legal_name: '',
      tax_id: '',
      contact_first_name: '',
      contact_last_name: '',
      contact_email: '',
      contact_phone: '',
      service_types: ['taxi'],
    },
  });

  const catalogFailed = municipalitiesStatus === 'error' && !municipalities;
  const catalogOffline = catalogFailed && (!online || isNetworkError(municipalitiesError));
  const catalogLoadState: CatalogLoadState = municipalitiesInitialLoading
    ? 'loading'
    : catalogOffline
      ? 'offline'
      : catalogFailed
        ? 'error'
        : 'ready';
  useOnReconnect(catalogFailed, refetchMunicipalities);

  const activeServices = municipalities?.active_service_types ?? ['taxi'];

  useEffect(() => {
    if (!municipalities) return;
    const current = getValues('service_types');
    const valid = current.filter((service) =>
      municipalities.active_service_types.includes(service),
    );
    if (valid.length === current.length && valid.length > 0) return;
    const [firstActive] = municipalities.active_service_types;
    setValue('service_types', valid.length > 0 || !firstActive ? valid : [firstActive], {
      shouldValidate: true,
    });
  }, [municipalities, getValues, setValue]);

  const legalNameValue = watch('legal_name');
  const publicNameValue = watch('public_name');
  const publicNamePreview = (publicNameValue?.trim() || legalNameValue.trim() || '…').slice(0, 60);

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
      const conflict = code
        ? AFFILIATION_CONFLICT_FIELD_MAP[code as AffiliationErrorCode]
        : undefined;
      if (conflict) {
        if (conflict.field === 'municipality_id') {
          resetField('municipality_id', { defaultValue: undefined });
          refetchMunicipalities();
        }
        setError(conflict.field, { type: 'server', message: conflict.message });
        if (conflict.field === 'municipality_id') setFocus('municipality_id');
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

  const uploadedCount = REQUIRED_COMPANY_DOCUMENT_TYPES.filter(
    (type) => slots[type].status === 'uploaded',
  ).length;

  if (successEmail) {
    return (
      <PublicPageShell
        hero={{
          eyebrow: AFFILIATION_FORM_COPY.eyebrow,
          title: AFFILIATION_FORM_COPY.successTitle,
          role: 'status',
        }}
      >
        <div className="mx-auto flex max-w-4xl flex-col gap-8">
          <StepRail steps={STEP_COPY.applicationSteps} current={STEP_ALL_DONE} />
          <div className="flex items-start gap-5">
            <StateGlyph glyph="success" size={72} animate />
            <p className="max-w-[56ch] pt-2 text-lede text-text-muted">
              {AFFILIATION_FORM_COPY.successBody(successEmail)}
            </p>
          </div>
          <section aria-label={AFFILIATION_SUCCESS_COPY.nextStepsTitle}>
            <p className="vy-eyebrow mb-3">{AFFILIATION_SUCCESS_COPY.nextStepsTitle}</p>
            <ol className="flex flex-col gap-3 border-t border-border pt-4">
              {AFFILIATION_SUCCESS_COPY.nextSteps.map((step, index) => (
                <li key={step} className="flex items-center gap-3 text-body text-text">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-amber bg-espresso text-small font-black text-crema"
                  >
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell
      hero={{
        eyebrow: AFFILIATION_FORM_COPY.eyebrow,
        title: AFFILIATION_FORM_COPY.title,
        lede: AFFILIATION_FORM_COPY.lede,
      }}
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <StepRail
            steps={STEP_COPY.applicationSteps}
            current={resolveCurrentStep(
              isValid,
              uploadedCount === REQUIRED_COMPANY_DOCUMENT_TYPES.length,
            )}
          />
        </div>

        {!online && (
          <Notice
            tone="info"
            role="alert"
            className="mb-4"
            leading={<StateGlyph glyph="offline" size={28} />}
          >
            {AFFILIATION_FIELDS_COPY.offline}
          </Notice>
        )}

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-10 pb-8">
          <fieldset disabled={submitting} className="border-t border-border pt-6">
            <legend className="vy-eyebrow mb-4">{AFFILIATION_FIELDS_COPY.companySection}</legend>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label={COMPANY_NAMES_COPY.legalName}
                htmlFor="legal_name"
                error={errors.legal_name?.message}
                announceError
              >
                {(fieldControl) => (
                  <input className="vy-input" {...fieldControl} {...register('legal_name')} />
                )}
              </Field>
              <Field
                label={COMPANY_NAMES_COPY.publicName}
                htmlFor="public_name"
                hint={COMPANY_NAMES_COPY.publicNameHint}
                error={errors.public_name ? COMPANY_NAMES_COPY.publicNameInvalid : undefined}
                announceError
              >
                {(fieldControl) => (
                  <>
                    <input
                      className="vy-input"
                      autoComplete="off"
                      {...fieldControl}
                      {...register('public_name', {
                        setValueAs: (value: string) =>
                          value.trim().length === 0 ? undefined : value,
                      })}
                    />
                    <p className="text-small text-text-muted">
                      {COMPANY_NAMES_COPY.publicNamePreview(publicNamePreview)}
                    </p>
                  </>
                )}
              </Field>
              <Field label="NIT" htmlFor="tax_id" error={errors.tax_id?.message} announceError>
                {(fieldControl) => (
                  <input
                    className="vy-input text-numeric"
                    {...fieldControl}
                    {...register('tax_id')}
                  />
                )}
              </Field>
              <Field
                label="Forma jurídica"
                htmlFor="legal_form"
                error={errors.legal_form?.message}
                announceError
              >
                {(fieldControl) => (
                  <select
                    defaultValue=""
                    className="vy-input"
                    {...fieldControl}
                    {...register('legal_form')}
                  >
                    <option value="" disabled>
                      {AFFILIATION_FIELDS_COPY.chooseOption}
                    </option>
                    {CompanyLegalForm.options.map((option) => (
                      <option key={option} value={option}>
                        {COMPANY_LEGAL_FORM_LABELS[option]}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Controller
                control={control}
                name="municipality_id"
                render={({ field }) => (
                  <MunicipalityPicker
                    catalog={municipalities}
                    loadState={catalogLoadState}
                    onRetry={refetchMunicipalities}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={() => {
                      field.onBlur();
                      void trigger('municipality_id');
                    }}
                    onEdit={() => clearErrors('municipality_id')}
                    inputRef={field.ref}
                    error={
                      errors.municipality_id
                        ? errors.municipality_id.type === 'server'
                          ? errors.municipality_id.message
                          : MUNICIPALITY_FIELD_COPY.required
                        : undefined
                    }
                  />
                )}
              />
              <div className="md:col-span-2">
                <Controller
                  control={control}
                  name="service_types"
                  render={({ field }) => (
                    <ServiceDeclarationField
                      activeServices={activeServices}
                      value={field.value}
                      onChange={field.onChange}
                      error={
                        errors.service_types
                          ? errors.service_types.type === 'server'
                            ? errors.service_types.message
                            : SERVICE_DECLARATION_COPY.required
                          : undefined
                      }
                    />
                  )}
                />
              </div>
              <Field
                label="Flota declarada (número de vehículos)"
                htmlFor="vehicle_count"
                error={errors.vehicle_count?.message}
                announceError
              >
                {(fieldControl) => (
                  <input
                    type="number"
                    min={1}
                    className="vy-input text-numeric"
                    {...fieldControl}
                    {...register('vehicle_count', { valueAsNumber: true })}
                  />
                )}
              </Field>
            </div>
          </fieldset>

          <fieldset disabled={submitting} className="border-t border-border pt-6">
            <legend className="vy-eyebrow mb-4">{AFFILIATION_FIELDS_COPY.contactSection}</legend>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label="Nombres"
                htmlFor="contact_first_name"
                error={errors.contact_first_name?.message}
                announceError
              >
                {(control) => (
                  <input className="vy-input" {...control} {...register('contact_first_name')} />
                )}
              </Field>
              <Field
                label="Apellidos"
                htmlFor="contact_last_name"
                error={errors.contact_last_name?.message}
                announceError
              >
                {(control) => (
                  <input className="vy-input" {...control} {...register('contact_last_name')} />
                )}
              </Field>
              <Field
                label="Correo"
                htmlFor="contact_email"
                error={errors.contact_email?.message}
                announceError
              >
                {(control) => (
                  <input
                    type="email"
                    className="vy-input"
                    {...control}
                    {...register('contact_email')}
                  />
                )}
              </Field>
              <Field
                label="Teléfono"
                htmlFor="contact_phone"
                error={errors.contact_phone?.message}
                announceError
              >
                {(control) => (
                  <input
                    className="vy-input text-numeric"
                    {...control}
                    {...register('contact_phone')}
                  />
                )}
              </Field>
            </div>
          </fieldset>

          <section
            aria-label={AFFILIATION_FIELDS_COPY.documentsSection}
            className="border-t border-border pt-6"
          >
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="vy-eyebrow">{AFFILIATION_FIELDS_COPY.documentsSection}</h2>
              <span className="text-small text-text-muted">
                {AFFILIATION_FORM_COPY.documentsHint}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
              <p
                role="alert"
                className="mt-3 text-small font-semibold text-danger-ink dark:text-danger-ink-dark"
              >
                {documentsError}
              </p>
            )}
            <p className="mt-3 text-small text-text-muted">
              {uploadedCount} de {REQUIRED_COMPANY_DOCUMENT_TYPES.length} documentos cargados
            </p>
          </section>

          <section
            aria-label={AFFILIATION_FIELDS_COPY.consentSection}
            className="border-t border-border pt-6"
          >
            <label className="flex min-h-tap cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(event) => {
                  setConsentAccepted(event.target.checked);
                  if (event.target.checked) setConsentError(null);
                }}
                aria-describedby={consentError ? 'consent-error' : undefined}
                className="focus-ring mt-0.5 h-5 w-5 shrink-0 accent-amber-deep"
              />
              <span className="text-small text-text-muted">
                {PRIVACY_CONSENT_COPY.label}{' '}
                {PRIVACY_POLICY_URL ? (
                  <a href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer" className="vy-link">
                    {PRIVACY_CONSENT_COPY.linkText}
                  </a>
                ) : null}
              </span>
            </label>
            {consentError && (
              <p
                id="consent-error"
                role="alert"
                className="mt-2 text-small font-semibold text-danger-ink dark:text-danger-ink-dark"
              >
                {consentError}
              </p>
            )}
          </section>

          {serverError && (
            <Notice tone="danger" role="alert" leading={<StateGlyph glyph="error" size={28} />}>
              {serverError}
            </Notice>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!isValid || !online}
              loading={submitting}
              className="px-6"
            >
              {submitting ? AFFILIATION_FIELDS_COPY.submitting : AFFILIATION_FIELDS_COPY.submit}
            </Button>
          </div>
        </form>
      </div>
    </PublicPageShell>
  );
}
