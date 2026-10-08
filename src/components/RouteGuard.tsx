import type { JSX } from 'react';
import { Link, Navigate, Outlet } from 'react-router-dom';
import { BrandLoader } from './brand/BrandLoader';
import { ErrorPanel } from './ui/TableStates';
import { buttonClassName } from './ui/button-styles';
import { SESSION_COPY } from '../copy/common';
import { useElapsedFlag } from '../hooks/useElapsedFlag';
import { resolveHomePath } from '../lib/routes';
import { useSessionStore } from '../state/session-store';

const SESSION_TIMEOUT_MS = 10_000;

function SessionLoading(): JSX.Element {
  const timedOut = useElapsedFlag(true, SESSION_TIMEOUT_MS);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-frame-bg text-frame-text">
      {timedOut ? (
        <div className="w-full max-w-lg">
          <ErrorPanel title={SESSION_COPY.timeoutTitle} onRetry={() => window.location.reload()} />
          <p className="mt-4 text-center text-small text-frame-text-muted">
            {SESSION_COPY.timeoutBody}{' '}
            <Link to="/login" className={buttonClassName('ghost', 'md', 'ml-2 text-frame-text')}>
              {SESSION_COPY.timeoutLogin}
            </Link>
          </p>
        </div>
      ) : (
        <BrandLoader variant="frame" size={72} label={SESSION_COPY.loading} />
      )}
    </div>
  );
}

export function RouteGuard(): JSX.Element {
  const status = useSessionStore((s) => s.status);

  if (status === 'hydrating') {
    return <SessionLoading />;
  }

  if (status === 'guest') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function AdminOnlyGuard(): JSX.Element {
  const role = useSessionStore((s) => s.user?.role);

  if (role !== 'admin') {
    return <Navigate to="/ops/queue" replace />;
  }

  return <Outlet />;
}

export function TenantOnlyGuard(): JSX.Element {
  const role = useSessionStore((s) => s.user?.role);

  if (role === 'platform_admin') {
    return <Navigate to="/platform/companies" replace />;
  }

  return <Outlet />;
}

export function PlatformOnlyGuard(): JSX.Element {
  const role = useSessionStore((s) => s.user?.role);

  if (role !== 'platform_admin') {
    return <Navigate to={resolveHomePath(role)} replace />;
  }

  return <Outlet />;
}
