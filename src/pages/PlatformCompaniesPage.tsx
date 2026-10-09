import { useCallback, useEffect, useMemo, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  OPS_LIST_DEFAULT_LIMIT,
  type PlatformCompanyRow,
  type PlatformCompanyStatusFilter,
} from '@voyyaa/shared';
import { getPlatformCompanies } from '../api/platform-companies.api';
import { Button } from '../components/ui/Button';
import { CoveragePendingBadge } from '../components/ui/CoveragePendingBadge';
import { Notice } from '../components/ui/Notice';
import { PageToolbar } from '../components/ui/PageToolbar';
import { StatusDot } from '../components/ui/StatusDot';
import { EmptyPanel, ErrorPanel, SkeletonRows } from '../components/ui/TableStates';
import { ROW_CLASS, TABLE_HEAD_CLASS, TH_CLASS } from '../components/ui/table-styles';
import { PLATFORM_EMPTY_COPY } from '../copy/affiliation';
import { COVERAGE_COPY, PLATFORM_COMPANIES_COPY } from '../copy/coverage';
import { serviceLabels } from '../copy/service';
import { useAsync } from '../hooks/useAsync';
import { useNetworkOnline } from '../hooks/useNetworkOnline';
import { COMPANY_STATUS_LABELS, COMPANY_STATUS_TONES } from '../lib/status-maps';
import { formatLongDate } from '../lib/time';

const STATUS_OPTIONS: PlatformCompanyStatusFilter[] = ['pending', 'active', 'rejected', 'all'];

const STATUS_FILTER_LABELS: Record<PlatformCompanyStatusFilter, string> = {
  pending: 'Pendientes',
  active: 'Habilitadas',
  rejected: 'Rechazadas',
  all: 'Todas',
};

type CoverageFilter = 'all' | 'pending';

const COVERAGE_OPTIONS: CoverageFilter[] = ['all', 'pending'];

function CompaniesColGroup(): JSX.Element {
  return (
    <colgroup>
      <col style={{ width: '22%' }} />
      <col style={{ width: '20%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '16%' }} />
      <col style={{ width: '14%' }} />
      <col style={{ width: '11%' }} />
    </colgroup>
  );
}

export function PlatformCompaniesPage(): JSX.Element {
  const online = useNetworkOnline();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<PlatformCompanyStatusFilter>('pending');
  const [municipalityFilter, setMunicipalityFilter] = useState<number | null>(null);
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>('all');
  const [knownMunicipalities, setKnownMunicipalities] = useState<Map<number, string>>(new Map());

  const fetcher = useCallback(
    () =>
      getPlatformCompanies({
        status: statusFilter,
        municipality_id: municipalityFilter ?? undefined,
        limit: OPS_LIST_DEFAULT_LIMIT,
      }),
    [statusFilter, municipalityFilter],
  );

  const { data, status, isInitialLoading, refetch } = useAsync(fetcher);

  useEffect(() => {
    if (!data) return;
    setKnownMunicipalities((previous) => {
      const next = new Map(previous);
      for (const row of data.rows) next.set(row.municipality_id, row.municipality_name);
      return next;
    });
  }, [data]);

  const municipalityOptions = useMemo(
    () =>
      [...knownMunicipalities.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })),
    [knownMunicipalities],
  );

  const loadedRows = data?.rows ?? [];
  const rows =
    coverageFilter === 'pending'
      ? loadedRows.filter((row) => !row.municipality_coverage_active)
      : loadedRows;
  const hasExtraFilters = municipalityFilter !== null || coverageFilter !== 'all';

  const clearFilters = (): void => {
    setMunicipalityFilter(null);
    setCoverageFilter('all');
  };

  return (
    <div className="flex h-full flex-col">
      <PageToolbar
        eyebrow="Plataforma"
        title="Empresas"
        subtitle={
          typeof data?.pending_count === 'number'
            ? `${data.pending_count} solicitud${data.pending_count === 1 ? '' : 'es'} pendiente${data.pending_count === 1 ? '' : 's'}`
            : undefined
        }
      >
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as PlatformCompanyStatusFilter)}
          aria-label="Filtrar por estado"
          className="vy-input w-auto"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {STATUS_FILTER_LABELS[option]}
            </option>
          ))}
        </select>
        <select
          value={municipalityFilter ?? ''}
          onChange={(event) =>
            setMunicipalityFilter(event.target.value === '' ? null : Number(event.target.value))
          }
          aria-label={PLATFORM_COMPANIES_COPY.filterByMunicipality}
          className="vy-input w-auto"
        >
          <option value="">{PLATFORM_COMPANIES_COPY.allMunicipalities}</option>
          {municipalityOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <select
          value={coverageFilter}
          onChange={(event) => setCoverageFilter(event.target.value as CoverageFilter)}
          aria-label={PLATFORM_COMPANIES_COPY.filterByCoverage}
          className="vy-input w-auto"
        >
          {COVERAGE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {PLATFORM_COMPANIES_COPY.coverageFilters[option]}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <Button variant="ghost" onClick={refetch} disabled={!online}>
          Actualizar
        </Button>
      </PageToolbar>

      {!online && (
        <Notice tone="info" role="alert" className="mx-6 mt-3">
          Sin conexión · la lista puede estar desactualizada.
        </Notice>
      )}

      <div className="flex-1 overflow-y-auto bg-surface">
        {isInitialLoading ? (
          <table className="w-full table-fixed border-collapse">
            <CompaniesColGroup />
            <tbody>
              <SkeletonRows columnCount={7} />
            </tbody>
          </table>
        ) : status === 'error' && !data ? (
          <ErrorPanel
            title="No pudimos cargar las empresas."
            onRetry={refetch}
            variant={online ? 'error' : 'offline'}
          />
        ) : rows.length === 0 ? (
          coverageFilter === 'pending' && municipalityFilter === null ? (
            <EmptyPanel title={COVERAGE_COPY.noneWaiting} glyph="success" />
          ) : hasExtraFilters ? (
            <EmptyPanel
              title={PLATFORM_COMPANIES_COPY.filtersEmpty}
              actionLabel={PLATFORM_COMPANIES_COPY.clearFilters}
              onAction={clearFilters}
            />
          ) : (
            <EmptyPanel
              title={
                statusFilter === 'pending'
                  ? PLATFORM_EMPTY_COPY.pending.title
                  : PLATFORM_EMPTY_COPY.other.title
              }
            />
          )
        ) : (
          <table className="w-full table-fixed border-collapse">
            <CompaniesColGroup />
            <thead className={TABLE_HEAD_CLASS}>
              <tr>
                <th scope="col" className={TH_CLASS}>
                  {PLATFORM_COMPANIES_COPY.columns.company}
                </th>
                <th scope="col" className={TH_CLASS}>
                  {PLATFORM_COMPANIES_COPY.columns.municipality}
                </th>
                <th scope="col" className={TH_CLASS}>
                  {PLATFORM_COMPANIES_COPY.columns.service}
                </th>
                <th scope="col" className={TH_CLASS}>
                  {PLATFORM_COMPANIES_COPY.columns.fleet}
                </th>
                <th scope="col" className={TH_CLASS}>
                  {PLATFORM_COMPANIES_COPY.columns.received}
                </th>
                <th scope="col" className={TH_CLASS}>
                  {PLATFORM_COMPANIES_COPY.columns.status}
                </th>
                <th scope="col" className={TH_CLASS}>
                  <span className="sr-only">{PLATFORM_COMPANIES_COPY.columns.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <CompanyRow
                  key={row.company_id}
                  row={row}
                  onView={() => navigate(`/platform/companies/${row.company_id}`)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function CompanyRow({ row, onView }: { row: PlatformCompanyRow; onView: () => void }): JSX.Element {
  return (
    <tr className={`${ROW_CLASS} hover:bg-bg-shell`}>
      <td className="py-2 pl-4 pr-4">
        <p className="text-body font-bold text-text">{row.legal_name}</p>
        {row.display_name !== row.legal_name && (
          <p className="text-small text-text-muted">{row.display_name}</p>
        )}
        <p className="text-numeric text-small text-text-muted">NIT {row.tax_id}</p>
      </td>
      <td className="px-4 py-2 text-body text-text">
        <p>{row.municipality_name}</p>
        {!row.municipality_coverage_active && (
          <div className="mt-1">
            <CoveragePendingBadge />
          </div>
        )}
      </td>
      <td className="px-4 py-2 text-body text-text">{serviceLabels(row.service_types)}</td>
      <td className="px-4 py-2 text-numeric text-body text-text">
        {row.vehicle_count ?? PLATFORM_COMPANIES_COPY.unlimitedFleet}
      </td>
      <td className="px-4 py-2 text-body text-text-muted">{formatLongDate(row.submitted_at)}</td>
      <td className="px-4 py-2">
        <StatusDot
          tone={COMPANY_STATUS_TONES[row.status]}
          label={COMPANY_STATUS_LABELS[row.status]}
        />
      </td>
      <td className="px-2 py-2 text-right">
        <Button variant="ghost" onClick={onView} aria-label={`Ver detalle de ${row.legal_name}`}>
          Ver
        </Button>
      </td>
    </tr>
  );
}
