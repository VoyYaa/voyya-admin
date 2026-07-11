// =============================================================================
// VoyYa Admin — Almacén de sesión (localStorage)
// -----------------------------------------------------------------------------
// Envoltorio fino sobre `window.localStorage`. Responsabilidad única: leer/
// escribir/borrar las claves de sesión. Mismo rol que
// apps/passenger|driver src/lib/secure-storage.ts, pero síncrono (localStorage
// no es async) y sin el nivel de protección de un keychain nativo — aceptable
// para una consola de administración web (HTTPS + expiración corta del access
// token, ver contracts/auth.ts). `usuario` se persiste ADEMÁS de los tokens
// porque el contrato no expone `GET /auth/me`: sin esto la consola no podría
// repintar nombre/rol al recargar la página sin pedir login otra vez.
// =============================================================================

import { UsuarioSesion } from '../contracts/auth';

const KEYS = {
  accessToken: 'voyya_admin_access_token',
  refreshToken: 'voyya_admin_refresh_token',
  usuario: 'voyya_admin_usuario',
  accessTokenExpiresAt: 'voyya_admin_access_token_expires_at',
} as const;

export interface PersistedSession {
  accessToken: string;
  refreshToken: string;
  usuario: UsuarioSesion;
  /** epoch ms — permite recalcular el refresh proactivo tras recargar la página. */
  accessTokenExpiresAt: number;
}

export function leerSesionPersistida(): PersistedSession | null {
  const accessToken = window.localStorage.getItem(KEYS.accessToken);
  const refreshToken = window.localStorage.getItem(KEYS.refreshToken);
  const usuarioJson = window.localStorage.getItem(KEYS.usuario);
  const expiresAtRaw = window.localStorage.getItem(KEYS.accessTokenExpiresAt);
  if (!accessToken || !refreshToken || !usuarioJson || !expiresAtRaw) return null;

  const parsedUsuarioJson: unknown = JSON.parse(usuarioJson);
  const parsedUsuario = UsuarioSesion.safeParse(parsedUsuarioJson);
  const accessTokenExpiresAt = Number(expiresAtRaw);
  if (!parsedUsuario.success || !Number.isFinite(accessTokenExpiresAt)) return null;

  return { accessToken, refreshToken, usuario: parsedUsuario.data, accessTokenExpiresAt };
}

/** Login exitoso: guarda las 4 claves completas. */
export function guardarSesion(sesion: PersistedSession): void {
  window.localStorage.setItem(KEYS.accessToken, sesion.accessToken);
  window.localStorage.setItem(KEYS.refreshToken, sesion.refreshToken);
  window.localStorage.setItem(KEYS.usuario, JSON.stringify(sesion.usuario));
  window.localStorage.setItem(KEYS.accessTokenExpiresAt, String(sesion.accessTokenExpiresAt));
}

/** Rotación de `/auth/refresh`: solo tokens — conserva el `usuario` ya guardado. */
export function actualizarTokensPersistidos(
  accessToken: string,
  refreshToken: string,
  accessTokenExpiresAt: number,
): void {
  window.localStorage.setItem(KEYS.accessToken, accessToken);
  window.localStorage.setItem(KEYS.refreshToken, refreshToken);
  window.localStorage.setItem(KEYS.accessTokenExpiresAt, String(accessTokenExpiresAt));
}

/** Logout (idempotente): borra sin importar si alguna clave ya no existía. */
export function borrarSesionPersistida(): void {
  window.localStorage.removeItem(KEYS.accessToken);
  window.localStorage.removeItem(KEYS.refreshToken);
  window.localStorage.removeItem(KEYS.usuario);
  window.localStorage.removeItem(KEYS.accessTokenExpiresAt);
}
