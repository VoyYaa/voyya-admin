import { useCallback, useEffect, useState } from 'react';
import { getHealth, type HealthResponse } from '../api/health.api';

export type BackendHealthState =
  { kind: 'loading' } | { kind: 'ok'; data: HealthResponse } | { kind: 'error'; message: string };

export function useBackendHealth(): BackendHealthState & { check: () => void } {
  const [state, setState] = useState<BackendHealthState>({ kind: 'loading' });

  const check = useCallback(() => {
    setState({ kind: 'loading' });
    getHealth()
      .then((data) => setState({ kind: 'ok', data }))
      .catch(() => setState({ kind: 'error', message: 'No se pudo contactar al backend.' }));
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return { ...state, check };
}
