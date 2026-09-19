import { useEffect, type JSX } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import {
  AdminOnlyGuard,
  PlatformOnlyGuard,
  RouteGuard,
  TenantOnlyGuard,
} from './components/RouteGuard';
import { AppShell } from './components/shell/AppShell';
import { resolveHomePath } from './lib/routes';
import { AdminNewDriverPage } from './pages/AdminNewDriverPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { LoginPage } from './pages/LoginPage';
import { OpsDriversPage } from './pages/OpsDriversPage';
import { OpsQueuePage } from './pages/OpsQueuePage';
import { PlatformCompaniesPage } from './pages/PlatformCompaniesPage';
import { PlatformCompanyDetailPage } from './pages/PlatformCompanyDetailPage';
import { useSessionStore } from './state/session-store';

function HomeRedirect(): JSX.Element {
  const role = useSessionStore((s) => s.user?.role);
  return <Navigate to={resolveHomePath(role)} replace />;
}

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
          <Route element={<TenantOnlyGuard />}>
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
          </Route>
          <Route element={<PlatformOnlyGuard />}>
            <Route
              path="/platform/companies"
              element={
                <AppShell>
                  <PlatformCompaniesPage />
                </AppShell>
              }
            />
            <Route
              path="/platform/companies/:companyId"
              element={
                <AppShell>
                  <PlatformCompanyDetailPage />
                </AppShell>
              }
            />
          </Route>
          <Route path="/" element={<HomeRedirect />} />
        </Route>
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
