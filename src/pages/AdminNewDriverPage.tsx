import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  AdminErrorCode,
  CreateDriverDTO,
  DOCUMENT_ALLOWED_CONTENT_TYPES,
  DOCUMENT_MAX_BYTES,
  REQUIRED_DRIVER_DOCUMENT_TYPES,
  type DriverDocumentInput,
  type DriverDocumentType,
} from '@voyyaa/shared';
import { createDriver, getFleetQuota, uploadDriverDocument } from '../api/admin-drivers.api';
import { domainErrorCode, domainErrorDetails, isNetworkError } from '../api/errors';
import {
  DRIVER_CREATE_ERROR_MESSAGES,
  DOCUMENT_UPLOAD_ERROR_MESSAGES,
  FLEET_QUOTA_COPY,
} from '../copy/affiliation';
import { useAsync } from '../hooks/useAsync';
import { useNetworkOnline } from '../hooks/useNetworkOnline';
import { DRIVER_DOCUMENT_TYPE_LABELS } from '../lib/status-maps';
import { useToastStore } from '../state/toast-store';

const DRAFT_KEY = 'voyya_admin_new_driver_draft';

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

function readDraft(): Partial<PersonalVehicleForm> | null {
  const raw = window.localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<PersonalVehicleForm>;
  } catch {
    return null;
  }
}

interface DocumentSlot {
  fileName: string | null;
  storageKey: string | null;
  issuedAt: string;
  expiresAt: string;
  status: 'idle' | 'uploading' | 'uploaded' | 'error';
  errorMessage: string | null;
}

function initialSlot(): DocumentSlot {
  return {
    fileName: null,
    storageKey: null,
    issuedAt: '',
    expiresAt: '',
    status: 'idle',
    errorMessage: null,
  };
}

type DocumentSlots = Record<DriverDocumentType, DocumentSlot>;

function initialSlots(): DocumentSlots {
  return REQUIRED_DRIVER_DOCUMENT_TYPES.reduce((acc, type) => {
    acc[type] = initialSlot();
    return acc;
  }, {} as DocumentSlots);
}

function validateFileClientSide(file: File): string | null {
  if (!(DOCUMENT_ALLOWED_CONTENT_TYPES as readonly string[]).includes(file.type)) {
    return 'Formato no permitido. Usa PDF, JPG o PNG.';
  }
  if (file.size > DOCUMENT_MAX_BYTES) {
    return 'El archivo supera el tamaño máximo de 5 MB.';
  }
  return null;
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

export function AdminNewDriverPage(): JSX.Element {
  const navigate = useNavigate();
  const online = useNetworkOnline();
  const pushToast = useToastStore((s) => s.pushToast);
  const [serverError, setServerError] = useState<string | null>(null);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [slots, setSlots] = useState<DocumentSlots>(initialSlots);
  const [submitting, setSubmitting] = useState(false);

  const quotaFetcher = useCallback(() => getFleetQuota(), []);
  const { data: quota, status: quotaStatus, refetch: refetchQuota } = useAsync(quotaFetcher);
  const quotaExhausted = quota !== null && quota.available === 0;

  const {
    register,
    handleSubmit,
    watch,
    setError,
    reset,
    formState: { errors, isValid },
  } = useForm<PersonalVehicleForm>({
    resolver: zodResolver(PersonalVehicleDTO),
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
    const clientError = validateFileClientSide(file);
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
        fileName: uploaded.file_name,
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
        setError(conflict.field, { type: 'server', message: conflict.message });
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

  const isSubmitting = submitting;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <p className="mb-1 text-eyebrow uppercase text-amber-ink dark:text-amber">Flota</p>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-display font-display text-text">Registrar conductor</h1>
        <Link
          to="/ops/drivers"
          className="focus-ring rounded-sm text-small font-medium text-text-muted hover:text-text"
        >
          ← Volver a Conductores
        </Link>
      </div>

      <FleetQuotaBanner status={quotaStatus} quota={quota} onRetry={refetchQuota} />

      {!online && (
        <p
          role="alert"
          className="mb-4 rounded-xs bg-danger-tint px-3 py-2 text-body text-danger-ink"
        >
          Sin conexión · no se puede crear el conductor ahora.
        </p>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-6 pb-24">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <div className="space-y-8 rounded-md border border-border bg-surface p-6">
              <fieldset disabled={isSubmitting} className="space-y-4">
                <legend className="mb-2 text-title font-display text-text">Datos personales</legend>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Nombres" htmlFor="first_name" error={errors.first_name?.message}>
                    <input
                      id="first_name"
                      className="focus-ring w-full rounded-xs border border-border-input bg-surface px-3 py-2 text-body text-text outline-none"
                      {...register('first_name')}
                    />
                  </Field>
                  <Field label="Apellidos" htmlFor="last_name" error={errors.last_name?.message}>
                    <input
                      id="last_name"
                      className="focus-ring w-full rounded-xs border border-border-input bg-surface px-3 py-2 text-body text-text outline-none"
                      {...register('last_name')}
                    />
                  </Field>
                  <Field label="Cédula" htmlFor="national_id" error={errors.national_id?.message}>
                    <input
                      id="national_id"
                      className="focus-ring w-full rounded-xs border border-border-input bg-surface px-3 py-2 text-numeric text-text outline-none"
                      {...register('national_id')}
                    />
                  </Field>
                  <Field label="Teléfono" htmlFor="phone" error={errors.phone?.message}>
                    <input
                      id="phone"
                      className="focus-ring w-full rounded-xs border border-border-input bg-surface px-3 py-2 text-numeric text-text outline-none"
                      {...register('phone')}
                    />
                  </Field>
                  <Field label="Correo (opcional)" htmlFor="email" error={errors.email?.message}>
                    <input
                      id="email"
                      type="email"
                      className="focus-ring w-full rounded-xs border border-border-input bg-surface px-3 py-2 text-body text-text outline-none"
                      {...register('email', {
                        setValueAs: (value: string) => (value === '' ? undefined : value),
                      })}
                    />
                  </Field>
                  <Field
                    label="Licencia (opcional)"
                    htmlFor="license"
                    error={errors.license?.message}
                  >
                    <input
                      id="license"
                      className="focus-ring w-full rounded-xs border border-border-input bg-surface px-3 py-2 text-body text-text outline-none"
                      {...register('license', {
                        setValueAs: (value: string) => (value === '' ? undefined : value),
                      })}
                    />
                  </Field>
                </div>
              </fieldset>

              <fieldset disabled={isSubmitting} className="space-y-4">
                <legend className="mb-2 text-title font-display text-text">Vehículo</legend>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field
                    label="Placa"
                    htmlFor="vehicle.plate"
                    error={errors.vehicle?.plate?.message}
                  >
                    <input
                      id="vehicle.plate"
                      className="focus-ring w-full rounded-xs border border-border-input bg-surface px-3 py-2 text-numeric uppercase text-text outline-none"
                      {...register('vehicle.plate')}
                    />
                  </Field>
                  <Field
                    label="Modelo"
                    htmlFor="vehicle.model"
                    error={errors.vehicle?.model?.message}
                  >
                    <input
                      id="vehicle.model"
                      className="focus-ring w-full rounded-xs border border-border-input bg-surface px-3 py-2 text-body text-text outline-none"
                      {...register('vehicle.model')}
                    />
                  </Field>
                  <Field
                    label="Año (opcional)"
                    htmlFor="vehicle.year"
                    error={errors.vehicle?.year?.message}
                  >
                    <input
                      id="vehicle.year"
                      type="number"
                      className="focus-ring w-full rounded-xs border border-border-input bg-surface px-3 py-2 text-numeric text-text outline-none"
                      {...register('vehicle.year', {
                        setValueAs: (value: string) => (value === '' ? undefined : Number(value)),
                      })}
                    />
                  </Field>
                  <div>
                    <p className="mb-1 block text-body font-medium text-text">Tipo de servicio</p>
                    <p className="text-body text-text-muted">Taxi</p>
                  </div>
                </div>
              </fieldset>
            </div>

            <div className="flex items-start gap-3 rounded-md bg-espresso p-5 text-crema">
              <span aria-hidden="true">🔐</span>
              <p className="text-small leading-relaxed">
                <span className="font-semibold text-crema">Credenciales automáticas.</span> Al
                guardar, el conductor recibe por SMS su usuario (la cédula) y un PIN temporal de 4
                dígitos.
              </p>
            </div>
          </div>

          <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-title font-display text-text">Documentos</h2>
              <span className="text-small text-text-muted">PDF o foto · máx. 5 MB</span>
            </div>
            <p className="text-small text-text-muted">
              La fecha de vencimiento es obligatoria para los 4 documentos.
            </p>

            {REQUIRED_DRIVER_DOCUMENT_TYPES.map((type) => (
              <DocumentUploadRow
                key={type}
                type={type}
                slot={slots[type]}
                disabled={isSubmitting}
                onFileSelected={(file) => void onFileSelected(type, file)}
                onDateChange={(field, value) => setSlot(type, { [field]: value })}
              />
            ))}

            {documentsError && (
              <p role="alert" className="text-small text-danger-ink dark:text-danger-ink-dark">
                {documentsError}
              </p>
            )}

            <span className="mt-auto text-small text-text-muted">
              {
                REQUIRED_DRIVER_DOCUMENT_TYPES.filter((type) => slots[type].status === 'uploaded')
                  .length
              }{' '}
              de {REQUIRED_DRIVER_DOCUMENT_TYPES.length} documentos cargados
            </span>
          </section>
        </div>

        {serverError && (
          <p role="alert" className="rounded-xs bg-danger-tint px-3 py-2 text-body text-danger-ink">
            {serverError}
          </p>
        )}

        <div className="fixed inset-x-0 bottom-0 flex justify-end gap-3 border-t border-border bg-surface px-6 py-4">
          <button
            type="button"
            onClick={() => navigate('/ops/drivers')}
            className="focus-ring rounded-sm border border-border px-4 py-2 text-btn font-display text-text hover:bg-bg-shell"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!isValid || isSubmitting || !online || quotaExhausted}
            className="focus-ring rounded-sm bg-amber px-4 py-2 text-btn font-display text-on-brand hover:bg-amber-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Guardando…' : 'Guardar y enviar PIN'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface FleetQuotaBannerProps {
  status: 'loading' | 'success' | 'error';
  quota: { declared: number | null; used: number; available: number | null } | null;
  onRetry: () => void;
}

function FleetQuotaBanner({ status, quota, onRetry }: FleetQuotaBannerProps): JSX.Element | null {
  if (status === 'loading' && !quota) return null;
  if (status === 'error' && !quota) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-xs border border-border bg-surface-sunken px-3 py-2">
        <p className="text-small text-text-muted">No pudimos cargar el cupo de flota.</p>
        <button
          type="button"
          onClick={onRetry}
          className="focus-ring rounded-sm text-small font-medium text-text hover:underline"
        >
          Reintentar
        </button>
      </div>
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
      className={`mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-small font-medium ${
        exhausted
          ? 'border-danger/40 bg-danger-tint text-danger-ink'
          : 'border-amber/40 bg-amber/10 text-amber-ink dark:text-amber'
      }`}
    >
      {label}
    </div>
  );
}

interface DocumentUploadRowProps {
  type: DriverDocumentType;
  slot: DocumentSlot;
  disabled: boolean;
  onFileSelected: (file: File) => void;
  onDateChange: (field: 'issuedAt' | 'expiresAt', value: string) => void;
}

function DocumentUploadRow({
  type,
  slot,
  disabled,
  onFileSelected,
  onDateChange,
}: DocumentUploadRowProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const label = DRIVER_DOCUMENT_TYPE_LABELS[type];

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
            <p className="text-small text-danger-ink dark:text-danger-ink-dark">
              {slot.errorMessage}
            </p>
          )}
        </span>
        <input
          ref={inputRef}
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
        <div className="flex items-center gap-3">
          <label className="w-32 shrink-0 text-small text-text-muted" htmlFor={`${type}-expires`}>
            Vence
          </label>
          <input
            id={`${type}-expires`}
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
        <p className="mt-1 text-small text-danger-ink dark:text-danger-ink-dark">{error}</p>
      )}
    </div>
  );
}
