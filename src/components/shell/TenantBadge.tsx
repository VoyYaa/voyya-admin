import type { JSX } from 'react';
import type { SessionTenant } from '@voyyaa/shared';

export interface TenantBadgeProps {
  tenant: SessionTenant | null;
}

export function TenantBadge({ tenant }: TenantBadgeProps): JSX.Element | null {
  const label = [tenant?.company_name, tenant?.municipality_name]
    .map((name) => name?.trim())
    .filter((name): name is string => Boolean(name))
    .join(' · ');

  if (!label) return null;

  return (
    <>
      <span className="h-5 w-px bg-frame-border" aria-hidden="true" />
      <span className="text-small text-frame-text-muted">{label}</span>
    </>
  );
}
