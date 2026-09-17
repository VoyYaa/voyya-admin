import type { JSX, ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
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

function NavItemLink({ item }: { item: NavItem }): JSX.Element {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `focus-ring flex items-center gap-2.5 rounded-sm border-l-[3px] px-3 py-2 text-body transition-colors motion-reduce:transition-none ${
          isActive
            ? 'border-l-amber bg-frame-active-bg font-semibold text-frame-text'
            : 'border-l-transparent text-frame-text-muted hover:bg-frame-chip-bg hover:text-frame-text'
        }`
      }
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          <item.icon className={isActive ? 'text-amber' : 'text-frame-text-muted'} />
          {item.label}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar(): JSX.Element {
  const role = useSessionStore((s) => s.user?.role);
  const isAdmin = role === 'admin';

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
            className={({ isActive }) =>
              `focus-ring ml-6 flex items-center gap-2 rounded-sm border-l-[3px] px-3 py-1.5 text-small transition-colors motion-reduce:transition-none ${
                isActive
                  ? 'border-l-amber bg-frame-active-bg font-medium text-frame-text'
                  : 'border-l-transparent text-frame-text-muted hover:bg-frame-chip-bg hover:text-frame-text'
              }`
            }
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
