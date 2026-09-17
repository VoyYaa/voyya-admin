import type { JSX } from 'react';
import { NavLink } from 'react-router-dom';
import { useSessionStore } from '../../state/session-store';

interface NavItem {
  to: string;
  label: string;
}

const BASE_ITEMS: NavItem[] = [
  { to: '/ops/queue', label: 'Cola en vivo' },
  { to: '/ops/drivers', label: 'Conductores' },
];

const ADMIN_ITEMS: NavItem[] = [{ to: '/admin/settings', label: 'Parámetros' }];

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
            `focus-ring rounded-sm border-l-[3px] px-3 py-2 text-body ${
              isActive
                ? 'border-l-amber font-semibold text-text'
                : 'border-l-transparent text-text-muted hover:text-text'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
