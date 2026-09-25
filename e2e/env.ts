function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `Falta la variable de entorno ${name}. Estas pruebas no arrancan sin ella para evitar ` +
        'apuntar por accidente a un entorno que no controlas (por ejemplo, producción).',
    );
  }
  return value;
}

export const BASE_URL = requiredEnv('BASE_URL');

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@voyya.co';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'DEV_ONLY_change_me_1234!';

export const PLATFORM_ADMIN_EMAIL = process.env.E2E_PLATFORM_ADMIN_EMAIL ?? 'plataforma@voyya.co';
export const PLATFORM_ADMIN_PASSWORD =
  process.env.E2E_PLATFORM_ADMIN_PASSWORD ?? 'DEV_ONLY_change_me_1234!';

export const ADMIN_AUTH_FILE = 'e2e/.auth/admin.json';
export const PLATFORM_ADMIN_AUTH_FILE = 'e2e/.auth/platform-admin.json';
