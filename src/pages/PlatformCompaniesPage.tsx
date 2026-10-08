import { useCallback, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  OPS_LIST_DEFAULT_LIMIT,
  type PlatformCompanyRow,
  type PlatformCompanyStatusFilter,
} from '@voyyaa/shared';
import { getPlatformCompanies } from '../api/platform-companies.api';
import { Button } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';
import { PageToolbar } from '../components/ui/PageToolbar';
import { EmptyPanel, ErrorPanel, SkeletonRows } from '../components/ui/TableStates';
import { ROW_CLASS, TABLE_HEAD_CLASS, TH_CLASS } from '../components/ui/table-styles';
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
      <col style={{ width: '26%' }} />
      <col style={{ width: '22%' }} />
      <col style={{ width: '12%' }} />
      <col style={{ width: '16%' }} />
      <col style={{ width: '13%' }} />
      <col style={{ width: '11%' }} />
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

  const { data, status, isInitialLoading, refetch } = useAsync(fetcher);
  const rows = data?.rows ?? [];

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
              <SkeletonRows columnCount={5} />
            </tbody>
          </table>
        ) : status === 'error' && !data ? (
          <ErrorPanel
            title="No pudimos cargar las empresas."
            onRetry={refetch}
            variant={online ? 'error' : 'offline'}
          />
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
            <thead className={TABLE_HEAD_CLASS}>
              <tr>
                <th scope="col" className={TH_CLASS}>
                  Empresa
                </th>
                <th scope="col" className={TH_CLASS}>
                  Municipio
                </th>
                <th scope="col" className={TH_CLASS}>
                  Flota
                </th>
                <th scope="col" className={TH_CLASS}>
                  Recibida
                </th>
                <th scope="col" className={TH_CLASS}>
                  Estado
                </th>
                <th scope="col" className={TH_CLASS}>
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
    <tr className={`${ROW_CLASS} hover:bg-bg-shell`}>
      <td className="py-2 pl-4 pr-4">
        <p className="text-body font-bold text-text">{row.legal_name}</p>
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
      <td className="px-2 py-2 text-right">
        <Button variant="ghost" onClick={onView} aria-label={`Ver detalle de ${row.legal_name}`}>
          Ver
        </Button>
      </td>
    </tr>
  );
}
