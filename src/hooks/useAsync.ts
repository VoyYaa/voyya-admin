import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/errors';

export type AsyncStatus = 'loading' | 'success' | 'error';

export interface UseAsyncResult<T> {
  data: T | null;
  status: AsyncStatus;
  error: ApiError | null;
  isInitialLoading: boolean;
  refetch: () => void;
}

export function useAsync<T>(fetcher: () => Promise<T>, enabled: boolean = true): UseAsyncResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<AsyncStatus>('loading');
  const [error, setError] = useState<ApiError | null>(null);
  const requestIdRef = useRef(0);

  const run = useCallback(() => {
    if (!enabled) return;
    const requestId = ++requestIdRef.current;
    setStatus('loading');
    setError(null);
    fetcher()
      .then((result) => {
        if (requestIdRef.current !== requestId) return;
        setData(result);
        setStatus('success');
      })
      .catch((err: unknown) => {
        if (requestIdRef.current !== requestId) return;
        setError(err instanceof ApiError ? err : new ApiError('network', 'Error inesperado.'));
        setStatus('error');
      });
  }, [fetcher, enabled]);

  useEffect(() => {
    run();
  }, [run]);

  return {
    data,
    status,
    error,
    isInitialLoading: status === 'loading' && data === null,
    refetch: run,
  };
}
