import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { AdminLoginDTO } from '@voyyaa/shared';
import { loginAdmin } from '../api/auth.api';
import { ApiError, domainErrorCode, isNetworkError } from '../api/errors';
import { AUTH_ERROR_MESSAGES, LOGIN_COPY } from '../copy/auth';
import { useNetworkOnline } from '../hooks/useNetworkOnline';
import { resolveHomePath } from '../lib/routes';
import { useSessionStore } from '../state/session-store';

type LoginErrorState =
  | { kind: 'none' }
  | { kind: 'message'; text: string }
  | { kind: 'rate-limited'; retryInSec: number };

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function LoginPage(): JSX.Element {
  const status = useSessionStore((s) => s.status);
  const role = useSessionStore((s) => s.user?.role);
  const setSession = useSessionStore((s) => s.setSession);
  const navigate = useNavigate();
  const online = useNetworkOnline();
  const [errorState, setErrorState] = useState<LoginErrorState>({ kind: 'none' });
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setFocus,
    setValue,
    formState: { errors },
  } = useForm<AdminLoginDTO>({
    resolver: zodResolver(AdminLoginDTO),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (errorState.kind !== 'rate-limited') return;
    if (errorState.retryInSec <= 0) {
      setErrorState({ kind: 'none' });
      return;
    }
    const timer = window.setTimeout(() => {
      setErrorState({ kind: 'rate-limited', retryInSec: errorState.retryInSec - 1 });
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [errorState]);

  if (status === 'authenticated') {
    return <Navigate to={resolveHomePath(role)} replace />;
  }

  const rateLimited = errorState.kind === 'rate-limited';

  const onSubmit = handleSubmit(async (dto) => {
    setErrorState({ kind: 'none' });
    setSubmitting(true);
    try {
      const response = await loginAdmin(dto);
      setSession(response);
      navigate(resolveHomePath(response.user.role), { replace: true });
    } catch (error) {
      if (isNetworkError(error)) {
        setErrorState({
          kind: 'message',
          text: 'No hay conexión con el servidor. Verifica tu internet e inténtalo de nuevo.',
        });
      } else if (error instanceof ApiError && typeof error.retryInSec === 'number') {
        setErrorState({ kind: 'rate-limited', retryInSec: error.retryInSec });
      } else {
        const code = domainErrorCode(error);
        setErrorState({
          kind: 'message',
          text:
            (code && AUTH_ERROR_MESSAGES[code]) ?? 'No se pudo iniciar sesión. Inténtalo de nuevo.',
        });
      }
      setValue('password', '');
      setFocus('password');
    } finally {
      setSubmitting(false);
    }
  });

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

      <main className="flex-1 px-6 py-14 sm:px-10 sm:py-20 lg:px-16 lg:py-24">
        <div className="mx-auto grid w-full max-w-6xl gap-y-12 md:grid-cols-2 md:items-start md:gap-x-8 md:gap-y-0">
          <div className="flex max-w-xl flex-col gap-5">
            <p className="text-eyebrow text-amber-ink dark:text-amber">{LOGIN_COPY.eyebrow}</p>
            <h1 className="text-hero font-display text-text">
              La cola de viajes, los conductores
              <br />
              <span className="text-amber-ink underline decoration-amber decoration-4 underline-offset-4 dark:text-amber">
                y las tarifas en una sola pantalla.
              </span>
            </h1>
            <p className="max-w-[42ch] text-lede text-text-muted">{LOGIN_COPY.lede}</p>
          </div>

          <div className="w-full max-w-sm border-t border-border pt-8 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            <h2 className="mb-6 text-title font-display text-text">Iniciar sesión</h2>

            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-body font-medium text-text">
                  Correo
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className="focus-ring w-full rounded-xs border border-border bg-surface px-3 py-2 text-body text-text outline-none"
                  {...register('email')}
                />
                {errors.email && (
                  <p
                    id="email-error"
                    role="alert"
                    className="text-small text-danger-ink dark:text-danger-ink-dark"
                  >
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-body font-medium text-text">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    className="focus-ring w-full rounded-xs border border-border bg-surface px-3 py-2 pr-12 text-body text-text outline-none"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onClick={() => setShowPassword((v) => !v)}
                    className="focus-ring absolute inset-y-0 right-0 flex w-11 items-center justify-center text-small font-medium text-text-muted hover:text-text"
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                {errors.password && (
                  <p
                    id="password-error"
                    role="alert"
                    className="text-small text-danger-ink dark:text-danger-ink-dark"
                  >
                    {errors.password.message}
                  </p>
                )}
              </div>

              {errorState.kind === 'message' && (
                <p
                  role="alert"
                  className="rounded-xs bg-danger-tint px-3 py-2 text-body text-danger-ink dark:text-danger-ink-dark"
                >
                  {errorState.text}
                </p>
              )}

              {errorState.kind === 'rate-limited' && (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-xs border border-amber/40 bg-amber/10 px-3 py-2"
                >
                  <p className="text-body text-text">
                    Demasiados intentos. Espera antes de volver a intentarlo.
                  </p>
                  <p aria-hidden="true" className="mt-1 text-numeric text-small text-text-muted">
                    {formatCountdown(errorState.retryInSec)}
                  </p>
                </div>
              )}

              {!online && (
                <p className="text-small text-text-muted">
                  Sin conexión a internet. Podrás ingresar cuando vuelva la señal.
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || rateLimited || !online}
                className="focus-ring w-full rounded-sm bg-amber px-4 py-2.5 text-btn font-display text-on-brand transition hover:bg-amber-deep motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Ingresando…' : 'Ingresar'}
              </button>
            </form>

            <p className="mt-6 text-small text-text-muted">{LOGIN_COPY.help}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
