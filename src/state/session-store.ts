// =============================================================================
// VoyYa Admin — useSessionStore (Zustand)
// -----------------------------------------------------------------------------
// Único store de SESIÓN: tokens + usuario + `status`. Se lee de forma SÍNCRONA
// (`getState()`) desde fuera de React (http-client.ts, vía los handlers
// inyectados abajo) — igual razón que en apps/passenger|driver: TanStack
// Query/React Context no ofrecen esa lectura síncrona igual de simple.
//
// Este módulo, al importarse, CONFIGURA los handlers de auth de http-client.ts
// (inversión de dependencia: http-client no conoce Zustand ni este store, solo
// expone `configureAuthHandlers`). `App.tsx` llama a `hydrate()` una vez al
// montar, antes de decidir la ruta (login vs dashboard).
// =============================================================================

import { create } from 'zustand';
import type { RespuestaSesion, SesionTokens, UsuarioSesion } from '../contracts/auth';
import { configureAuthHandlers } from '../api/http-client';
import { refrescarSesion } from '../api/auth.api';
import {
  actualizarTokensPersistidos,
  borrarSesionPersistida,
  guardarSesion,
  leerSesionPersistida,
} from '../lib/local-storage';

export type SessionStatus = 'hydrating' | 'authenticated' | 'guest';

interface SessionState {
  status: SessionStatus;
  accessToken: string | null;
  refreshToken: string | null;
  usuario: UsuarioSesion | null;
  /** epoch ms — para diagnósticos y un futuro refresh proactivo (próximo ciclo). */
  accessTokenExpiresAt: number | null;

  /** Lee localStorage una vez al montar la app (ver App.tsx). */
  hydrate: () => void;
  /** Login exitoso: guarda tokens + usuario. */
  setSession: (respuesta: RespuestaSesion) => void;
  /** Rotación de `/auth/refresh`: reemplaza AMBOS tokens, conserva `usuario`. */
  setTokens: (tokens: SesionTokens) => void;
  /** Logout (idempotente): limpia el estado local sin depender del servidor. */
  clearSession: () => void;
}

function calcularExpiraEn(expiresInSeg: number): number {
  return Date.now() + expiresInSeg * 1000;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'hydrating',
  accessToken: null,
  refreshToken: null,
  usuario: null,
  accessTokenExpiresAt: null,

  hydrate: () => {
    const persisted = leerSesionPersistida();
    if (!persisted) {
      set({ status: 'guest' });
      return;
    }
    set({
      status: 'authenticated',
      accessToken: persisted.accessToken,
      refreshToken: persisted.refreshToken,
      usuario: persisted.usuario,
      accessTokenExpiresAt: persisted.accessTokenExpiresAt,
    });
  },

  setSession: (respuesta) => {
    const accessTokenExpiresAt = calcularExpiraEn(respuesta.tokens.expires_in);
    guardarSesion({
      accessToken: respuesta.tokens.access_token,
      refreshToken: respuesta.tokens.refresh_token,
      usuario: respuesta.usuario,
      accessTokenExpiresAt,
    });
    set({
      status: 'authenticated',
      accessToken: respuesta.tokens.access_token,
      refreshToken: respuesta.tokens.refresh_token,
      usuario: respuesta.usuario,
      accessTokenExpiresAt,
    });
  },

  setTokens: (tokens) => {
    const accessTokenExpiresAt = calcularExpiraEn(tokens.expires_in);
    actualizarTokensPersistidos(tokens.access_token, tokens.refresh_token, accessTokenExpiresAt);
    set({
      status: 'authenticated',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt,
    });
  },

  clearSession: () => {
    borrarSesionPersistida();
    set({
      status: 'guest',
      accessToken: null,
      refreshToken: null,
      usuario: null,
      accessTokenExpiresAt: null,
    });
  },
}));

// -----------------------------------------------------------------------------
// Cableado del interceptor de refresh — ver api/http-client.ts.
// -----------------------------------------------------------------------------

/** Intenta refrescar la sesión una vez. `null` si no había refresh token o si el
 *  refresh falló (en ambos casos ya deja la sesión limpia). Única fuente de esta
 *  lógica: la usa el interceptor 401 de http-client.ts. */
export async function intentarRefrescarSesion(): Promise<string | null> {
  const { refreshToken } = useSessionStore.getState();
  if (!refreshToken) return null;
  try {
    const nuevosTokens = await refrescarSesion({ refresh_token: refreshToken });
    useSessionStore.getState().setTokens(nuevosTokens);
    return nuevosTokens.access_token;
  } catch {
    useSessionStore.getState().clearSession();
    return null;
  }
}

configureAuthHandlers({
  getAccessToken: () => useSessionStore.getState().accessToken,
  refreshAndRetry: intentarRefrescarSesion,
  onSessionExpired: () => {
    useSessionStore.getState().clearSession();
  },
});
