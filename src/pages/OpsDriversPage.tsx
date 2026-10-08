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
import { SuspendDriverAction } from '../components/drivers/SuspendDriverAction';
import { Button } from '../components/ui/Button';
import { buttonClassName } from '../components/ui/button-styles';
import { DetailDrawer } from '../components/ui/DetailDrawer';
import { FreshnessBar } from '../components/ui/FreshnessBar';
import { PageToolbar } from '../components/ui/PageToolbar';
import { StatusDot } from '../components/ui/StatusDot';
import { DetailSkeleton, EmptyPanel, ErrorPanel, SkeletonRows } from '../components/ui/TableStates';
import { ROW_CLASS, TABLE_HEAD_CLASS, TH_CLASS } from '../components/ui/table-styles';
import { useAsync } from '../hooks/useAsync';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useNetworkOnline } from '../hooks/useNetworkOnline';
import { DRIVER_STATUS_LABELS, DRIVER_STATUS_TONES, type StatusTone } from '../lib/status-maps';
import { computeSkewMs, elapsedMsSince, formatRelativeMinutes } from '../lib/time';
import { useSessionStore } from '../state/session-store';

function DriversColGroup(): JSX.Element {
  return (
    <colgroup>
      <col style={{ width: '26%' }} />
      <col style={{ width: '20%' }} />
      <col style={{ width: '19%' }} />
      <col style={{ width: '24%' }} />
      <col style={{ width: '11%' }} />
    </colgroup>
  );
}

const RAIL_BORDER_CLASS: Record<StatusTone, string> = {
  success: 'border-l-success',
  brand: 'border-l-amber',
  danger: 'border-l-danger',
  neutral: 'border-l-status-neutral',
  strong: 'border-l-espresso dark:border-l-crema',
};

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

  const { data, status, isInitialLoading, refetch } = useAsync(fetcher);

  useEffect(() => {
    if (status === 'success') setLastLoadedAt(Date.now());
  }, [status, data]);

  const skewMs = useMemo(() => (data ? computeSkewMs(data.server_time) : 0), [data]);
  const rows = data?.rows ?? [];
  const hasAnyFilter = search.trim().length > 0 || statusFilter !== 'all';

  return (
    <div className="flex h-full flex-col">
      <PageToolbar eyebrow="Flota" title="Conductores">
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Buscar por nombre, cédula o placa"
          aria-label="Buscar por nombre, cédula o placa"
          className="vy-input min-w-[220px] max-w-xs flex-1"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as DriverStatus | 'all')}
          aria-label="Filtrar por estado"
          className="vy-input w-auto"
        >
          <option value="all">Todos los estados</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {DRIVER_STATUS_LABELS[option]}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <Button variant="ghost" onClick={refetch} disabled={!online}>
          Actualizar
        </Button>
        {role === 'admin' && (
          <Link
            to="/admin/drivers/new"
            aria-disabled={!online}
            onClick={(event) => {
              if (!online) event.preventDefault();
            }}
            className={buttonClassName('primary', 'md')}
          >
            Nuevo conductor
          </Link>
        )}
        <FreshnessBar state={online ? 'stale' : 'offline'} lastUpdatedAtMs={lastLoadedAt} />
      </PageToolbar>

      <div className={`flex-1 overflow-y-auto bg-surface ${!online ? 'opacity-85' : ''}`}>
        {isInitialLoading ? (
          <table className="w-full table-fixed border-collapse">
            <DriversColGroup />
            <tbody>
              <SkeletonRows columnCount={5} />
            </tbody>
          </table>
        ) : status === 'error' && !data ? (
          <ErrorPanel
            title="No pudimos cargar los conductores."
            onRetry={refetch}
            variant={online ? 'error' : 'offline'}
          />
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
          <table className="w-full table-fixed border-collapse">
            <DriversColGroup />
            <thead className={TABLE_HEAD_CLASS}>
              <tr>
                <th
                  scope="col"
                  className="border-l-rail border-l-transparent py-2 pl-[13px] pr-4 text-left text-table-header uppercase text-text-muted"
                >
                  Conductor
                </th>
                <th scope="col" className={TH_CLASS}>
                  Vehículo
                </th>
                <th scope="col" className={TH_CLASS}>
                  Estado
                </th>
                <th scope="col" className={TH_CLASS}>
                  Ubicación
                </th>
                <th scope="col" className={TH_CLASS}>
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
        onDriverChanged={refetch}
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
    <tr className={`${ROW_CLASS} hover:bg-bg-shell`}>
      <td
        className={`border-l-rail py-2 pl-[13px] pr-4 ${RAIL_BORDER_CLASS[DRIVER_STATUS_TONES[row.status]]}`}
      >
        <p className="text-body font-bold text-text">
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
      <td className="px-2 py-2 text-right">
        <Button
          variant="ghost"
          onClick={onView}
          aria-label={`Ver detalle de ${row.first_name} ${row.last_name}`}
        >
          Ver
        </Button>
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
  onDriverChanged: () => void;
}

function DriverDetailDrawer({
  driverId,
  onClose,
  canManage,
  onDriverChanged,
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
      {status === 'loading' && <DetailSkeleton />}
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
                  <Button
                    variant="ghost"
                    onClick={() => void onResendPin()}
                    loading={resendState === 'sending'}
                  >
                    {resendState === 'sending' ? 'Reenviando…' : 'Reenviar PIN'}
                  </Button>
                  {resendState === 'sent' && (
                    <p className="mt-1 text-small text-success-ink dark:text-success-ink-dark">
                      PIN reenviado.
                    </p>
                  )}
                  {resendState === 'error' && (
                    <p className="mt-1 text-small text-danger-ink dark:text-danger-ink-dark">
                      No pudimos reenviar el PIN. Intenta de nuevo.
                    </p>
                  )}
                </div>
              )}
              <SuspendDriverAction
                driverId={data.driver_id}
                fullName={`${data.first_name} ${data.last_name}`}
                status={data.status}
                onSuspended={() => {
                  refetch();
                  onDriverChanged();
                }}
              />
            </div>
          )}
        </div>
      )}
    </DetailDrawer>
  );
}
