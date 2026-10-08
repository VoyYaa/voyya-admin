import { useCallback, useState, type JSX } from 'react';
import type { CompanyCommission, PlatformCommissionRow, ServiceConfigError } from '@voyyaa/shared';
import { getCommissionHistory, updateCommission } from '../../api/service-config.api';
import { domainErrorCode, domainErrorDetails, isNetworkError } from '../../api/errors';
import { COMMISSIONS_COPY } from '../../copy/commissions';
import { commissionError, parseDraftNumber } from '../../lib/service-config';
import { COMMISSION_RANGE, formatFieldValue } from '../../lib/service-config-fields';
import { formatLongDate } from '../../lib/time';
import { snapshotOfCommission } from '../../lib/version-diff';
import { VersionHistory } from '../rates/VersionHistory';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DetailDrawer } from '../ui/DetailDrawer';
import { Field } from '../ui/Field';
import { Notice } from '../ui/Notice';

export interface CommissionDrawerProps {
  row: PlatformCommissionRow | null;
  online: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
  reload: () => void;
}

function originText(version: CompanyCommission): string | null {
  if (version.origin === 'migrated') return COMMISSIONS_COPY.originMigrated;
  if (version.origin === 'company_approval') return COMMISSIONS_COPY.originCompanyApproval;
  return null;
}

interface CommissionFormProps {
  row: PlatformCommissionRow;
  online: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
  reload: () => void;
}

function CommissionForm({
  row,
  online,
  onClose,
  onSaved,
  reload,
}: CommissionFormProps): JSX.Element {
  const current = row.commission;
  const [value, setValue] = useState(current ? String(current.commission_pct) : '');
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  const company = row.display_name;
  const parsed = parseDraftNumber(value);
  const unchanged = current !== null && parsed === current.commission_pct;

  const fetchPage = useCallback(
    (before?: number) => getCommissionHistory(row.company_id, before),
    [row.company_id],
  );

  const review = (): void => {
    const message = commissionError(value);
    setError(message);
    if (message) {
      document.getElementById('commission-pct')?.focus();
      return;
    }
    setBanner(null);
    setConfirmOpen(true);
  };

  const save = async (): Promise<void> => {
    if (parsed === null) return;
    setSaving(true);
    try {
      await updateCommission(row.company_id, {
        version: current?.company_commission_id ?? null,
        commission_pct: parsed,
      });
      setConfirmOpen(false);
      onSaved(COMMISSIONS_COPY.saved(company));
      reload();
      setHistoryKey((key) => key + 1);
      onClose();
    } catch (failure) {
      setConfirmOpen(false);
      const code = domainErrorCode(failure);
      if (code === 'SETTINGS_CONFLICT') {
        const details = domainErrorDetails<ServiceConfigError>(failure);
        setBanner(
          COMMISSIONS_COPY.conflict(
            details?.current_version ?? 0,
            details?.current_author_name ?? null,
          ),
        );
        reload();
        setHistoryKey((key) => key + 1);
      } else if (code === 'SETTINGS_OUT_OF_RANGE') {
        setError(COMMISSIONS_COPY.outOfRange(COMMISSION_RANGE.min, COMMISSION_RANGE.max));
      } else {
        setBanner(
          isNetworkError(failure) ? COMMISSIONS_COPY.offlineSave : COMMISSIONS_COPY.saveFailed,
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-small text-text-muted">{row.municipality_name}</p>
      <p className="text-body text-text">
        {current
          ? COMMISSIONS_COPY.current(
              formatFieldValue('pct', current.commission_pct),
              formatLongDate(current.valid_from),
            )
          : COMMISSIONS_COPY.noCurrent}
      </p>

      {!online && (
        <Notice tone="info" role="alert">
          {COMMISSIONS_COPY.offlineSave}
        </Notice>
      )}
      {banner && (
        <Notice tone="warning" role="alert">
          {banner}
        </Notice>
      )}

      <Field
        label={COMMISSIONS_COPY.field}
        htmlFor="commission-pct"
        hint={`${COMMISSIONS_COPY.hint} ${COMMISSIONS_COPY.range(COMMISSION_RANGE.min, COMMISSION_RANGE.max)}`}
        error={error ?? undefined}
        announceError
      >
        {(control) => (
          <input
            type="number"
            inputMode="decimal"
            min={COMMISSION_RANGE.min}
            max={COMMISSION_RANGE.max}
            step={COMMISSION_RANGE.step}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
            onWheel={(event) => event.currentTarget.blur()}
            className="vy-input w-32 text-numeric"
            {...control}
          />
        )}
      </Field>
      <p className="text-small text-text-muted">{COMMISSIONS_COPY.scope}</p>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          {COMMISSIONS_COPY.cancel}
        </Button>
        <Button onClick={review} disabled={!online || unchanged || value.trim().length === 0}>
          {COMMISSIONS_COPY.review}
        </Button>
      </div>

      <VersionHistory
        title={COMMISSIONS_COPY.history}
        fetchPage={fetchPage}
        reloadKey={historyKey}
        toSnapshot={(version: CompanyCommission) => snapshotOfCommission(version.commission_pct)}
        originText={originText}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={COMMISSIONS_COPY.confirmTitle(company)}
        confirmLabel={COMMISSIONS_COPY.save}
        cancelLabel={COMMISSIONS_COPY.keepEditing}
        onConfirm={() => void save()}
        onCancel={() => setConfirmOpen(false)}
        confirmDisabled={saving}
        confirming={saving}
      >
        <p>
          {COMMISSIONS_COPY.confirmBody(
            company,
            current ? formatFieldValue('pct', current.commission_pct) : '—',
            parsed === null ? value : formatFieldValue('pct', parsed),
          )}
        </p>
      </ConfirmDialog>
    </div>
  );
}

export function CommissionDrawer({
  row,
  online,
  onClose,
  onSaved,
  reload,
}: CommissionDrawerProps): JSX.Element {
  return (
    <DetailDrawer
      open={row !== null}
      title={row ? COMMISSIONS_COPY.drawerTitle(row.display_name) : ''}
      onClose={onClose}
    >
      {row && (
        <CommissionForm
          key={row.company_id}
          row={row}
          online={online}
          onClose={onClose}
          onSaved={onSaved}
          reload={reload}
        />
      )}
    </DetailDrawer>
  );
}
