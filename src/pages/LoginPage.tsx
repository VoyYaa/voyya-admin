import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { loginAdmin } from '../api/auth.api';
import { domainErrorCode, isNetworkError } from '../api/errors';
import { AdminLoginDTO } from '@voyyaa/shared';
import { useSessionStore } from '../state/session-store';

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  ACCOUNT_SUSPENDED: 'Esta cuenta está suspendida.',
  STAFF_WITHOUT_COMPANY: 'Tu usuario no está vinculado a ninguna empresa.',
};

export function LoginPage(): JSX.Element {
  const status = useSessionStore((s) => s.status);
  const setSession = useSessionStore((s) => s.setSession);
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginDTO>({
    resolver: zodResolver(AdminLoginDTO),
    defaultValues: { email: '', password: '' },
  });

  if (status === 'authenticated') {
    return <Navigate to="/ops/queue" replace />;
  }

  const onSubmit = handleSubmit(async (dto) => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const response = await loginAdmin(dto);
      setSession(response);
      navigate('/ops/queue', { replace: true });
    } catch (error) {
      if (isNetworkError(error)) {
        setErrorMsg('No hay conexión con el servidor.');
      } else {
        const code = domainErrorCode(error);
        setErrorMsg((code && ERROR_MESSAGES[code]) ?? 'No se pudo iniciar sesión.');
      }
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-overlay-lg">
        <h1 className="mb-1 text-display font-display text-text">VoyYa Admin</h1>
        <p className="mb-6 text-body text-text-muted">Ingresa con tu correo y contraseña.</p>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-body font-medium text-text">
              Correo
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className="focus-ring w-full rounded-xs border border-border bg-surface px-3 py-2 text-body text-text outline-none"
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-small text-danger-ink dark:text-danger-ink-dark">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-body font-medium text-text">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="focus-ring w-full rounded-xs border border-border bg-surface px-3 py-2 text-body text-text outline-none"
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1 text-small text-danger-ink dark:text-danger-ink-dark">
                {errors.password.message}
              </p>
            )}
          </div>

          {errorMsg && (
            <p
              role="alert"
              className="rounded-xs bg-danger-tint px-3 py-2 text-body text-danger-ink dark:text-danger-ink-dark"
            >
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="focus-ring w-full rounded-sm bg-amber px-4 py-2.5 text-btn font-display text-on-brand transition hover:bg-amber-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
