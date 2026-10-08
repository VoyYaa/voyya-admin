import { useCallback, useMemo, useState } from 'react';
import { settlementWeekOf, type SettlementReportQuery } from '@voyyaa/shared';
import {
  currentWeek,
  previousWeek,
  shiftWeeks,
  validateRange,
  type DateRange,
  type RangeIssue,
} from '../lib/settlement';

export interface SettlementQueryState {
  applied: DateRange;
  currentWeekRange: DateRange;
  lastWeekRange: DateRange;
  appliedWeek: DateRange;
  isNextWeekAvailable: boolean;
  driverId: number | null;
  customOpen: boolean;
  draft: DateRange;
  draftIssue: RangeIssue | null;
  isDraftDirty: boolean;
  query: SettlementReportQuery;
  selectWeek: (range: DateRange) => void;
  shiftWeek: (delta: number) => void;
  setDriverId: (driverId: number | null) => void;
  toggleCustom: () => void;
  setDraftField: (field: keyof DateRange, value: string) => void;
  generateCustom: () => void;
}

export function useSettlementQuery(): SettlementQueryState {
  const now = useMemo(() => new Date(), []);
  const currentWeekRange = useMemo(() => currentWeek(now), [now]);
  const lastWeekRange = useMemo(() => previousWeek(now), [now]);
  const [applied, setApplied] = useState<DateRange>(lastWeekRange);
  const [driverId, setDriverId] = useState<number | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(applied);
  const [draftIssue, setDraftIssue] = useState<RangeIssue | null>(null);

  const applyRange = useCallback((range: DateRange) => {
    setApplied(range);
    setDraft(range);
    setDraftIssue(null);
  }, []);

  const appliedWeek = useMemo(() => settlementWeekOf(applied.from), [applied.from]);

  const shiftWeek = useCallback(
    (delta: number) => applyRange(shiftWeeks(appliedWeek, delta)),
    [appliedWeek, applyRange],
  );

  const setDraftField = useCallback((field: keyof DateRange, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setDraftIssue(null);
  }, []);

  const generateCustom = useCallback(() => {
    const issue = validateRange(draft.from, draft.to);
    setDraftIssue(issue);
    if (!issue) setApplied({ from: draft.from, to: draft.to });
  }, [draft]);

  const query = useMemo<SettlementReportQuery>(
    () => ({
      from: applied.from,
      to: applied.to,
      ...(driverId !== null ? { driver_id: driverId } : {}),
    }),
    [applied.from, applied.to, driverId],
  );

  return {
    applied,
    currentWeekRange,
    lastWeekRange,
    appliedWeek,
    isNextWeekAvailable: appliedWeek.from < currentWeekRange.from,
    driverId,
    customOpen,
    draft,
    draftIssue,
    isDraftDirty: draft.from !== applied.from || draft.to !== applied.to,
    query,
    selectWeek: applyRange,
    shiftWeek,
    setDriverId,
    toggleCustom: () => setCustomOpen((open) => !open),
    setDraftField,
    generateCustom,
  };
}
