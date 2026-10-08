import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SessionUser } from '@voyyaa/shared';
import { logout } from '../../api/auth.api';
import { THEME_COPY } from '../../copy/common';
import { useBackendHealth } from '../../hooks/useBackendHealth';
import { useSessionStore } from '../../state/session-store';
import { useThemeStore, type ThemePreference } from '../../state/theme-store';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  operator: 'Operador',
  platform_admin: 'Admin de plataforma',
};

const THEME_OPTIONS: ThemePreference[] = ['system', 'light', 'dark'];

const ITEM_CLASS =
  'focus-ring flex min-h-tap w-full cursor-pointer items-center rounded-sm px-3 text-left text-body text-text outline-none data-[highlighted]:bg-bg-shell';

export interface UserMenuProps {
  user: SessionUser;
}

function healthLabel(kind: string): string {
  if (kind === 'ok') return 'Sistema operando';
  if (kind === 'error') return 'Backend no responde';
  return 'Revisando…';
}

function healthDotClass(kind: string): string {
  if (kind === 'ok') return 'bg-success';
  if (kind === 'error') return 'bg-danger';
  return 'bg-status-neutral';
}

export function UserMenu({ user }: UserMenuProps): JSX.Element {
  const navigate = useNavigate();
  const refreshToken = useSessionStore((s) => s.refreshToken);
  const clearSession = useSessionStore((s) => s.clearSession);
  const health = useBackendHealth();
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  const onLogout = async (): Promise<void> => {
    try {
      if (refreshToken) await logout({ refresh_token: refreshToken });
    } finally {
      clearSession();
      navigate('/login', { replace: true });
    }
  };

  const initial = user.first_name.charAt(0).toUpperCase();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="focus-ring flex h-tap items-center gap-2 rounded-sm px-2 hover:bg-frame-chip-bg"
        >
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-amber text-btn text-on-brand"
          >
            {initial}
          </span>
          <span className="text-small font-bold text-frame-text">{user.first_name}</span>
          <span aria-hidden="true" className="text-frame-text-muted">
            ▾
          </span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="vy-menu z-40 w-64 rounded-md border border-border-input border-t-rail border-t-amber bg-surface p-2 focus:outline-none"
        >
          <div className="px-3 py-2">
            <p className="text-body font-bold text-text">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-small text-text-muted">{ROLE_LABELS[user.role] ?? user.role}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item
            className={`${ITEM_CLASS} justify-between gap-2`}
            onSelect={(event) => {
              event.preventDefault();
              health.check();
            }}
          >
            <span className="inline-flex items-center gap-2 text-small text-text-muted">
              <span
                className={`h-2 w-2 rounded-full ${healthDotClass(health.kind)}`}
                aria-hidden="true"
              />
              {healthLabel(health.kind)}
            </span>
            <span className="text-small font-bold text-text underline decoration-amber decoration-2 underline-offset-2">
              Revisar
            </span>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Label className="px-3 pt-2 text-eyebrow uppercase text-text-muted">
            {THEME_COPY.label}
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={preference}
            onValueChange={(value) => setPreference(value as ThemePreference)}
          >
            {THEME_OPTIONS.map((option) => (
              <DropdownMenu.RadioItem
                key={option}
                value={option}
                onSelect={(event) => event.preventDefault()}
                className={`${ITEM_CLASS} gap-2.5`}
              >
                <span
                  aria-hidden="true"
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-border-control"
                >
                  <DropdownMenu.ItemIndicator>
                    <span className="block h-2 w-2 rounded-full bg-amber-deep" />
                  </DropdownMenu.ItemIndicator>
                </span>
                {THEME_COPY.options[option]}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item className={ITEM_CLASS} onSelect={() => void onLogout()}>
            Cerrar sesión
          </DropdownMenu.Item>
          <p className="mt-1 px-3 pb-1 text-small text-text-muted">VoyYa Admin</p>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
