import type { JSX, ReactNode } from 'react';

interface PublicPageShellProps {
  children: ReactNode;
}

export function PublicPageShell({ children }: PublicPageShellProps): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex h-16 shrink-0 items-center gap-2.5 border-b-2 border-b-amber bg-frame-bg px-6 sm:px-10">
        <span
          aria-hidden="true"
          className="relative inline-flex h-3 w-3 shrink-0 rounded-full bg-amber shadow-brand-halo"
        />
        <span className="text-title font-display font-black tracking-tight text-frame-text">
          VoyYa
        </span>
      </header>

      <main className="flex-1 px-6 py-10 sm:px-10 sm:py-14 lg:px-16">{children}</main>
    </div>
  );
}
