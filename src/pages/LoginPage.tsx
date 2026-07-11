import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { loginAdmin } from '../api/auth.api';
import { domainErrorCode, isNetworkError } from '../api/errors';
import { AdminLoginDTO } from '../contracts/auth';
import { useSessionStore } from '../state/session-store';

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  ACCOUNT_SUSPENDED: 'Esta cuenta está suspendida.',
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
    return <Navigate to="/" replace />;
  }

  const onSubmit = handleSubmit(async (dto) => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const response = await loginAdmin(dto);
      setSession(response);
      navigate('/', { replace: true });
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
    <div className="flex min-h-screen items-center justify-center bg-crema px-4">
      <div className="w-full max-w-sm rounded-3xl border border-amber/20 bg-white/70 p-8 shadow-lg">
        <h1 className="mb-1 text-2xl font-bold text-espresso">VoyYa Admin</h1>
        <p className="mb-6 text-sm text-espresso/70">Ingresa con tu correo y contraseña.</p>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-espresso">
              Correo
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2 text-espresso outline-none focus:border-amber focus:ring-2 focus:ring-amber/30"
              {...register('email')}
            />
            {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-espresso">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2 text-espresso outline-none focus:border-amber focus:ring-2 focus:ring-amber/30"
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-danger">{errors.password.message}</p>
            )}
          </div>

          {errorMsg && (
            <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-amber px-4 py-2.5 font-semibold text-espresso transition hover:bg-amber-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
