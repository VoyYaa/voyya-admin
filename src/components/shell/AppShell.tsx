import type { JSX, ReactNode } from 'react';
import { ToastViewport } from '../ui/ToastViewport';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps): JSX.Element {
  return (
    <div className="flex min-h-screen bg-bg text-text">
      <a
        href="#contenido"
        className="focus-ring fixed left-2 top-2 z-50 -translate-y-16 rounded-sm bg-frame-bg px-4 py-2 text-btn font-display text-frame-text transition-transform focus:translate-y-0 motion-reduce:transition-none"
      >
        Saltar al contenido principal
      </a>
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main id="contenido" className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <ToastViewport />
    </div>
  );
}
