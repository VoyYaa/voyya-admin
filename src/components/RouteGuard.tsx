import type { JSX } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSessionStore } from '../state/session-store';

export function RouteGuard(): JSX.Element {
  const status = useSessionStore((s) => s.status);

  if (status === 'hydrating') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-crema text-espresso">
        <p className="text-sm text-espresso/70">Cargando sesión…</p>
      </div>
    );
  }

  if (status === 'guest') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
