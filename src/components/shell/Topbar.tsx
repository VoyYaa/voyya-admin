import type { JSX } from 'react';
import { useElapsedFlag } from '../../hooks/useElapsedFlag';
import { useNetworkOnline } from '../../hooks/useNetworkOnline';
import { resolveHomePath } from '../../lib/routes';
import { useConnectionStore } from '../../state/connection-store';
import { useSessionStore } from '../../state/session-store';
import { FreshnessBar } from '../ui/FreshnessBar';
import { ProgressRail } from '../ui/ProgressRail';
import { Wordmark } from '../ui/Wordmark';
import { TenantBadge } from './TenantBadge';
import { UserMenu } from './UserMenu';

const REFRESH_RAIL_DELAY_MS = 400;

export function Topbar(): JSX.Element {
  const user = useSessionStore((s) => s.user);
  const online = useNetworkOnline();
  const published = useConnectionStore((state) => state.published);
  const refreshing = useConnectionStore((state) => state.refreshing);
  const showRail = useElapsedFlag(refreshing, REFRESH_RAIL_DELAY_MS);

  return (
    <div className="relative shrink-0">
      <header className="flex h-14 items-center justify-between border-b-2 border-b-amber bg-frame-bg px-6">
        <div className="flex items-center gap-3">
          <a
            href={resolveHomePath(user?.role)}
            data-compact-chrome
            className="focus-ring flex min-h-tap-compact items-center gap-2.5 rounded-sm"
          >
            <Wordmark />
          </a>
          <TenantBadge tenant={user?.tenant ?? null} />
        </div>
        <div className="flex items-center gap-4">
          <FreshnessBar
            state={!online ? 'offline' : (published?.state ?? 'live')}
            errorStatus={published?.errorStatus}
            variant="frame"
          />
          <span className="h-5 w-px bg-frame-border" aria-hidden="true" />
          {user && <UserMenu user={user} />}
        </div>
      </header>
      {showRail && <ProgressRail className="absolute inset-x-0 top-full z-10" />}
    </div>
  );
}
