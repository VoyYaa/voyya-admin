// =============================================================================
// VoyYa Admin — LoginPage (HU-AUTH-03: correo + contraseña)
// -----------------------------------------------------------------------------
// react-hook-form + zodResolver(LoginAdminDTO): reusa el contrato vendorizado
// como validador en runtime (no se reescriben a mano las reglas de "email
// válido"/"mínimo 8 caracteres" — ya viven en contracts/auth.ts), mismo patrón
// que apps/passenger (frontend-yavoy) para sus formularios.
// =============================================================================

import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { loginAdmin } from '../api/auth.api';
import { codigoErrorDominio, esErrorDeRed } from '../api/errors';
import { LoginAdminDTO } from '../contracts/auth';
import { useSessionStore } from '../state/session-store';

/** Mensajes amigables por código de dominio (ErrorAuth) — el resto cae al genérico. */
const MENSAJES_ERROR: Record<string, string> = {
  CREDENCIALES_INVALIDAS: 'Correo o contraseña incorrectos.',
  CUENTA_SUSPENDIDA: 'Esta cuenta está suspendida.',
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
  } = useForm<LoginAdminDTO>({
    resolver: zodResolver(LoginAdminDTO),
    defaultValues: { correo: '', password: '' },
  });

  // Ya hay sesión (p.ej. el operador navegó manualmente a /login): no mostrar el form.
  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  const onSubmit = handleSubmit(async (dto) => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const respuesta = await loginAdmin(dto);
      setSession(respuesta);
      navigate('/', { replace: true });
    } catch (error) {
      if (esErrorDeRed(error)) {
        setErrorMsg('No hay conexión con el servidor.');
      } else {
        const codigo = codigoErrorDominio(error);
        setErrorMsg((codigo && MENSAJES_ERROR[codigo]) ?? 'No se pudo iniciar sesión.');
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
            <label htmlFor="correo" className="mb-1 block text-sm font-medium text-espresso">
              Correo
            </label>
            <input
              id="correo"
              type="email"
              autoComplete="username"
              className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2 text-espresso outline-none focus:border-amber focus:ring-2 focus:ring-amber/30"
              {...register('correo')}
            />
            {errors.correo && <p className="mt-1 text-xs text-danger">{errors.correo.message}</p>}
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
