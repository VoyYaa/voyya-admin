import { expect, test } from '@playwright/test';
import {
  COMPANY_ROWS,
  companyDetail,
  companyRow,
  fare,
  mockCompanies,
  mockServiceConfigs,
  openAs,
} from '../fixtures/multiempresa-mock';
import { GUEST_STATE } from '../fixtures/session';

test.use({ storageState: GUEST_STATE });

test.beforeEach(async ({ page }) => {
  await openAs(page, 'platform_admin');
});

test.describe('companies list', () => {
  test('shows the service column and flags pending coverage instead of "ya cubierto"', async ({
    page,
  }) => {
    await mockCompanies(page);
    await page.goto('/platform/companies');

    await expect(page.getByRole('columnheader', { name: 'Servicio' })).toBeVisible();
    const covered = page.getByRole('row', { name: /Taxis Horizonte S\.A\.S\./ });
    await expect(covered).toContainText('Taxi');
    await expect(covered).not.toContainText('Cobertura pendiente');
    await expect(covered).toContainText('Taxis Horizonte');
    const pending = page.getByRole('row', { name: /Movilidad del Puerto/ });
    await expect(pending).toContainText('Cobertura pendiente');
    await expect(pending).toContainText('Sin tope');
    await expect(page.getByText('Ya cubierto')).toHaveCount(0);
  });

  test('filters by municipality through the API and keeps every option available', async ({
    page,
  }) => {
    const mock = await mockCompanies(page);
    await page.goto('/platform/companies');
    const filter = page.getByLabel('Filtrar por municipio');
    await expect(filter.locator('option')).toHaveText(['Todos', 'Puerto Sur', 'Villa Norte']);

    await filter.selectOption({ label: 'Puerto Sur' });
    await expect(page.getByRole('row', { name: /Movilidad del Puerto/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /Taxis Horizonte S\.A\.S\./ })).toHaveCount(0);
    expect(mock.listQueries.at(-1)?.get('municipality_id')).toBe('2');
    await expect(filter.locator('option')).toHaveText(['Todos', 'Puerto Sur', 'Villa Norte']);

    await filter.selectOption({ label: 'Todos' });
    await expect(page.getByRole('row', { name: /Taxis Horizonte S\.A\.S\./ })).toBeVisible();
    expect(mock.listQueries.at(-1)?.has('municipality_id')).toBe(false);
  });

  test('lists only the municipalities waiting for coverage', async ({ page }) => {
    await mockCompanies(page);
    await page.goto('/platform/companies');
    await page.getByLabel('Filtrar por cobertura').selectOption('pending');
    await expect(page.getByRole('row', { name: /Movilidad del Puerto/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /Taxis Horizonte S\.A\.S\./ })).toHaveCount(0);
  });

  test('celebrates when no municipality waits for coverage', async ({ page }) => {
    await mockCompanies(page, [companyRow()]);
    await page.goto('/platform/companies');
    await page.getByLabel('Filtrar por cobertura').selectOption('pending');
    await expect(page.getByText('Ningún municipio está esperando su cobertura.')).toBeVisible();
  });

  test('offers to clear filters when they leave nothing', async ({ page }) => {
    await mockCompanies(page, [COMPANY_ROWS[0] ?? companyRow()]);
    await page.goto('/platform/companies');
    await expect(page.getByLabel('Filtrar por municipio').locator('option')).toHaveCount(2);
    await page.getByLabel('Filtrar por municipio').selectOption({ label: 'Villa Norte' });
    await page.getByLabel('Filtrar por cobertura').selectOption('pending');
    await expect(page.getByText('Ninguna empresa coincide con los filtros.')).toBeVisible();
    await page.getByRole('button', { name: 'Quitar filtros' }).click();
    await expect(page.getByRole('row', { name: /Taxis Horizonte S\.A\.S\./ })).toBeVisible();
    await expect(page.getByLabel('Filtrar por cobertura')).toHaveValue('all');
  });
});

test.describe('company detail and approval', () => {
  test('shows service, public name, municipality and the neutral list of companies already operating', async ({
    page,
  }) => {
    await mockCompanies(page);
    await page.goto('/platform/companies/7');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Taxis Horizonte S.A.S.' }),
    ).toBeVisible();
    const data = page.getByRole('region', { name: 'Datos de la empresa' });
    await expect(data).toContainText('Villa Norte, Antioquia');
    await expect(data).toContainText('Taxi');
    await expect(data).toContainText('Taxis Horizonte');
    await expect(data.getByText('Ya operan 2 empresas en este municipio:')).toBeVisible();
    await expect(
      data.getByRole('listitem').filter({ hasText: 'Cooperativa Norte de Transporte' }),
    ).toBeVisible();
    await expect(
      data.getByRole('listitem').filter({ hasText: 'Transportes del Sur' }),
    ).toBeVisible();
    await expect(data.getByRole('alert')).toHaveCount(0);
    await expect(data).not.toContainText('Municipio ya cubierto');
    await expect(data).not.toContainText('limitación');
  });

  test('says the public name falls back to the legal name', async ({ page }) => {
    await mockCompanies(page, COMPANY_ROWS, companyDetail({ public_name: null }));
    await page.goto('/platform/companies/7');
    await expect(page.getByText('Igual que la razón social')).toBeVisible();
  });

  test('shows the commission and a link to edit it once the company is active', async ({
    page,
  }) => {
    await mockCompanies(
      page,
      COMPANY_ROWS,
      companyDetail({
        status: 'active',
        commission: {
          company_commission_id: 5,
          company_id: 7,
          commission_pct: 8,
          origin: 'company_approval',
          valid_from: '2026-10-01T15:30:00.000Z',
          valid_to: null,
          created_by: null,
        },
      }),
    );
    await page.goto('/platform/companies/7');
    const data = page.getByRole('region', { name: 'Datos de la empresa' });
    await expect(data).toContainText('8 %');
    await data.getByRole('link', { name: 'Editar comisión' }).click();
    await expect(page).toHaveURL(/\/platform\/commissions$/);
  });

  test('approves a second company with a mandatory commission and no acknowledgement', async ({
    page,
  }) => {
    const mock = await mockCompanies(page);
    await page.goto('/platform/companies/7');
    await page.getByRole('button', { name: 'Aprobar empresa' }).click();

    await expect(page.getByLabel('Entiendo la limitación')).toHaveCount(0);
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    await expect(page.getByLabel('Tarifa base inicial')).toHaveCount(0);
    const fareRow = page.getByText('Tarifa del municipio · Taxi').locator('..');
    await expect(fareRow).toContainText('$8.000');
    await expect(fareRow).toContainText('No oficial');
    await expect(fareRow).toContainText('No cambia al aprobar.');
    await expect(fareRow.getByRole('link', { name: 'Ver tarifa' })).toHaveAttribute(
      'href',
      '/platform/rates/1/taxi',
    );

    const submit = page.getByRole('button', { name: 'Aprobar empresa' }).last();
    await expect(submit).toBeDisabled();
    const commission = page.getByLabel('Comisión de la empresa (%)');
    await commission.fill('60');
    await expect(page.getByText('fuera del rango permitido (0 a 50 %)')).toBeVisible();
    await expect(submit).toBeDisabled();
    await commission.fill('8');
    await expect(submit).toBeEnabled();
    await submit.click();

    const dialog = page.getByRole('dialog', { name: '¿Confirmar aprobación?' });
    await expect(dialog).toContainText(
      'Aprobar habilita a Taxis Horizonte S.A.S. para registrar conductores y recibir viajes de Taxi.',
    );
    await expect(dialog).toContainText('Compartirá Villa Norte con 2 empresas activas.');
    await expect(dialog).not.toContainText('Aún no recibirá viajes');
    await dialog.getByRole('button', { name: 'Aprobar empresa' }).click();

    await expect(
      page.getByText('Empresa aprobada · ya puede registrar conductores.'),
    ).toBeVisible();
    expect(mock.approveBodies).toEqual([{ commission_pct: 8 }]);
  });

  test('asks for the initial fare only when the municipality has none, and says coverage is pending', async ({
    page,
  }) => {
    const mock = await mockCompanies(
      page,
      COMPANY_ROWS,
      companyDetail({
        company_id: 8,
        municipality_id: 2,
        municipality_name: 'Puerto Sur',
        municipality_department: 'Bolívar',
        municipality_coverage_active: false,
        coverage_pending_since: '2026-09-20T10:00:00.000Z',
        municipality_active_companies: [],
        municipality_fares: [{ service_type: 'taxi', fare: null }],
      }),
      false,
    );
    await page.goto('/platform/companies/8');

    const data = page.getByRole('region', { name: 'Datos de la empresa' });
    await expect(
      data.getByText(
        'Aprobar la empresa no habilita pedir taxis en este municipio: falta definir el polígono de cobertura.',
      ),
    ).toBeVisible();
    await expect(
      data.getByText('Cobertura pendiente desde el 20 de septiembre de 2026'),
    ).toBeVisible();
    await expect(data.getByText('Ya operan')).toHaveCount(0);

    await page.getByRole('button', { name: 'Aprobar empresa' }).click();
    await expect(
      page.getByText(
        'El municipio todavía no tiene tarifa. Se crea como «No oficial» y la puedes ajustar en Tarifas.',
      ),
    ).toBeVisible();
    const submit = page.getByRole('button', { name: 'Aprobar empresa' }).last();
    await page.getByLabel('Comisión de la empresa (%)').fill('7.5');
    await expect(submit).toBeDisabled();
    await page.getByLabel('Tarifa base inicial').fill('500');
    await expect(page.getByText('fuera del rango permitido ($1.000 a $1.000.000)')).toBeVisible();
    await expect(submit).toBeDisabled();
    await page.getByLabel('Tarifa base inicial').fill('999');
    await expect(page.getByText('fuera del rango permitido ($1.000 a $1.000.000)')).toBeVisible();
    await expect(submit).toBeDisabled();
    await page.getByLabel('Tarifa base inicial').fill('9600');
    await expect(page.getByText('Debe ser múltiplo')).toHaveCount(0);
    await expect(submit).toBeEnabled();
    await page.getByLabel('Tarifa base inicial').fill('9500');
    await submit.click();

    const dialog = page.getByRole('dialog', { name: '¿Confirmar aprobación?' });
    await expect(dialog).toContainText(
      'Aún no recibirá viajes: Puerto Sur no tiene cobertura habilitada.',
    );
    await expect(dialog).not.toContainText('Compartirá');
    await dialog.getByRole('button', { name: 'Aprobar empresa' }).click();

    await expect(
      page.getByText('Empresa aprobada · cobertura pendiente en Puerto Sur.'),
    ).toBeVisible();
    expect(mock.approveBodies).toEqual([
      { initial_fare: { base_fare: 9500 }, commission_pct: 7.5 },
    ]);
  });

  test('explains that the declared service is not active when the server refuses', async ({
    page,
  }) => {
    const mock = await mockCompanies(page);
    mock.failApprove({ status: 409, code: 'SERVICE_NOT_AVAILABLE', message: 'inactivo' });
    await page.goto('/platform/companies/7');
    await page.getByRole('button', { name: 'Aprobar empresa' }).click();
    await page.getByLabel('Comisión de la empresa (%)').fill('8');
    await page.getByRole('button', { name: 'Aprobar empresa' }).last().click();
    await page
      .getByRole('dialog', { name: '¿Confirmar aprobación?' })
      .getByRole('button', { name: 'Aprobar empresa' })
      .click();
    await expect(
      page.getByText('No se puede aprobar: el servicio que declaró (Taxi) no está activo.'),
    ).toBeVisible();
  });

  test('links the existing fare of the municipality to its detail', async ({ page }) => {
    await mockCompanies(
      page,
      COMPANY_ROWS,
      companyDetail({
        municipality_fares: [{ service_type: 'taxi', fare: fare({ is_official: true }) }],
      }),
    );
    await mockServiceConfigs(page);
    await page.goto('/platform/companies/7');
    await page.getByRole('button', { name: 'Aprobar empresa' }).click();
    const fareRow = page.getByText('Tarifa del municipio · Taxi').locator('..');
    await expect(fareRow).toContainText('Oficial');
    await fareRow.getByRole('link', { name: 'Ver tarifa' }).click();
    await expect(page).toHaveURL(/\/platform\/rates\/1\/taxi$/);
  });
});
