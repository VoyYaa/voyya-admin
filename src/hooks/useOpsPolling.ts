import { useCallback, useEffect, useRef, useState } from 'react';
import { OPS_QUEUE_STALE_AFTER_MS } from '@voyyaa/shared';
import { ApiError, isNetworkError } from '../api/errors';
import { useClockTick } from './useClockTick';
import { useDocumentVisibility } from './useDocumentVisibility';
import { computeSkewMs } from '../lib/time';

export type OpsFreshness = 'live' | 'reconnecting' | 'offline';

export interface UseOpsPollingResult<T> {
  data: T | null;
  freshness: OpsFreshness;
  skewMs: number;
  lastSuccessAt: number | null;
  error: ApiError | null;
  isInitialLoading: boolean;
  refetch: () => void;
}

export function useOpsPolling<T extends { server_time: string }>(
  fetcher: () => Promise<T>,
  intervalMs: number,
): UseOpsPollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [lastSuccessAt, setLastSuccessAt] = useState<number | null>(null);
  const [lastErrorWasNetwork, setLastErrorWasNetwork] = useState(false);
  const [skewMs, setSkewMs] = useState(0);
  const isVisible = useDocumentVisibility();
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  useClockTick(1000);

  const poll = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      setData(result);
      setSkewMs(computeSkewMs(result.server_time));
      setLastSuccessAt(Date.now());
      setLastErrorWasNetwork(false);
      setError(null);
    } catch (err) {
      const apiError =
        err instanceof ApiError ? err : new ApiError('network', 'Error de red desconocido.');
      setError(apiError);
      setLastErrorWasNetwork(isNetworkError(apiError) || !navigator.onLine);
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    void poll();
    const id = window.setInterval(() => void poll(), intervalMs);
    return () => window.clearInterval(id);
  }, [isVisible, intervalMs, poll]);

  const freshness: OpsFreshness = (() => {
    if (!navigator.onLine || lastErrorWasNetwork || lastSuccessAt === null) return 'offline';
    const elapsed = Date.now() - lastSuccessAt;
    return elapsed >= OPS_QUEUE_STALE_AFTER_MS ? 'reconnecting' : 'live';
  })();

  return {
    data,
    freshness,
    skewMs,
    lastSuccessAt,
    error,
    isInitialLoading,
    refetch: () => void poll(),
  };
}
