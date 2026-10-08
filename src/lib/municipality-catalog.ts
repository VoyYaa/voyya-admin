import type { AffiliationMunicipality } from '@voyyaa/shared';

export interface DepartmentOption {
  code: string;
  name: string;
}

export interface IndexedMunicipality {
  row: AffiliationMunicipality;
  key: string;
}

export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function deriveDepartments(rows: readonly AffiliationMunicipality[]): DepartmentOption[] {
  const byCode = new Map<string, string>();
  for (const row of rows) {
    if (!byCode.has(row.department_code)) byCode.set(row.department_code, row.department);
  }
  return [...byCode.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}

export function indexMunicipalitiesOf(
  rows: readonly AffiliationMunicipality[],
  departmentCode: string,
): IndexedMunicipality[] {
  return rows
    .filter((row) => row.department_code === departmentCode)
    .map((row) => ({ row, key: normalizeSearchText(row.name) }))
    .sort((a, b) => a.row.name.localeCompare(b.row.name, 'es', { sensitivity: 'base' }));
}

function stripSpaces(text: string): string {
  return text.replace(/ /g, '');
}

function matchScore(key: string, words: string[], fullQuery: string): number | null {
  if (key.startsWith(fullQuery)) return 0;
  if (stripSpaces(key).startsWith(stripSpaces(fullQuery))) return 0;
  const nameWords = key.split(' ');
  const everyWordPrefixes = words.every((word) =>
    nameWords.some((nameWord) => nameWord.startsWith(word)),
  );
  return everyWordPrefixes ? 1 : null;
}

export function filterMunicipalities(
  indexed: readonly IndexedMunicipality[],
  query: string,
): AffiliationMunicipality[] {
  const fullQuery = normalizeSearchText(query);
  if (fullQuery.length === 0) return indexed.map((entry) => entry.row);
  const words = fullQuery.split(' ');
  return indexed
    .map((entry) => ({ entry, score: matchScore(entry.key, words, fullQuery) }))
    .filter(
      (candidate): candidate is { entry: IndexedMunicipality; score: number } =>
        candidate.score !== null,
    )
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.entry.row.name.localeCompare(b.entry.row.name, 'es', { sensitivity: 'base' }),
    )
    .map((candidate) => candidate.entry.row);
}
