import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type JSX,
  type KeyboardEvent,
  type Ref,
} from 'react';
import type { AffiliationMunicipality } from '@voyyaa/shared';
import { MUNICIPALITY_FIELD_COPY } from '../../copy/affiliation';
import {
  filterMunicipalities,
  indexMunicipalitiesOf,
  type DepartmentOption,
} from '../../lib/municipality-catalog';

const PAGE_STEP = 5;
const ANNOUNCE_DEBOUNCE_MS = 300;

export interface MunicipalityComboboxProps {
  id: string;
  rows: readonly AffiliationMunicipality[];
  department: DepartmentOption | undefined;
  value: number | undefined;
  onChange: (municipalityId: number | undefined) => void;
  onBlur?: () => void;
  onEdit?: () => void;
  selectionNotes: (row: AffiliationMunicipality) => string[];
  inputRef?: Ref<HTMLInputElement>;
  disabled?: boolean;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

function SearchIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
    >
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M3 8.5l3.2 3.2L13 4.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MunicipalityCombobox({
  id,
  rows,
  department,
  value,
  onChange,
  onBlur,
  onEdit,
  selectionNotes,
  inputRef,
  disabled = false,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: MunicipalityComboboxProps): JSX.Element {
  const listboxId = useId();
  const optionId = useCallback(
    (municipalityId: number): string => `${id}-option-${municipalityId}`,
    [id],
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const hadSelectionRef = useRef(false);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const indexed = useMemo(
    () => (department ? indexMunicipalitiesOf(rows, department.code) : []),
    [rows, department],
  );
  const selectedRow = useMemo(
    () => (value === undefined ? undefined : rows.find((row) => row.municipality_id === value)),
    [rows, value],
  );
  const results = useMemo(
    () => filterMunicipalities(indexed, selectedRow ? '' : query),
    [indexed, query, selectedRow],
  );

  const hasQuery = query.trim().length > 0 && !selectedRow;
  const showList = isOpen && results.length > 0;
  const showNoResults = isOpen && hasQuery && results.length === 0 && department !== undefined;
  const activeIndex = results.findIndex((row) => row.municipality_id === activeId);

  useEffect(() => {
    if (selectedRow) {
      setQuery(selectedRow.name);
      hadSelectionRef.current = true;
    } else if (hadSelectionRef.current) {
      setQuery('');
      hadSelectionRef.current = false;
    }
  }, [selectedRow]);

  useEffect(() => {
    if (!isOpen) {
      setActiveId(null);
      return;
    }
    const onlyResult = results[0];
    if (results.length === 1 && onlyResult) {
      setActiveId(onlyResult.municipality_id);
    } else if (!results.some((row) => row.municipality_id === activeId)) {
      setActiveId(null);
    }
  }, [isOpen, results, activeId]);

  useEffect(() => {
    if (activeId === null) return;
    document.getElementById(optionId(activeId))?.scrollIntoView({ block: 'nearest' });
  }, [activeId, optionId]);

  useEffect(() => {
    if (!isOpen || !department || selectedRow) return;
    const timer = window.setTimeout(() => {
      if (results.length === 0) {
        setAnnouncement(MUNICIPALITY_FIELD_COPY.noResultsAnnouncement(department.name));
      } else if (hasQuery) {
        setAnnouncement(MUNICIPALITY_FIELD_COPY.resultsCount(results.length));
      } else {
        setAnnouncement(
          MUNICIPALITY_FIELD_COPY.listOpenedAnnouncement(results.length, department.name),
        );
      }
    }, ANNOUNCE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [isOpen, hasQuery, results.length, department, selectedRow]);

  const select = (row: AffiliationMunicipality): void => {
    hadSelectionRef.current = true;
    setQuery(row.name);
    setIsOpen(false);
    setActiveId(null);
    onChange(row.municipality_id);
    setAnnouncement(MUNICIPALITY_FIELD_COPY.selectedAnnouncement(row.name, selectionNotes(row)));
  };

  const clear = (): void => {
    hadSelectionRef.current = false;
    setQuery('');
    setIsOpen(false);
    onChange(undefined);
    setAnnouncement(MUNICIPALITY_FIELD_COPY.clearedAnnouncement);
    containerRef.current?.querySelector('input')?.focus();
  };

  const moveActive = (delta: number): void => {
    if (results.length === 0) return;
    const base = activeIndex === -1 ? (delta > 0 ? -1 : results.length) : activeIndex;
    const next = Math.min(Math.max(base + delta, 0), results.length - 1);
    setActiveId(results[next]?.municipality_id ?? null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setActiveId(results[0]?.municipality_id ?? null);
        } else {
          moveActive(1);
        }
        break;
      case 'ArrowUp':
        if (!isOpen) break;
        event.preventDefault();
        if (activeIndex <= 0) setActiveId(null);
        else moveActive(-1);
        break;
      case 'Home':
        if (isOpen && activeIndex !== -1) {
          event.preventDefault();
          setActiveId(results[0]?.municipality_id ?? null);
        }
        break;
      case 'End':
        if (isOpen && activeIndex !== -1) {
          event.preventDefault();
          setActiveId(results[results.length - 1]?.municipality_id ?? null);
        }
        break;
      case 'PageDown':
        if (isOpen) {
          event.preventDefault();
          moveActive(PAGE_STEP);
        }
        break;
      case 'PageUp':
        if (isOpen) {
          event.preventDefault();
          moveActive(-PAGE_STEP);
        }
        break;
      case 'Enter':
        event.preventDefault();
        if (isOpen && activeIndex !== -1) {
          const target = results[activeIndex];
          if (target) select(target);
        }
        break;
      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          setIsOpen(false);
        }
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
        setActiveId(null);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const onInputChange = (text: string): void => {
    setQuery(text);
    setIsOpen(true);
    onEdit?.();
    if (selectedRow) {
      hadSelectionRef.current = false;
      onChange(undefined);
    }
  };

  const onFocusOut = (event: FocusEvent<HTMLDivElement>): void => {
    if (containerRef.current?.contains(event.relatedTarget as Node | null)) return;
    setIsOpen(false);
  };

  const activeDescendant = showList && activeId !== null ? optionId(activeId) : undefined;
  const placeholder = department
    ? MUNICIPALITY_FIELD_COPY.placeholder
    : MUNICIPALITY_FIELD_COPY.placeholderNoDepartment;

  return (
    <div ref={containerRef} className="relative" onBlur={onFocusOut}>
      <div className="relative">
        <SearchIcon />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-activedescendant={activeDescendant}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          autoComplete="off"
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          disabled={disabled || !department}
          placeholder={placeholder}
          value={query}
          onChange={(event) => onInputChange(event.target.value)}
          onClick={() => setIsOpen(true)}
          onBlur={() => onBlur?.()}
          onKeyDown={onKeyDown}
          className="vy-input pl-10 pr-12"
        />
        {query.length > 0 && !disabled && department && (
          <button
            type="button"
            onClick={clear}
            aria-label={MUNICIPALITY_FIELD_COPY.clearLabel}
            className="focus-ring absolute right-0 top-0 inline-flex min-h-tap min-w-tap items-center justify-center rounded-xs text-text-muted hover:text-text"
          >
            <span aria-hidden="true">✕</span>
          </button>
        )}
      </div>

      {showList && department && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={MUNICIPALITY_FIELD_COPY.listLabel(department.name)}
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[220px] overflow-y-auto overscroll-contain border border-border-input border-t-rail border-t-amber bg-surface"
        >
          {results.map((row) => {
            const isActive = row.municipality_id === activeId;
            const isSelected = row.municipality_id === value;
            return (
              <div
                key={row.municipality_id}
                id={optionId(row.municipality_id)}
                role="option"
                aria-selected={isSelected}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(row)}
                onMouseEnter={() => setActiveId(row.municipality_id)}
                className={`flex min-h-[48px] cursor-pointer items-center justify-between gap-2 border-b border-l-rail border-b-border px-3 py-2 text-body font-bold text-text last:border-b-0 ${
                  isActive
                    ? 'border-l-amber bg-surface-sunken outline outline-2 -outline-offset-2 outline-focus-ring'
                    : 'border-l-transparent'
                }`}
              >
                <span className="min-w-0 break-words">{row.name}</span>
                {isSelected && <CheckIcon />}
              </div>
            );
          })}
        </div>
      )}

      {showNoResults && department && (
        <p role="status" className="mt-2 text-small text-text-muted">
          {MUNICIPALITY_FIELD_COPY.noResults(department.name)}
        </p>
      )}

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
