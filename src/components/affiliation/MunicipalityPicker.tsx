import { useEffect, useMemo, useState, type JSX, type Ref } from 'react';
import type { AffiliationMunicipalityListResponse } from '@voyyaa/shared';
import { MUNICIPALITY_FIELD_COPY } from '../../copy/affiliation';
import { COMMON_COPY } from '../../copy/common';
import { useElapsedFlag } from '../../hooks/useElapsedFlag';
import { deriveDepartments } from '../../lib/municipality-catalog';
import { formatLongDate } from '../../lib/time';
import { StateGlyph } from '../brand/StateGlyph';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Notice } from '../ui/Notice';
import { SkeletonBlock } from '../ui/TableStates';
import { DepartmentSelect } from './DepartmentSelect';
import { MunicipalityCombobox } from './MunicipalityCombobox';

const SLOW_LOADING_MS = 8_000;
const DEPARTMENT_FIELD_ID = 'department_code';
const MUNICIPALITY_FIELD_ID = 'municipality_id';

export type CatalogLoadState = 'loading' | 'ready' | 'error' | 'offline';

export interface MunicipalityPickerProps {
  catalog: AffiliationMunicipalityListResponse | null;
  loadState: CatalogLoadState;
  onRetry: () => void;
  value: number | undefined;
  onChange: (municipalityId: number | undefined) => void;
  onBlur: () => void;
  onEdit: () => void;
  error?: string;
  inputRef?: Ref<HTMLInputElement>;
}

function CatalogSourceLine({
  source,
}: {
  source: AffiliationMunicipalityListResponse['source'];
}): JSX.Element {
  const attribution =
    source.attribution.trim() || MUNICIPALITY_FIELD_COPY.sourceFallbackAttribution;
  const license = source.license.trim() || MUNICIPALITY_FIELD_COPY.sourceFallbackLicense;
  return (
    <p className="text-small text-text-muted">
      {MUNICIPALITY_FIELD_COPY.sourceLead(attribution)}
      <a
        href={MUNICIPALITY_FIELD_COPY.sourceLicenseUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="focus-ring inline-flex min-h-11 items-center rounded-sm font-bold text-text underline underline-offset-2 hover:text-amber-ink dark:hover:text-amber"
      >
        {license}
        <span className="sr-only"> {MUNICIPALITY_FIELD_COPY.sourceNewTab}</span>
      </a>
      {MUNICIPALITY_FIELD_COPY.sourceTail(formatLongDate(`${source.cut_date}T12:00:00`))}
    </p>
  );
}

function InfoIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 9v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="6.2" r="1" fill="currentColor" />
    </svg>
  );
}

function LoadingFields({ slow }: { slow: boolean }): JSX.Element {
  return (
    <div role="status" className="flex flex-col gap-4 md:col-span-2">
      <div className="flex flex-col gap-1.5">
        <span className="text-body font-bold text-text">
          {MUNICIPALITY_FIELD_COPY.departmentLabel}
        </span>
        <SkeletonBlock className="h-tap w-full" />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-body font-bold text-text">{MUNICIPALITY_FIELD_COPY.label}</span>
        <SkeletonBlock className="h-tap w-full" />
      </div>
      <p className="text-small text-text-muted">
        {slow ? MUNICIPALITY_FIELD_COPY.loadingSlow : MUNICIPALITY_FIELD_COPY.loading}
      </p>
    </div>
  );
}

export function MunicipalityPicker({
  catalog,
  loadState,
  onRetry,
  value,
  onChange,
  onBlur,
  onEdit,
  error,
  inputRef,
}: MunicipalityPickerProps): JSX.Element {
  const [departmentCode, setDepartmentCode] = useState('');
  const [departmentTouched, setDepartmentTouched] = useState(false);
  const [swapNotice, setSwapNotice] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const slow = useElapsedFlag(loadState === 'loading', SLOW_LOADING_MS);
  const rows = useMemo(() => catalog?.rows ?? [], [catalog]);
  const departments = useMemo(() => deriveDepartments(rows), [rows]);
  const department = departments.find((candidate) => candidate.code === departmentCode);
  const selectedRow = rows.find((row) => row.municipality_id === value);

  useEffect(() => {
    if (selectedRow && departmentCode === '') setDepartmentCode(selectedRow.department_code);
  }, [selectedRow, departmentCode]);

  if (loadState === 'loading' && !catalog) return <LoadingFields slow={slow} />;

  if ((loadState === 'error' || loadState === 'offline') && !catalog) {
    const offline = loadState === 'offline';
    return (
      <div className="md:col-span-2">
        <Notice
          tone={offline ? 'info' : 'danger'}
          role={offline ? 'status' : 'alert'}
          leading={<StateGlyph glyph={offline ? 'offline' : 'error'} size={28} />}
          action={
            <Button variant="ghost" onClick={onRetry}>
              {COMMON_COPY.retry}
            </Button>
          }
        >
          {offline ? MUNICIPALITY_FIELD_COPY.offline : MUNICIPALITY_FIELD_COPY.loadError}
        </Notice>
      </div>
    );
  }

  if (catalog && rows.length === 0) {
    return (
      <div className="md:col-span-2">
        <Notice
          tone="warning"
          role="alert"
          leading={<StateGlyph glyph="empty" size={28} />}
          action={
            <Button variant="ghost" onClick={onRetry}>
              {COMMON_COPY.retry}
            </Button>
          }
        >
          {MUNICIPALITY_FIELD_COPY.emptyCatalog}
        </Notice>
      </div>
    );
  }

  const countInDepartment = (code: string): number =>
    rows.filter((row) => row.department_code === code).length;

  const onDepartmentChange = (code: string): void => {
    if (code === departmentCode) return;
    const hadSelection = value !== undefined;
    setDepartmentCode(code);
    if (hadSelection) onChange(undefined);
    setSwapNotice(hadSelection);
    const next = departments.find((candidate) => candidate.code === code);
    if (hadSelection) setAnnouncement(MUNICIPALITY_FIELD_COPY.departmentChangedNotice);
    else if (next) {
      setAnnouncement(
        MUNICIPALITY_FIELD_COPY.departmentChosenAnnouncement(next.name, countInDepartment(code)),
      );
    } else setAnnouncement(MUNICIPALITY_FIELD_COPY.departmentClearedAnnouncement);
  };

  const hasActiveCompanies = selectedRow?.has_active_companies === true;
  const lacksCoverage = selectedRow !== undefined && !selectedRow.coverage_active;
  const showCovered =
    selectedRow !== undefined && selectedRow.coverage_active && !selectedRow.has_active_companies;
  const hasNotes = lacksCoverage || hasActiveCompanies || showCovered;

  const selectionNotes = (row: (typeof rows)[number]): string[] => {
    const notes: string[] = [];
    if (row.has_active_companies) notes.push(MUNICIPALITY_FIELD_COPY.existingCompaniesNote);
    if (!row.coverage_active) notes.push(MUNICIPALITY_FIELD_COPY.noCoverageShort);
    return notes;
  };

  const notesId = 'municipality-notes';
  const departmentError =
    departmentTouched && departmentCode === ''
      ? MUNICIPALITY_FIELD_COPY.departmentRequired
      : undefined;

  return (
    <div className="flex flex-col gap-4 md:col-span-2">
      <Field
        label={MUNICIPALITY_FIELD_COPY.departmentLabel}
        htmlFor={DEPARTMENT_FIELD_ID}
        error={departmentError}
        announceError
      >
        {(control) => (
          <DepartmentSelect
            control={control}
            departments={departments}
            value={departmentCode}
            onChange={onDepartmentChange}
            onBlur={() => setDepartmentTouched(true)}
          />
        )}
      </Field>

      <Field
        label={MUNICIPALITY_FIELD_COPY.label}
        htmlFor={MUNICIPALITY_FIELD_ID}
        hint={
          department
            ? MUNICIPALITY_FIELD_COPY.hint(department.name)
            : MUNICIPALITY_FIELD_COPY.hintNoDepartment
        }
        error={error}
        announceError
      >
        {(control) => (
          <MunicipalityCombobox
            key={departmentCode}
            id={control.id}
            rows={rows}
            department={department}
            value={value}
            onChange={(id) => {
              setSwapNotice(false);
              onChange(id);
            }}
            onBlur={onBlur}
            onEdit={onEdit}
            selectionNotes={selectionNotes}
            inputRef={inputRef}
            aria-invalid={control['aria-invalid']}
            aria-describedby={
              [control['aria-describedby'], hasNotes ? notesId : null].filter(Boolean).join(' ') ||
              undefined
            }
          />
        )}
      </Field>

      {swapNotice && (
        <p role="status" className="-mt-2 text-small text-text-muted">
          {MUNICIPALITY_FIELD_COPY.departmentChangedNotice}
        </p>
      )}

      {hasNotes && (
        <div id={notesId} className="-mt-2 flex flex-col gap-2">
          {lacksCoverage && (
            <Notice tone="info" role="note" leading={<InfoIcon />}>
              {MUNICIPALITY_FIELD_COPY.noCoverageNotice}
            </Notice>
          )}
          {showCovered && (
            <p className="text-small text-text-muted">{MUNICIPALITY_FIELD_COPY.coveredNotice}</p>
          )}
          {hasActiveCompanies && (
            <p className="text-small text-text-muted">
              {MUNICIPALITY_FIELD_COPY.existingCompaniesNote}
            </p>
          )}
        </div>
      )}

      {catalog && <CatalogSourceLine source={catalog.source} />}

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
