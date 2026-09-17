import type { JSX, ReactNode } from 'react';
import { ToastViewport } from '../ui/ToastViewport';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <div className="h-[3px] w-full shrink-0 bg-amber" aria-hidden="true" />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
      <ToastViewport />
    </div>
  );
}
