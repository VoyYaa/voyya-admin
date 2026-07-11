// =============================================================================
// VoyYa Admin — RouteGuard
// -----------------------------------------------------------------------------
// Protege rutas según el `status` de la sesión: sin sesión → /login; mientras
// `status === 'hydrating'` no redirige (evita un parpadeo a login antes de
// terminar de leer localStorage, ver App.tsx). Mismo criterio que
// apps/passenger|driver src/hooks/useRouteGuard.ts, expresado aquí como
// componente de layout de react-router (`<Outlet/>`) en vez de hook + redirect
// imperativo — es el modismo idiomático de react-router para esto.
// =============================================================================

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
