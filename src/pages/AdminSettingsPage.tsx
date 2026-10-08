import { useCallback, type JSX, type ReactNode } from 'react';
import type { ConsoleSettings } from '@voyyaa/shared';
import { getConsoleSettings } from '../api/admin-settings.api';
import { isForbiddenError } from '../api/errors';
import { StateGlyph } from '../components/brand/StateGlyph';
import { Notice } from '../components/ui/Notice';
import { OfficialBadge } from '../components/ui/OfficialBadge';
import { ProgressRail } from '../components/ui/ProgressRail';
import { ReadOnlyRow } from '../components/ui/ReadOnlyRow';
import { EmptyPanel, ErrorPanel, SkeletonBlock } from '../components/ui/TableStates';
import { SETTINGS_COPY } from '../copy/settings';
import { serviceLabel } from '../copy/service';
import { useAsync } from '../hooks/useAsync';
import { useNetworkOnline } from '../hooks/useNetworkOnline';
import {
  CONFIG_GROUP_LABELS,
  fieldsOfGroup,
  formatConfigValue,
  formatFieldValue,
  type ConfigGroup,
} from '../lib/service-config-fields';
import { formatLongDate } from '../lib/time';
import { useSessionStore } from '../state/session-store';

const PARAMETER_GROUPS: { group: ConfigGroup; title: string; note: string }[] = [
  {
    group: 'assignment',
    title: SETTINGS_COPY.assignmentSection,
    note: SETTINGS_COPY.assignmentNote,
  },
  { group: 'passenger', title: SETTINGS_COPY.passengerSection, note: SETTINGS_COPY.passengerNote },
];

function Section({
  title,
  note,
  aside,
  footer,
  children,
}: {
  title: string;
  note?: string;
  aside?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="mb-8 border-t border-border pt-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-title text-text">{title}</h2>
        {aside}
      </div>
      {note && <p className="mb-3 text-small text-text-muted">{note}</p>}
      <dl>{children}</dl>
      {footer}
    </section>
  );
}

function LoadingState(): JSX.Element {
  return (
    <div role="status" aria-label={SETTINGS_COPY.loading} className="mx-auto max-w-2xl px-6 py-8">
      <ProgressRail className="mb-6" />
      <SkeletonBlock className="mb-2 h-3 w-24" />
      <SkeletonBlock className="mb-8 h-8 w-48" />
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="mb-8 border-t border-border pt-6">
          <SkeletonBlock className="mb-4 h-5 w-40" />
          <div className="flex items-center justify-between gap-4">
            <SkeletonBlock className="h-4 w-1/3" />
            <SkeletonBlock className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReadOnlyNotice({ municipality }: { municipality: string | null }): JSX.Element {
  return (
    <Notice
      tone="info"
      role="note"
      className="mb-6"
      leading={<StateGlyph glyph="empty" size={28} />}
    >
      <p className="font-bold">{SETTINGS_COPY.readOnlyTitle}</p>
      <p className="mt-1 text-small">
        {municipality
          ? SETTINGS_COPY.readOnlyBody(municipality)
          : SETTINGS_COPY.readOnlyBodyGeneric}
      </p>
      <p className="mt-1 text-small">{SETTINGS_COPY.readOnlyAsk}</p>
    </Notice>
  );
}

function valueOf(settings: ConsoleSettings, key: keyof ConsoleSettings): number {
  const value = settings[key];
  return typeof value === 'number' ? value : 0;
}

export function AdminSettingsPage(): JSX.Element {
  const online = useNetworkOnline();
  const municipality = useSessionStore((s) => s.user?.tenant?.municipality_name ?? null);
  const fetcher = useCallback(() => getConsoleSettings(), []);
  const { data, error, status, isInitialLoading, refetch } = useAsync(fetcher);

  if (isInitialLoading) return <LoadingState />;

  if (status === 'error' && !data) {
    if (isForbiddenError(error)) {
      return (
        <div className="mx-auto max-w-2xl px-6 py-8">
          <p className="vy-eyebrow mb-1">{SETTINGS_COPY.eyebrow}</p>
          <h1 className="mb-6 font-display text-display text-text">{SETTINGS_COPY.title}</h1>
          <ReadOnlyNotice municipality={municipality} />
        </div>
      );
    }
    return (
      <ErrorPanel
        title={SETTINGS_COPY.error}
        onRetry={refetch}
        variant={online ? 'error' : 'offline'}
      />
    );
  }

  if (!data) return <></>;

  const hasFare = data.base_fare > 0 || data.fare_valid_from !== null;
  if (!hasFare) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <EmptyPanel title={SETTINGS_COPY.emptyTitle} description={SETTINGS_COPY.emptyBody} />
      </div>
    );
  }

  const service = serviceLabel(data.service_type);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <p className="vy-eyebrow mb-1">{SETTINGS_COPY.eyebrow}</p>
      <h1 className="font-display text-display text-text">{SETTINGS_COPY.title}</h1>
      <p className="mb-6 text-body text-text-muted">
        {municipality
          ? SETTINGS_COPY.serviceLine(service, municipality)
          : SETTINGS_COPY.serviceOnly(service)}
      </p>

      {!online && (
        <Notice
          tone="info"
          role="alert"
          className="mb-6"
          leading={<StateGlyph glyph="offline" size={28} />}
        >
          {SETTINGS_COPY.offline}
        </Notice>
      )}

      <ReadOnlyNotice municipality={municipality} />

      {!data.fare_is_official && (
        <Notice tone="warning" role="note" className="mb-6">
          {municipality
            ? SETTINGS_COPY.unofficialNotice(municipality)
            : SETTINGS_COPY.unofficialNoticeGeneric}
        </Notice>
      )}

      <Section
        title={SETTINGS_COPY.fareSection}
        note={SETTINGS_COPY.fareSectionNote}
        aside={<OfficialBadge official={data.fare_is_official} />}
        footer={
          data.fare_valid_from && (
            <p className="pt-2 text-small text-text-muted">
              {SETTINGS_COPY.effectiveSince(formatLongDate(data.fare_valid_from))}
              {data.fare_is_official && data.fare_official_reference
                ? ` · ${SETTINGS_COPY.reference(data.fare_official_reference)}`
                : ''}
            </p>
          )
        }
      >
        {fieldsOfGroup('fare').map((field) => (
          <ReadOnlyRow key={field.key} label={field.label}>
            {formatConfigValue(field.key, valueOf(data, field.key))}
          </ReadOnlyRow>
        ))}
      </Section>

      <Section title={CONFIG_GROUP_LABELS.surcharges}>
        {fieldsOfGroup('surcharges').map((field) => (
          <ReadOnlyRow key={field.key} label={field.label} helper={field.helper}>
            {formatConfigValue(field.key, valueOf(data, field.key))}
          </ReadOnlyRow>
        ))}
      </Section>

      <Section title={SETTINGS_COPY.commissionSection} note={SETTINGS_COPY.commissionNote}>
        <ReadOnlyRow label={SETTINGS_COPY.commissionLabel}>
          {formatFieldValue('pct', data.commission_pct)}
        </ReadOnlyRow>
      </Section>

      {PARAMETER_GROUPS.map(({ group, title, note }) => (
        <Section key={group} title={title} note={note}>
          {fieldsOfGroup(group).map((field) => (
            <ReadOnlyRow key={field.key} label={field.label} helper={field.helper}>
              {formatConfigValue(field.key, valueOf(data, field.key))}
            </ReadOnlyRow>
          ))}
        </Section>
      ))}
    </div>
  );
}
