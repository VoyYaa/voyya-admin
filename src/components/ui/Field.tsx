import type { JSX, ReactNode } from 'react';

export interface FieldControlProps {
  id: string;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
}

export interface FieldProps {
  label: ReactNode;
  htmlFor: string;
  error?: string;
  hint?: string;
  announceError?: boolean;
  children: (controlProps: FieldControlProps) => ReactNode;
}

function ErrorIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 shrink-0">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 4.8V8.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="11" r="1" fill="currentColor" />
    </svg>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  announceError = false,
  children,
}: FieldProps): JSX.Element {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-body font-bold text-text">
        {label}
      </label>
      {children({
        id: htmlFor,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy.length > 0 ? describedBy : undefined,
      })}
      {hint && (
        <p id={hintId} className="text-small text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role={announceError ? 'alert' : undefined}
          className="flex items-start gap-1.5 text-small font-semibold text-danger-ink dark:text-danger-ink-dark"
        >
          <ErrorIcon />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
