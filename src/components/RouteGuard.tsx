import type { JSX } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { resolveHomePath } from '../lib/routes';
import { useSessionStore } from '../state/session-store';

export function RouteGuard(): JSX.Element {
  const status = useSessionStore((s) => s.status);

  if (status === 'hydrating') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text">
        <p className="text-small text-text-muted">Cargando sesión…</p>
      </div>
    );
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
