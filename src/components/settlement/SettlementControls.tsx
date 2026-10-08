import { useEffect, useRef, type JSX } from 'react';
import type { OpsDriverRow } from '@voyyaa/shared';
import { SETTLEMENT_COPY } from '../../copy/settlement';
import type { SettlementQueryState } from '../../hooks/useSettlementQuery';
import { formatWeekdayRange, sameRange } from '../../lib/settlement';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';

export interface SettlementControlsProps {
  state: SettlementQueryState;
  drivers: readonly OpsDriverRow[];
  generating: boolean;
}

export function SettlementControls({
  state,
  drivers,
  generating,
}: SettlementControlsProps): JSX.Element {
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const { draftIssue } = state;

  useEffect(() => {
    if (draftIssue) (draftIssue.field === 'from' ? fromRef : toRef).current?.focus();
  }, [draftIssue]);

  const lastWeek = state.lastWeekRange;
  const isLastWeek = sameRange(state.applied, lastWeek);
  const isThisWeek = sameRange(state.applied, state.currentWeekRange);

  return (
    <section
      aria-label={SETTLEMENT_COPY.controlsLabel}
      className="flex shrink-0 flex-col gap-3 border-b border-border bg-bg-shell px-6 py-3 print:hidden"
    >
      <div className="flex flex-wrap items-end gap-3">
        <Button variant="ghost" onClick={() => state.shiftWeek(-1)}>
          {SETTLEMENT_COPY.previousWeek}
        </Button>
        <p aria-live="polite" className="min-w-[250px] text-center text-body font-bold text-text">
          {formatWeekdayRange(state.applied)}
        </p>
        <Button
          variant="ghost"
          onClick={() => state.shiftWeek(1)}
          disabled={!state.isNextWeekAvailable}
        >
          {SETTLEMENT_COPY.nextWeek}
        </Button>

        <div className="flex gap-2" role="group" aria-label="Atajos de semana">
          <Button
            variant={isLastWeek ? 'secondary' : 'ghost'}
            aria-pressed={isLastWeek}
            onClick={() => state.selectWeek(lastWeek)}
          >
            {SETTLEMENT_COPY.lastWeek}
          </Button>
          <Button
            variant={isThisWeek ? 'secondary' : 'ghost'}
            aria-pressed={isThisWeek}
            onClick={() => state.selectWeek(state.currentWeekRange)}
          >
            {SETTLEMENT_COPY.thisWeek}
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="settlement-driver" className="text-body font-bold text-text">
            {SETTLEMENT_COPY.driverFilter}
          </label>
          <select
            id="settlement-driver"
            value={state.driverId ?? ''}
            onChange={(event) =>
              state.setDriverId(event.target.value === '' ? null : Number(event.target.value))
            }
            className="vy-input w-auto min-w-[220px]"
          >
            <option value="">{SETTLEMENT_COPY.allDrivers}</option>
            {drivers.map((driver) => (
              <option key={driver.driver_id} value={driver.driver_id}>
                {driver.first_name} {driver.last_name}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="ghost"
          aria-expanded={state.customOpen}
          aria-controls="settlement-custom-range"
          onClick={state.toggleCustom}
        >
          {SETTLEMENT_COPY.otherRange}
        </Button>
      </div>

      {state.customOpen && (
        <div id="settlement-custom-range" className="flex flex-wrap items-start gap-3">
          <Field
            label={SETTLEMENT_COPY.from}
            htmlFor="settlement-from"
            error={draftIssue?.field === 'from' ? draftIssue.message : undefined}
          >
            {(controlProps) => (
              <input
                {...controlProps}
                ref={fromRef}
                type="date"
                value={state.draft.from}
                onChange={(event) => state.setDraftField('from', event.target.value)}
                className="vy-input w-auto"
              />
            )}
          </Field>
          <Field
            label={SETTLEMENT_COPY.to}
            htmlFor="settlement-to"
            error={draftIssue?.field === 'to' ? draftIssue.message : undefined}
          >
            {(controlProps) => (
              <input
                {...controlProps}
                ref={toRef}
                type="date"
                value={state.draft.to}
                onChange={(event) => state.setDraftField('to', event.target.value)}
                className="vy-input w-auto"
              />
            )}
          </Field>
          <div className="flex flex-col gap-1.5 pt-[28px]">
            <Button onClick={state.generateCustom} loading={generating}>
              {generating ? SETTLEMENT_COPY.generating : SETTLEMENT_COPY.generate}
            </Button>
          </div>
          <p className="max-w-sm pt-[28px] text-small text-text-muted">
            {SETTLEMENT_COPY.rangeHelper}
          </p>
        </div>
      )}
    </section>
  );
}
