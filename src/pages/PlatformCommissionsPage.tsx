import { useCallback, useState, type JSX } from 'react';
import type { PlatformCommissionRow } from '@voyyaa/shared';
import { getCommissions } from '../api/service-config.api';
import { CommissionDrawer } from '../components/commissions/CommissionDrawer';
import { Button } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';
import { PageToolbar } from '../components/ui/PageToolbar';
import { EmptyPanel, ErrorPanel, SkeletonRows } from '../components/ui/TableStates';
import { ROW_CLASS, TABLE_HEAD_CLASS, TH_CLASS } from '../components/ui/table-styles';
import { COMMISSIONS_COPY } from '../copy/commissions';
import { RATES_COPY } from '../copy/rates';
import { useAsync } from '../hooks/useAsync';
import { useNetworkOnline } from '../hooks/useNetworkOnline';
import { formatFieldValue } from '../lib/service-config-fields';
import { formatLongDate } from '../lib/time';
import { useToastStore } from '../state/toast-store';

function CommissionsColGroup(): JSX.Element {
  return (
    <colgroup>
      <col style={{ width: '28%' }} />
      <col style={{ width: '18%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '18%' }} />
      <col style={{ width: '14%' }} />
      <col style={{ width: '12%' }} />
    </colgroup>
  );
}

export function PlatformCommissionsPage(): JSX.Element {
  const online = useNetworkOnline();
  const pushToast = useToastStore((s) => s.pushToast);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const fetcher = useCallback(() => getCommissions(), []);
  const { data, status, isInitialLoading, refetch } = useAsync(fetcher);

  const rows = data?.rows ?? [];
  const selected = rows.find((row) => row.company_id === selectedCompanyId) ?? null;

  const onSaved = useCallback(
    (message: string) => {
      pushToast('success', message);
    },
    [pushToast],
  );

  return (
    <div className="flex h-full flex-col">
      <PageToolbar
        eyebrow={COMMISSIONS_COPY.eyebrow}
        title={COMMISSIONS_COPY.title}
        subtitle={data ? COMMISSIONS_COPY.subtitle(rows.length) : undefined}
      >
        <div className="flex-1" />
        <Button variant="ghost" onClick={refetch} disabled={!online}>
          {RATES_COPY.refresh}
        </Button>
      </PageToolbar>

      {!online && (
        <Notice tone="info" role="alert" className="mx-6 mt-3">
          {COMMISSIONS_COPY.offline}
        </Notice>
      )}

      <div className="flex-1 overflow-y-auto bg-surface">
        {isInitialLoading ? (
          <div role="status" aria-label={COMMISSIONS_COPY.loading}>
            <table className="w-full table-fixed border-collapse">
              <CommissionsColGroup />
              <tbody>
                <SkeletonRows columnCount={6} />
              </tbody>
            </table>
          </div>
        ) : status === 'error' && !data ? (
          <ErrorPanel
            title={COMMISSIONS_COPY.error}
            onRetry={refetch}
            variant={online ? 'error' : 'offline'}
          />
        ) : rows.length === 0 ? (
          <EmptyPanel title={COMMISSIONS_COPY.empty} />
        ) : (
          <table className="w-full table-fixed border-collapse">
            <CommissionsColGroup />
            <thead className={TABLE_HEAD_CLASS}>
              <tr>
                <th scope="col" className={TH_CLASS}>
                  {COMMISSIONS_COPY.columns.company}
                </th>
                <th scope="col" className={TH_CLASS}>
                  {COMMISSIONS_COPY.columns.municipality}
                </th>
                <th scope="col" className={TH_CLASS}>
                  {COMMISSIONS_COPY.columns.commission}
                </th>
                <th scope="col" className={TH_CLASS}>
                  {COMMISSIONS_COPY.columns.validFrom}
                </th>
                <th scope="col" className={TH_CLASS}>
                  {COMMISSIONS_COPY.columns.changedBy}
                </th>
                <th scope="col" className={TH_CLASS}>
                  <span className="sr-only">{COMMISSIONS_COPY.columns.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <CommissionRow
                  key={row.company_id}
                  row={row}
                  onEdit={() => setSelectedCompanyId(row.company_id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CommissionDrawer
        row={selected}
        online={online}
        onClose={() => setSelectedCompanyId(null)}
        onSaved={onSaved}
        reload={refetch}
      />
    </div>
  );
}

function CommissionRow({
  row,
  onEdit,
}: {
  row: PlatformCommissionRow;
  onEdit: () => void;
}): JSX.Element {
  const commission = row.commission;
  const showsLegalName = row.legal_name !== row.display_name;

  return (
    <tr className={`${ROW_CLASS} hover:bg-bg-shell`}>
      <td className="py-2 pl-4 pr-4">
        <p className="text-body font-bold text-text">{row.display_name}</p>
        {showsLegalName && <p className="text-small text-text-muted">{row.legal_name}</p>}
      </td>
      <td className="px-4 py-2 text-body text-text">{row.municipality_name}</td>
      <td className="px-4 py-2 text-numeric text-body text-text">
        {commission ? (
          formatFieldValue('pct', commission.commission_pct)
        ) : (
          <span className="text-small text-text-muted">{COMMISSIONS_COPY.noCommission}</span>
        )}
      </td>
      <td className="px-4 py-2 text-body text-text-muted">
        {commission ? formatLongDate(commission.valid_from) : '—'}
      </td>
      <td className="px-4 py-2 text-body text-text">{commission?.created_by?.name ?? '—'}</td>
      <td className="px-2 py-2 text-right">
        <Button
          variant="ghost"
          onClick={onEdit}
          aria-label={COMMISSIONS_COPY.editAria(row.display_name)}
        >
          {COMMISSIONS_COPY.edit}
        </Button>
      </td>
    </tr>
  );
}
