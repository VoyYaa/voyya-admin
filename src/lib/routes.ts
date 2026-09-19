import type { Role } from '@voyyaa/shared';

export function resolveHomePath(role?: Role): string {
  return role === 'platform_admin' ? '/platform/companies' : '/ops/queue';
}
