import { expect, test } from '@playwright/test';
import { UpdateMunicipalityFareDTO, UpdateMunicipalityOperationalParamsDTO } from '@voyyaa/shared';
import {
  FARE_FIELD_KEYS,
  PARAM_FIELD_KEYS,
  formatConfigValue,
} from '../../src/lib/service-config-fields';
import {
  buildFareDto,
  buildParamsDto,
  changedKeys,
  commissionError,
  describeChanges,
  effectiveIsOfficial,
  markChanged,
  numericDraftOf,
  validateNumericDraft,
  validateReference,
  type ConfigValues,
  type MarkState,
} from '../../src/lib/service-config';
import { diffSnapshots, snapshotOfCommission, snapshotOfFare } from '../../src/lib/version-diff';

const BASELINE: ConfigValues = {
  base_fare: 8000,
  night_surcharge_pct: 25,
  holiday_surcharge_pct: 25,
  search_radius_km: 5,
  expansion_radius_km: 8,
  acceptance_timeout_sec: 30,
  max_auto_retries: 3,
  tiebreak_window_hours: 2,
  location_stale_min: 10,
  avg_speed_kmh: 25,
  cancellation_window_min: 5,
  no_show_grace_min: 5,
};

const ALL_KEYS = [...FARE_FIELD_KEYS, ...PARAM_FIELD_KEYS];

function markState(overrides: Partial<MarkState> = {}): MarkState {
  return {
    baselineOfficial: false,
    baselineReference: '',
    touched: false,
    isOfficial: false,
    reference: '',
    valuesChanged: false,
    ...overrides,
  };
}

test.describe('validateNumericDraft', () => {
  test('accepts the baseline', () => {
    expect(validateNumericDraft(numericDraftOf(BASELINE), ALL_KEYS)).toEqual({});
  });

  test('rejects values outside the contract range with the range in the message', () => {
    const draft = { ...numericDraftOf(BASELINE), base_fare: '500', acceptance_timeout_sec: '200' };
    const errors = validateNumericDraft(draft, ALL_KEYS);
    expect(errors.base_fare).toContain('fuera del rango permitido');
    expect(errors.base_fare).toContain('$1.000');
    expect(errors.acceptance_timeout_sec).toContain('5 s a 120 s');
  });

  test('rejects empty, non numeric, fractional and off-step values', () => {
    const draft = {
      ...numericDraftOf(BASELINE),
      base_fare: '',
      max_auto_retries: '2.5',
      night_surcharge_pct: '10.005',
      search_radius_km: '1.25',
    };
    const errors = validateNumericDraft(draft, ALL_KEYS);
    expect(errors.base_fare).toBeTruthy();
    expect(errors.max_auto_retries).toBeTruthy();
    expect(errors.night_surcharge_pct).toBeTruthy();
    expect(errors.search_radius_km).toBeTruthy();
  });

  test('requires the search radius not to exceed the expansion radius', () => {
    const draft = { ...numericDraftOf(BASELINE), search_radius_km: '9', expansion_radius_km: '8' };
    expect(validateNumericDraft(draft, ALL_KEYS).search_radius_km).toContain('no puede superar');
  });

  test('ignores fare fields when the municipality has no fare', () => {
    const draft = { ...numericDraftOf(BASELINE), base_fare: '' };
    expect(validateNumericDraft(draft, PARAM_FIELD_KEYS)).toEqual({});
  });
});

test.describe('changedKeys and describeChanges', () => {
  test('lists only the fields that differ from the baseline', () => {
    const draft = { ...numericDraftOf(BASELINE), base_fare: '9000', acceptance_timeout_sec: '45' };
    expect(changedKeys(BASELINE, draft, ALL_KEYS)).toEqual(['base_fare', 'acceptance_timeout_sec']);
  });

  test('treats an equivalent number written differently as unchanged', () => {
    const draft = { ...numericDraftOf(BASELINE), base_fare: '8000.0' };
    expect(changedKeys(BASELINE, draft, ALL_KEYS)).toEqual([]);
  });

  test('describes before and after with units', () => {
    const draft = { ...numericDraftOf(BASELINE), base_fare: '9000', night_surcharge_pct: '30' };
    expect(describeChanges(BASELINE, draft, ['base_fare', 'night_surcharge_pct'])).toEqual([
      { label: 'Tarifa base', before: '$8.000', after: '$9.000' },
      { label: 'Recargo nocturno', before: '25 %', after: '30 %' },
    ]);
  });

  test('formats each unit', () => {
    expect(formatConfigValue('search_radius_km', 5)).toBe('5 km');
    expect(formatConfigValue('acceptance_timeout_sec', 30)).toBe('30 s');
    expect(formatConfigValue('avg_speed_kmh', 25)).toBe('25 km/h');
    expect(formatConfigValue('tiebreak_window_hours', 2)).toBe('2 h');
    expect(formatConfigValue('max_auto_retries', 3)).toBe('3');
  });
});

test.describe('official mark rules', () => {
  test('an unofficial fare stays unofficial by default', () => {
    expect(effectiveIsOfficial(markState())).toBe(false);
  });

  test('changing values of an official fare proposes unofficial', () => {
    expect(effectiveIsOfficial(markState({ baselineOfficial: true, valuesChanged: true }))).toBe(
      false,
    );
    expect(markChanged(markState({ baselineOfficial: true, valuesChanged: true }))).toBe(true);
  });

  test('editing nothing keeps an official fare official', () => {
    const state = markState({ baselineOfficial: true });
    expect(effectiveIsOfficial(state)).toBe(true);
    expect(markChanged(state)).toBe(false);
  });

  test('marking an unofficial fare as official without changing values is a mark-only change', () => {
    const state = markState({ touched: true, isOfficial: true, reference: 'Decreto 45' });
    expect(effectiveIsOfficial(state)).toBe(true);
    expect(markChanged(state)).toBe(true);
  });

  test('an explicit choice wins over the default', () => {
    const state = markState({
      baselineOfficial: true,
      valuesChanged: true,
      touched: true,
      isOfficial: true,
    });
    expect(effectiveIsOfficial(state)).toBe(true);
  });

  test('a changed reference of an official fare is a change', () => {
    const state = markState({
      baselineOfficial: true,
      baselineReference: 'Decreto 1',
      reference: 'Decreto 2',
    });
    expect(markChanged(state)).toBe(true);
  });

  test('validates the reference length only when official', () => {
    expect(validateReference(false, 'x')).toBeNull();
    expect(validateReference(true, '')).toBeNull();
    expect(validateReference(true, 'ab')).toContain('entre 3 y 120');
    expect(validateReference(true, 'Decreto 045 de 2026')).toBeNull();
  });
});

test.describe('DTO builders', () => {
  const draft = numericDraftOf(BASELINE);

  test('build a fare DTO accepted by the shared contract', () => {
    const dto = buildFareDto(11, draft, true, '  Decreto 045  ');
    expect(UpdateMunicipalityFareDTO.parse(dto)).toMatchObject({
      version: 11,
      is_official: true,
      official_reference: 'Decreto 045',
    });
  });

  test('drop the reference when the fare is not official', () => {
    const dto = buildFareDto(11, draft, false, 'Decreto 045');
    expect(dto.official_reference).toBeNull();
    expect(() => UpdateMunicipalityFareDTO.parse(dto)).not.toThrow();
  });

  test('build a params DTO with all nine values and a nullable version', () => {
    const dto = buildParamsDto(null, draft);
    expect(Object.keys(dto).sort()).toEqual([...PARAM_FIELD_KEYS, 'version'].sort());
    expect(() => UpdateMunicipalityOperationalParamsDTO.parse(dto)).not.toThrow();
  });
});

test.describe('commissionError', () => {
  test('accepts 0 to 50 percent with two decimals', () => {
    for (const value of ['0', '8', '12.5', '50', '7.25']) {
      expect(commissionError(value), value).toBeNull();
    }
  });

  test('rejects empty, out of range and too precise values', () => {
    expect(commissionError('')).toBeTruthy();
    expect(commissionError('51')).toContain('0 a 50');
    expect(commissionError('-1')).toContain('0 a 50');
    expect(commissionError('7.255')).toBeTruthy();
  });
});

test.describe('version snapshots', () => {
  const fare = {
    base_fare: 8000,
    night_surcharge_pct: 25,
    holiday_surcharge_pct: 25,
    is_official: false,
    official_reference: null,
  };

  test('diff lists only what changed, with the mark and its reference', () => {
    const next = { ...fare, base_fare: 9000, is_official: true, official_reference: 'Decreto 045' };
    expect(diffSnapshots(snapshotOfFare(fare), snapshotOfFare(next))).toEqual([
      { label: 'Tarifa base', before: '$8.000', after: '$9.000' },
      { label: 'Marca', before: 'No oficial', after: 'Oficial · Decreto 045' },
    ]);
  });

  test('a mark-only change is listed even when no value changes', () => {
    const next = { ...fare, is_official: true };
    expect(diffSnapshots(snapshotOfFare(fare), snapshotOfFare(next))).toEqual([
      { label: 'Marca', before: 'No oficial', after: 'Oficial' },
    ]);
  });

  test('identical versions have no differences', () => {
    expect(diffSnapshots(snapshotOfFare(fare), snapshotOfFare({ ...fare }))).toEqual([]);
  });

  test('commission snapshots compare by value', () => {
    expect(diffSnapshots(snapshotOfCommission(10), snapshotOfCommission(8))).toEqual([
      { label: 'Comisión', before: '10 %', after: '8 %' },
    ]);
  });
});
