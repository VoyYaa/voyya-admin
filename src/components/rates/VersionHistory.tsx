import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import type { ConfigAuthor, ConfigOrigin } from '@voyyaa/shared';
import { Button } from '../ui/Button';
import { DiffTable } from '../ui/DiffTable';
import { ErrorPanel, SkeletonBlock } from '../ui/TableStates';
import { StatusDot } from '../ui/StatusDot';
import { RATES_COPY } from '../../copy/rates';
import { diffSnapshots, type Snapshot } from '../../lib/version-diff';

export interface HistoryVersion {
  valid_from: string | null;
  created_by: ConfigAuthor | null;
  origin: ConfigOrigin | null;
}

export interface HistoryPage<T> {
  versions: T[];
  next_before: number | null;
}

export interface VersionHistoryProps<T extends HistoryVersion> {
  title: string;
  fetchPage: (before?: number) => Promise<HistoryPage<T>>;
  reloadKey: number;
  toSnapshot: (version: T) => Snapshot;
  originText: (version: T) => string | null;
}

interface HistoryState<T> {
  versions: T[];
  nextBefore: number | null;
  status: 'loading' | 'ready' | 'error';
  loadingMore: boolean;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function VersionHistory<T extends HistoryVersion>({
  title,
  fetchPage,
  reloadKey,
  toSnapshot,
  originText,
}: VersionHistoryProps<T>): JSX.Element {
  const [state, setState] = useState<HistoryState<T>>({
    versions: [],
    nextBefore: null,
    status: 'loading',
    loadingMore: false,
  });
  const requestRef = useRef(0);

  const loadFirst = useCallback(() => {
    const requestId = ++requestRef.current;
    setState((current) => ({ ...current, status: 'loading' }));
    fetchPage()
      .then((page) => {
        if (requestRef.current !== requestId) return;
        setState({
          versions: page.versions,
          nextBefore: page.next_before,
          status: 'ready',
          loadingMore: false,
        });
      })
      .catch(() => {
        if (requestRef.current !== requestId) return;
        setState((current) => ({ ...current, status: 'error' }));
      });
  }, [fetchPage]);

  useEffect(() => {
    loadFirst();
  }, [loadFirst, reloadKey]);

  const loadOlder = (): void => {
    if (state.nextBefore === null) return;
    const requestId = ++requestRef.current;
    setState((current) => ({ ...current, loadingMore: true }));
    fetchPage(state.nextBefore)
      .then((page) => {
        if (requestRef.current !== requestId) return;
        setState((current) => ({
          versions: [...current.versions, ...page.versions],
          nextBefore: page.next_before,
          status: 'ready',
          loadingMore: false,
        }));
      })
      .catch(() => {
        if (requestRef.current !== requestId) return;
        setState((current) => ({ ...current, status: 'error', loadingMore: false }));
      });
  };

  const { versions, nextBefore, status, loadingMore } = state;

  return (
    <section aria-label={title} className="mb-8 border-t border-border pt-6">
      <h2 className="mb-3 font-display text-title text-text">{title}</h2>
      {status === 'loading' && versions.length === 0 && (
        <div role="status" aria-label={RATES_COPY.loadingDetail} className="flex flex-col gap-3">
          <SkeletonBlock className="h-4 w-1/3" />
          <SkeletonBlock className="h-4 w-2/3" />
        </div>
      )}
      {status === 'error' && versions.length === 0 && (
        <ErrorPanel title={RATES_COPY.historyError} onRetry={loadFirst} />
      )}
      {status === 'ready' && versions.length === 0 && (
        <p className="text-body text-text-muted">{RATES_COPY.historyEmpty}</p>
      )}
      {versions.length > 0 && (
        <ol className="flex flex-col">
          {versions.map((version, index) => {
            const older = versions[index + 1];
            const hasKnownPredecessor = older !== undefined;
            const isOldestEver = !hasKnownPredecessor && nextBefore === null;
            const snapshot = toSnapshot(version);
            const origin = originText(version);
            return (
              <li
                key={`${index}-${version.valid_from ?? ''}`}
                className="border-b border-border py-3 last:border-b-0"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {index === 0 && <StatusDot tone="success" label={RATES_COPY.current} />}
                    {isOldestEver && (
                      <span className="text-body text-text-muted">{RATES_COPY.initialVersion}</span>
                    )}
                  </div>
                  {version.valid_from && (
                    <span className="text-numeric text-small text-text-muted">
                      {formatDateTime(version.valid_from)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-body text-text">
                  {version.created_by?.name ?? RATES_COPY.originUnknown}
                </p>
                {origin && <p className="text-small text-text-muted">{origin}</p>}
                {hasKnownPredecessor && (
                  <div className="mt-2">
                    <DiffTable rows={diffSnapshots(toSnapshot(older), snapshot)} caption={title} />
                  </div>
                )}
                {!hasKnownPredecessor && !isOldestEver && (
                  <dl className="mt-2 text-small">
                    {snapshot.map((item) => (
                      <div key={item.key} className="flex gap-3 py-0.5">
                        <dt className="text-text-muted">{item.label}</dt>
                        <dd className="text-numeric text-text">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {status === 'error' && versions.length > 0 && (
        <p
          role="alert"
          className="mt-2 text-small font-semibold text-danger-ink dark:text-danger-ink-dark"
        >
          {RATES_COPY.historyError}
        </p>
      )}
      {nextBefore !== null && (
        <div className="mt-3">
          <Button variant="ghost" onClick={loadOlder} loading={loadingMore}>
            {loadingMore ? RATES_COPY.loadingOlder : RATES_COPY.loadOlder}
          </Button>
        </div>
      )}
    </section>
  );
}
