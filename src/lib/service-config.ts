import type {
  MunicipalityFare,
  MunicipalityOperationalParams,
  UpdateMunicipalityFareDTO,
  UpdateMunicipalityOperationalParamsDTO,
} from '@voyyaa/shared';
import { COMMISSIONS_COPY } from '../copy/commissions';
import { RATES_COPY } from '../copy/rates';
import { VALIDATION_COPY } from '../copy/validation';
import {
  COMMISSION_RANGE,
  FARE_FIELD_KEYS,
  PARAM_FIELD_KEYS,
  fieldSpec,
  formatConfigValue,
  isMultipleOfStep,
  type ConfigFieldKey,
} from './service-config-fields';
import { MARK_LABEL, formatMark, type DiffRow } from './version-diff';

export type ConfigValues = Partial<Record<ConfigFieldKey, number>>;
export type NumericDraft = Record<ConfigFieldKey, string>;
export type DraftErrors = Partial<Record<ConfigFieldKey | 'official_reference', string>>;

export const MIN_REFERENCE_LENGTH = 3;
export const MAX_REFERENCE_LENGTH = 120;

export function valuesOf(
  fare: MunicipalityFare | null,
  params: MunicipalityOperationalParams,
): ConfigValues {
  const values: ConfigValues = {};
  if (fare) {
    for (const key of FARE_FIELD_KEYS) values[key] = fare[key];
  }
  for (const key of PARAM_FIELD_KEYS) values[key] = params[key];
  return values;
}

export function numericDraftOf(values: ConfigValues): NumericDraft {
  const draft = {} as NumericDraft;
  for (const key of [...FARE_FIELD_KEYS, ...PARAM_FIELD_KEYS]) {
    const value = values[key];
    draft[key] = value === undefined ? '' : String(value);
  }
  return draft;
}

export function parseDraftNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateConfigNumber(key: ConfigFieldKey, raw: string): string | null {
  const spec = fieldSpec(key);
  const value = parseDraftNumber(raw);
  if (value === null)
    return raw.trim().length === 0 ? VALIDATION_COPY.required : VALIDATION_COPY.invalidNumber;
  if (value < spec.min || value > spec.max) {
    return RATES_COPY.outOfRange(
      formatConfigValue(key, spec.min),
      formatConfigValue(key, spec.max),
    );
  }
  if (spec.integer && !Number.isInteger(value)) return VALIDATION_COPY.integer;
  if (!isMultipleOfStep(value, spec.step)) return VALIDATION_COPY.multipleOf(spec.step);
  return null;
}

export function validateNumericDraft(
  draft: NumericDraft,
  keys: readonly ConfigFieldKey[],
): DraftErrors {
  const errors: DraftErrors = {};
  for (const key of keys) {
    const message = validateConfigNumber(key, draft[key]);
    if (message) errors[key] = message;
  }
  const search = parseDraftNumber(draft.search_radius_km);
  const expansion = parseDraftNumber(draft.expansion_radius_km);
  if (
    keys.includes('search_radius_km') &&
    !errors.search_radius_km &&
    search !== null &&
    expansion !== null &&
    search > expansion
  ) {
    errors.search_radius_km = RATES_COPY.searchAboveExpansion;
  }
  return errors;
}

export function validateReference(isOfficial: boolean, reference: string): string | null {
  const trimmed = reference.trim();
  if (!isOfficial || trimmed.length === 0) return null;
  if (trimmed.length < MIN_REFERENCE_LENGTH || trimmed.length > MAX_REFERENCE_LENGTH) {
    return RATES_COPY.referenceInvalid(MIN_REFERENCE_LENGTH, MAX_REFERENCE_LENGTH);
  }
  return null;
}

export function normalizeReference(isOfficial: boolean, reference: string): string | null {
  const trimmed = reference.trim();
  return isOfficial && trimmed.length > 0 ? trimmed : null;
}

export function changedKeys(
  baseline: ConfigValues,
  draft: NumericDraft,
  keys: readonly ConfigFieldKey[],
): ConfigFieldKey[] {
  return keys.filter((key) => {
    const baselineValue = baseline[key];
    if (baselineValue === undefined) return false;
    return parseDraftNumber(draft[key]) !== baselineValue;
  });
}

export interface MarkState {
  baselineOfficial: boolean;
  baselineReference: string;
  touched: boolean;
  isOfficial: boolean;
  reference: string;
  valuesChanged: boolean;
}

export function effectiveIsOfficial(state: MarkState): boolean {
  if (state.touched) return state.isOfficial;
  return state.baselineOfficial && !state.valuesChanged;
}

export function markChanged(state: MarkState): boolean {
  const official = effectiveIsOfficial(state);
  if (official !== state.baselineOfficial) return true;
  return official && state.reference.trim() !== state.baselineReference.trim();
}

export function describeChanges(
  baseline: ConfigValues,
  draft: NumericDraft,
  keys: readonly ConfigFieldKey[],
): DiffRow[] {
  return changedKeys(baseline, draft, keys).map((key) => {
    const after = parseDraftNumber(draft[key]);
    const before = baseline[key];
    return {
      label: fieldSpec(key).label,
      before: before === undefined ? '—' : formatConfigValue(key, before),
      after: after === null ? draft[key] : formatConfigValue(key, after),
    };
  });
}

export function describeMarkChange(state: MarkState): DiffRow {
  return {
    label: MARK_LABEL,
    before: formatMark(state.baselineOfficial, state.baselineReference),
    after: formatMark(effectiveIsOfficial(state), state.reference),
  };
}

function requireNumber(raw: string): number {
  const value = parseDraftNumber(raw);
  if (value === null) throw new Error('Draft was not validated');
  return value;
}

export function buildFareDto(
  version: number,
  draft: NumericDraft,
  isOfficial: boolean,
  reference: string,
): UpdateMunicipalityFareDTO {
  return {
    version,
    base_fare: requireNumber(draft.base_fare),
    night_surcharge_pct: requireNumber(draft.night_surcharge_pct),
    holiday_surcharge_pct: requireNumber(draft.holiday_surcharge_pct),
    is_official: isOfficial,
    official_reference: normalizeReference(isOfficial, reference),
  };
}

export function buildParamsDto(
  version: number | null,
  draft: NumericDraft,
): UpdateMunicipalityOperationalParamsDTO {
  return {
    version,
    search_radius_km: requireNumber(draft.search_radius_km),
    expansion_radius_km: requireNumber(draft.expansion_radius_km),
    acceptance_timeout_sec: requireNumber(draft.acceptance_timeout_sec),
    max_auto_retries: requireNumber(draft.max_auto_retries),
    tiebreak_window_hours: requireNumber(draft.tiebreak_window_hours),
    location_stale_min: requireNumber(draft.location_stale_min),
    avg_speed_kmh: requireNumber(draft.avg_speed_kmh),
    cancellation_window_min: requireNumber(draft.cancellation_window_min),
    no_show_grace_min: requireNumber(draft.no_show_grace_min),
  };
}

export function commissionError(raw: string): string | null {
  const value = parseDraftNumber(raw);
  if (value === null) {
    return raw.trim().length === 0 ? VALIDATION_COPY.required : VALIDATION_COPY.invalidNumber;
  }
  if (value < COMMISSION_RANGE.min || value > COMMISSION_RANGE.max) {
    return COMMISSIONS_COPY.outOfRange(COMMISSION_RANGE.min, COMMISSION_RANGE.max);
  }
  if (!isMultipleOfStep(value, COMMISSION_RANGE.step)) {
    return VALIDATION_COPY.multipleOf(COMMISSION_RANGE.step);
  }
  return null;
}
