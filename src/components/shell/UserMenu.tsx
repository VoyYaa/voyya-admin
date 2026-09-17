import { useEffect, useRef, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SessionUser } from '@voyyaa/shared';
import { logout } from '../../api/auth.api';
import { useBackendHealth } from '../../hooks/useBackendHealth';
import { useSessionStore } from '../../state/session-store';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  operator: 'Operador',
};

function getFocusableMenuItems(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('button:not([disabled])'));
}

export interface UserMenuProps {
  user: SessionUser;
}

export function UserMenu({ user }: UserMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const navigate = useNavigate();
  const refreshToken = useSessionStore((s) => s.refreshToken);
  const clearSession = useSessionStore((s) => s.clearSession);
  const health = useBackendHealth();

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const trigger = triggerRef.current;
    panelRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key === 'Tab' && panelRef.current) {
        const focusables = getFocusableMenuItems(panelRef.current);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    function onClickOutside(event: MouseEvent): void {
      if (
        !panelRef.current?.contains(event.target as Node) &&
        event.target !== triggerRef.current
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClickOutside);
      (previouslyFocusedRef.current ?? trigger)?.focus();
    };
  }, [open]);

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
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="focus-ring flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-frame-chip-bg"
      >
        <span
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-amber text-btn text-on-brand"
        >
          {initial}
        </span>
        <span className="text-small font-medium text-frame-text">{user.first_name}</span>
        <span aria-hidden="true" className="text-frame-text-muted">
          ▾
        </span>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-64 rounded-md border border-border bg-surface p-2 shadow-overlay-sm"
        >
          <div className="px-3 py-2">
            <p className="text-body font-medium text-text">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-small text-text-muted">{ROLE_LABELS[user.role] ?? user.role}</p>
          </div>
          <div className="my-1 border-t border-border" />
          <div className="flex items-center justify-between px-3 py-2">
            <span className="inline-flex items-center gap-2 text-small text-text-muted">
              <span
                className={`h-2 w-2 rounded-full ${
                  health.kind === 'ok'
                    ? 'bg-success'
                    : health.kind === 'error'
                      ? 'bg-danger'
                      : 'bg-status-neutral'
                }`}
                aria-hidden="true"
              />
              {health.kind === 'ok'
                ? 'Sistema operando'
                : health.kind === 'error'
                  ? 'Backend no responde'
                  : 'Revisando…'}
            </span>
            <button
              type="button"
              onClick={health.check}
              className="focus-ring rounded-sm px-1 text-small font-medium text-text hover:underline hover:decoration-amber hover:decoration-2 hover:underline-offset-2"
            >
              Revisar
            </button>
          </div>
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => void onLogout()}
            className="focus-ring w-full rounded-sm px-3 py-2 text-left text-body text-text hover:bg-bg-shell"
          >
            Cerrar sesión
          </button>
          <p className="mt-1 px-3 text-small text-text-muted">VoyYa Admin</p>
        </div>
      )}
    </div>
  );
}
