import { useCallback, useMemo, useState } from 'react';
import type { PlatformServiceConfigRow, ServiceConfigError } from '@voyyaa/shared';
import { updateFare, updateOperationalParams } from '../api/service-config.api';
import {
  domainErrorCode,
  domainErrorDetails,
  domainErrorField,
  isNetworkError,
} from '../api/errors';
import { RATES_COPY } from '../copy/rates';
import {
  buildFareDto,
  buildParamsDto,
  changedKeys,
  describeChanges,
  describeMarkChange,
  effectiveIsOfficial,
  markChanged,
  numericDraftOf,
  validateNumericDraft,
  validateReference,
  valuesOf,
  type DraftErrors,
  type MarkState,
  type NumericDraft,
} from '../lib/service-config';
import {
  FARE_FIELD_KEYS,
  PARAM_FIELD_KEYS,
  type ConfigFieldKey,
} from '../lib/service-config-fields';
import type { DiffRow } from '../lib/version-diff';

export interface ConflictInfo {
  version: number;
  author: string | null;
}

export interface RateEditor {
  editing: boolean;
  draft: NumericDraft;
  errors: DraftErrors;
  isOfficial: boolean;
  reference: string;
  canEditFare: boolean;
  dirtyKeys: ReadonlySet<ConfigFieldKey>;
  markDirty: boolean;
  hasChanges: boolean;
  diffRows: DiffRow[];
  onlyMarkChanged: boolean;
  confirmOpen: boolean;
  saving: boolean;
  banner: string | null;
  conflict: ConflictInfo | null;
  startEdit: () => void;
  cancelEdit: () => void;
  setValue: (key: ConfigFieldKey, value: string) => void;
  setOfficial: (value: boolean) => void;
  setReference: (value: string) => void;
  review: () => void;
  closeConfirm: () => void;
  save: () => Promise<void>;
  resolveConflictWithMine: () => void;
}

interface UseRateEditorArgs {
  row: PlatformServiceConfigRow;
  onSaved: (message: string) => void;
  reload: () => void;
}

function describeSaveError(error: unknown): string {
  if (isNetworkError(error)) return RATES_COPY.offlineSave;
  return RATES_COPY.saveFailed;
}

export function useRateEditor({ row, onSaved, reload }: UseRateEditorArgs): RateEditor {
  const fare = row.fare;
  const params = row.operational_params;
  const baseline = useMemo(() => valuesOf(fare, params), [fare, params]);
  const baselineOfficial = fare?.is_official ?? false;
  const baselineReference = fare?.official_reference ?? '';
  const editableKeys = useMemo<readonly ConfigFieldKey[]>(
    () => (fare ? [...FARE_FIELD_KEYS, ...PARAM_FIELD_KEYS] : PARAM_FIELD_KEYS),
    [fare],
  );

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<NumericDraft>(() => numericDraftOf(baseline));
  const [markTouched, setMarkTouched] = useState(false);
  const [officialChoice, setOfficialChoice] = useState(baselineOfficial);
  const [reference, setReferenceState] = useState(baselineReference);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);

  const changedFare = useMemo(
    () => (fare ? changedKeys(baseline, draft, FARE_FIELD_KEYS) : []),
    [fare, baseline, draft],
  );
  const changedParams = useMemo(
    () => changedKeys(baseline, draft, PARAM_FIELD_KEYS),
    [baseline, draft],
  );
  const valuesChanged = changedFare.length + changedParams.length > 0;

  const markState: MarkState = {
    baselineOfficial,
    baselineReference,
    touched: markTouched,
    isOfficial: officialChoice,
    reference,
    valuesChanged,
  };
  const isOfficial = effectiveIsOfficial(markState);
  const markDirty = fare ? markChanged(markState) : false;
  const hasChanges = valuesChanged || markDirty;

  const dirtyKeys = useMemo(
    () => new Set<ConfigFieldKey>([...changedFare, ...changedParams]),
    [changedFare, changedParams],
  );

  const valueRows = describeChanges(baseline, draft, [...changedFare, ...changedParams]);
  const diffRows = markDirty ? [...valueRows, describeMarkChange(markState)] : valueRows;

  const resetDraft = useCallback(() => {
    setDraft(numericDraftOf(baseline));
    setMarkTouched(false);
    setOfficialChoice(baselineOfficial);
    setReferenceState(baselineReference);
    setErrors({});
    setBanner(null);
    setConflict(null);
  }, [baseline, baselineOfficial, baselineReference]);

  const startEdit = useCallback(() => {
    resetDraft();
    setEditing(true);
  }, [resetDraft]);

  const cancelEdit = useCallback(() => {
    resetDraft();
    setConfirmOpen(false);
    setEditing(false);
  }, [resetDraft]);

  const setValue = useCallback((key: ConfigFieldKey, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }, []);

  const setOfficial = useCallback((value: boolean) => {
    setMarkTouched(true);
    setOfficialChoice(value);
    setErrors((current) => ({ ...current, official_reference: undefined }));
  }, []);

  const setReference = useCallback((value: string) => {
    setReferenceState(value);
    setErrors((current) => ({ ...current, official_reference: undefined }));
  }, []);

  const review = useCallback(() => {
    const nextErrors = validateNumericDraft(draft, editableKeys);
    const referenceError = validateReference(isOfficial, reference);
    if (referenceError) nextErrors.official_reference = referenceError;
    setErrors(nextErrors);
    const firstInvalid = Object.keys(nextErrors).find(
      (key) => nextErrors[key as keyof DraftErrors] !== undefined,
    );
    if (firstInvalid) {
      document.getElementById(`rate-${firstInvalid}`)?.focus();
      return;
    }
    setBanner(null);
    setConfirmOpen(true);
  }, [draft, editableKeys, isOfficial, reference]);

  const closeConfirm = useCallback(() => setConfirmOpen(false), []);

  const save = useCallback(async (): Promise<void> => {
    setSaving(true);
    setBanner(null);
    let fareSaved = false;
    try {
      if (fare && (changedFare.length > 0 || markDirty)) {
        await updateFare(
          row.municipality_id,
          row.service_type,
          buildFareDto(fare.municipality_fare_id, draft, isOfficial, reference),
        );
        fareSaved = true;
      }
      if (changedParams.length > 0) {
        await updateOperationalParams(
          row.municipality_id,
          row.service_type,
          buildParamsDto(params.operational_params_id, draft),
        );
      }
      setConfirmOpen(false);
      setEditing(false);
      onSaved(valuesChanged ? RATES_COPY.saved : RATES_COPY.markedOfficial);
      reload();
    } catch (error) {
      setConfirmOpen(false);
      const code = domainErrorCode(error);
      if (code === 'SETTINGS_CONFLICT') {
        const details = domainErrorDetails<ServiceConfigError>(error);
        setConflict({
          version: details?.current_version ?? 0,
          author: details?.current_author_name ?? null,
        });
        reload();
        return;
      }
      if (code === 'SETTINGS_OUT_OF_RANGE') {
        const field = domainErrorField(error);
        setErrors(field ? { [field]: RATES_COPY.outOfRangeServer } : {});
        setBanner(RATES_COPY.saveFailed);
      } else {
        const message = describeSaveError(error);
        setBanner(fareSaved ? RATES_COPY.partialSave(message) : message);
      }
      if (fareSaved) reload();
    } finally {
      setSaving(false);
    }
  }, [
    fare,
    changedFare.length,
    changedParams.length,
    markDirty,
    row.municipality_id,
    row.service_type,
    draft,
    isOfficial,
    reference,
    params.operational_params_id,
    valuesChanged,
    onSaved,
    reload,
  ]);

  const resolveConflictWithMine = useCallback(() => {
    setConflict(null);
    setConfirmOpen(true);
  }, []);

  return {
    editing,
    draft,
    errors,
    isOfficial,
    reference,
    canEditFare: fare !== null,
    dirtyKeys,
    markDirty,
    hasChanges,
    diffRows,
    onlyMarkChanged: !valuesChanged && markDirty,
    confirmOpen,
    saving,
    banner,
    conflict,
    startEdit,
    cancelEdit,
    setValue,
    setOfficial,
    setReference,
    review,
    closeConfirm,
    save,
    resolveConflictWithMine,
  };
}
