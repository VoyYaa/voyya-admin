// =============================================================================
// VoyYa Admin — App (rutas + guard)
// -----------------------------------------------------------------------------
// "/login" pública; "/" protegida por RouteGuard. `hydrate()` se dispara una
// vez al montar, ANTES de que RouteGuard decida redirigir (ver
// state/session-store.ts § status 'hydrating').
// =============================================================================

import { useEffect, type JSX } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { RouteGuard } from './components/RouteGuard';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { useSessionStore } from './state/session-store';

export function App(): JSX.Element {
  const hydrate = useSessionStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RouteGuard />}>
          <Route path="/" element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
