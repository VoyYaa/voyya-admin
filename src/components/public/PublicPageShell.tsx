import type { JSX, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AFFILIATION_BACK_TO_LOGIN_COPY } from '../../copy/auth';
import { Wordmark } from '../ui/Wordmark';

export interface PublicHero {
  eyebrow: string;
  title: string;
  lede?: string;
  role?: 'status' | 'alert';
}

interface PublicPageShellProps {
  children: ReactNode;
  hero?: PublicHero;
}

export function PublicPageShell({ children, hero }: PublicPageShellProps): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex h-16 shrink-0 items-center gap-2.5 border-b-2 border-b-amber bg-frame-bg px-6 sm:px-10">
        <Wordmark />
      </header>

      {hero && (
        <section className="bg-frame-bg px-6 pb-12 pt-10 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-4xl">
            <p className="vy-eyebrow mb-3 !text-amber">{hero.eyebrow}</p>
            <h1
              role={hero.role}
              className="max-w-[24ch] font-display text-hero font-black text-frame-text"
            >
              {hero.title}
            </h1>
            {hero.lede && (
              <p className="mt-4 max-w-[62ch] text-lede text-frame-text-muted">{hero.lede}</p>
            )}
          </div>
        </section>
      )}

      <main className="flex-1 px-6 py-10 sm:px-10 sm:py-14 lg:px-16">
        {children}
        <p className="mx-auto mt-10 max-w-4xl border-t border-border pt-6 text-small text-text-muted">
          {AFFILIATION_BACK_TO_LOGIN_COPY.prompt}{' '}
          <Link to="/login" className="vy-link inline-flex min-h-tap items-center">
            {AFFILIATION_BACK_TO_LOGIN_COPY.action}
          </Link>
        </p>
      </main>
    </div>
  );
}
