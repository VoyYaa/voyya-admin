import type { JSX } from 'react';
import type { ActivatableServiceType } from '@voyyaa/shared';
import { SERVICE_DECLARATION_COPY } from '../../copy/affiliation';
import { serviceLabel } from '../../copy/service';

export interface ServiceDeclarationFieldProps {
  activeServices: readonly ActivatableServiceType[];
  value: readonly ActivatableServiceType[];
  onChange: (next: ActivatableServiceType[]) => void;
  error?: string;
}

function CheckIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M3 8.5l3.2 3.2L13 4.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ServiceDeclarationField({
  activeServices,
  value,
  onChange,
  error,
}: ServiceDeclarationFieldProps): JSX.Element {
  const [onlyService] = activeServices;
  const toggle = (service: ActivatableServiceType): void => {
    onChange(
      value.includes(service) ? value.filter((item) => item !== service) : [...value, service],
    );
  };

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-body font-bold text-text">
        {SERVICE_DECLARATION_COPY.legend}
      </legend>
      {activeServices.length === 1 && onlyService ? (
        <>
          <p className="flex min-h-tap items-center gap-2 text-body font-bold text-text">
            <span className="text-success-ink dark:text-success-ink-dark">
              <CheckIcon />
            </span>
            {serviceLabel(onlyService)}
          </p>
          <p className="text-small text-text-muted">
            {SERVICE_DECLARATION_COPY.onlyOne(serviceLabel(onlyService))}
          </p>
        </>
      ) : (
        activeServices.map((service) => (
          <label key={service} className="flex min-h-tap cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={value.includes(service)}
              onChange={() => toggle(service)}
              className="focus-ring h-5 w-5 shrink-0 accent-amber-deep"
            />
            <span className="text-body text-text">{serviceLabel(service)}</span>
          </label>
        ))
      )}
      {error && (
        <p
          role="alert"
          className="text-small font-semibold text-danger-ink dark:text-danger-ink-dark"
        >
          {error}
        </p>
      )}
    </fieldset>
  );
}
