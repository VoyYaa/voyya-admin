import { useCallback, type JSX, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { OPS_LIST_DEFAULT_LIMIT } from '@voyyaa/shared';
import { getPlatformCompanies } from '../../api/platform-companies.api';
import { useAsync } from '../../hooks/useAsync';
import { useSessionStore } from '../../state/session-store';

function QueueIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 18 18"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M3 5h12M3 9h12M3 13h7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DriversIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 18 18"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3.5 15c0-3 2.5-5 5.5-5s5.5 2 5.5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 18 18"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M3 5h8M13 5h2M3 13h2M7 13h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="11" cy="5" r="1.6" fill="currentColor" />
      <circle cx="5" cy="13" r="1.6" fill="currentColor" />
    </svg>
  );
}

function CompaniesIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 18 18"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect x="3" y="5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 5V3.5h5V5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 14 14"
      width="14"
      height="14"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

interface NavItem {
  to: string;
  label: string;
  icon: (props: { className?: string }) => JSX.Element;
}

const OPS_ITEMS: NavItem[] = [
  { to: '/ops/queue', label: 'Cola en vivo', icon: QueueIcon },
  { to: '/ops/drivers', label: 'Conductores', icon: DriversIcon },
];

const ADMIN_ITEMS: NavItem[] = [{ to: '/admin/settings', label: 'Parámetros', icon: SettingsIcon }];

function NavGroup({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-3 pb-1 pt-3 text-eyebrow uppercase text-frame-text-muted">{label}</p>
      {children}
    </div>
  );
}

function navLinkClass(isActive: boolean, nested = false): string {
  const size = nested ? 'ml-6 gap-2 text-small' : 'gap-2.5 text-body';
  const state = isActive
    ? 'border-l-amber bg-frame-active-bg font-bold text-frame-text'
    : 'border-l-transparent text-frame-text-muted hover:bg-frame-chip-bg hover:text-frame-text';
  return `focus-ring flex min-h-tap items-center rounded-sm border-l-rail px-3 transition-colors motion-reduce:transition-none ${size} ${state}`;
}

function NavItemLink({ item }: { item: NavItem }): JSX.Element {
  return (
    <NavLink to={item.to} className={({ isActive }) => navLinkClass(isActive)}>
      {({ isActive }: { isActive: boolean }) => (
        <>
          <item.icon className={isActive ? 'text-amber' : 'text-frame-text-muted'} />
          {item.label}
        </>
      )}
    </NavLink>
  );
}

function PlatformCompaniesNavLink(): JSX.Element {
  const fetcher = useCallback(
    () => getPlatformCompanies({ status: 'pending', limit: OPS_LIST_DEFAULT_LIMIT }),
    [],
  );
  const { data } = useAsync(fetcher);
  const pendingCount = data?.pending_count ?? 0;

  return (
    <NavLink to="/platform/companies" className={({ isActive }) => navLinkClass(isActive)}>
      {({ isActive }: { isActive: boolean }) => (
        <>
          <CompaniesIcon className={isActive ? 'text-amber' : 'text-frame-text-muted'} />
          Empresas
          {pendingCount > 0 && (
            <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber px-1.5 text-eyebrow font-black text-on-brand">
              {pendingCount}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar(): JSX.Element {
  const role = useSessionStore((s) => s.user?.role);
  const isAdmin = role === 'admin';
  const isPlatformAdmin = role === 'platform_admin';

  if (isPlatformAdmin) {
    return (
      <nav
        aria-label="Navegación principal"
        className="flex w-[224px] shrink-0 flex-col gap-1 border-r-2 border-r-amber bg-frame-bg px-2 py-2"
      >
        <NavGroup label="Plataforma">
          <PlatformCompaniesNavLink />
        </NavGroup>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Navegación principal"
      className="flex w-[224px] shrink-0 flex-col gap-1 border-r-2 border-r-amber bg-frame-bg px-2 py-2"
    >
      <NavGroup label="Operación">
        {OPS_ITEMS.map((item) => (
          <NavItemLink key={item.to} item={item} />
        ))}
        {isAdmin && (
          <NavLink
            to="/admin/drivers/new"
            className={({ isActive }) => navLinkClass(isActive, true)}
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                <PlusIcon className={isActive ? 'text-amber' : 'text-frame-text-muted'} />
                Nuevo conductor
              </>
            )}
          </NavLink>
        )}
      </NavGroup>

      {isAdmin && (
        <NavGroup label="Administración">
          {ADMIN_ITEMS.map((item) => (
            <NavItemLink key={item.to} item={item} />
          ))}
        </NavGroup>
      )}
    </nav>
  );
}
