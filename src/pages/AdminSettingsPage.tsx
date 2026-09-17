import { useCallback, useEffect, useMemo, useState, type JSX, type ReactNode } from 'react';
import type { ConsoleSettings, UpdateConsoleSettingsDTO } from '@voyyaa/shared';
import { getConsoleSettings, updateConsoleSettings } from '../api/admin-settings.api';
import { domainErrorCode, domainErrorField, isNetworkError } from '../api/errors';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorPanel } from '../components/ui/TableStates';
import { useAsync } from '../hooks/useAsync';
import { useNetworkOnline } from '../hooks/useNetworkOnline';
import { useToastStore } from '../state/toast-store';

type EditableFields = Pick<
  UpdateConsoleSettingsDTO,
  | 'base_fare'
  | 'night_surcharge_pct'
  | 'holiday_surcharge_pct'
  | 'search_radius_km'
  | 'acceptance_timeout_sec'
>;

type FieldName = keyof EditableFields;

const FIELD_LABELS: Record<FieldName, string> = {
  base_fare: 'Tarifa base',
  night_surcharge_pct: 'Recargo nocturno',
  holiday_surcharge_pct: 'Recargo festivo',
  search_radius_km: 'Radio de búsqueda',
  acceptance_timeout_sec: 'Timeout de aceptación',
};

function formatFieldValue(field: FieldName, value: number): string {
  if (field === 'base_fare') return `$${value.toLocaleString('es-CO')}`;
  if (field === 'night_surcharge_pct' || field === 'holiday_surcharge_pct') return `${value}%`;
  if (field === 'search_radius_km') return `${value} km`;
  return `${value} s`;
}

function toEditable(settings: ConsoleSettings): EditableFields {
  return {
    base_fare: settings.base_fare,
    night_surcharge_pct: settings.night_surcharge_pct,
    holiday_surcharge_pct: settings.holiday_surcharge_pct,
    search_radius_km: settings.search_radius_km,
    acceptance_timeout_sec: settings.acceptance_timeout_sec,
  };
}

export function AdminSettingsPage(): JSX.Element {
  const online = useNetworkOnline();
  const pushToast = useToastStore((s) => s.pushToast);
  const fetcher = useCallback(() => getConsoleSettings(), []);
  const { data, status, refetch } = useAsync(fetcher);

  const [draft, setDraft] = useState<EditableFields | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    if (data) setDraft(toEditable(data));
  }, [data]);

  const baseline = useMemo(() => (data ? toEditable(data) : null), [data]);

  const dirtyFields = useMemo<FieldName[]>(() => {
    if (!draft || !baseline) return [];
    return (Object.keys(baseline) as FieldName[]).filter((key) => draft[key] !== baseline[key]);
  }, [draft, baseline]);

  const hasChanges = dirtyFields.length > 0;

  const setField = (field: FieldName, value: number): void => {
    setFieldError(null);
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  };

  const discardChanges = (): void => {
    if (baseline) setDraft(baseline);
    setFieldError(null);
  };

  const onSave = async (): Promise<void> => {
    if (!draft || !data) return;
    setSaving(true);
    setFieldError(null);
    setConflict(false);
    try {
      await updateConsoleSettings({ version: data.version, ...draft });
      setConfirmOpen(false);
      pushToast('success', 'Parámetros actualizados · aplican a las solicitudes nuevas.');
      refetch();
    } catch (err) {
      const code = domainErrorCode(err);
      if (code === 'SETTINGS_CONFLICT') {
        setConfirmOpen(false);
        setConflict(true);
      } else if (code === 'SETTINGS_OUT_OF_RANGE') {
        setConfirmOpen(false);
        setFieldError({
          field: domainErrorField(err) ?? '',
          message: 'Este valor está fuera del rango permitido.',
        });
      } else if (isNetworkError(err)) {
        setConfirmOpen(false);
        setFieldError({ field: '', message: 'Sin conexión · no se puede guardar ahora.' });
      } else {
        setConfirmOpen(false);
        setFieldError({ field: '', message: 'No pudimos guardar los cambios.' });
      }
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' && !data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="space-y-6 rounded-md border border-border bg-surface p-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-xs bg-bg-shell motion-reduce:animate-none"
            />
          ))}
        </div>
      </div>
    );
  }

  if (status === 'error' && !data) {
    return <ErrorPanel title="No pudimos cargar los parámetros." onRetry={refetch} />;
  }

  if (!data || !draft) return <></>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 pb-28">
      <h1 className="mb-6 text-display font-display text-text">Parámetros</h1>

      {conflict && (
        <div className="mb-6 rounded-xs border border-amber/40 bg-amber/10 px-4 py-3">
          <p className="text-body text-text">
            Alguien más actualizó los parámetros mientras editabas. Revisa los valores actuales
            antes de guardar.
          </p>
          <button
            type="button"
            onClick={() => {
              setConflict(false);
              refetch();
            }}
            className="focus-ring mt-2 rounded-sm border border-border px-3 py-1.5 text-btn font-display text-text hover:bg-bg-shell"
          >
            Ver valores actuales
          </button>
        </div>
      )}

      {!online && (
        <p
          role="alert"
          className="mb-6 rounded-xs bg-danger-tint px-3 py-2 text-body text-danger-ink"
        >
          Sin conexión · no se puede guardar ahora.
        </p>
      )}

      {fieldError && fieldError.field === '' && (
        <p
          role="alert"
          className="mb-6 rounded-xs bg-danger-tint px-3 py-2 text-body text-danger-ink"
        >
          {fieldError.message}
        </p>
      )}

      <div className="rounded-md border border-border bg-surface p-6">
        <section className="mb-8 border-b border-border pb-6">
          <h2 className="mb-3 text-title font-display text-text">Tarifa base</h2>
          <SettingsRow
            label={FIELD_LABELS.base_fare}
            dirty={dirtyFields.includes('base_fare')}
            error={fieldError?.field === 'base_fare' ? fieldError.message : undefined}
          >
            <input
              type="number"
              step={500}
              min={1}
              max={1_000_000}
              value={draft.base_fare}
              onChange={(event) => setField('base_fare', Number(event.target.value))}
              className="focus-ring w-40 rounded-xs border border-border bg-surface px-3 py-2 text-numeric text-text outline-none"
            />
          </SettingsRow>
        </section>

        <section className="mb-8 border-b border-border pb-6">
          <h2 className="mb-3 text-title font-display text-text">Recargos</h2>
          <SettingsRow
            label={FIELD_LABELS.night_surcharge_pct}
            helper="9pm–5am"
            dirty={dirtyFields.includes('night_surcharge_pct')}
            error={fieldError?.field === 'night_surcharge_pct' ? fieldError.message : undefined}
          >
            <input
              type="number"
              step={0.01}
              min={0}
              max={100}
              value={draft.night_surcharge_pct}
              onChange={(event) => setField('night_surcharge_pct', Number(event.target.value))}
              className="focus-ring w-28 rounded-xs border border-border bg-surface px-3 py-2 text-numeric text-text outline-none"
            />
          </SettingsRow>
          <SettingsRow
            label={FIELD_LABELS.holiday_surcharge_pct}
            helper="Domingos y festivos"
            dirty={dirtyFields.includes('holiday_surcharge_pct')}
            error={fieldError?.field === 'holiday_surcharge_pct' ? fieldError.message : undefined}
          >
            <input
              type="number"
              step={0.01}
              min={0}
              max={100}
              value={draft.holiday_surcharge_pct}
              onChange={(event) => setField('holiday_surcharge_pct', Number(event.target.value))}
              className="focus-ring w-28 rounded-xs border border-border bg-surface px-3 py-2 text-numeric text-text outline-none"
            />
          </SettingsRow>
        </section>

        <section className="mb-8 border-b border-border pb-6">
          <h2 className="mb-3 text-title font-display text-text">Comisión por viaje</h2>
          <p className="text-numeric text-title text-text">{data.commission_pct}%</p>
          <p className="text-small text-text-muted">No editable en este ciclo.</p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-title font-display text-text">Parámetros de asignación</h2>
          <SettingsRow
            label={FIELD_LABELS.search_radius_km}
            dirty={dirtyFields.includes('search_radius_km')}
            error={fieldError?.field === 'search_radius_km' ? fieldError.message : undefined}
          >
            <input
              type="number"
              step={0.1}
              min={0.1}
              max={50}
              value={draft.search_radius_km}
              onChange={(event) => setField('search_radius_km', Number(event.target.value))}
              className="focus-ring w-28 rounded-xs border border-border bg-surface px-3 py-2 text-numeric text-text outline-none"
            />
          </SettingsRow>
          <SettingsRow
            label={FIELD_LABELS.acceptance_timeout_sec}
            dirty={dirtyFields.includes('acceptance_timeout_sec')}
            error={fieldError?.field === 'acceptance_timeout_sec' ? fieldError.message : undefined}
          >
            <input
              type="number"
              step={1}
              min={5}
              max={120}
              value={draft.acceptance_timeout_sec}
              onChange={(event) => setField('acceptance_timeout_sec', Number(event.target.value))}
              className="focus-ring w-28 rounded-xs border border-border bg-surface px-3 py-2 text-numeric text-text outline-none"
            />
          </SettingsRow>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 flex justify-end gap-3 border-t border-border bg-surface px-6 py-4">
        <button
          type="button"
          onClick={discardChanges}
          disabled={!hasChanges}
          className="focus-ring rounded-sm border border-border px-4 py-2 text-btn font-display text-text hover:bg-bg-shell disabled:cursor-not-allowed disabled:opacity-60"
        >
          Descartar cambios
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={!hasChanges || !online || saving}
          className="focus-ring rounded-sm bg-amber px-4 py-2 text-btn font-display text-on-brand hover:bg-amber-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Confirmar cambios de tarifa?"
        confirmLabel="Guardar cambios"
        cancelLabel="Seguir editando"
        onConfirm={() => void onSave()}
        onCancel={() => setConfirmOpen(false)}
        confirmDisabled={saving}
      >
        <div className="space-y-2">
          <table className="w-full text-small">
            <tbody>
              {dirtyFields.map((field) => (
                <tr key={field}>
                  <td className="py-1 pr-4 text-text-muted">{FIELD_LABELS[field]}</td>
                  <td className="py-1 text-numeric text-text">
                    {baseline && formatFieldValue(field, baseline[field])} →{' '}
                    {formatFieldValue(field, draft[field])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-small text-text-muted">
            Aplican a las solicitudes nuevas. Los viajes en curso mantienen su tarifa ya calculada.
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
}

interface SettingsRowProps {
  label: string;
  helper?: string;
  dirty: boolean;
  error?: string;
  children: ReactNode;
}

function SettingsRow({ label, helper, dirty, error, children }: SettingsRowProps): JSX.Element {
  return (
    <div className="flex h-row-lg items-center justify-between gap-4 border-b border-border last:border-b-0">
      <div>
        <p className="flex items-center gap-2 text-body text-text">
          {dirty && <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-hidden="true" />}
          {label}
        </p>
        {helper && <p className="text-small text-text-muted">{helper}</p>}
        {error && <p className="text-small text-danger-ink dark:text-danger-ink-dark">{error}</p>}
      </div>
      {children}
    </div>
  );
}
