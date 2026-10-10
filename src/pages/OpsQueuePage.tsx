import { useCallback, useEffect, useMemo, useState, type JSX } from 'react';
import {
  OPS_LIST_DEFAULT_LIMIT,
  OPS_QUEUE_FILTER_STATUSES,
  OPS_QUEUE_POLL_INTERVAL_MS,
  type OpsQueueRow,
  type OpsQueueStatusFilter,
  type OpsTripDetail,
  type TripStatus,
} from '@voyyaa/shared';
import { getOpsQueue, getOpsTripDetail } from '../api/ops-queue.api';
import { StartBlockNotice } from '../components/ops/StartBlockNotice';
import { StartBlockStatus } from '../components/ops/StartBlockStatus';
import { Button } from '../components/ui/Button';
import { DetailDrawer } from '../components/ui/DetailDrawer';
import { FreshnessBar } from '../components/ui/FreshnessBar';
import { PageToolbar } from '../components/ui/PageToolbar';
import { StatStrip, type StatItem } from '../components/ui/StatStrip';
import { StatusDot } from '../components/ui/StatusDot';
import { DetailSkeleton, EmptyPanel, ErrorPanel, SkeletonRows } from '../components/ui/TableStates';
import { Timeline, type TimelineItem } from '../components/ui/Timeline';
import {
  ROW_CLASS,
  TABLE_HEAD_CLASS,
  TH_CLASS,
  TH_RIGHT_CLASS,
} from '../components/ui/table-styles';
import { STAT_COPY } from '../copy/common';
import { TRIP_DETAIL_COPY } from '../copy/drivers';
import { START_BLOCKED_COPY } from '../copy/ops';
import { useAsync } from '../hooks/useAsync';
import { useOpsPolling } from '../hooks/useOpsPolling';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useQueueAnnouncement } from '../hooks/useQueueAnnouncement';
import { useRowFlash } from '../hooks/useRowFlash';
import { START_CODE_MAX_ATTEMPTS, startBlockState } from '../lib/start-block';
import {
  elapsedMsSince,
  formatBogotaDateTime,
  formatClockTime,
  formatDurationMmSs,
} from '../lib/time';
import {
  QUEUE_FILTER_LABELS,
  TONE_DOT_CLASS,
  TRIP_STATUS_LABELS,
  TRIP_STATUS_TONES,
  type StatusTone,
} from '../lib/status-maps';

function QueueColGroup(): JSX.Element {
  return (
    <colgroup>
      <col style={{ width: '9%' }} />
      <col style={{ width: '14%' }} />
      <col style={{ width: '26%' }} />
      <col style={{ width: '16%' }} />
      <col style={{ width: '15%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '11%' }} />
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

function matchesQueueFilter(
  status: TripStatus,
  filter: Exclude<OpsQueueStatusFilter, 'all'>,
): boolean {
  return (OPS_QUEUE_FILTER_STATUSES[filter] as readonly TripStatus[]).includes(status);
}

function countByStatuses(rows: readonly OpsQueueRow[], statuses: readonly TripStatus[]): number {
  return rows.filter((row) => statuses.includes(row.status)).length;
}

function buildStatItems(rows: readonly OpsQueueRow[]): StatItem[] {
  return [
    {
      key: 'pending',
      label: STAT_COPY.searching,
      value: countByStatuses(rows, ['pending_assignment']),
      tone: 'brand',
    },
    {
      key: 'en-route',
      label: STAT_COPY.enRoute,
      value: countByStatuses(rows, ['assigned', 'driver_en_route']),
      tone: 'brand',
    },
    {
      key: 'in-progress',
      label: STAT_COPY.inProgress,
      value: countByStatuses(rows, ['in_progress']),
      tone: 'strong',
    },
    {
      key: 'completed',
      label: STAT_COPY.completed,
      value: countByStatuses(rows, ['completed']),
      tone: 'success',
    },
  ];
}

export function OpsQueuePage(): JSX.Element {
  const [statusFilter, setStatusFilter] = useState<OpsQueueStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);

  const fetcher = useCallback(
    () => getOpsQueue({ status: 'all', limit: OPS_LIST_DEFAULT_LIMIT }),
    [],
  );

  const { data, freshness, skewMs, lastSuccessAt, error, isInitialLoading, refetch } =
    useOpsPolling(fetcher, OPS_QUEUE_POLL_INTERVAL_MS);

  const rows = useMemo(() => data?.rows ?? [], [data]);

  const filterCounts = useMemo(() => {
    const counts = {
      all: rows.length,
      pending: 0,
      assigned: 0,
      in_progress: 0,
      no_driver: 0,
    } as Record<OpsQueueStatusFilter, number>;
    for (const row of rows) {
      for (const option of FILTER_OPTIONS) {
        if (option !== 'all' && matchesQueueFilter(row.status, option)) {
          counts[option] += 1;
        }
      }
    }
    return counts;
  }, [rows]);

  const statusFilteredRows = useMemo(() => {
    if (statusFilter === 'all') return rows;
    return rows.filter((row) => matchesQueueFilter(row.status, statusFilter));
  }, [rows, statusFilter]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term.length === 0) return statusFilteredRows;
    return statusFilteredRows.filter(
      (row) =>
        row.passenger_name.toLowerCase().includes(term) ||
        (row.driver?.name.toLowerCase().includes(term) ?? false),
    );
  }, [statusFilteredRows, search]);

  const flashSource = useMemo(
    () => filteredRows.map((row) => ({ id: row.trip_request_id, status: row.status })),
    [filteredRows],
  );
  const flashing = useRowFlash(flashSource);
  const announcement = useQueueAnnouncement(flashSource);

  const statItems = useMemo<StatItem[]>(() => buildStatItems(rows), [rows]);

  return (
    <div className="flex h-full flex-col">
      <PageToolbar eyebrow="Operación" title="Cola en vivo">
        <div className="flex-1" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por pasajero o conductor"
          aria-label="Buscar por pasajero o conductor"
          className="vy-input min-w-[220px] max-w-sm flex-1"
        />
        <span className="text-numeric text-small text-text-muted">
          {filteredRows.length} solicitud{filteredRows.length === 1 ? '' : 'es'}
        </span>
        <FreshnessBar
          state={freshness}
          lastUpdatedAtMs={lastSuccessAt}
          errorStatus={error?.status}
        />
      </PageToolbar>

      <StatStrip items={statItems} loading={isInitialLoading} />

      <div
        role="tablist"
        aria-label="Filtrar por estado"
        className="flex shrink-0 items-end gap-6 border-b border-border bg-surface px-6"
      >
        {FILTER_OPTIONS.map((option) => {
          const isActive = statusFilter === option;
          const count = filterCounts[option];
          return (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`${QUEUE_FILTER_LABELS[option]}, ${count} solicitud${count === 1 ? '' : 'es'}`}
              onClick={() => setStatusFilter(option)}
              className={`focus-ring -mb-px min-h-tap border-b-rail px-0.5 text-body font-bold transition-colors motion-reduce:transition-none ${
                isActive
                  ? 'border-b-amber text-text'
                  : 'border-b-transparent text-text-muted hover:border-b-amber/40 hover:text-text'
              }`}
            >
              <span aria-hidden="true">
                {QUEUE_FILTER_LABELS[option]} <span className="text-numeric">· {count}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        className={`flex-1 overflow-y-auto bg-surface ${freshness === 'offline' || freshness === 'error' ? 'opacity-85' : ''}`}
      >
        {isInitialLoading ? (
          <table className="w-full table-fixed border-collapse">
            <QueueColGroup />
            <tbody>
              <SkeletonRows columnCount={7} />
            </tbody>
          </table>
        ) : error && !data ? (
          <ErrorPanel
            title="No pudimos cargar la cola."
            onRetry={refetch}
            variant={freshness === 'offline' ? 'offline' : 'error'}
          />
        ) : filteredRows.length === 0 ? (
          <EmptyPanel
            title="No hay solicitudes activas."
            description="Te avisaremos apenas entre una nueva solicitud."
          />
        ) : (
          <table className="w-full table-fixed border-collapse">
            <QueueColGroup />
            <thead className={TABLE_HEAD_CLASS}>
              <tr>
                <th scope="col" className={TH_RIGHT_CLASS}>
                  Hora
                </th>
                <th scope="col" className={TH_CLASS}>
                  Pasajero
                </th>
                <th scope="col" className={TH_CLASS}>
                  Origen → Destino
                </th>
                <th scope="col" className={TH_CLASS}>
                  Estado
                </th>
                <th scope="col" className={TH_CLASS}>
                  Conductor
                </th>
                <th scope="col" className={TH_RIGHT_CLASS}>
                  Tiempo en estado
                </th>
                <th scope="col" className={TH_CLASS}>
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
  strong: 'bg-espresso/10 dark:bg-crema/10',
  info: 'bg-info/15',
};

interface QueueRowProps {
  row: OpsQueueRow;
  skewMs: number;
  isFlashing: boolean;
  onView: () => void;
}

function QueueRow({ row, skewMs, isFlashing, onView }: QueueRowProps): JSX.Element {
  const blocked = startBlockState(row) === 'blocked';
  const tone: StatusTone = blocked ? 'danger' : TRIP_STATUS_TONES[row.status];
  const elapsed = elapsedMsSince(row.status_since, skewMs);
  const routeLabel = `${row.pickup_address} → ${row.dropoff_address}`;

  return (
    <tr className={`${ROW_CLASS} ${isFlashing ? FLASH_BG_CLASS[tone] : 'hover:bg-bg-shell'}`}>
      <td className="relative whitespace-nowrap px-4 py-2 text-right text-numeric text-body text-text">
        <RowRail tone={tone} active={isFlashing} />
        {formatClockTime(row.requested_at)}
      </td>
      <td className="px-4 py-2 text-body font-medium text-text">{row.passenger_name}</td>
      <td className="truncate px-4 py-2 text-body text-text" title={routeLabel}>
        <span>{row.pickup_address}</span>
        <span className="text-text-muted"> → </span>
        <span>{row.dropoff_address}</span>
      </td>
      <td className="px-4 py-2">
        <StatusDot
          tone={tone}
          label={TRIP_STATUS_LABELS[row.status]}
          pulse={row.status === 'pending_assignment'}
        />
        <StartBlockStatus source={row} />
      </td>
      <td className="px-4 py-2 text-body text-text">
        {row.driver ? `${row.driver.name} · ${row.driver.plate}` : '—'}
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-right text-numeric text-body text-text">
        {formatDurationMmSs(elapsed)}
      </td>
      <td className="px-2 py-2 text-right">
        <Button
          variant="ghost"
          onClick={onView}
          aria-label={`Ver detalle de la solicitud de ${row.passenger_name}${blocked ? START_BLOCKED_COPY.viewAriaSuffix : ''}`}
        >
          Ver
        </Button>
      </td>
    </tr>
  );
}

interface RowRailProps {
  tone: StatusTone;
  active: boolean;
}

function RowRail({ tone, active }: RowRailProps): JSX.Element {
  const reducedMotion = usePrefersReducedMotion();
  const [revealed, setRevealed] = useState(() => !active || reducedMotion);

  useEffect(() => {
    if (!active || reducedMotion) {
      setRevealed(true);
      return;
    }
    setRevealed(false);
    const frame = window.requestAnimationFrame(() => setRevealed(true));
    return () => window.cancelAnimationFrame(frame);
  }, [active, reducedMotion]);

  return (
    <span
      aria-hidden="true"
      className={`absolute inset-y-0 left-0 w-[3px] origin-top transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${TONE_DOT_CLASS[tone]}`}
      style={{ transform: `scaleY(${revealed ? 1 : 0})` }}
    />
  );
}

function buildTimelineItems(data: OpsTripDetail): TimelineItem[] {
  const blockedItems: TimelineItem[] = data.start_blocked_at
    ? [{ label: START_BLOCKED_COPY.timeline, timestamp: data.start_blocked_at }]
    : [];
  return [
    { label: 'Creada', timestamp: data.timeline.requested_at },
    { label: 'Asignada', timestamp: data.timeline.assigned_at },
    { label: 'Conductor llegó', timestamp: data.timeline.arrived_at },
    ...blockedItems,
    { label: START_BLOCKED_COPY.startedTimeline, timestamp: data.timeline.started_at },
    { label: 'Finalizada', timestamp: data.timeline.finished_at },
  ];
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
      {status === 'loading' && <DetailSkeleton />}
      {status === 'error' && <ErrorPanel title="No pudimos cargar el detalle." onRetry={refetch} />}
      {status === 'success' && data && (
        <div className="space-y-4">
          <div>
            <StatusDot
              tone={TRIP_STATUS_TONES[data.status]}
              label={TRIP_STATUS_LABELS[data.status]}
            />
          </div>
          <StartBlockNotice source={data} />
          <dl className="space-y-2 text-body text-text">
            <div>
              <dt className="text-small text-text-muted">Pasajero</dt>
              <dd>{data.passenger_name}</dd>
            </div>
            <div>
              <dt className="text-small text-text-muted">Origen</dt>
              <dd>{data.pickup_address ?? TRIP_DETAIL_COPY.addressRemoved}</dd>
            </div>
            <div>
              <dt className="text-small text-text-muted">Destino</dt>
              <dd>{data.dropoff_address ?? TRIP_DETAIL_COPY.addressRemoved}</dd>
            </div>
            <div>
              <dt className="text-small text-text-muted">Conductor</dt>
              <dd>{data.driver ? `${data.driver.name} · ${data.driver.plate}` : 'Sin asignar'}</dd>
            </div>
            <div>
              <dt className="text-small text-text-muted">Tarifa total</dt>
              <dd className="text-numeric">${data.fare.total.toLocaleString('es-CO')}</dd>
            </div>
            {data.start_failed_attempts > 0 && (
              <div>
                <dt className="text-small text-text-muted">{START_BLOCKED_COPY.attemptsRow}</dt>
                <dd className="text-numeric">
                  {START_BLOCKED_COPY.attemptsRowValue(
                    data.start_failed_attempts,
                    START_CODE_MAX_ATTEMPTS,
                  )}
                </dd>
              </div>
            )}
            {data.start_blocked_at && (
              <div>
                <dt className="text-small text-text-muted">{START_BLOCKED_COPY.blockedAtRow}</dt>
                <dd className="text-numeric">{formatBogotaDateTime(data.start_blocked_at)}</dd>
              </div>
            )}
          </dl>
          <div>
            <h3 className="mb-2 text-title font-display text-text">Línea de tiempo</h3>
            <Timeline items={buildTimelineItems(data)} />
          </div>
        </div>
      )}
    </DetailDrawer>
  );
}
