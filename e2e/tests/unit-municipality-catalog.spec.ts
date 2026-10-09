import { expect, test } from '@playwright/test';
import type { AffiliationMunicipality } from '@voyyaa/shared';
import {
  deriveDepartments,
  filterMunicipalities,
  indexMunicipalitiesOf,
  normalizeSearchText,
} from '../../src/lib/municipality-catalog';

function row(
  id: number,
  name: string,
  departmentCode: string,
  department: string,
): AffiliationMunicipality {
  return {
    municipality_id: id,
    dane_code: `${departmentCode}${String(id).padStart(3, '0')}`,
    department_code: departmentCode,
    name,
    department,
    already_covered: false,
    has_active_companies: false,
    coverage_active: true,
  };
}

const ROWS: AffiliationMunicipality[] = [
  row(1, 'Medellín', '05', 'Antioquia'),
  row(2, 'Nariño', '05', 'Antioquia'),
  row(3, 'Santa Rosa de Osos', '05', 'Antioquia'),
  row(4, 'Santa Fe de Antioquia', '05', 'Antioquia'),
  row(5, 'Rionegro', '05', 'Antioquia'),
  row(6, 'Rionegro', '68', 'Santander'),
  row(7, 'Bogotá, D.C.', '11', 'Bogotá, D.C.'),
  row(8, 'Cartagena', '13', 'Bolívar'),
  row(9, 'Tunja', '15', 'Boyacá'),
  row(10, 'Quibdó', '27', 'Chocó'),
];

function names(rows: AffiliationMunicipality[]): string[] {
  return rows.map((entry) => entry.name);
}

test.describe('normalizeSearchText', () => {
  test('ignores case and diacritics', () => {
    expect(normalizeSearchText('Medellin')).toBe('medellin');
    expect(normalizeSearchText('MEDELLÍN')).toBe('medellin');
    expect(normalizeSearchText('medellín')).toBe('medellin');
    expect(normalizeSearchText('Nariño')).toBe('narino');
  });

  test('turns punctuation into single spaces', () => {
    expect(normalizeSearchText('Bogotá, D.C.')).toBe('bogota d c');
    expect(normalizeSearchText('  San   Andrés ')).toBe('san andres');
  });
});

test.describe('deriveDepartments', () => {
  test('derives one option per department code, sorted like Spanish', () => {
    const departments = deriveDepartments(ROWS);
    expect(departments.map((entry) => entry.name)).toEqual([
      'Antioquia',
      'Bogotá, D.C.',
      'Bolívar',
      'Boyacá',
      'Chocó',
      'Santander',
    ]);
  });

  test('counts a department once regardless of its municipalities', () => {
    expect(deriveDepartments(ROWS).filter((entry) => entry.code === '05')).toHaveLength(1);
  });
});

test.describe('filterMunicipalities', () => {
  const antioquia = indexMunicipalitiesOf(ROWS, '05');

  test('restricts to the chosen department and sorts alphabetically', () => {
    expect(names(filterMunicipalities(antioquia, ''))).toEqual([
      'Medellín',
      'Nariño',
      'Rionegro',
      'Santa Fe de Antioquia',
      'Santa Rosa de Osos',
    ]);
  });

  test('does not leak homonyms from other departments', () => {
    expect(
      filterMunicipalities(antioquia, 'rionegro').map((entry) => entry.municipality_id),
    ).toEqual([5]);
  });

  test('matches without accents or capitals', () => {
    expect(names(filterMunicipalities(antioquia, 'Medellin'))).toEqual(['Medellín']);
    expect(names(filterMunicipalities(antioquia, 'MEDELLÍN'))).toEqual(['Medellín']);
    expect(names(filterMunicipalities(antioquia, 'narino'))).toEqual(['Nariño']);
  });

  test('matches the start of any word of the name', () => {
    expect(names(filterMunicipalities(antioquia, 'osos'))).toEqual(['Santa Rosa de Osos']);
  });

  test('requires every word to prefix a word of the name', () => {
    expect(names(filterMunicipalities(antioquia, 'santa rosa'))).toEqual(['Santa Rosa de Osos']);
    expect(filterMunicipalities(antioquia, 'sta rosa')).toEqual([]);
  });

  test('ranks names starting with the query before word matches', () => {
    const indexed = indexMunicipalitiesOf(
      [row(1, 'La Santa', '05', 'Antioquia'), row(2, 'Santa Bárbara', '05', 'Antioquia')],
      '05',
    );
    expect(names(filterMunicipalities(indexed, 'santa'))).toEqual(['Santa Bárbara', 'La Santa']);
  });

  test('finds Bogotá with the punctuation of its name', () => {
    const bogota = indexMunicipalitiesOf(ROWS, '11');
    expect(names(filterMunicipalities(bogota, 'bogota dc'))).toEqual(['Bogotá, D.C.']);
  });

  test('returns nothing for an unknown name', () => {
    expect(filterMunicipalities(antioquia, 'zzz')).toEqual([]);
  });
});
