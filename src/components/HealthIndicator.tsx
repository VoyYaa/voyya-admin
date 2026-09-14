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
    state.kind === 'ok' ? 'bg-go' : state.kind === 'error' ? 'bg-danger' : 'bg-espresso/30';

  const label =
    state.kind === 'ok'
      ? `${state.data.service} · ok`
      : state.kind === 'error'
        ? state.message
        : 'Revisando…';

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-amber/20 bg-white/60 px-4 py-3 shadow-sm">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-espresso">{label}</p>
        {state.kind === 'ok' && (
          <p className="truncate text-xs text-espresso/60">
            {new Date(state.data.ts).toLocaleString()}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={check}
        className="shrink-0 rounded-full px-3 py-1 text-xs font-medium text-amber-deep hover:bg-amber/10"
      >
        Revisar
      </button>
    </div>
  );
}
