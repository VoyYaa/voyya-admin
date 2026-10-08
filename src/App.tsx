import { lazy, Suspense, useEffect, type JSX } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import {
  AdminOnlyGuard,
  PlatformOnlyGuard,
  RouteGuard,
  TenantOnlyGuard,
} from './components/RouteGuard';
import { AppShell } from './components/shell/AppShell';
import { resolveHomePath } from './lib/routes';

const AdminNewDriverPage = lazy(() =>
  import('./pages/AdminNewDriverPage').then((m) => ({ default: m.AdminNewDriverPage })),
);
const AdminSettingsPage = lazy(() =>
  import('./pages/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })),
);
const SettlementPage = lazy(() =>
  import('./pages/SettlementPage').then((m) => ({ default: m.SettlementPage })),
);
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const OpsDriversPage = lazy(() =>
  import('./pages/OpsDriversPage').then((m) => ({ default: m.OpsDriversPage })),
);
const OpsQueuePage = lazy(() =>
  import('./pages/OpsQueuePage').then((m) => ({ default: m.OpsQueuePage })),
);
const AffiliationApplicationPage = lazy(() =>
  import('./pages/public/AffiliationApplicationPage').then((m) => ({
    default: m.AffiliationApplicationPage,
  })),
);
const AffiliationDocumentsPage = lazy(() =>
  import('./pages/public/AffiliationDocumentsPage').then((m) => ({
    default: m.AffiliationDocumentsPage,
  })),
);
const PlatformCompaniesPage = lazy(() =>
  import('./pages/PlatformCompaniesPage').then((m) => ({ default: m.PlatformCompaniesPage })),
);
const PlatformCompanyDetailPage = lazy(() =>
  import('./pages/PlatformCompanyDetailPage').then((m) => ({
    default: m.PlatformCompanyDetailPage,
  })),
);

import { RouteFallback } from './components/brand/RouteFallback';
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
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/afiliacion" element={<AffiliationApplicationPage />} />
          <Route path="/afiliacion/documentos" element={<AffiliationDocumentsPage />} />
          <Route element={<RouteGuard />}>
            <Route element={<AppShell />}>
              <Route element={<TenantOnlyGuard />}>
                <Route path="/ops/queue" element={<OpsQueuePage />} />
                <Route path="/ops/drivers" element={<OpsDriversPage />} />
                <Route element={<AdminOnlyGuard />}>
                  <Route path="/admin/drivers/new" element={<AdminNewDriverPage />} />
                  <Route path="/admin/settings" element={<AdminSettingsPage />} />
                  <Route path="/reports/settlement" element={<SettlementPage />} />
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
      </Suspense>
    </BrowserRouter>
  );
}
