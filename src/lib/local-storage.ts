import { SessionUser } from '@voyyaa/shared';

const KEYS = {
  accessToken: 'voyya_admin_access_token',
  refreshToken: 'voyya_admin_refresh_token',
  user: 'voyya_admin_user',
  accessTokenExpiresAt: 'voyya_admin_access_token_expires_at',
} as const;

export interface PersistedSession {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
  accessTokenExpiresAt: number;
}

export function readPersistedSession(): PersistedSession | null {
  const accessToken = window.localStorage.getItem(KEYS.accessToken);
  const refreshToken = window.localStorage.getItem(KEYS.refreshToken);
  const userJson = window.localStorage.getItem(KEYS.user);
  const expiresAtRaw = window.localStorage.getItem(KEYS.accessTokenExpiresAt);
  if (!accessToken || !refreshToken || !userJson || !expiresAtRaw) return null;

  const parsedUserJson: unknown = JSON.parse(userJson);
  const parsedUser = SessionUser.safeParse(parsedUserJson);
  const accessTokenExpiresAt = Number(expiresAtRaw);
  if (!parsedUser.success || !Number.isFinite(accessTokenExpiresAt)) return null;

  return { accessToken, refreshToken, user: parsedUser.data, accessTokenExpiresAt };
}

export function saveSession(session: PersistedSession): void {
  window.localStorage.setItem(KEYS.accessToken, session.accessToken);
  window.localStorage.setItem(KEYS.refreshToken, session.refreshToken);
  window.localStorage.setItem(KEYS.user, JSON.stringify(session.user));
  window.localStorage.setItem(KEYS.accessTokenExpiresAt, String(session.accessTokenExpiresAt));
}

export function updatePersistedTokens(
  accessToken: string,
  refreshToken: string,
  accessTokenExpiresAt: number,
): void {
  window.localStorage.setItem(KEYS.accessToken, accessToken);
  window.localStorage.setItem(KEYS.refreshToken, refreshToken);
  window.localStorage.setItem(KEYS.accessTokenExpiresAt, String(accessTokenExpiresAt));
}

export function clearPersistedSession(): void {
  window.localStorage.removeItem(KEYS.accessToken);
  window.localStorage.removeItem(KEYS.refreshToken);
  window.localStorage.removeItem(KEYS.user);
  window.localStorage.removeItem(KEYS.accessTokenExpiresAt);
}
