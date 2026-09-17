import { useCallback, useEffect, useState, type JSX } from 'react';
import { getHealth, type HealthResponse } from '../api/health.api';

type HealthState =
  { kind: 'loading' } | { kind: 'ok'; data: HealthResponse } | { kind: 'error'; message: string };

export function HealthIndicator(): JSX.Element {
  const [state, setState] = useState<HealthState>({ kind: 'loading' });

  const check = useCallback(() => {
    setState({ kind: 'loading' });
    getHealth()
      .then((data) => setState({ kind: 'ok', data }))
      .catch(() => setState({ kind: 'error', message: 'No se pudo contactar al backend.' }));
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const dotClass =
    state.kind === 'ok' ? 'bg-success' : state.kind === 'error' ? 'bg-danger' : 'bg-status-neutral';

  const label =
    state.kind === 'ok'
      ? `${state.data.service} · ok`
      : state.kind === 'error'
        ? state.message
        : 'Revisando…';

  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-small text-text-muted">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} aria-hidden="true" />
      <span className="max-w-[16rem] truncate">{label}</span>
      <button
        type="button"
        onClick={check}
        className="focus-ring shrink-0 rounded-sm px-1 text-small font-medium text-text hover:text-amber-deep"
      >
        Revisar
      </button>
    </div>
  );
}
