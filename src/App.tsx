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
          <Route element={<AppShell />}>
            <Route element={<TenantOnlyGuard />}>
              <Route path="/ops/queue" element={<OpsQueuePage />} />
              <Route path="/ops/drivers" element={<OpsDriversPage />} />
              <Route element={<AdminOnlyGuard />}>
                <Route path="/admin/drivers/new" element={<AdminNewDriverPage />} />
                <Route path="/admin/settings" element={<AdminSettingsPage />} />
              </Route>
            </Route>
            <Route element={<PlatformOnlyGuard />}>
              <Route path="/platform/companies" element={<PlatformCompaniesPage />} />
              <Route
                path="/platform/companies/:companyId"
                element={<PlatformCompanyDetailPage />}
              />
            </Route>
          </Route>
          <Route path="/" element={<HomeRedirect />} />
        </Route>
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
