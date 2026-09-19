import { useCallback, type JSX } from 'react';
import type { CompanyProfile, SessionTenant } from '@voyyaa/shared';
import { getCompanyProfile } from '../../api/company-profile.api';
import { useAsync } from '../../hooks/useAsync';
import { COMPANY_STATUS_LABELS, COMPANY_STATUS_TONES, TONE_DOT_CLASS } from '../../lib/status-maps';

export interface TenantBadgeProps {
  tenant: SessionTenant | null;
}

function CompanyStatusChip({ profile }: { profile: CompanyProfile }): JSX.Element {
  const tone = COMPANY_STATUS_TONES[profile.status];
  const label = COMPANY_STATUS_LABELS[profile.status];

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-frame-chip-border bg-frame-chip-bg px-3 py-1 text-small text-frame-text-muted">
      <span className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT_CLASS[tone]}`} aria-hidden="true" />
      <span className="text-numeric font-medium text-frame-text">NIT {profile.tax_id}</span>
      <span aria-hidden="true">·</span>
      <span>{label}</span>
    </span>
  );
}

function CompanyStatusChipSkeleton(): JSX.Element {
  return (
    <span
      className="h-6 w-32 animate-pulse rounded-full bg-frame-chip-bg motion-reduce:animate-none"
      aria-hidden="true"
    />
  );
}

export function TenantBadge({ tenant }: TenantBadgeProps): JSX.Element | null {
  const label = [tenant?.company_name, tenant?.municipality_name]
    .map((name) => name?.trim())
    .filter((name): name is string => Boolean(name))
    .join(' · ');

  const fetchCompanyProfile = useCallback(() => getCompanyProfile(), []);
  const { data, status } = useAsync(fetchCompanyProfile, tenant !== null);

  if (!label) return null;

  return (
    <>
      <span className="h-5 w-px bg-frame-border" aria-hidden="true" />
      <span className="text-small text-frame-text-muted">{label}</span>
      {status === 'loading' && <CompanyStatusChipSkeleton />}
      {status === 'success' && data && <CompanyStatusChip profile={data} />}
    </>
  );
}
