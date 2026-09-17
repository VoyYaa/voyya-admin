import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../api/auth.api';
import { useNetworkOnline } from '../../hooks/useNetworkOnline';
import { useSessionStore } from '../../state/session-store';
import { HealthIndicator } from '../HealthIndicator';
import { FreshnessBar } from '../ui/FreshnessBar';

export function Topbar(): JSX.Element {
  const user = useSessionStore((s) => s.user);
  const refreshToken = useSessionStore((s) => s.refreshToken);
  const clearSession = useSessionStore((s) => s.clearSession);
  const navigate = useNavigate();
  const online = useNetworkOnline();

  const onLogout = async (): Promise<void> => {
    try {
      if (refreshToken) {
        await logout({ refresh_token: refreshToken });
      }
    } finally {
      clearSession();
      navigate('/login', { replace: true });
    }
  };

  const initial = user ? user.first_name.charAt(0).toUpperCase() : '?';

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-bg-shell px-6">
      <div className="flex items-center gap-3">
        <span className="text-title font-display text-text">VoyYa</span>
        <span className="text-small text-text-muted">Cootrayal · Yarumal</span>
      </div>
      <div className="flex items-center gap-4">
        <HealthIndicator />
        <FreshnessBar state={online ? 'live' : 'offline'} />
        {user && (
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-amber text-btn text-on-brand"
            >
              {initial}
            </span>
            <div className="text-small leading-tight">
              <p className="font-medium text-text">
                {user.first_name} {user.last_name}
              </p>
              <p className="capitalize text-text-muted">{user.role}</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => void onLogout()}
          className="focus-ring rounded-sm border border-border px-3 py-1.5 text-small font-medium text-text hover:bg-bg"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
