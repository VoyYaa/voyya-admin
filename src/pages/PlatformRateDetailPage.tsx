import { useCallback, useEffect, useMemo, useState, type JSX, type MouseEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ActivatableServiceType,
  type MunicipalityFare,
  type MunicipalityOperationalParams,
  type PlatformServiceConfigRow,
} from '@voyyaa/shared';
import {
  getFareHistory,
  getOperationalParamsHistory,
  getServiceConfigs,
} from '../api/service-config.api';
import { StateGlyph } from '../components/brand/StateGlyph';
import { ConflictDialog } from '../components/rates/ConflictDialog';
import { RateEditForm } from '../components/rates/RateEditForm';
import { RateReadView } from '../components/rates/RateReadView';
import { VersionHistory } from '../components/rates/VersionHistory';
import { Button } from '../components/ui/Button';
import { buttonClassName } from '../components/ui/button-styles';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { CoveragePendingBadge } from '../components/ui/CoveragePendingBadge';
import { DiffTable } from '../components/ui/DiffTable';
import { Notice } from '../components/ui/Notice';
import { OfficialBadge } from '../components/ui/OfficialBadge';
import { ProgressRail } from '../components/ui/ProgressRail';
import { ErrorPanel, SkeletonBlock } from '../components/ui/TableStates';
import { RATES_COPY } from '../copy/rates';
import { serviceLabel } from '../copy/service';
import { useAsync } from '../hooks/useAsync';
import { useNetworkOnline } from '../hooks/useNetworkOnline';
import { useRateEditor } from '../hooks/useRateEditor';
import { PARAM_FIELD_KEYS } from '../lib/service-config-fields';
import { formatLongDate } from '../lib/time';
import { numericSnapshot, snapshotOfFare, type Snapshot } from '../lib/version-diff';
import { useToastStore } from '../state/toast-store';

function fareOriginText(version: MunicipalityFare): string | null {
  if (version.origin === 'migrated') return RATES_COPY.originMigrated(version.origin_company_name);
  if (version.origin === 'company_approval') {
    return RATES_COPY.originCompanyApproval(version.origin_company_name);
  }
  return null;
}

function paramsOriginText(version: MunicipalityOperationalParams): string | null {
  if (version.origin === 'migrated') return RATES_COPY.originMigrated(version.origin_company_name);
  if (version.origin === 'company_approval') {
    return RATES_COPY.originCompanyApproval(version.origin_company_name);
  }
  return null;
}

function paramsSnapshot(version: MunicipalityOperationalParams): Snapshot {
  return numericSnapshot(PARAM_FIELD_KEYS, version);
}

interface RateDetailProps {
  row: PlatformServiceConfigRow;
  online: boolean;
  refreshing: boolean;
  reload: () => void;
}

function RateDetail({ row, online, refreshing, reload }: RateDetailProps): JSX.Element {
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.pushToast);
  const [historyKey, setHistoryKey] = useState(0);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [conflictDismissed, setConflictDismissed] = useState(false);

  const reloadAll = useCallback(() => {
    reload();
    setHistoryKey((key) => key + 1);
  }, [reload]);

  const onSaved = useCallback(
    (message: string) => {
      pushToast('success', message);
    },
    [pushToast],
  );

  const editor = useRateEditor({ row, onSaved, reload: reloadAll });
  const serviceName = serviceLabel(row.service_type);
  const fare = row.fare;
  const author = fare?.created_by?.name ?? row.operational_params.created_by?.name ?? null;
  const validFrom = fare?.valid_from ?? row.operational_params.valid_from;
  const dirty = editor.editing && editor.hasChanges;

  useEffect(() => {
    if (editor.conflict) setConflictDismissed(false);
  }, [editor.conflict]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent): void => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const fareFetch = useCallback(
    (before?: number) => getFareHistory(row.municipality_id, row.service_type, before),
    [row.municipality_id, row.service_type],
  );
  const paramsFetch = useCallback(
    (before?: number) => getOperationalParamsHistory(row.municipality_id, row.service_type, before),
    [row.municipality_id, row.service_type],
  );

  const conflictDialogOpen = Boolean(editor.conflict) && !refreshing && !conflictDismissed;

  const onBackClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (!dirty) return;
    event.preventDefault();
    setLeaveOpen(true);
  };

  const onDiscard = (): void => {
    if (editor.diffRows.length > 1) {
      setDiscardOpen(true);
      return;
    }
    editor.cancelEdit();
  };

  return (
    <div className={editor.editing ? 'pb-28' : 'pb-16'}>
      <header className="mx-auto flex max-w-3xl items-start gap-4 px-6 pt-8">
        <Link
          to="/platform/rates"
          aria-label={RATES_COPY.backToList}
          onClick={onBackClick}
          className={buttonClassName('ghost', 'md', 'w-tap px-0')}
        >
          <span aria-hidden="true">←</span>
        </Link>
        <div className="flex-1">
          <p className="vy-eyebrow">{RATES_COPY.detailEyebrow}</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-display text-text">
              {RATES_COPY.detailTitle(row.municipality_name, serviceName)}
            </h1>
            {fare && <OfficialBadge official={fare.is_official} />}
            {!row.coverage_active && <CoveragePendingBadge />}
          </div>
          <p className="text-small text-text-muted">
            {validFrom
              ? RATES_COPY.detailSubtitle(row.department, formatLongDate(validFrom), author)
              : row.department}
          </p>
        </div>
        {!editor.editing && (
          <Button variant="secondary" onClick={editor.startEdit} disabled={!online}>
            {RATES_COPY.edit}
          </Button>
        )}
      </header>

      <div className="mx-auto mt-4 flex max-w-3xl flex-col gap-3 px-6">
        {!online && (
          <Notice tone="info" role="alert" leading={<StateGlyph glyph="offline" size={28} />}>
            {editor.editing ? RATES_COPY.offlineSave : RATES_COPY.offlineData}
          </Notice>
        )}
        {editor.conflict && (
          <Notice
            tone="warning"
            role="alert"
            leading={<StateGlyph glyph="error" size={28} />}
            action={
              <Button variant="ghost" onClick={() => setConflictDismissed(false)}>
                {RATES_COPY.compare}
              </Button>
            }
          >
            {RATES_COPY.conflict(editor.conflict.version, editor.conflict.author)}
          </Notice>
        )}
        {editor.banner && (
          <Notice tone="danger" role="alert">
            {editor.banner}
          </Notice>
        )}
        {fare && !fare.is_official && (
          <Notice tone="warning" role="note">
            {RATES_COPY.unofficialNotice(row.municipality_name)}
          </Notice>
        )}
        {fare?.is_official && fare.official_reference && (
          <p className="text-small text-text-muted">
            {RATES_COPY.reference(fare.official_reference)}
          </p>
        )}
        {!fare && (
          <Notice tone="info" role="note">
            {RATES_COPY.noFareNotice}
          </Notice>
        )}
      </div>

      <div className="mx-auto mt-6 max-w-3xl px-6">
        {editor.editing ? (
          <RateEditForm editor={editor} disabled={editor.saving} />
        ) : (
          <RateReadView row={row} />
        )}
        {!editor.editing && (
          <>
            {fare && (
              <VersionHistory
                title={RATES_COPY.fareHistory}
                fetchPage={fareFetch}
                reloadKey={historyKey}
                toSnapshot={snapshotOfFare}
                originText={fareOriginText}
              />
            )}
            <VersionHistory
              title={RATES_COPY.paramsHistory}
              fetchPage={paramsFetch}
              reloadKey={historyKey}
              toSnapshot={paramsSnapshot}
              originText={paramsOriginText}
            />
          </>
        )}
      </div>

      {editor.editing && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-end gap-3 border-t border-border bg-surface px-6 py-4">
          <Button variant="ghost" onClick={onDiscard} disabled={!editor.hasChanges}>
            {RATES_COPY.discard}
          </Button>
          <Button onClick={editor.review} disabled={!editor.hasChanges || !online}>
            {RATES_COPY.review}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={editor.confirmOpen}
        title={RATES_COPY.confirmTitle}
        confirmLabel={editor.saving ? RATES_COPY.saving : RATES_COPY.save}
        cancelLabel={RATES_COPY.keepEditing}
        onConfirm={() => void editor.save()}
        onCancel={editor.closeConfirm}
        confirmDisabled={editor.saving}
        confirming={editor.saving}
      >
        <div className="flex flex-col gap-3">
          <p className="font-bold">{RATES_COPY.detailTitle(row.municipality_name, serviceName)}</p>
          <DiffTable rows={editor.diffRows} caption={RATES_COPY.confirmTitle} />
          {editor.onlyMarkChanged && (
            <p className="text-small text-text-muted">{RATES_COPY.confirmMarkOnly}</p>
          )}
          <p className="text-small text-text-muted">
            {RATES_COPY.confirmScope(row.active_company_count, row.municipality_name)}
          </p>
          <p className="text-small text-text-muted">{RATES_COPY.confirmKeep}</p>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={leaveOpen}
        title={RATES_COPY.leaveTitle}
        confirmLabel={RATES_COPY.leaveConfirm}
        cancelLabel={RATES_COPY.leaveStay}
        onConfirm={() => navigate('/platform/rates')}
        onCancel={() => setLeaveOpen(false)}
      >
        <p>{RATES_COPY.leaveBody}</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={discardOpen}
        title={RATES_COPY.discardConfirmTitle}
        confirmLabel={RATES_COPY.discard}
        cancelLabel={RATES_COPY.discardConfirmKeep}
        onConfirm={() => {
          setDiscardOpen(false);
          editor.cancelEdit();
        }}
        onCancel={() => setDiscardOpen(false)}
        confirmTone="danger"
      >
        <p>{RATES_COPY.discardConfirmBody}</p>
      </ConfirmDialog>

      <ConflictDialog
        open={conflictDialogOpen}
        message={
          editor.conflict
            ? RATES_COPY.conflict(editor.conflict.version, editor.conflict.author)
            : ''
        }
        rows={editor.diffRows}
        onClose={() => setConflictDismissed(true)}
        onUseMine={editor.resolveConflictWithMine}
        onDiscardMine={editor.cancelEdit}
      />
    </div>
  );
}

function DetailSkeleton(): JSX.Element {
  return (
    <div
      role="status"
      aria-label={RATES_COPY.loadingDetail}
      className="mx-auto max-w-3xl px-6 py-8"
    >
      <ProgressRail className="mb-6" />
      <SkeletonBlock className="mb-2 h-3 w-32" />
      <SkeletonBlock className="mb-8 h-8 w-1/2" />
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="mb-8 border-t border-border pt-6">
          <SkeletonBlock className="mb-4 h-5 w-40" />
          <SkeletonBlock className="h-tap w-full" />
        </div>
      ))}
    </div>
  );
}

export function PlatformRateDetailPage(): JSX.Element {
  const params = useParams<{ municipalityId: string; serviceType: string }>();
  const navigate = useNavigate();
  const online = useNetworkOnline();
  const municipalityId = Number(params.municipalityId);
  const parsedService = ActivatableServiceType.safeParse(params.serviceType);
  const serviceType = parsedService.success ? parsedService.data : null;
  const valid = Number.isInteger(municipalityId) && municipalityId > 0 && serviceType !== null;

  const fetcher = useCallback(() => getServiceConfigs(municipalityId), [municipalityId]);
  const { data, status, isInitialLoading, refetch } = useAsync(fetcher, valid);

  const row = useMemo(
    () => data?.rows.find((candidate) => candidate.service_type === serviceType),
    [data, serviceType],
  );

  const backToList = (): void => navigate('/platform/rates');

  if (!valid) {
    return (
      <ErrorPanel
        title={RATES_COPY.notFound}
        onRetry={backToList}
        retryLabel={RATES_COPY.backToList}
      />
    );
  }

  if (isInitialLoading) return <DetailSkeleton />;

  if (status === 'error' && !data) {
    return (
      <ErrorPanel
        title={RATES_COPY.detailError}
        onRetry={refetch}
        variant={online ? 'error' : 'offline'}
      />
    );
  }

  if (!data) return <></>;

  if (!row) {
    return (
      <ErrorPanel
        title={RATES_COPY.notFound}
        onRetry={backToList}
        retryLabel={RATES_COPY.backToList}
      />
    );
  }

  return (
    <RateDetail
      key={`${row.municipality_id}-${row.service_type}`}
      row={row}
      online={online}
      refreshing={status === 'loading'}
      reload={refetch}
    />
  );
}
