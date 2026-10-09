import { useCallback, useMemo, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlatformServiceConfigRow } from '@voyyaa/shared';
import { getServiceConfigs } from '../api/service-config.api';
import { Button } from '../components/ui/Button';
import { CoveragePendingBadge } from '../components/ui/CoveragePendingBadge';
import { Notice } from '../components/ui/Notice';
import { OfficialBadge } from '../components/ui/OfficialBadge';
import { PageToolbar } from '../components/ui/PageToolbar';
import { EmptyPanel, ErrorPanel, SkeletonRows } from '../components/ui/TableStates';
import { ROW_CLASS, TABLE_HEAD_CLASS, TH_CLASS } from '../components/ui/table-styles';
import { RATES_COPY } from '../copy/rates';
import { serviceLabel } from '../copy/service';
import { useAsync } from '../hooks/useAsync';
import { useNetworkOnline } from '../hooks/useNetworkOnline';
import { formatFieldValue } from '../lib/service-config-fields';
import { formatLongDate } from '../lib/time';

type MarkFilter = 'all' | 'unofficial' | 'official';

const MARK_FILTERS: MarkFilter[] = ['all', 'unofficial', 'official'];

function isOfficial(row: PlatformServiceConfigRow): boolean {
  return row.fare?.is_official === true;
}

function matchesFilter(row: PlatformServiceConfigRow, filter: MarkFilter): boolean {
  if (filter === 'all') return true;
  return filter === 'official' ? isOfficial(row) : !isOfficial(row);
}

function sortRows(rows: readonly PlatformServiceConfigRow[]): PlatformServiceConfigRow[] {
  return [...rows].sort(
    (a, b) =>
      Number(isOfficial(a)) - Number(isOfficial(b)) ||
      a.municipality_name.localeCompare(b.municipality_name, 'es', { sensitivity: 'base' }),
  );
}

function RatesColGroup(): JSX.Element {
  return (
    <colgroup>
      <col style={{ width: '16%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '14%' }} />
      <col style={{ width: '11%' }} />
      <col style={{ width: '12%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '15%' }} />
      <col style={{ width: '8%' }} />
    </colgroup>
  );
}

export function PlatformRatesPage(): JSX.Element {
  const online = useNetworkOnline();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<MarkFilter>('all');
  const fetcher = useCallback(() => getServiceConfigs(), []);
  const { data, status, isInitialLoading, refetch } = useAsync(fetcher);

  const allRows = useMemo(() => sortRows(data?.rows ?? []), [data]);
  const rows = useMemo(
    () => allRows.filter((row) => matchesFilter(row, filter)),
    [allRows, filter],
  );
  const unofficialCount = allRows.filter((row) => !isOfficial(row)).length;

  return (
    <div className="flex h-full flex-col">
      <PageToolbar
        eyebrow={RATES_COPY.eyebrow}
        title={RATES_COPY.title}
        subtitle={data ? RATES_COPY.subtitle(unofficialCount) : undefined}
      >
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as MarkFilter)}
          aria-label={RATES_COPY.filterByMark}
          className="vy-input w-auto"
        >
          {MARK_FILTERS.map((option) => (
            <option key={option} value={option}>
              {RATES_COPY.markFilters[option]}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <Button variant="ghost" onClick={refetch} disabled={!online}>
          {RATES_COPY.refresh}
        </Button>
      </PageToolbar>

      {!online && (
        <Notice tone="info" role="alert" className="mx-6 mt-3">
          {RATES_COPY.offlineList}
        </Notice>
      )}

      <div className="flex-1 overflow-y-auto bg-surface">
        {isInitialLoading ? (
          <div role="status" aria-label={RATES_COPY.loadingList}>
            <table className="w-full table-fixed border-collapse">
              <RatesColGroup />
              <tbody>
                <SkeletonRows columnCount={9} />
              </tbody>
            </table>
          </div>
        ) : status === 'error' && !data ? (
          <ErrorPanel
            title={RATES_COPY.listError}
            onRetry={refetch}
            variant={online ? 'error' : 'offline'}
          />
        ) : allRows.length === 0 ? (
          <EmptyPanel title={RATES_COPY.emptyList} description={RATES_COPY.emptyListHint} />
        ) : rows.length === 0 ? (
          <EmptyPanel
            title={RATES_COPY.emptyFilter}
            actionLabel={RATES_COPY.showAll}
            onAction={() => setFilter('all')}
          />
        ) : (
          <table className="w-full table-fixed border-collapse">
            <RatesColGroup />
            <thead className={TABLE_HEAD_CLASS}>
              <tr>
                <th scope="col" className={TH_CLASS}>
                  {RATES_COPY.columns.municipality}
                </th>
                <th scope="col" className={TH_CLASS}>
                  {RATES_COPY.columns.service}
                </th>
                <th scope="col" className={TH_CLASS}>
                  {RATES_COPY.columns.base}
                </th>
                <th scope="col" className={TH_CLASS}>
                  {RATES_COPY.columns.surcharges}
                </th>
                <th scope="col" className={TH_CLASS}>
                  {RATES_COPY.columns.mark}
                </th>
                <th scope="col" className={TH_CLASS}>
                  {RATES_COPY.columns.validFrom}
                </th>
                <th scope="col" className={TH_CLASS}>
                  {RATES_COPY.columns.companies}
                </th>
                <th scope="col" className={TH_CLASS}>
                  {RATES_COPY.columns.coverage}
                </th>
                <th scope="col" className={TH_CLASS}>
                  <span className="sr-only">{RATES_COPY.columns.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <RateRow
                  key={`${row.municipality_id}-${row.service_type}`}
                  row={row}
                  onView={() =>
                    navigate(`/platform/rates/${row.municipality_id}/${row.service_type}`)
                  }
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function RateRow({
  row,
  onView,
}: {
  row: PlatformServiceConfigRow;
  onView: () => void;
}): JSX.Element {
  const service = serviceLabel(row.service_type);
  const fare = row.fare;

  return (
    <tr className={`${ROW_CLASS} hover:bg-bg-shell`}>
      <td className="py-2 pl-4 pr-4">
        <p className="text-body font-bold text-text">{row.municipality_name}</p>
        <p className="text-small text-text-muted">{row.department}</p>
      </td>
      <td className="px-4 py-2 text-body text-text">{service}</td>
      <td className="px-4 py-2 text-numeric text-body text-text">
        {fare ? formatFieldValue('cop', fare.base_fare) : '—'}
      </td>
      <td className="px-4 py-2 text-numeric text-small text-text">
        {fare
          ? RATES_COPY.surchargesCell(fare.night_surcharge_pct, fare.holiday_surcharge_pct)
          : '—'}
      </td>
      <td className="px-4 py-2">
        {fare ? (
          <OfficialBadge official={fare.is_official} />
        ) : (
          <span className="text-small text-text-muted">{RATES_COPY.noFare}</span>
        )}
      </td>
      <td className="px-4 py-2 text-body text-text-muted">
        {fare ? formatLongDate(fare.valid_from) : '—'}
      </td>
      <td className="px-4 py-2 text-body text-text">
        {RATES_COPY.activeCompanies(row.active_company_count)}
      </td>
      <td className="px-4 py-2">{!row.coverage_active && <CoveragePendingBadge />}</td>
      <td className="px-2 py-2 text-right">
        <Button
          variant="ghost"
          onClick={onView}
          aria-label={RATES_COPY.viewAria(row.municipality_name, service)}
        >
          {RATES_COPY.view}
        </Button>
      </td>
    </tr>
  );
}
