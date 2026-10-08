import {
  SETTLEMENT_MAX_RANGE_DAYS,
  SETTLEMENT_TIME_ZONE,
  addDays,
  daysBetween,
  isCalendarDate,
  settlementToday,
  settlementWeekOf,
  type IsoDate,
} from '@voyyaa/shared';
import {
  SETTLEMENT_COPY,
  SETTLEMENT_MONTHS_LONG,
  SETTLEMENT_MONTHS_SHORT,
  SETTLEMENT_WEEKDAYS,
} from '../copy/settlement';

export interface DateRange {
  from: IsoDate;
  to: IsoDate;
}

export type RangeField = 'from' | 'to';

export interface RangeIssue {
  field: RangeField;
  message: string;
}

const DAYS_IN_WEEK = 7;

export function currentWeek(now: Date): DateRange {
  return settlementWeekOf(settlementToday(now));
}

export function previousWeek(now: Date): DateRange {
  return shiftWeeks(currentWeek(now), -1);
}

export function shiftWeeks(range: DateRange, weeks: number): DateRange {
  return {
    from: addDays(range.from, weeks * DAYS_IN_WEEK),
    to: addDays(range.to, weeks * DAYS_IN_WEEK),
  };
}

export function sameRange(a: DateRange, b: DateRange): boolean {
  return a.from === b.from && a.to === b.to;
}

function splitDate(date: IsoDate): { year: number; month: number; day: number; weekday: number } {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return { year, month, day, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() };
}

export function formatDayMonth(date: IsoDate): string {
  const { month, day } = splitDate(date);
  return `${day} ${SETTLEMENT_MONTHS_SHORT[month - 1]}`;
}

export function formatDayMonthYear(date: IsoDate): string {
  return `${formatDayMonth(date)} ${splitDate(date).year}`;
}

export function formatLongDate(date: IsoDate): string {
  const { year, month, day } = splitDate(date);
  return `${day} de ${SETTLEMENT_MONTHS_LONG[month - 1]} de ${year}`;
}

function formatWeekdayDayMonth(date: IsoDate): string {
  return `${SETTLEMENT_WEEKDAYS[splitDate(date).weekday]} ${formatDayMonth(date)}`;
}

function capitalize(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

export function formatCompactRange(range: DateRange): string {
  const from = splitDate(range.from);
  const to = splitDate(range.to);
  return from.year === to.year
    ? `${formatDayMonth(range.from)} al ${formatDayMonth(range.to)} de ${to.year}`
    : `${formatDayMonthYear(range.from)} al ${formatDayMonthYear(range.to)}`;
}

export function formatWeekdayRange(range: DateRange): string {
  return `${capitalize(formatWeekdayDayMonth(range.from))} – ${formatWeekdayDayMonth(range.to)} ${splitDate(range.to).year}`;
}

export function formatLongRange(range: DateRange): string {
  return `${formatLongDate(range.from)} al ${formatLongDate(range.to)}`;
}

export function reportTitle(range: DateRange, isWeek: boolean): string {
  const compact = formatCompactRange(range);
  return isWeek ? SETTLEMENT_COPY.weekTitle(compact) : SETTLEMENT_COPY.rangeTitle(compact);
}

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function formatCop(amount: number): string {
  return copFormatter.format(amount).replace(/\s/g, '');
}

interface BogotaParts {
  isoDate: IsoDate;
  hour: number;
  minute: number;
}

const bogotaFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SETTLEMENT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function bogotaParts(iso: string): BogotaParts {
  const parts = Object.fromEntries(
    bogotaFormatter.formatToParts(new Date(iso)).map((part) => [part.type, part.value]),
  );
  return {
    isoDate: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function formatClock12(hour: number, minute: number): string {
  const suffix = hour < 12 ? 'a. m.' : 'p. m.';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function formatDateTimeBogota(iso: string): string {
  const { isoDate, hour, minute } = bogotaParts(iso);
  return `${formatDayMonthYear(isoDate)}, ${formatClock12(hour, minute)}`;
}

export function formatLongDateTimeBogota(iso: string): string {
  const { isoDate, hour, minute } = bogotaParts(iso);
  return `${formatLongDate(isoDate)}, ${formatClock12(hour, minute)}`;
}

export function formatDayMonthBogota(iso: string): string {
  return formatDayMonth(bogotaParts(iso).isoDate);
}

export function validateRange(from: string, to: string): RangeIssue | null {
  if (!isCalendarDate(from)) {
    return { field: 'from', message: SETTLEMENT_COPY.range.invalidDate };
  }
  if (!isCalendarDate(to)) {
    return { field: 'to', message: SETTLEMENT_COPY.range.invalidDate };
  }
  if (from > to) {
    return { field: 'from', message: SETTLEMENT_COPY.range.fromAfterTo };
  }
  if (daysBetween(from, to) >= SETTLEMENT_MAX_RANGE_DAYS) {
    return { field: 'to', message: SETTLEMENT_COPY.range.tooLong };
  }
  return null;
}
