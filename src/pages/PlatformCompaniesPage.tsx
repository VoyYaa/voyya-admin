import { useCallback, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  OPS_LIST_DEFAULT_LIMIT,
  type PlatformCompanyRow,
  type PlatformCompanyStatusFilter,
} from '@voyyaa/shared';
import { getPlatformCompanies } from '../api/platform-companies.api';
import { EmptyPanel, ErrorPanel, SkeletonRows } from '../components/ui/TableStates';
import { PLATFORM_EMPTY_COPY } from '../copy/affiliation';
import { useAsync } from '../hooks/useAsync';
import { useNetworkOnline } from '../hooks/useNetworkOnline';
import { COMPANY_STATUS_LABELS, COMPANY_STATUS_TONES } from '../lib/status-maps';
import { StatusDot } from '../components/ui/StatusDot';

const STATUS_OPTIONS: PlatformCompanyStatusFilter[] = ['pending', 'active', 'rejected', 'all'];

const STATUS_FILTER_LABELS: Record<PlatformCompanyStatusFilter, string> = {
  pending: 'Pendientes',
  active: 'Habilitadas',
  rejected: 'Rechazadas',
  all: 'Todas',
};

function CompaniesColGroup(): JSX.Element {
  return (
    <colgroup>
      <col style={{ width: '28%' }} />
      <col style={{ width: '22%' }} />
      <col style={{ width: '12%' }} />
      <col style={{ width: '16%' }} />
      <col style={{ width: '14%' }} />
      <col style={{ width: '8%' }} />
    </colgroup>
  );
}

function formatSubmittedAt(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function PlatformCompaniesPage(): JSX.Element {
  const online = useNetworkOnline();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<PlatformCompanyStatusFilter>('pending');

  const fetcher = useCallback(
    () => getPlatformCompanies({ status: statusFilter, limit: OPS_LIST_DEFAULT_LIMIT }),
    [statusFilter],
  );

  const { data, status, refetch } = useAsync(fetcher);
  const rows = data?.rows ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-surface px-6 py-3">
        <div>
          <p className="text-eyebrow uppercase text-amber-ink dark:text-amber">Plataforma</p>
          <h1 className="text-display font-display text-text">Empresas</h1>
          {typeof data?.pending_count === 'number' && (
            <p className="text-small text-text-muted">
              {data.pending_count} solicitud{data.pending_count === 1 ? '' : 'es'} pendiente
              {data.pending_count === 1 ? '' : 's'}
            </p>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as PlatformCompanyStatusFilter)}
          aria-label="Filtrar por estado"
          className="focus-ring rounded-xs border border-border bg-surface px-3 py-1.5 text-body text-text"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {STATUS_FILTER_LABELS[option]}
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
      </div>

      {!online && (
        <p
          role="alert"
          className="mx-6 mt-3 rounded-xs bg-danger-tint px-3 py-2 text-body text-danger-ink"
        >
          Sin conexión · la lista puede estar desactualizada.
        </p>
      )}

      <div className="flex-1 overflow-y-auto bg-surface">
        {status === 'loading' && !data ? (
          <table className="w-full table-fixed border-collapse">
            <CompaniesColGroup />
            <tbody>
              <SkeletonRows columnCount={5} />
            </tbody>
          </table>
        ) : status === 'error' && !data ? (
          <ErrorPanel title="No pudimos cargar las empresas." onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyPanel
            title={
              statusFilter === 'pending'
                ? PLATFORM_EMPTY_COPY.pending.title
                : PLATFORM_EMPTY_COPY.other.title
            }
          />
        ) : (
          <table className="w-full table-fixed border-collapse">
            <CompaniesColGroup />
            <thead className="sticky top-0 z-10 bg-surface-sunken">
              <tr>
                <th
                  scope="col"
                  className="py-2 pl-4 pr-4 text-left text-table-header text-text-muted"
                >
                  Empresa
                </th>
                <th scope="col" className="px-4 py-2 text-left text-table-header text-text-muted">
                  Municipio
                </th>
                <th scope="col" className="px-4 py-2 text-left text-table-header text-text-muted">
                  Flota
                </th>
                <th scope="col" className="px-4 py-2 text-left text-table-header text-text-muted">
                  Recibida
                </th>
                <th scope="col" className="px-4 py-2 text-left text-table-header text-text-muted">
                  Estado
                </th>
                <th scope="col" className="px-4 py-2 text-left text-table-header text-text-muted">
                  <span className="sr-only">Acciones</span>
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
    <tr className="h-row-lg border-b border-border transition-colors duration-300 hover:bg-bg-shell motion-reduce:transition-none">
      <td className="py-2 pl-4 pr-4">
        <p className="text-body font-medium text-text">{row.legal_name}</p>
        <p className="text-numeric text-small text-text-muted">NIT {row.tax_id}</p>
      </td>
      <td className="px-4 py-2 text-body text-text">
        {row.municipality_name}
        {row.municipality_already_covered && (
          <span className="ml-2 inline-flex items-center rounded-full border border-amber/60 bg-amber/10 px-2 py-0.5 text-small font-medium text-amber-ink dark:text-amber">
            Ya cubierto
          </span>
        )}
      </td>
      <td className="px-4 py-2 text-numeric text-body text-text">
        {row.vehicle_count ?? 'Sin tope'}
      </td>
      <td className="px-4 py-2 text-body text-text-muted">{formatSubmittedAt(row.submitted_at)}</td>
      <td className="px-4 py-2">
        <StatusDot
          tone={COMPANY_STATUS_TONES[row.status]}
          label={COMPANY_STATUS_LABELS[row.status]}
        />
      </td>
      <td className="px-4 py-2 text-right">
        <button
          type="button"
          onClick={onView}
          aria-label={`Ver detalle de ${row.legal_name}`}
          className="focus-ring rounded-sm px-2 py-1 text-small font-medium text-text hover:bg-bg-shell"
        >
          Ver
        </button>
      </td>
    </tr>
  );
}
