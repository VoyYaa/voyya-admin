import { useCallback, useEffect, useMemo, useState, type JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  OPS_LIST_DEFAULT_LIMIT,
  type DriverStatus,
  type OpsDriverDetail,
  type OpsDriverRow,
} from '@voyyaa/shared';
import { getOpsDriverDetail, getOpsDrivers } from '../api/ops-drivers.api';
import { resendDriverPin } from '../api/admin-drivers.api';
import { DetailDrawer } from '../components/ui/DetailDrawer';
import { FreshnessBar } from '../components/ui/FreshnessBar';
import { StatusDot } from '../components/ui/StatusDot';
import { EmptyPanel, ErrorPanel, SkeletonRows } from '../components/ui/TableStates';
import { useAsync } from '../hooks/useAsync';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useNetworkOnline } from '../hooks/useNetworkOnline';
import { DRIVER_STATUS_LABELS, DRIVER_STATUS_TONES } from '../lib/status-maps';
import { computeSkewMs, elapsedMsSince, formatRelativeMinutes } from '../lib/time';
import { useSessionStore } from '../state/session-store';

const STATUS_OPTIONS: DriverStatus[] = [
  'available',
  'on_trip',
  'off_shift',
  'inactive',
  'suspended',
  'documents_blocked',
];

export function OpsDriversPage(): JSX.Element {
  const role = useSessionStore((s) => s.user?.role);
  const online = useNetworkOnline();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput, 300);
  const [statusFilter, setStatusFilter] = useState<DriverStatus | 'all'>('all');
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);

  const fetcher = useCallback(
    () =>
      getOpsDrivers({
        search: search.trim().length > 0 ? search.trim() : undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: OPS_LIST_DEFAULT_LIMIT,
      }),
    [search, statusFilter],
  );

  const { data, status, refetch } = useAsync(fetcher);

  useEffect(() => {
    if (status === 'success') setLastLoadedAt(Date.now());
  }, [status, data]);

  const skewMs = useMemo(() => (data ? computeSkewMs(data.server_time) : 0), [data]);
  const rows = data?.rows ?? [];
  const hasAnyFilter = search.trim().length > 0 || statusFilter !== 'all';

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-surface px-6 py-3">
        <h1 className="text-display font-display text-text">Conductores</h1>
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Buscar por nombre, cédula o placa"
          aria-label="Buscar por nombre, cédula o placa"
          className="focus-ring min-w-[220px] rounded-xs border border-border bg-surface px-3 py-1.5 text-body text-text outline-none"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as DriverStatus | 'all')}
          aria-label="Filtrar por estado"
          className="focus-ring rounded-xs border border-border bg-surface px-3 py-1.5 text-body text-text"
        >
          <option value="all">Todos los estados</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {DRIVER_STATUS_LABELS[option]}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <button
          type="button"
          onClick={refetch}
          disabled={!online}
          className="focus-ring rounded-sm border border-border px-3 py-1.5 text-btn font-display text-text hover:bg-bg-shell disabled:cursor-not-allowed disabled:opacity-60"
        >
          Actualizar
        </button>
        {role === 'admin' && (
          <Link
            to="/admin/drivers/new"
            aria-disabled={!online}
            onClick={(event) => {
              if (!online) event.preventDefault();
            }}
            className="focus-ring rounded-sm bg-amber px-4 py-1.5 text-btn font-display text-on-brand hover:bg-amber-deep aria-disabled:pointer-events-none aria-disabled:opacity-60"
          >
            Nuevo conductor
          </Link>
        )}
        <FreshnessBar state={online ? 'stale' : 'offline'} lastUpdatedAtMs={lastLoadedAt} />
      </div>

      <div className={`flex-1 overflow-y-auto ${!online ? 'opacity-85' : ''}`}>
        {status === 'loading' && !data ? (
          <table className="w-full border-collapse">
            <tbody>
              <SkeletonRows columnCount={5} />
            </tbody>
          </table>
        ) : status === 'error' && !data ? (
          <ErrorPanel title="No pudimos cargar los conductores." onRetry={refetch} />
        ) : rows.length === 0 ? (
          hasAnyFilter ? (
            <EmptyPanel
              title="Ningún conductor coincide con ese filtro."
              actionLabel="Quitar filtros"
              onAction={() => {
                setSearchInput('');
                setStatusFilter('all');
              }}
            />
          ) : (
            <EmptyPanel
              title="Todavía no hay conductores."
              actionLabel={role === 'admin' ? 'Crear el primero' : undefined}
              onAction={role === 'admin' ? () => navigate('/admin/drivers/new') : undefined}
            />
          )
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-surface-sunken">
              <tr>
                <th scope="col" className="px-4 py-2 text-left text-table-header text-text-muted">
                  Conductor
                </th>
                <th scope="col" className="px-4 py-2 text-left text-table-header text-text-muted">
                  Vehículo
                </th>
                <th scope="col" className="px-4 py-2 text-left text-table-header text-text-muted">
                  Estado
                </th>
                <th scope="col" className="px-4 py-2 text-left text-table-header text-text-muted">
                  Ubicación
                </th>
                <th scope="col" className="px-4 py-2 text-left text-table-header text-text-muted">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <DriverRow
                  key={row.driver_id}
                  row={row}
                  skewMs={skewMs}
                  onView={() => setSelectedDriverId(row.driver_id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DriverDetailDrawer
        driverId={selectedDriverId}
        onClose={() => setSelectedDriverId(null)}
        canManage={role === 'admin'}
      />
    </div>
  );
}

interface DriverRowProps {
  row: OpsDriverRow;
  skewMs: number;
  onView: () => void;
}

function DriverRow({ row, skewMs, onView }: DriverRowProps): JSX.Element {
  return (
    <tr className="h-row-md border-b border-border">
      <td className="px-4 py-2">
        <p className="text-body text-text">
          {row.first_name} {row.last_name}
        </p>
        <p className="text-small text-text-muted">{row.national_id}</p>
      </td>
      <td className="px-4 py-2 text-body text-text">
        {row.vehicle ? (
          <>
            <span className="text-numeric">{row.vehicle.plate}</span>
            {row.vehicle.model && <span className="text-text-muted"> · {row.vehicle.model}</span>}
          </>
        ) : (
          '—'
        )}
      </td>
      <td className="px-4 py-2">
        <StatusDot
          tone={DRIVER_STATUS_TONES[row.status]}
          label={DRIVER_STATUS_LABELS[row.status]}
        />
      </td>
      <td className="px-4 py-2">
        <LocationCell row={row} skewMs={skewMs} />
      </td>
      <td className="px-4 py-2 text-right">
        <button
          type="button"
          onClick={onView}
          className="focus-ring rounded-sm px-2 py-1 text-small font-medium text-text hover:bg-bg-shell"
        >
          Ver detalle de {row.first_name} {row.last_name}
        </button>
      </td>
    </tr>
  );
}

function LocationCell({ row, skewMs }: { row: OpsDriverRow; skewMs: number }): JSX.Element {
  if (!row.location_updated_at) {
    return <span className="text-small text-text-muted">Sin ubicación registrada</span>;
  }
  const elapsed = elapsedMsSince(row.location_updated_at, skewMs);
  return (
    <div>
      <p className="text-small text-text">{formatRelativeMinutes(elapsed)}</p>
      {row.location_stale && (
        <p className="text-small text-danger-ink dark:text-danger-ink-dark">
          El motor no le está ofreciendo viajes
        </p>
      )}
    </div>
  );
}

interface DriverDetailDrawerProps {
  driverId: number | null;
  onClose: () => void;
  canManage: boolean;
}

function DriverDetailDrawer({
  driverId,
  onClose,
  canManage,
}: DriverDetailDrawerProps): JSX.Element {
  const fetcher = useCallback((): Promise<OpsDriverDetail> => {
    if (driverId === null) return Promise.reject(new Error('No hay conductor seleccionado.'));
    return getOpsDriverDetail(driverId);
  }, [driverId]);

  const { data, status, refetch } = useAsync(fetcher, driverId !== null);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const onResendPin = async (): Promise<void> => {
    if (driverId === null) return;
    setResendState('sending');
    try {
      await resendDriverPin(driverId);
      setResendState('sent');
      refetch();
    } catch {
      setResendState('error');
    }
  };

  return (
    <DetailDrawer open={driverId !== null} title="Detalle del conductor" onClose={onClose}>
      {status === 'loading' && <p className="text-body text-text-muted">Cargando…</p>}
      {status === 'error' && <ErrorPanel title="No pudimos cargar el detalle." onRetry={refetch} />}
      {status === 'success' && data && (
        <div className="space-y-4">
          <div>
            <StatusDot
              tone={DRIVER_STATUS_TONES[data.status]}
              label={DRIVER_STATUS_LABELS[data.status]}
            />
          </div>
          <dl className="space-y-2 text-body text-text">
            <div>
              <dt className="text-small text-text-muted">Nombre</dt>
              <dd>
                {data.first_name} {data.last_name}
              </dd>
            </div>
            <div>
              <dt className="text-small text-text-muted">Cédula</dt>
              <dd className="text-numeric">{data.national_id}</dd>
            </div>
            <div>
              <dt className="text-small text-text-muted">Teléfono</dt>
              <dd className="text-numeric">{data.phone}</dd>
            </div>
            <div>
              <dt className="text-small text-text-muted">Licencia</dt>
              <dd>{data.license ?? 'No registrada'}</dd>
            </div>
            <div>
              <dt className="text-small text-text-muted">Vehículo</dt>
              <dd>
                {data.vehicle
                  ? `${data.vehicle.plate} · ${data.vehicle.model ?? ''}`
                  : 'Sin vehículo'}
              </dd>
            </div>
          </dl>

          {canManage && (
            <div className="space-y-2 border-t border-border pt-4">
              {data.pin_delivered_at === null && (
                <div>
                  <button
                    type="button"
                    onClick={() => void onResendPin()}
                    disabled={resendState === 'sending'}
                    className="focus-ring rounded-sm border border-border px-3 py-1.5 text-btn font-display text-text hover:bg-bg-shell disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {resendState === 'sending' ? 'Reenviando…' : 'Reenviar PIN'}
                  </button>
                  {resendState === 'sent' && (
                    <p className="mt-1 text-small text-success">PIN reenviado.</p>
                  )}
                  {resendState === 'error' && (
                    <p className="mt-1 text-small text-danger-ink dark:text-danger-ink-dark">
                      No pudimos reenviar el PIN. Intenta de nuevo.
                    </p>
                  )}
                </div>
              )}
              <button
                type="button"
                disabled
                aria-disabled="true"
                title="Disponible en un próximo ciclo"
                className="rounded-sm border border-border px-3 py-1.5 text-btn font-display text-text-muted opacity-60"
              >
                Suspender
              </button>
            </div>
          )}
        </div>
      )}
    </DetailDrawer>
  );
}
