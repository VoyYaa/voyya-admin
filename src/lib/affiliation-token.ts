export type AffiliationTokenState =
  | { kind: 'missing' }
  | { kind: 'malformed' }
  | { kind: 'expired' }
  | { kind: 'valid'; companyId: number };

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + '='.repeat(padLength);
    return atob(padded);
  } catch {
    return null;
  }
}

export function readAffiliationToken(token: string | null): AffiliationTokenState {
  if (!token || token.trim().length === 0) return { kind: 'missing' };

  const parts = token.split('.');
  if (parts.length !== 2) return { kind: 'malformed' };

  const [body] = parts;
  const decoded = body ? decodeBase64Url(body) : null;
  if (!decoded) return { kind: 'malformed' };

  let payload: unknown;
  try {
    payload = JSON.parse(decoded);
  } catch {
    return { kind: 'malformed' };
  }

  if (typeof payload !== 'object' || payload === null) return { kind: 'malformed' };
  const companyId = (payload as Record<string, unknown>).companyId;
  const exp = (payload as Record<string, unknown>).exp;
  if (typeof companyId !== 'number' || typeof exp !== 'number') return { kind: 'malformed' };

  if (exp * 1000 < Date.now()) return { kind: 'expired' };
  return { kind: 'valid', companyId };
}
