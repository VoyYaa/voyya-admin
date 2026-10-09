import type { JSX } from 'react';
import type { PlatformServiceConfigRow } from '@voyyaa/shared';
import { RATES_COPY } from '../../copy/rates';
import {
  CONFIG_GROUP_LABELS,
  CONFIG_GROUP_ORDER,
  FARE_FIELD_KEYS,
  fieldsOfGroup,
  formatConfigValue,
  type ConfigFieldKey,
  type FareFieldKey,
  type ParamFieldKey,
} from '../../lib/service-config-fields';
import { ReadOnlyRow } from '../ui/ReadOnlyRow';

export interface RateReadViewProps {
  row: PlatformServiceConfigRow;
}

function isFareKey(key: ConfigFieldKey): key is FareFieldKey {
  return (FARE_FIELD_KEYS as readonly string[]).includes(key);
}

export function RateReadView({ row }: RateReadViewProps): JSX.Element {
  const fare = row.fare;
  const params = row.operational_params;
  const defaults = new Set<string>(params.platform_default_keys);

  return (
    <div>
      {CONFIG_GROUP_ORDER.map((group) => {
        const fields = fieldsOfGroup(group).filter((field) => !isFareKey(field.key) || fare);
        if (fields.length === 0) return null;
        return (
          <section key={group} className="mb-8 border-t border-border pt-6">
            <h2 className="mb-3 font-display text-title text-text">{CONFIG_GROUP_LABELS[group]}</h2>
            <dl>
              {fields.map((field) => {
                const value = isFareKey(field.key)
                  ? fare?.[field.key]
                  : params[field.key as ParamFieldKey];
                const helper = defaults.has(field.key)
                  ? [field.helper, RATES_COPY.platformDefault].filter(Boolean).join(' · ')
                  : field.helper;
                return (
                  <ReadOnlyRow key={field.key} label={field.label} helper={helper}>
                    {value === undefined ? '—' : formatConfigValue(field.key, value)}
                  </ReadOnlyRow>
                );
              })}
            </dl>
          </section>
        );
      })}
      <section className="mb-8 border-t border-border pt-6">
        <h2 className="mb-3 font-display text-title text-text">{RATES_COPY.usedByTitle}</h2>
        <p className="text-body text-text">
          {RATES_COPY.usedBy(row.active_company_count, row.municipality_name)}
        </p>
      </section>
    </div>
  );
}
