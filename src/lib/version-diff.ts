import { CONFIG_FIELDS, formatFieldValue, type ConfigFieldKey } from './service-config-fields';

export interface SnapshotItem {
  key: string;
  label: string;
  value: string;
}

export type Snapshot = SnapshotItem[];

export interface DiffRow {
  label: string;
  before: string;
  after: string;
}

export interface FareSnapshotSource {
  base_fare: number;
  night_surcharge_pct: number;
  holiday_surcharge_pct: number;
  is_official: boolean;
  official_reference: string | null;
}

export const MARK_KEY = 'mark';
export const MARK_LABEL = 'Marca';
export const OFFICIAL_TEXT = 'Oficial';
export const UNOFFICIAL_TEXT = 'No oficial';

export function formatMark(isOfficial: boolean, reference: string | null | undefined): string {
  if (!isOfficial) return UNOFFICIAL_TEXT;
  const trimmed = reference?.trim() ?? '';
  return trimmed.length > 0 ? `${OFFICIAL_TEXT} · ${trimmed}` : OFFICIAL_TEXT;
}

export function numericSnapshot(
  keys: readonly ConfigFieldKey[],
  source: Partial<Record<ConfigFieldKey, number | null>>,
): Snapshot {
  return CONFIG_FIELDS.filter((field) => keys.includes(field.key)).map((field) => {
    const raw = source[field.key];
    return {
      key: field.key,
      label: field.label,
      value: typeof raw === 'number' ? formatFieldValue(field.unit, raw) : '—',
    };
  });
}

export function snapshotOfFare(fare: FareSnapshotSource): Snapshot {
  return [
    ...numericSnapshot(['base_fare', 'night_surcharge_pct', 'holiday_surcharge_pct'], fare),
    {
      key: MARK_KEY,
      label: MARK_LABEL,
      value: formatMark(fare.is_official, fare.official_reference),
    },
  ];
}

export function snapshotOfCommission(commissionPct: number): Snapshot {
  return [
    { key: 'commission_pct', label: 'Comisión', value: formatFieldValue('pct', commissionPct) },
  ];
}

export function diffSnapshots(previous: Snapshot, next: Snapshot): DiffRow[] {
  const rows: DiffRow[] = [];
  for (const item of next) {
    const before = previous.find((candidate) => candidate.key === item.key);
    if (before && before.value !== item.value) {
      rows.push({ label: item.label, before: before.value, after: item.value });
    }
  }
  return rows;
}
