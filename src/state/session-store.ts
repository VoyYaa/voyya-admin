import { create } from 'zustand';
import type { SessionResponse, SessionTokens, SessionUser } from '../contracts/auth';
import { configureAuthHandlers } from '../api/http-client';
import { refreshSession } from '../api/auth.api';
import {
  clearPersistedSession,
  readPersistedSession,
  saveSession,
  updatePersistedTokens,
} from '../lib/local-storage';

export type SessionStatus = 'hydrating' | 'authenticated' | 'guest';

interface SessionState {
  status: SessionStatus;
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  accessTokenExpiresAt: number | null;

  hydrate: () => void;
  setSession: (response: SessionResponse) => void;
  setTokens: (tokens: SessionTokens) => void;
  clearSession: () => void;
}

function calculateExpiresAt(expiresInSec: number): number {
  return Date.now() + expiresInSec * 1000;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'hydrating',
  accessToken: null,
  refreshToken: null,
  user: null,
  accessTokenExpiresAt: null,

  hydrate: () => {
    const persisted = readPersistedSession();
    if (!persisted) {
      set({ status: 'guest' });
      return;
    }
    set({
      status: 'authenticated',
      accessToken: persisted.accessToken,
      refreshToken: persisted.refreshToken,
      user: persisted.user,
      accessTokenExpiresAt: persisted.accessTokenExpiresAt,
    });
  },

  setSession: (response) => {
    const accessTokenExpiresAt = calculateExpiresAt(response.tokens.expires_in);
    saveSession({
      accessToken: response.tokens.access_token,
      refreshToken: response.tokens.refresh_token,
      user: response.user,
      accessTokenExpiresAt,
    });
    set({
      status: 'authenticated',
      accessToken: response.tokens.access_token,
      refreshToken: response.tokens.refresh_token,
      user: response.user,
      accessTokenExpiresAt,
    });
  },

  setTokens: (tokens) => {
    const accessTokenExpiresAt = calculateExpiresAt(tokens.expires_in);
    updatePersistedTokens(tokens.access_token, tokens.refresh_token, accessTokenExpiresAt);
    set({
      status: 'authenticated',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt,
    });
  },

  clearSession: () => {
    clearPersistedSession();
    set({
      status: 'guest',
      accessToken: null,
      refreshToken: null,
      user: null,
      accessTokenExpiresAt: null,
    });
  },
}));

export async function attemptSessionRefresh(): Promise<string | null> {
  const { refreshToken } = useSessionStore.getState();
  if (!refreshToken) return null;
  try {
    const newTokens = await refreshSession({ refresh_token: refreshToken });
    useSessionStore.getState().setTokens(newTokens);
    return newTokens.access_token;
  } catch {
    useSessionStore.getState().clearSession();
    return null;
  }
}

configureAuthHandlers({
  getAccessToken: () => useSessionStore.getState().accessToken,
  refreshAndRetry: attemptSessionRefresh,
  onSessionExpired: () => {
    useSessionStore.getState().clearSession();
  },
});
