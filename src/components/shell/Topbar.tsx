import type { JSX } from 'react';
import { useNetworkOnline } from '../../hooks/useNetworkOnline';
import { useSessionStore } from '../../state/session-store';
import { FreshnessBar } from '../ui/FreshnessBar';
import { UserMenu } from './UserMenu';

export function Topbar(): JSX.Element {
  const user = useSessionStore((s) => s.user);
  const online = useNetworkOnline();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b-2 border-b-amber bg-frame-bg px-6">
      <div className="flex items-center gap-3">
        <a href="/ops/queue" className="focus-ring flex items-center gap-2.5 rounded-sm">
          <span
            className="relative inline-flex h-3 w-3 shrink-0 rounded-full bg-amber shadow-brand-halo"
            aria-hidden="true"
          />
          <span className="text-title font-display font-black tracking-tight text-frame-text">
            VoyYa
          </span>
        </a>
        <span className="h-5 w-px bg-frame-border" aria-hidden="true" />
        <span className="text-small text-frame-text-muted">Cootrayal · Yarumal</span>
      </div>
      <div className="flex items-center gap-4">
        <FreshnessBar state={online ? 'live' : 'offline'} variant="frame" />
        <span className="h-5 w-px bg-frame-border" aria-hidden="true" />
        {user && <UserMenu user={user} />}
      </div>
    </header>
  );
}
