import { Suspense, type JSX } from 'react';
import { Outlet } from 'react-router-dom';
import { COMMON_COPY } from '../../copy/common';
import { RouteFallback } from '../brand/RouteFallback';
import { ToastViewport } from '../ui/ToastViewport';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell(): JSX.Element {
  return (
    <div className="flex min-h-screen bg-bg text-text">
      <a
        href="#contenido"
        className="focus-ring fixed left-2 top-2 z-[70] print:hidden inline-flex h-tap -translate-y-16 items-center rounded-sm bg-frame-bg px-4 text-btn text-frame-text transition-transform focus:translate-y-0 motion-reduce:transition-none"
      >
        {COMMON_COPY.skipToContent}
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main id="contenido" className="flex-1 overflow-y-auto">
          <Suspense fallback={<RouteFallback variant="inline" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <ToastViewport />
    </div>
  );
}
