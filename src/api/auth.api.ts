// =============================================================================
// VoyYa Admin — API del dominio AUTH (correo + contraseña · HU-AUTH-03/04)
// -----------------------------------------------------------------------------
// Funciones finas 1:1 con contracts/auth.ts (vendorizado de @voyya/shared). Cada
// DTO se valida con `.parse()` antes de enviarlo (defensa en profundidad) y la
// respuesta con su esquema — mismo patrón que apps/passenger|driver.
// =============================================================================

import {
  ErrorAuth,
  LoginAdminDTO,
  LogoutDTO,
  RefreshDTO,
  RespuestaLogout,
  RespuestaRefresh,
  RespuestaSesion,
} from '../contracts/auth';
import { apiRequest } from './http-client';

export function loginAdmin(dto: LoginAdminDTO): Promise<RespuestaSesion> {
  const body = LoginAdminDTO.parse(dto);
  return apiRequest(
    { method: 'POST', path: '/auth/admin/login', body, skipAuth: true },
    RespuestaSesion,
    ErrorAuth,
  );
}

export function refrescarSesion(dto: RefreshDTO): Promise<RespuestaRefresh> {
  const body = RefreshDTO.parse(dto);
  return apiRequest(
    { method: 'POST', path: '/auth/refresh', body, skipAuth: true },
    RespuestaRefresh,
    ErrorAuth,
  );
}

export function cerrarSesion(dto: LogoutDTO): Promise<RespuestaLogout> {
  const body = LogoutDTO.parse(dto);
  return apiRequest(
    { method: 'POST', path: '/auth/logout', body, skipAuth: true },
    RespuestaLogout,
    ErrorAuth,
  );
}
