// =============================================================================
// VoyYa Admin — DashboardPage
// -----------------------------------------------------------------------------
// Muestra la sesión activa (usuario/rol), el indicador de salud del backend y
// tarjetas placeholder de lo que llega en el próximo ciclo (Cola en vivo,
// Conductores, Tarifas, Conciliación) — ver README § Mínimo vs. próximo ciclo.
// =============================================================================

import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { cerrarSesion } from '../api/auth.api';
import { HealthIndicator } from '../components/HealthIndicator';
import { PlaceholderCard } from '../components/PlaceholderCard';
import { useSessionStore } from '../state/session-store';

const TARJETAS_PROXIMO_CICLO = [
  {
    title: 'Cola en vivo',
    description: 'Solicitudes de viaje en curso y su estado en tiempo real.',
  },
  {
    title: 'Conductores',
    description: 'Alta, estado y disponibilidad de la flota.',
  },
  {
    title: 'Tarifas',
    description: 'Parámetros de tarifa vigentes por municipio/empresa.',
  },
  {
    title: 'Conciliación',
    description: 'Cierre de caja y conciliación de viajes en efectivo.',
  },
] as const;

export function DashboardPage(): JSX.Element {
  const usuario = useSessionStore((s) => s.usuario);
  const refreshToken = useSessionStore((s) => s.refreshToken);
  const clearSession = useSessionStore((s) => s.clearSession);
  const navigate = useNavigate();

  const onLogout = async (): Promise<void> => {
    if (refreshToken) {
      try {
        await cerrarSesion({ refresh_token: refreshToken });
      } catch {
        // Logout es idempotente en el backend; si la llamada falla (red caída, etc.)
        // igual limpiamos la sesión local — nunca dejamos al operador "atrapado".
      }
    }
    clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-crema">
      <header className="flex items-center justify-between border-b border-amber/15 bg-white/60 px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-espresso">VoyYa Admin</h1>
          {usuario && (
            <p className="text-sm text-espresso/70">
              {usuario.nombre} {usuario.apellido} ·{' '}
              <span className="capitalize">{usuario.rol}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void onLogout()}
          className="rounded-full border border-espresso/15 px-4 py-1.5 text-sm font-medium text-espresso hover:bg-espresso/5"
        >
          Cerrar sesión
        </button>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <HealthIndicator />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-espresso/60">
            Próximo ciclo
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TARJETAS_PROXIMO_CICLO.map((tarjeta) => (
              <PlaceholderCard key={tarjeta.title} {...tarjeta} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
