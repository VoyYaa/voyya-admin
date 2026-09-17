import type { JSX } from 'react';
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

interface NavItem {
  to: string;
  label: string;
  icon: (props: { className?: string }) => JSX.Element;
}

const BASE_ITEMS: NavItem[] = [
  { to: '/ops/queue', label: 'Cola en vivo', icon: QueueIcon },
  { to: '/ops/drivers', label: 'Conductores', icon: DriversIcon },
];

const ADMIN_ITEMS: NavItem[] = [{ to: '/admin/settings', label: 'Parámetros', icon: SettingsIcon }];

export function Sidebar(): JSX.Element {
  const role = useSessionStore((s) => s.user?.role);
  const items = role === 'admin' ? [...BASE_ITEMS, ...ADMIN_ITEMS] : BASE_ITEMS;

  return (
    <nav
      aria-label="Navegación principal"
      className="flex w-[220px] shrink-0 flex-col gap-1 border-r border-border bg-bg-shell px-2 py-4"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `focus-ring flex items-center gap-2.5 rounded-sm border-l-[3px] px-3 py-2 text-body ${
              isActive
                ? 'border-l-amber font-semibold text-text'
                : 'border-l-transparent text-text-muted hover:text-text'
            }`
          }
        >
          {({ isActive }: { isActive: boolean }) => (
            <>
              <item.icon className={isActive ? 'text-amber' : 'text-text-muted'} />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
