import { useEffect, type JSX } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminOnlyGuard, RouteGuard } from './components/RouteGuard';
import { AppShell } from './components/shell/AppShell';
import { AdminNewDriverPage } from './pages/AdminNewDriverPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { LoginPage } from './pages/LoginPage';
import { OpsDriversPage } from './pages/OpsDriversPage';
import { OpsQueuePage } from './pages/OpsQueuePage';
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
          <Route
            path="/ops/queue"
            element={
              <AppShell>
                <OpsQueuePage />
              </AppShell>
            }
          />
          <Route
            path="/ops/drivers"
            element={
              <AppShell>
                <OpsDriversPage />
              </AppShell>
            }
          />
          <Route element={<AdminOnlyGuard />}>
            <Route
              path="/admin/drivers/new"
              element={
                <AppShell>
                  <AdminNewDriverPage />
                </AppShell>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <AppShell>
                  <AdminSettingsPage />
                </AppShell>
              }
            />
          </Route>
          <Route path="/" element={<Navigate to="/ops/queue" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/ops/queue" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
