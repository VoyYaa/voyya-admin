export type FieldUnit = 'cop' | 'pct' | 'km' | 'sec' | 'min' | 'hours' | 'kmh' | 'count';

export type FareFieldKey = 'base_fare' | 'night_surcharge_pct' | 'holiday_surcharge_pct';

export type ParamFieldKey =
  | 'search_radius_km'
  | 'expansion_radius_km'
  | 'acceptance_timeout_sec'
  | 'max_auto_retries'
  | 'tiebreak_window_hours'
  | 'location_stale_min'
  | 'avg_speed_kmh'
  | 'cancellation_window_min'
  | 'no_show_grace_min';

export type ConfigFieldKey = FareFieldKey | ParamFieldKey;

export type ConfigGroup = 'fare' | 'surcharges' | 'assignment' | 'passenger';

export interface ConfigFieldSpec {
  key: ConfigFieldKey;
  group: ConfigGroup;
  label: string;
  helper?: string;
  unit: FieldUnit;
  min: number;
  max: number;
  step: number;
  integer: boolean;
}

export const CONFIG_GROUP_ORDER: readonly ConfigGroup[] = [
  'fare',
  'surcharges',
  'assignment',
  'passenger',
];

export const CONFIG_GROUP_LABELS: Record<ConfigGroup, string> = {
  fare: 'Tarifa',
  surcharges: 'Recargos',
  assignment: 'Asignación',
  passenger: 'Reglas para el pasajero',
};

export const CONFIG_FIELDS: readonly ConfigFieldSpec[] = [
  {
    key: 'base_fare',
    group: 'fare',
    label: 'Tarifa base',
    unit: 'cop',
    min: 1_000,
    max: 1_000_000,
    step: 1,
    integer: true,
  },
  {
    key: 'night_surcharge_pct',
    group: 'surcharges',
    label: 'Recargo nocturno',
    helper: '9 p. m. a 5 a. m.',
    unit: 'pct',
    min: 0,
    max: 100,
    step: 0.01,
    integer: false,
  },
  {
    key: 'holiday_surcharge_pct',
    group: 'surcharges',
    label: 'Recargo festivo',
    helper: 'Domingos y festivos',
    unit: 'pct',
    min: 0,
    max: 100,
    step: 0.01,
    integer: false,
  },
  {
    key: 'search_radius_km',
    group: 'assignment',
    label: 'Radio de búsqueda',
    unit: 'km',
    min: 0.1,
    max: 50,
    step: 0.1,
    integer: false,
  },
  {
    key: 'expansion_radius_km',
    group: 'assignment',
    label: 'Radio de expansión',
    unit: 'km',
    min: 0.1,
    max: 50,
    step: 0.1,
    integer: false,
  },
  {
    key: 'acceptance_timeout_sec',
    group: 'assignment',
    label: 'Tiempo de aceptación',
    unit: 'sec',
    min: 5,
    max: 120,
    step: 1,
    integer: true,
  },
  {
    key: 'max_auto_retries',
    group: 'assignment',
    label: 'Reintentos automáticos',
    unit: 'count',
    min: 1,
    max: 10,
    step: 1,
    integer: true,
  },
  {
    key: 'tiebreak_window_hours',
    group: 'assignment',
    label: 'Ventana de desempate',
    unit: 'hours',
    min: 1,
    max: 24,
    step: 1,
    integer: true,
  },
  {
    key: 'location_stale_min',
    group: 'assignment',
    label: 'Vigencia de la ubicación',
    helper: '0 es sin caducidad',
    unit: 'min',
    min: 0,
    max: 120,
    step: 1,
    integer: true,
  },
  {
    key: 'avg_speed_kmh',
    group: 'assignment',
    label: 'Velocidad promedio',
    unit: 'kmh',
    min: 5,
    max: 80,
    step: 1,
    integer: true,
  },
  {
    key: 'cancellation_window_min',
    group: 'passenger',
    label: 'Ventana de cancelación gratis',
    unit: 'min',
    min: 1,
    max: 30,
    step: 1,
    integer: true,
  },
  {
    key: 'no_show_grace_min',
    group: 'passenger',
    label: 'Cortesía de no-show',
    unit: 'min',
    min: 1,
    max: 30,
    step: 1,
    integer: true,
  },
];

export const COMMISSION_RANGE = { min: 0, max: 50, step: 0.01 } as const;

export const FARE_FIELD_KEYS: readonly FareFieldKey[] = [
  'base_fare',
  'night_surcharge_pct',
  'holiday_surcharge_pct',
];

export const PARAM_FIELD_KEYS: readonly ParamFieldKey[] = [
  'search_radius_km',
  'expansion_radius_km',
  'acceptance_timeout_sec',
  'max_auto_retries',
  'tiebreak_window_hours',
  'location_stale_min',
  'avg_speed_kmh',
  'cancellation_window_min',
  'no_show_grace_min',
];

export function fieldSpec(key: ConfigFieldKey): ConfigFieldSpec {
  const spec = CONFIG_FIELDS.find((field) => field.key === key);
  if (!spec) throw new Error(`Unknown config field ${key}`);
  return spec;
}

export function fieldsOfGroup(group: ConfigGroup): ConfigFieldSpec[] {
  return CONFIG_FIELDS.filter((field) => field.group === group);
}

const UNIT_SUFFIX: Record<Exclude<FieldUnit, 'cop' | 'count'>, string> = {
  pct: ' %',
  km: ' km',
  sec: ' s',
  min: ' min',
  hours: ' h',
  kmh: ' km/h',
};

export function formatFieldValue(unit: FieldUnit, value: number): string {
  if (unit === 'cop') return `$${value.toLocaleString('es-CO')}`;
  if (unit === 'count') return value.toLocaleString('es-CO');
  return `${value.toLocaleString('es-CO')}${UNIT_SUFFIX[unit]}`;
}

export function formatConfigValue(key: ConfigFieldKey, value: number): string {
  return formatFieldValue(fieldSpec(key).unit, value);
}

export function isMultipleOfStep(value: number, step: number): boolean {
  const ratio = value / step;
  return Math.abs(ratio - Math.round(ratio)) < 1e-6;
}
