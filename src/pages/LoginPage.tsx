import { useEffect, useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AdminLoginDTO } from '@voyyaa/shared';
import { loginAdmin } from '../api/auth.api';
import { StateGlyph } from '../components/brand/StateGlyph';
import { Button } from '../components/ui/Button';
import { buttonClassName } from '../components/ui/button-styles';
import { Field } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import { Wordmark } from '../components/ui/Wordmark';
import { ApiError, domainErrorCode, isNetworkError } from '../api/errors';
import { AUTH_ERROR_MESSAGES, LOGIN_AFFILIATION_COPY, LOGIN_COPY } from '../copy/auth';
import { useNetworkOnline } from '../hooks/useNetworkOnline';
import { spanishZodResolver } from '../lib/form-resolver';
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
    resolver: spanishZodResolver(AdminLoginDTO),
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
        <Wordmark />
      </header>

      <main className="flex-1 px-6 py-14 sm:px-10 sm:py-20 lg:px-16 lg:py-24">
        <div className="mx-auto grid w-full max-w-6xl gap-y-12 md:grid-cols-2 md:items-start md:gap-x-8 md:gap-y-0">
          <div className="flex max-w-xl flex-col gap-5">
            <p className="vy-eyebrow">{LOGIN_COPY.eyebrow}</p>
            <h1 className="font-display text-hero font-black text-text">
              La cola de viajes, los conductores
              <br />
              <span className="vy-draw-underline text-amber-ink dark:text-amber">
                y las tarifas en una sola pantalla.
              </span>
            </h1>
            <p className="max-w-[42ch] text-lede text-text-muted">{LOGIN_COPY.lede}</p>
          </div>

          <div className="w-full max-w-sm border-t border-border pt-8 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            <h2 className="mb-6 font-display text-title text-text">Iniciar sesión</h2>

            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
              <Field label="Correo" htmlFor="email" error={errors.email?.message} announceError>
                {(control) => (
                  <input
                    type="email"
                    autoComplete="username"
                    autoFocus
                    className="vy-input"
                    {...control}
                    {...register('email')}
                  />
                )}
              </Field>

              <Field
                label="Contraseña"
                htmlFor="password"
                error={errors.password?.message}
                announceError
              >
                {(control) => (
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      className="vy-input pr-24"
                      {...control}
                      {...register('password')}
                    />
                    <button
                      type="button"
                      aria-pressed={showPassword}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowPassword((v) => !v)}
                      className="focus-ring absolute inset-y-0 right-0 flex min-w-tap items-center justify-center rounded-xs px-3 text-small font-bold text-text-muted hover:text-text"
                    >
                      {showPassword ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                )}
              </Field>

              {errorState.kind === 'message' && (
                <Notice tone="danger" role="alert" leading={<StateGlyph glyph="error" size={28} />}>
                  {errorState.text}
                </Notice>
              )}

              {errorState.kind === 'rate-limited' && (
                <Notice tone="warning" role="status">
                  <p>Demasiados intentos. Espera antes de volver a intentarlo.</p>
                  <p aria-hidden="true" className="mt-1 text-numeric text-small text-text-muted">
                    {formatCountdown(errorState.retryInSec)}
                  </p>
                </Notice>
              )}

              {!online && (
                <Notice tone="info" leading={<StateGlyph glyph="offline" size={28} />}>
                  Sin conexión a internet. Podrás ingresar cuando vuelva la señal.
                </Notice>
              )}

              <Button
                type="submit"
                disabled={rateLimited || !online}
                loading={submitting}
                className="w-full"
              >
                {submitting ? 'Ingresando…' : 'Ingresar'}
              </Button>
            </form>

            <p className="mt-6 text-small text-text-muted">{LOGIN_COPY.help}</p>

            <section
              aria-labelledby="login-affiliation-prompt"
              className="mt-8 flex flex-col gap-3 border-t border-border pt-6"
            >
              <p id="login-affiliation-prompt" className="text-small text-text-muted">
                {LOGIN_AFFILIATION_COPY.prompt}
              </p>
              <Link to="/afiliacion" className={buttonClassName('ghost', 'md', 'w-full')}>
                {LOGIN_AFFILIATION_COPY.action}
              </Link>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
