import { useCallback, useMemo, useState, type JSX } from 'react';
import {
  OPS_LIST_DEFAULT_LIMIT,
  OPS_QUEUE_POLL_INTERVAL_MS,
  type OpsQueueRow,
  type OpsQueueStatusFilter,
  type OpsTripDetail,
} from '@voyyaa/shared';
import { getOpsQueue, getOpsTripDetail } from '../api/ops-queue.api';
import { DetailDrawer } from '../components/ui/DetailDrawer';
import { FreshnessBar } from '../components/ui/FreshnessBar';
import { StatusDot } from '../components/ui/StatusDot';
import { EmptyPanel, ErrorPanel, SkeletonRows } from '../components/ui/TableStates';
import { Timeline } from '../components/ui/Timeline';
import { useAsync } from '../hooks/useAsync';
import { useOpsPolling } from '../hooks/useOpsPolling';
import { useQueueAnnouncement } from '../hooks/useQueueAnnouncement';
import { useRowFlash } from '../hooks/useRowFlash';
import { elapsedMsSince, formatClockTime, formatDurationMmSs } from '../lib/time';
import {
  QUEUE_FILTER_LABELS,
  TRIP_STATUS_LABELS,
  TRIP_STATUS_TONES,
  type StatusTone,
} from '../lib/status-maps';

function QueueColGroup(): JSX.Element {
  return (
    <colgroup>
      <col style={{ width: '9%' }} />
      <col style={{ width: '15%' }} />
      <col style={{ width: '32%' }} />
      <col style={{ width: '17%' }} />
      <col style={{ width: '15%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '4%' }} />
    </colgroup>
  );
}

const FILTER_OPTIONS: OpsQueueStatusFilter[] = [
  'all',
  'pending',
  'assigned',
  'in_progress',
  'no_driver',
];

export function OpsQueuePage(): JSX.Element {
  const [statusFilter, setStatusFilter] = useState<OpsQueueStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);

  const fetcher = useCallback(
    () => getOpsQueue({ status: statusFilter, limit: OPS_LIST_DEFAULT_LIMIT }),
    [statusFilter],
  );

  const { data, freshness, skewMs, lastSuccessAt, error, isInitialLoading, refetch } =
    useOpsPolling(fetcher, OPS_QUEUE_POLL_INTERVAL_MS);

  const rows = useMemo(() => data?.rows ?? [], [data]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term.length === 0) return rows;
    return rows.filter(
      (row) =>
        row.passenger_name.toLowerCase().includes(term) ||
        (row.driver?.name.toLowerCase().includes(term) ?? false),
    );
  }, [rows, search]);

  const flashSource = useMemo(
    () => filteredRows.map((row) => ({ id: row.trip_request_id, status: row.status })),
    [filteredRows],
  );
  const flashing = useRowFlash(flashSource);
  const announcement = useQueueAnnouncement(flashSource);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-surface px-6 py-3">
        <div>
          <p className="text-eyebrow uppercase text-amber-ink dark:text-amber">Operación</p>
          <h1 className="text-display font-display text-text">Cola en vivo</h1>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setStatusFilter(option)}
              aria-pressed={statusFilter === option}
              className={`focus-ring rounded-sm border px-3 py-1.5 text-small font-medium ${
                statusFilter === option
                  ? 'border-amber bg-amber/15 text-text'
                  : 'border-border text-text-muted hover:text-text'
              }`}
            >
              {QUEUE_FILTER_LABELS[option]}
            </button>
          ))}
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por pasajero o conductor"
            aria-label="Buscar por pasajero o conductor"
            className="focus-ring min-w-[220px] flex-1 rounded-xs border border-border bg-surface px-3 py-1.5 text-body text-text outline-none"
          />
        </div>
        <span className="text-numeric text-small text-text-muted">
          {filteredRows.length} solicitud{filteredRows.length === 1 ? '' : 'es'}
        </span>
        <FreshnessBar state={freshness} lastUpdatedAtMs={lastSuccessAt} />
      </div>

      <div
        className={`flex-1 overflow-y-auto bg-surface ${freshness === 'offline' ? 'opacity-85' : ''}`}
      >
        {isInitialLoading ? (
          <table className="w-full table-fixed border-collapse">
            <QueueColGroup />
            <tbody>
              <SkeletonRows columnCount={7} />
            </tbody>
          </table>
        ) : error && !data ? (
          <ErrorPanel title="No pudimos cargar la cola." onRetry={refetch} />
        ) : filteredRows.length === 0 ? (
          <EmptyPanel
            title="No hay solicitudes activas."
            description="Te avisaremos apenas entre una nueva solicitud."
          />
        ) : (
          <table className="w-full table-fixed border-collapse">
            <QueueColGroup />
            <thead className="sticky top-0 z-10 bg-surface-sunken">
              <tr>
                <th
                  scope="col"
                  className="border-l-[3px] border-l-transparent py-2 pl-[13px] pr-4 text-right text-table-header text-text-muted"
                >
                  Hora
                </th>
                <th scope="col" className="px-4 py-2 text-left text-table-header text-text-muted">
                  Pasajero
                </th>
                <th scope="col" className="px-4 py-2 text-left text-table-header text-text-muted">
                  Origen → Destino
                </th>
                <th scope="col" className="px-4 py-2 text-left text-table-header text-text-muted">
                  Estado
                </th>
                <th scope="col" className="px-4 py-2 text-left text-table-header text-text-muted">
                  Conductor
                </th>
                <th scope="col" className="px-4 py-2 text-right text-table-header text-text-muted">
                  Tiempo en estado
                </th>
                <th scope="col" className="px-4 py-2 text-left text-table-header text-text-muted">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <QueueRow
                  key={row.trip_request_id}
                  row={row}
                  skewMs={skewMs}
                  isFlashing={flashing[row.trip_request_id] === true}
                  onView={() => setSelectedTripId(row.trip_request_id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>

      <TripDetailDrawer tripId={selectedTripId} onClose={() => setSelectedTripId(null)} />
    </div>
  );
}

const FLASH_BG_CLASS: Record<StatusTone, string> = {
  success: 'bg-success/15',
  brand: 'bg-amber/15',
  danger: 'bg-danger/15',
  neutral: 'bg-status-neutral',
};

const RAIL_BORDER_CLASS: Record<StatusTone, string> = {
  success: 'border-l-success',
  brand: 'border-l-amber',
  danger: 'border-l-danger',
  neutral: 'border-l-status-neutral',
};

interface QueueRowProps {
  row: OpsQueueRow;
  skewMs: number;
  isFlashing: boolean;
  onView: () => void;
}

function QueueRow({ row, skewMs, isFlashing, onView }: QueueRowProps): JSX.Element {
  const tone = TRIP_STATUS_TONES[row.status];
  const elapsed = elapsedMsSince(row.status_since, skewMs);
  const routeLabel = `${row.pickup_address} → ${row.dropoff_address}`;

  return (
    <tr
      className={`h-row-md border-b border-border transition-colors duration-300 motion-reduce:transition-none ${
        isFlashing ? FLASH_BG_CLASS[tone] : 'hover:bg-bg-shell'
      }`}
    >
      <td
        className={`whitespace-nowrap border-l-[3px] py-2 pl-[13px] pr-4 text-right text-numeric text-body text-text ${RAIL_BORDER_CLASS[tone]}`}
      >
        {formatClockTime(row.requested_at)}
      </td>
      <td className="px-4 py-2 text-body font-medium text-text">{row.passenger_name}</td>
      <td className="truncate px-4 py-2 text-body text-text" title={routeLabel}>
        <span>{row.pickup_address}</span>
        <span className="text-text-muted"> → </span>
        <span>{row.dropoff_address}</span>
      </td>
      <td className="px-4 py-2">
        <StatusDot tone={tone} label={TRIP_STATUS_LABELS[row.status]} />
      </td>
      <td className="px-4 py-2 text-body text-text">
        {row.driver ? `${row.driver.name} · ${row.driver.plate}` : '—'}
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-right text-numeric text-body text-text">
        {formatDurationMmSs(elapsed)}
      </td>
      <td className="px-4 py-2 text-right">
        <button
          type="button"
          onClick={onView}
          aria-label={`Ver detalle de la solicitud de ${row.passenger_name}`}
          className="focus-ring rounded-sm px-2 py-1 text-small font-medium text-text hover:bg-bg-shell"
        >
          Ver
        </button>
      </td>
    </tr>
  );
}

interface TripDetailDrawerProps {
  tripId: number | null;
  onClose: () => void;
}

function TripDetailDrawer({ tripId, onClose }: TripDetailDrawerProps): JSX.Element {
  const fetcher = useCallback((): Promise<OpsTripDetail> => {
    if (tripId === null) return Promise.reject(new Error('No hay solicitud seleccionada.'));
    return getOpsTripDetail(tripId);
  }, [tripId]);

  const { data, status, refetch } = useAsync(fetcher, tripId !== null);

  return (
    <DetailDrawer open={tripId !== null} title="Detalle de la solicitud" onClose={onClose}>
      {status === 'loading' && <p className="text-body text-text-muted">Cargando…</p>}
      {status === 'error' && <ErrorPanel title="No pudimos cargar el detalle." onRetry={refetch} />}
      {status === 'success' && data && (
        <div className="space-y-4">
          <div>
            <StatusDot
              tone={TRIP_STATUS_TONES[data.status]}
              label={TRIP_STATUS_LABELS[data.status]}
            />
          </div>
          <dl className="space-y-2 text-body text-text">
            <div>
              <dt className="text-small text-text-muted">Pasajero</dt>
              <dd>{data.passenger_name}</dd>
            </div>
            <div>
              <dt className="text-small text-text-muted">Origen</dt>
              <dd>{data.pickup_address}</dd>
            </div>
            <div>
              <dt className="text-small text-text-muted">Destino</dt>
              <dd>{data.dropoff_address}</dd>
            </div>
            <div>
              <dt className="text-small text-text-muted">Conductor</dt>
              <dd>{data.driver ? `${data.driver.name} · ${data.driver.plate}` : 'Sin asignar'}</dd>
            </div>
            <div>
              <dt className="text-small text-text-muted">Tarifa total</dt>
              <dd className="text-numeric">${data.fare.total.toLocaleString('es-CO')}</dd>
            </div>
          </dl>
          <div>
            <h3 className="mb-2 text-title font-display text-text">Línea de tiempo</h3>
            <Timeline
              items={[
                { label: 'Creada', timestamp: data.timeline.requested_at },
                { label: 'Asignada', timestamp: data.timeline.assigned_at },
                { label: 'Conductor llegó', timestamp: data.timeline.arrived_at },
                { label: 'Finalizada', timestamp: data.timeline.finished_at },
              ]}
            />
          </div>
        </div>
      )}
    </DetailDrawer>
  );
}
