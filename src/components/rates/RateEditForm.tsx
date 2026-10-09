import type { JSX } from 'react';
import { RATES_COPY } from '../../copy/rates';
import {
  CONFIG_GROUP_LABELS,
  CONFIG_GROUP_ORDER,
  FARE_FIELD_KEYS,
  fieldsOfGroup,
  type ConfigFieldKey,
  type ConfigFieldSpec,
  type FareFieldKey,
} from '../../lib/service-config-fields';
import type { RateEditor } from '../../hooks/useRateEditor';
import { Field } from '../ui/Field';

function isFareKey(key: ConfigFieldKey): key is FareFieldKey {
  return (FARE_FIELD_KEYS as readonly string[]).includes(key);
}

interface EditableRowProps {
  spec: ConfigFieldSpec;
  value: string;
  error?: string;
  dirty: boolean;
  onChange: (value: string) => void;
}

function EditableRow({ spec, value, error, dirty, onChange }: EditableRowProps): JSX.Element {
  const inputId = `rate-${spec.key}`;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const describedBy = [spec.helper ? helperId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex min-h-row-lg items-center justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <div>
        <div className="flex items-center gap-2">
          <label htmlFor={inputId} className="text-body text-text">
            {spec.label}
          </label>
          {dirty && (
            <span className="text-small font-bold text-amber-ink dark:text-amber">
              {RATES_COPY.modified}
            </span>
          )}
        </div>
        {spec.helper && (
          <p id={helperId} className="text-small text-text-muted">
            {spec.helper}
          </p>
        )}
        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-small font-semibold text-danger-ink dark:text-danger-ink-dark"
          >
            {error}
          </p>
        )}
      </div>
      <input
        type="number"
        inputMode="decimal"
        id={inputId}
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy.length > 0 ? describedBy : undefined}
        onChange={(event) => onChange(event.target.value)}
        onWheel={(event) => event.currentTarget.blur()}
        className={`vy-input text-numeric ${spec.key === 'base_fare' ? 'w-40' : 'w-28'}`}
      />
    </div>
  );
}

interface RadioOptionProps {
  checked: boolean;
  label: string;
  help: string;
  onSelect: () => void;
}

function RadioOption({ checked, label, help, onSelect }: RadioOptionProps): JSX.Element {
  return (
    <label className="flex min-h-tap cursor-pointer items-start gap-3 py-2">
      <input
        type="radio"
        name="rate-official-mark"
        checked={checked}
        onChange={onSelect}
        className="focus-ring mt-0.5 h-5 w-5 shrink-0 accent-amber-deep"
      />
      <span>
        <span className="block text-body font-bold text-text">{label}</span>
        <span className="block text-small text-text-muted">{help}</span>
      </span>
    </label>
  );
}

export interface RateEditFormProps {
  editor: RateEditor;
  disabled: boolean;
}

export function RateEditForm({ editor, disabled }: RateEditFormProps): JSX.Element {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      {CONFIG_GROUP_ORDER.map((group) => {
        const fields = fieldsOfGroup(group).filter(
          (field) => !isFareKey(field.key) || editor.canEditFare,
        );
        if (fields.length === 0) return null;
        return (
          <section key={group} className="mb-8 border-t border-border pt-6">
            <h2 className="mb-3 font-display text-title text-text">{CONFIG_GROUP_LABELS[group]}</h2>
            {fields.map((field) => (
              <EditableRow
                key={field.key}
                spec={field}
                value={editor.draft[field.key]}
                error={editor.errors[field.key]}
                dirty={editor.dirtyKeys.has(field.key)}
                onChange={(value) => editor.setValue(field.key, value)}
              />
            ))}
          </section>
        );
      })}

      {editor.canEditFare && (
        <fieldset className="mb-8 border-t border-border pt-6">
          <legend className="mb-1 font-display text-title text-text">{RATES_COPY.markTitle}</legend>
          <p className="mb-2 text-body text-text-muted">{RATES_COPY.markQuestion}</p>
          <RadioOption
            checked={!editor.isOfficial}
            label={RATES_COPY.markUnofficial}
            help={RATES_COPY.markUnofficialHelp}
            onSelect={() => editor.setOfficial(false)}
          />
          <RadioOption
            checked={editor.isOfficial}
            label={RATES_COPY.markOfficial}
            help={RATES_COPY.markOfficialHelp}
            onSelect={() => editor.setOfficial(true)}
          />
          {editor.isOfficial && (
            <div className="mt-2 max-w-md">
              <Field
                label={RATES_COPY.referenceLabel}
                htmlFor="rate-official_reference"
                hint={RATES_COPY.referenceHint}
                error={editor.errors.official_reference}
                announceError
              >
                {(control) => (
                  <input
                    className="vy-input"
                    maxLength={120}
                    autoComplete="off"
                    value={editor.reference}
                    onChange={(event) => editor.setReference(event.target.value)}
                    {...control}
                  />
                )}
              </Field>
            </div>
          )}
        </fieldset>
      )}
      <p className="mb-8 text-small text-text-muted">{RATES_COPY.effectiveNow}</p>
    </fieldset>
  );
}
