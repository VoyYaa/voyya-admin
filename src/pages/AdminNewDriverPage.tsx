import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  AdminErrorCode,
  CreateDriverDTO,
  REQUIRED_DRIVER_DOCUMENT_TYPES,
  type DriverDocumentInput,
  type DriverDocumentType,
} from '@voyyaa/shared';
import { createDriver, getFleetQuota, uploadDriverDocument } from '../api/admin-drivers.api';
import { domainErrorCode, domainErrorDetails, isNetworkError } from '../api/errors';
import { StateGlyph } from '../components/brand/StateGlyph';
import { DocumentSlotCard } from '../components/documents/DocumentSlotCard';
import { Button } from '../components/ui/Button';
import { buttonClassName } from '../components/ui/button-styles';
import { Field } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import { StepRail } from '../components/ui/StepRail';
import {
  DRIVER_CREATE_ERROR_MESSAGES,
  DOCUMENT_UPLOAD_ERROR_MESSAGES,
  FLEET_QUOTA_COPY,
} from '../copy/affiliation';
import { NEW_DRIVER_COPY } from '../copy/drivers';
import { useActiveSection } from '../hooks/useActiveSection';
import { useAsync } from '../hooks/useAsync';
import { useNetworkOnline } from '../hooks/useNetworkOnline';
import {
  createInitialDocumentSlot,
  validateDocumentFileClientSide,
  type DocumentSlot,
} from '../lib/document-slots';
import { spanishZodResolver } from '../lib/form-resolver';
import { DRIVER_DOCUMENT_TYPE_LABELS } from '../lib/status-maps';
import { useToastStore } from '../state/toast-store';

const DRAFT_KEY = 'voyya_admin_new_driver_draft';
const SECTION_IDS = ['driver-personal', 'driver-vehicle', 'driver-documents'] as const;

const PersonalVehicleDTO = CreateDriverDTO.omit({ documents: true });
type PersonalVehicleForm = z.infer<typeof PersonalVehicleDTO>;

const CONFLICT_FIELD_MAP: Partial<
  Record<
    AdminErrorCode,
    { field: 'national_id' | 'phone' | 'email' | 'vehicle.plate'; message: string }
  >
> = {
  NATIONAL_ID_TAKEN: { field: 'national_id', message: 'Ya existe un conductor con esta cédula.' },
  PHONE_TAKEN: { field: 'phone', message: 'Ya hay una cuenta con este teléfono.' },
  EMAIL_TAKEN: { field: 'email', message: 'Ya hay una cuenta con este correo.' },
  PLATE_TAKEN: { field: 'vehicle.plate', message: 'Esta placa ya está registrada.' },
};

const FIELD_SUMMARY_LABELS: Record<string, string> = {
  first_name: 'Nombres',
  last_name: 'Apellidos',
  national_id: 'Cédula',
  phone: 'Teléfono',
  email: 'Correo',
  license: 'Licencia',
  'vehicle.plate': 'Placa',
  'vehicle.model': 'Modelo',
  'vehicle.year': 'Año',
};

function readDraft(): Partial<PersonalVehicleForm> | null {
  const raw = window.localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<PersonalVehicleForm>;
  } catch {
    return null;
  }
}

type DocumentSlots = Record<DriverDocumentType, DocumentSlot>;

function initialSlots(): DocumentSlots {
  return REQUIRED_DRIVER_DOCUMENT_TYPES.reduce((acc, type) => {
    acc[type] = createInitialDocumentSlot();
    return acc;
  }, {} as DocumentSlots);
}

function buildDocumentsPayload(slots: DocumentSlots): DriverDocumentInput[] | null {
  const complete = REQUIRED_DRIVER_DOCUMENT_TYPES.every((type) => {
    const slot = slots[type];
    return slot.status === 'uploaded' && slot.storageKey && slot.expiresAt.trim().length > 0;
  });
  if (!complete) return null;
  return REQUIRED_DRIVER_DOCUMENT_TYPES.map((type) => {
    const slot = slots[type];
    return {
      type,
      storage_key: slot.storageKey as string,
      issued_at: slot.issuedAt.trim().length > 0 ? slot.issuedAt.trim() : undefined,
      expires_at: slot.expiresAt.trim(),
    };
  });
}

function collectErrorSummary(errors: FieldErrors<PersonalVehicleForm>): ErrorSummaryItem[] {
  const items: ErrorSummaryItem[] = [];
  const push = (name: string, message: string | undefined): void => {
    if (message) items.push({ fieldId: name, label: FIELD_SUMMARY_LABELS[name] ?? name, message });
  };
  push('first_name', errors.first_name?.message);
  push('last_name', errors.last_name?.message);
  push('national_id', errors.national_id?.message);
  push('phone', errors.phone?.message);
  push('email', errors.email?.message);
  push('license', errors.license?.message);
  push('vehicle.plate', errors.vehicle?.plate?.message);
  push('vehicle.model', errors.vehicle?.model?.message);
  push('vehicle.year', errors.vehicle?.year?.message);
  return items;
}

export function AdminNewDriverPage(): JSX.Element {
  const navigate = useNavigate();
  const online = useNetworkOnline();
  const pushToast = useToastStore((s) => s.pushToast);
  const [serverError, setServerError] = useState<string | null>(null);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [slots, setSlots] = useState<DocumentSlots>(initialSlots);
  const [submitting, setSubmitting] = useState(false);
  const activeSection = useActiveSection(SECTION_IDS);

  const quotaFetcher = useCallback(() => getFleetQuota(), []);
  const {
    data: quota,
    status: quotaStatus,
    isInitialLoading: quotaInitialLoading,
    refetch: refetchQuota,
  } = useAsync(quotaFetcher);
  const quotaExhausted = quota !== null && quota.available === 0;

  const {
    register,
    handleSubmit,
    watch,
    setError,
    reset,
    formState: { errors, isValid, submitCount },
  } = useForm<PersonalVehicleForm>({
    resolver: spanishZodResolver(PersonalVehicleDTO),
    mode: 'onChange',
    defaultValues: readDraft() ?? {
      first_name: '',
      last_name: '',
      national_id: '',
      phone: '',
      email: '',
      license: '',
      vehicle: { plate: '', model: '' },
    },
  });

  useEffect(() => {
    const subscription = watch((value) => {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const setSlot = (type: DriverDocumentType, patch: Partial<DocumentSlot>): void => {
    setSlots((current) => ({ ...current, [type]: { ...current[type], ...patch } }));
  };

  const onFileSelected = async (type: DriverDocumentType, file: File): Promise<void> => {
    setDocumentsError(null);
    const clientError = validateDocumentFileClientSide(file);
    if (clientError) {
      setSlot(type, { status: 'error', errorMessage: clientError, fileName: file.name });
      return;
    }
    setSlot(type, { status: 'uploading', errorMessage: null, fileName: file.name });
    try {
      const uploaded = await uploadDriverDocument(file);
      setSlot(type, {
        status: 'uploaded',
        storageKey: uploaded.storage_key,
      });
    } catch (error) {
      const code = domainErrorCode(error);
      const message = isNetworkError(error)
        ? 'Sin conexión · no se pudo subir el archivo.'
        : (code && DOCUMENT_UPLOAD_ERROR_MESSAGES[code]) ||
          'No pudimos subir el archivo. Intenta de nuevo.';
      setSlot(type, { status: 'error', errorMessage: message });
    }
  };

  const onSubmit = handleSubmit(async (formValues) => {
    setServerError(null);
    setDocumentsError(null);

    if (quotaExhausted) {
      setServerError(quota ? FLEET_QUOTA_COPY.exhausted(quota.declared ?? 0) : null);
      return;
    }

    const documents = buildDocumentsPayload(slots);
    if (!documents) {
      const missing = REQUIRED_DRIVER_DOCUMENT_TYPES.filter(
        (type) => slots[type].status !== 'uploaded' || slots[type].expiresAt.trim().length === 0,
      );
      setDocumentsError(
        `Faltan documentos: ${missing.map((type) => DRIVER_DOCUMENT_TYPE_LABELS[type]).join(', ')}.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const created = await createDriver({ ...formValues, documents });
      window.localStorage.removeItem(DRAFT_KEY);
      reset();
      setSlots(initialSlots());
      if (created.pin_delivery === 'sent') {
        pushToast('success', 'Conductor creado · le enviamos la cédula y el PIN por SMS.');
      } else {
        pushToast(
          'danger',
          'Conductor creado, pero no pudimos enviarle el PIN por SMS. Reenvíalo desde su detalle.',
        );
      }
      navigate('/ops/drivers', { replace: true });
    } catch (error) {
      if (isNetworkError(error)) {
        setServerError('No pudimos crear el conductor. Revisa los datos e intenta de nuevo.');
        return;
      }
      const code = domainErrorCode(error);
      const conflict = code ? CONFLICT_FIELD_MAP[code as AdminErrorCode] : undefined;
      if (conflict) {
        setError(
          conflict.field,
          { type: 'server', message: conflict.message },
          { shouldFocus: true },
        );
        return;
      }
      if (code === 'FLEET_LIMIT_REACHED') {
        setServerError(
          quota
            ? FLEET_QUOTA_COPY.exhausted(quota.declared ?? 0)
            : 'Alcanzaste tu flota declarada.',
        );
        refetchQuota();
        return;
      }
      if (code === 'DRIVER_DOCUMENTS_INCOMPLETE') {
        const details = domainErrorDetails<{ missing_documents?: DriverDocumentType[] }>(error);
        const missing = details?.missing_documents ?? [];
        setDocumentsError(
          missing.length > 0
            ? `Faltan documentos: ${missing.map((type) => DRIVER_DOCUMENT_TYPE_LABELS[type]).join(', ')}.`
            : 'Faltan documentos por cargar.',
        );
        return;
      }
      if (code === 'DOCUMENT_NOT_FOUND') {
        setDocumentsError(
          DRIVER_CREATE_ERROR_MESSAGES.DOCUMENT_NOT_FOUND ??
            'Uno de los archivos ya no está disponible.',
        );
        return;
      }
      setServerError('No pudimos crear el conductor. Revisa los datos e intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  });

  const summaryItems = submitCount > 0 ? collectErrorSummary(errors) : [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 pb-28">
      <p className="vy-eyebrow mb-1">{NEW_DRIVER_COPY.eyebrow}</p>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-display text-text">{NEW_DRIVER_COPY.title}</h1>
        <Link to="/ops/drivers" className={buttonClassName('ghost')}>
          {NEW_DRIVER_COPY.back}
        </Link>
      </div>

      <FleetQuotaBanner
        status={quotaStatus}
        isInitialLoading={quotaInitialLoading}
        quota={quota}
        onRetry={refetchQuota}
      />

      {!online && (
        <Notice
          tone="info"
          role="alert"
          className="mb-4"
          leading={<StateGlyph glyph="offline" size={28} />}
        >
          Sin conexión · no se puede crear el conductor ahora.
        </Notice>
      )}

      <ErrorSummary items={summaryItems} extra={[documentsError, serverError]} />

      <form onSubmit={onSubmit} noValidate className="lg:grid lg:grid-cols-[180px_1fr] lg:gap-10">
        <aside aria-label={NEW_DRIVER_COPY.railLabel} className="hidden lg:block">
          <div className="sticky top-8">
            <StepRail
              steps={NEW_DRIVER_COPY.sections}
              current={activeSection}
              orientation="vertical"
            />
          </div>
        </aside>

        <div className="flex flex-col gap-10">
          <section id={SECTION_IDS[0]} className="border-t border-border pt-6">
            <fieldset disabled={submitting}>
              <legend className="vy-eyebrow mb-4">{NEW_DRIVER_COPY.sections[0]}</legend>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Nombres" htmlFor="first_name" error={errors.first_name?.message}>
                  {(control) => (
                    <input className="vy-input" {...control} {...register('first_name')} />
                  )}
                </Field>
                <Field label="Apellidos" htmlFor="last_name" error={errors.last_name?.message}>
                  {(control) => (
                    <input className="vy-input" {...control} {...register('last_name')} />
                  )}
                </Field>
                <Field label="Cédula" htmlFor="national_id" error={errors.national_id?.message}>
                  {(control) => (
                    <input
                      inputMode="numeric"
                      className="vy-input text-numeric"
                      {...control}
                      {...register('national_id')}
                    />
                  )}
                </Field>
                <Field label="Teléfono" htmlFor="phone" error={errors.phone?.message}>
                  {(control) => (
                    <input
                      inputMode="tel"
                      className="vy-input text-numeric"
                      {...control}
                      {...register('phone')}
                    />
                  )}
                </Field>
                <Field label="Correo (opcional)" htmlFor="email" error={errors.email?.message}>
                  {(control) => (
                    <input
                      type="email"
                      className="vy-input"
                      {...control}
                      {...register('email', {
                        setValueAs: (value: string) => (value === '' ? undefined : value),
                      })}
                    />
                  )}
                </Field>
                <Field
                  label="Licencia (opcional)"
                  htmlFor="license"
                  error={errors.license?.message}
                >
                  {(control) => (
                    <input
                      className="vy-input"
                      {...control}
                      {...register('license', {
                        setValueAs: (value: string) => (value === '' ? undefined : value),
                      })}
                    />
                  )}
                </Field>
              </div>
            </fieldset>
          </section>

          <section id={SECTION_IDS[1]} className="border-t border-border pt-6">
            <fieldset disabled={submitting}>
              <legend className="vy-eyebrow mb-4">{NEW_DRIVER_COPY.sections[1]}</legend>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Placa" htmlFor="vehicle.plate" error={errors.vehicle?.plate?.message}>
                  {(control) => (
                    <input
                      className="vy-input text-numeric uppercase"
                      {...control}
                      {...register('vehicle.plate')}
                    />
                  )}
                </Field>
                <Field
                  label="Modelo"
                  htmlFor="vehicle.model"
                  error={errors.vehicle?.model?.message}
                >
                  {(control) => (
                    <input className="vy-input" {...control} {...register('vehicle.model')} />
                  )}
                </Field>
                <Field
                  label="Año (opcional)"
                  htmlFor="vehicle.year"
                  error={errors.vehicle?.year?.message}
                >
                  {(control) => (
                    <input
                      type="number"
                      className="vy-input text-numeric"
                      {...control}
                      {...register('vehicle.year', {
                        setValueAs: (value: string) => (value === '' ? undefined : Number(value)),
                      })}
                    />
                  )}
                </Field>
                <div>
                  <p className="mb-1.5 text-body font-bold text-text">Tipo de servicio</p>
                  <p className="text-body text-text-muted">Taxi</p>
                </div>
              </div>
            </fieldset>

            <div className="mt-6 flex items-start gap-3 rounded-md bg-espresso p-5 text-crema">
              <span aria-hidden="true" className="mt-1 h-3 w-3 shrink-0 rounded-full bg-amber" />
              <p className="text-small leading-relaxed">
                <span className="font-bold text-crema">{NEW_DRIVER_COPY.credentialsTitle}</span>{' '}
                {NEW_DRIVER_COPY.credentialsBody}
              </p>
            </div>
          </section>

          <section id={SECTION_IDS[2]} className="border-t border-border pt-6">
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="vy-eyebrow">{NEW_DRIVER_COPY.sections[2]}</h2>
              <span className="text-small text-text-muted">{NEW_DRIVER_COPY.documentsHint}</span>
            </div>
            <p className="mb-4 text-small text-text-muted">{NEW_DRIVER_COPY.documentsExpiry}</p>

            <div className="flex flex-col gap-3">
              {REQUIRED_DRIVER_DOCUMENT_TYPES.map((type) => (
                <DocumentSlotCard
                  key={type}
                  documentType={type}
                  label={DRIVER_DOCUMENT_TYPE_LABELS[type]}
                  slot={slots[type]}
                  disabled={submitting}
                  expiryMode="required"
                  onFileSelected={(file) => void onFileSelected(type, file)}
                  onDateChange={(field, value) => setSlot(type, { [field]: value })}
                />
              ))}
            </div>

            <p className="mt-3 text-small text-text-muted">
              {
                REQUIRED_DRIVER_DOCUMENT_TYPES.filter((type) => slots[type].status === 'uploaded')
                  .length
              }{' '}
              de {REQUIRED_DRIVER_DOCUMENT_TYPES.length} documentos cargados
            </p>
          </section>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-end gap-3 border-t border-border bg-surface px-6 py-4">
          <Button variant="ghost" onClick={() => navigate('/ops/drivers')}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={!isValid || !online || quotaExhausted}
            loading={submitting}
          >
            {submitting ? 'Guardando…' : 'Guardar y enviar PIN'}
          </Button>
        </div>
      </form>
    </div>
  );
}

interface ErrorSummaryItem {
  fieldId: string;
  label: string;
  message: string;
}

interface ErrorSummaryProps {
  items: ErrorSummaryItem[];
  extra: Array<string | null>;
}

function ErrorSummary({ items, extra }: ErrorSummaryProps): JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null);
  const extras = extra.filter((message): message is string => message !== null);
  const total = items.length + extras.length;

  useEffect(() => {
    if (total > 0) ref.current?.focus();
  }, [total]);

  if (total === 0) return null;

  return (
    <div ref={ref} tabIndex={-1} role="alert" className="mb-6 focus:outline-none">
      <Notice tone="danger" leading={<StateGlyph glyph="error" size={28} />}>
        <p className="font-bold">{NEW_DRIVER_COPY.summaryTitle}</p>
        <ul className="mt-1 list-disc pl-5 text-small">
          {items.map((item) => (
            <li key={item.fieldId}>
              <a href={`#${item.fieldId}`} className="font-bold underline">
                {item.label}
              </a>
              : {item.message}
            </li>
          ))}
          {extras.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </Notice>
    </div>
  );
}

interface FleetQuotaBannerProps {
  status: 'loading' | 'success' | 'error';
  isInitialLoading: boolean;
  quota: { declared: number | null; used: number; available: number | null } | null;
  onRetry: () => void;
}

function FleetQuotaBanner({
  status,
  isInitialLoading,
  quota,
  onRetry,
}: FleetQuotaBannerProps): JSX.Element | null {
  if (isInitialLoading) return null;
  if (status === 'error' && !quota) {
    return (
      <Notice
        tone="info"
        className="mb-4"
        action={
          <Button variant="ghost" onClick={onRetry}>
            Reintentar
          </Button>
        }
      >
        {NEW_DRIVER_COPY.quotaLoadError}
      </Notice>
    );
  }
  if (!quota) return null;
  const label =
    quota.declared === null
      ? FLEET_QUOTA_COPY.unlimited
      : FLEET_QUOTA_COPY.available(quota.available ?? 0, quota.declared);
  const exhausted = quota.available === 0;
  return (
    <div
      className={`mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-small font-bold ${
        exhausted
          ? 'border-danger/40 bg-danger-tint text-danger-ink dark:bg-danger/15 dark:text-danger-ink-dark'
          : 'border-amber/50 bg-amber/10 text-amber-ink dark:text-amber'
      }`}
    >
      {label}
    </div>
  );
}
