import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { AdminErrorCode, CreateDriverDTO } from '@voyyaa/shared';
import { createDriver } from '../api/admin-drivers.api';
import { domainErrorCode, isNetworkError } from '../api/errors';
import { useNetworkOnline } from '../hooks/useNetworkOnline';
import { useToastStore } from '../state/toast-store';

const DRAFT_KEY = 'voyya_admin_new_driver_draft';

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

function readDraft(): Partial<CreateDriverDTO> | null {
  const raw = window.localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<CreateDriverDTO>;
  } catch {
    return null;
  }
}

export function AdminNewDriverPage(): JSX.Element {
  const navigate = useNavigate();
  const online = useNetworkOnline();
  const pushToast = useToastStore((s) => s.pushToast);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    reset,
    formState: { errors, isValid, isSubmitting },
  } = useForm<CreateDriverDTO>({
    resolver: zodResolver(CreateDriverDTO),
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

  const onSubmit = handleSubmit(async (dto) => {
    setServerError(null);
    try {
      const created = await createDriver(dto);
      window.localStorage.removeItem(DRAFT_KEY);
      reset();
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
      setServerError('No pudimos crear el conductor. Revisa los datos e intenta de nuevo.');
    }
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-display font-display text-text">Nuevo conductor</h1>

      {!online && (
        <p
          role="alert"
          className="mb-4 rounded-xs bg-danger-tint px-3 py-2 text-body text-danger-ink"
        >
          Sin conexión · no se puede crear el conductor ahora.
        </p>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-8 pb-24">
        <div className="space-y-8 rounded-md border border-border bg-surface p-6">
          <fieldset disabled={isSubmitting} className="space-y-4">
            <legend className="mb-2 text-title font-display text-text">Datos personales</legend>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Nombres" htmlFor="first_name" error={errors.first_name?.message}>
                <input
                  id="first_name"
                  className="focus-ring w-full rounded-xs border border-border bg-surface px-3 py-2 text-body text-text outline-none"
                  {...register('first_name')}
                />
              </Field>
              <Field label="Apellidos" htmlFor="last_name" error={errors.last_name?.message}>
                <input
                  id="last_name"
                  className="focus-ring w-full rounded-xs border border-border bg-surface px-3 py-2 text-body text-text outline-none"
                  {...register('last_name')}
                />
              </Field>
              <Field label="Cédula" htmlFor="national_id" error={errors.national_id?.message}>
                <input
                  id="national_id"
                  className="focus-ring w-full rounded-xs border border-border bg-surface px-3 py-2 text-numeric text-text outline-none"
                  {...register('national_id')}
                />
              </Field>
              <Field label="Teléfono" htmlFor="phone" error={errors.phone?.message}>
                <input
                  id="phone"
                  className="focus-ring w-full rounded-xs border border-border bg-surface px-3 py-2 text-numeric text-text outline-none"
                  {...register('phone')}
                />
              </Field>
              <Field label="Correo (opcional)" htmlFor="email" error={errors.email?.message}>
                <input
                  id="email"
                  type="email"
                  className="focus-ring w-full rounded-xs border border-border bg-surface px-3 py-2 text-body text-text outline-none"
                  {...register('email', {
                    setValueAs: (value: string) => (value === '' ? undefined : value),
                  })}
                />
              </Field>
              <Field label="Licencia (opcional)" htmlFor="license" error={errors.license?.message}>
                <input
                  id="license"
                  className="focus-ring w-full rounded-xs border border-border bg-surface px-3 py-2 text-body text-text outline-none"
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
              <Field label="Placa" htmlFor="vehicle.plate" error={errors.vehicle?.plate?.message}>
                <input
                  id="vehicle.plate"
                  className="focus-ring w-full rounded-xs border border-border bg-surface px-3 py-2 text-numeric uppercase text-text outline-none"
                  {...register('vehicle.plate')}
                />
              </Field>
              <Field label="Modelo" htmlFor="vehicle.model" error={errors.vehicle?.model?.message}>
                <input
                  id="vehicle.model"
                  className="focus-ring w-full rounded-xs border border-border bg-surface px-3 py-2 text-body text-text outline-none"
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
                  className="focus-ring w-full rounded-xs border border-border bg-surface px-3 py-2 text-numeric text-text outline-none"
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
            disabled={!isValid || isSubmitting || !online}
            className="focus-ring rounded-sm bg-amber px-4 py-2 text-btn font-display text-on-brand hover:bg-amber-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Creando…' : 'Crear conductor'}
          </button>
        </div>
      </form>
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
