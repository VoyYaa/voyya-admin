import { expect, test, type Page } from '@playwright/test';
import {
  RATE_ROWS,
  configRow,
  fare,
  mockCompanies,
  mockServiceConfigs,
  openAs,
  type ServiceConfigMock,
} from '../fixtures/multiempresa-mock';
import { GUEST_STATE } from '../fixtures/session';

test.use({ storageState: GUEST_STATE });

test.beforeEach(async ({ page }) => {
  await openAs(page, 'platform_admin');
  await mockCompanies(page);
});

async function openDetail(page: Page, path = '/platform/rates/1/taxi'): Promise<ServiceConfigMock> {
  const mock = await mockServiceConfigs(page);
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  return mock;
}

async function startEditing(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Editar valores' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Tarifa base' })).toBeVisible();
}

async function review(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Revisar y guardar' }).click();
}

test.describe('rates list', () => {
  test('lists one row per municipality and service, unofficial first, with marks and coverage', async ({
    page,
  }) => {
    await mockServiceConfigs(page);
    await page.goto('/platform/rates');

    await expect(page.getByRole('heading', { name: 'Tarifas', level: 1 })).toBeVisible();
    await expect(page.getByText('1 sin tarifa oficial')).toBeVisible();

    const rows = page
      .getByRole('row')
      .filter({ has: page.getByRole('button', { name: /^Ver la tarifa/ }) });
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Villa Norte');
    await expect(rows.nth(0)).toContainText('Antioquia');
    await expect(rows.nth(0)).toContainText('No oficial');
    await expect(rows.nth(0)).toContainText('$8.000');
    await expect(rows.nth(0)).toContainText('Noct. 25 % · Fest. 25 %');
    await expect(rows.nth(0)).toContainText('2 activas');
    await expect(rows.nth(0)).not.toContainText('Cobertura pendiente');
    await expect(rows.nth(1)).toContainText('Puerto Sur');
    await expect(rows.nth(1)).toContainText('Oficial');
    await expect(rows.nth(1)).toContainText('1 activa');
    await expect(rows.nth(1)).toContainText('Cobertura pendiente');
  });

  test('filters by mark and offers a way back from an empty filter', async ({ page }) => {
    const first = RATE_ROWS[0];
    if (!first) throw new Error('missing fixture');
    await mockServiceConfigs(page, [first]);
    await page.goto('/platform/rates');
    await expect(page.getByText('Villa Norte')).toBeVisible();

    await page.getByLabel('Filtrar por marca').selectOption('official');
    await expect(page.getByText('Ninguna tarifa coincide con el filtro.')).toBeVisible();
    await page.getByRole('button', { name: 'Ver todas' }).click();
    await expect(page.getByText('Villa Norte')).toBeVisible();
    await expect(page.getByLabel('Filtrar por marca')).toHaveValue('all');
  });

  test('says when every fare is official', async ({ page }) => {
    await mockServiceConfigs(page, [configRow({ fare: fare({ is_official: true }) })]);
    await page.goto('/platform/rates');
    await expect(page.getByText('Todas las tarifas son oficiales')).toBeVisible();
  });

  test('shows the empty state when no municipality has active companies', async ({ page }) => {
    await mockServiceConfigs(page, []);
    await page.goto('/platform/rates');
    await expect(page.getByText('Aún no hay municipios con empresas activas.')).toBeVisible();
  });

  test('shows an error with a working retry', async ({ page }) => {
    const mock = await mockServiceConfigs(page);
    mock.failList({ status: 500, code: 'INTERNAL' });
    await page.goto('/platform/rates');
    await expect(page.getByText('No pudimos cargar las tarifas.')).toBeVisible();

    mock.failList(null);
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByText('Villa Norte')).toBeVisible();
  });

  test('keeps the previous list and warns when the connection drops', async ({ page, context }) => {
    await mockServiceConfigs(page);
    await page.goto('/platform/rates');
    await expect(page.getByText('Villa Norte')).toBeVisible();

    await context.setOffline(true);
    await expect(
      page.getByText('Sin conexión · la lista puede estar desactualizada.'),
    ).toBeVisible();
    await expect(page.getByText('Villa Norte')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Actualizar' })).toBeDisabled();
    await context.setOffline(false);
  });

  test('opens the detail from the row action', async ({ page }) => {
    await mockServiceConfigs(page);
    await page.goto('/platform/rates');
    await page.getByRole('button', { name: 'Ver la tarifa de Taxi en Villa Norte' }).click();
    await expect(page).toHaveURL(/\/platform\/rates\/1\/taxi$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Villa Norte · Taxi' })).toBeVisible();
  });

  test('is reachable from the platform sidebar', async ({ page }) => {
    await mockServiceConfigs(page);
    await page.goto('/platform/companies');
    await page.getByRole('link', { name: 'Tarifas' }).click();
    await expect(page).toHaveURL(/\/platform\/rates$/);
  });
});

test.describe('rate detail, read mode', () => {
  test('groups the fare and the nine parameters and explains the unofficial mark', async ({
    page,
  }) => {
    await openDetail(page);

    await expect(page.getByText('Esta tarifa es provisional.')).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 1 }).locator('..').getByText('No oficial'),
    ).toBeVisible();
    for (const heading of ['Tarifa', 'Recargos', 'Asignación', 'Reglas para el pasajero']) {
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    }
    const expected: Record<string, string> = {
      'Tarifa base': '$8.000',
      'Recargo nocturno': '25 %',
      'Radio de búsqueda': '5 km',
      'Radio de expansión': '8 km',
      'Tiempo de aceptación': '30 s',
      'Reintentos automáticos': '3',
      'Ventana de desempate': '2 h',
      'Vigencia de la ubicación': '10 min',
      'Velocidad promedio': '25 km/h',
      'Ventana de cancelación gratis': '5 min',
      'Cortesía de no-show': '5 min',
    };
    for (const [label, value] of Object.entries(expected)) {
      await expect(page.locator('dt', { hasText: label }).locator('xpath=..')).toContainText(value);
    }
    await expect(page.getByRole('spinbutton')).toHaveCount(0);
    await expect(
      page.getByText('Aplica a las solicitudes nuevas de las 2 empresas activas de Villa Norte.'),
    ).toBeVisible();
  });

  test('marks the values still coming from the platform default', async ({ page }) => {
    const mock = await mockServiceConfigs(page);
    const row = mock.rows[0];
    if (!row) throw new Error('missing fixture');
    row.operational_params = {
      ...row.operational_params,
      platform_default_keys: ['cancellation_window_min'],
    };
    await page.goto('/platform/rates/1/taxi');
    await expect(
      page
        .locator('dt', { hasText: 'Ventana de cancelación gratis' })
        .getByText('Valor por defecto de la plataforma'),
    ).toBeVisible();
  });

  test('shows the reference of an official fare without the provisional notice', async ({
    page,
  }) => {
    await openDetail(page, '/platform/rates/2/taxi');
    await expect(page.getByText('Referencia: Decreto 045 de 2026')).toBeVisible();
    await expect(page.getByText('Esta tarifa ya no existe.')).toHaveCount(0);
    await expect(page.getByText('Esta tarifa es provisional.')).toHaveCount(0);
    await expect(page.getByText('Cobertura pendiente').first()).toBeVisible();
  });

  test('says the fare is gone when the municipality or service does not exist', async ({
    page,
  }) => {
    await mockServiceConfigs(page);
    await page.goto('/platform/rates/99/taxi');
    await expect(page.getByText('Esta tarifa ya no existe.')).toBeVisible();
    await page.getByRole('button', { name: 'Volver a Tarifas' }).click();
    await expect(page).toHaveURL(/\/platform\/rates$/);

    await page.goto('/platform/rates/1/motorcycle');
    await expect(page.getByText('Esta tarifa ya no existe.')).toBeVisible();
  });

  test('shows an error with retry when the detail fails to load', async ({ page }) => {
    const mock = await mockServiceConfigs(page);
    mock.failList({ status: 500 });
    await page.goto('/platform/rates/1/taxi');
    await expect(page.getByText('No pudimos cargar la tarifa.')).toBeVisible();
    mock.failList(null);
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Villa Norte · Taxi' })).toBeVisible();
  });

  test('lists the initial version with its origin in the history', async ({ page }) => {
    await openDetail(page);
    const history = page.getByRole('region', { name: 'Historial de la tarifa' });
    await expect(history).toContainText('Vigente');
    await expect(history).toContainText('Versión inicial');
    await expect(history).toContainText('Migración de la tarifa de Cooperativa Norte');
    await expect(history).toContainText('Ana Ruiz');
    await expect(page.getByRole('region', { name: 'Historial de los parámetros' })).toBeVisible();
  });

  test('pages the history and shows only what changed between versions', async ({ page }) => {
    const mock = await mockServiceConfigs(page);
    const versions = Array.from({ length: 12 }, (_, index) =>
      fare({
        municipality_fare_id: 22 - index,
        base_fare: 9000 - index * 100,
        origin: index === 11 ? 'company_approval' : 'platform_edit',
        origin_company_name: index === 11 ? 'Taxis Horizonte' : null,
      }),
    );
    mock.seedFareHistory(versions);
    const row = mock.rows[0];
    if (!row) throw new Error('missing fixture');
    row.fare = versions[0] ?? null;
    await page.goto('/platform/rates/1/taxi');

    const history = page.getByRole('region', { name: 'Historial de la tarifa' });
    await expect(history.getByRole('listitem')).toHaveCount(10);
    await expect(history.getByRole('listitem').first()).toContainText('$8.900');
    await expect(history.getByRole('listitem').first()).toContainText('$9.000');
    await expect(history).not.toContainText('Versión inicial');

    await history.getByRole('button', { name: 'Ver versiones anteriores' }).click();
    await expect(history.getByRole('listitem')).toHaveCount(12);
    await expect(history.getByRole('listitem').last()).toContainText('Versión inicial');
    await expect(history.getByRole('listitem').last()).toContainText(
      'Creada al aprobar a Taxis Horizonte',
    );
    await expect(history.getByRole('button', { name: 'Ver versiones anteriores' })).toHaveCount(0);
  });
});

test.describe('rate detail, edit mode', () => {
  test('edits the fare after a confirmation that shows the difference and the scope', async ({
    page,
  }) => {
    const mock = await openDetail(page);
    await startEditing(page);
    await expect(page.getByRole('button', { name: 'Revisar y guardar' })).toBeDisabled();
    await expect(page.getByText('Vigente desde hoy, al guardar.')).toBeVisible();

    await page.getByRole('spinbutton', { name: 'Tarifa base' }).fill('9000');
    await expect(page.getByText('Modificado')).toBeVisible();
    await review(page);

    const dialog = page.getByRole('dialog', { name: '¿Guardar la nueva versión de la tarifa?' });
    await expect(dialog).toContainText('Villa Norte · Taxi');
    await expect(dialog).toContainText('$8.000');
    await expect(dialog).toContainText('$9.000');
    await expect(dialog).toContainText(
      'Aplica a las solicitudes nuevas de 2 empresas de Villa Norte.',
    );
    await expect(dialog).toContainText(
      'Los viajes ya pedidos y las cotizaciones vigentes conservan su total.',
    );
    expect(mock.fareBodies).toHaveLength(0);

    await dialog.getByRole('button', { name: 'Guardar versión' }).click();
    await expect(
      page.getByText('Tarifa actualizada · aplica a las solicitudes nuevas.'),
    ).toBeVisible();

    expect(mock.fareBodies).toEqual([
      {
        version: 11,
        base_fare: 9000,
        night_surcharge_pct: 25,
        holiday_surcharge_pct: 25,
        is_official: false,
        official_reference: null,
      },
    ]);
    expect(mock.paramBodies).toHaveLength(0);

    await expect(page.getByRole('button', { name: 'Editar valores' })).toBeVisible();
    await expect(page.locator('dt', { hasText: 'Tarifa base' }).locator('xpath=..')).toContainText(
      '$9.000',
    );
    const history = page.getByRole('region', { name: 'Historial de la tarifa' });
    await expect(history.getByRole('listitem')).toHaveCount(2);
    await expect(history.getByRole('listitem').first()).toContainText('$8.000');
  });

  test('saves only the parameters when no fare value changed', async ({ page }) => {
    const mock = await openDetail(page);
    await startEditing(page);
    await page.getByRole('spinbutton', { name: 'Tiempo de aceptación' }).fill('45');
    await review(page);
    const dialog = page.getByRole('dialog', { name: '¿Guardar la nueva versión de la tarifa?' });
    await expect(dialog).toContainText('30 s');
    await expect(dialog).toContainText('45 s');
    await expect(dialog).not.toContainText('Marca');
    await dialog.getByRole('button', { name: 'Guardar versión' }).click();
    await expect(page.getByText('Tarifa actualizada')).toBeVisible();
    expect(mock.fareBodies).toHaveLength(0);
    expect(mock.paramBodies).toHaveLength(1);
    expect(mock.paramBodies[0]).toMatchObject({ version: 21, acceptance_timeout_sec: 45 });
    expect(Object.keys(mock.paramBodies[0] ?? {})).toHaveLength(10);
  });

  test('marks an unofficial fare as official without changing a value', async ({ page }) => {
    const mock = await openDetail(page);
    await startEditing(page);
    await expect(page.getByRole('radio', { name: /^No oficial/ })).toBeChecked();
    await page.getByRole('radio', { name: /^Oficial/ }).check();
    await page.getByLabel('Referencia del acto (opcional)').fill('Decreto 045 de 2026');
    await review(page);

    const dialog = page.getByRole('dialog', { name: '¿Guardar la nueva versión de la tarifa?' });
    await expect(dialog).toContainText('Este cambio no modifica los valores.');
    await expect(dialog).toContainText('No oficial');
    await expect(dialog).toContainText('Oficial · Decreto 045 de 2026');
    await dialog.getByRole('button', { name: 'Guardar versión' }).click();

    await expect(page.getByText('Marcada como oficial.')).toBeVisible();
    expect(mock.fareBodies[0]).toMatchObject({
      is_official: true,
      official_reference: 'Decreto 045 de 2026',
      base_fare: 8000,
    });
    await expect(page.getByText('Esta tarifa es provisional.')).toHaveCount(0);
    await expect(page.getByText('Referencia: Decreto 045 de 2026')).toBeVisible();
  });

  test('does not inherit the official mark when values of an official fare change', async ({
    page,
  }) => {
    const mock = await openDetail(page, '/platform/rates/2/taxi');
    await startEditing(page);
    await expect(page.getByRole('radio', { name: /^Oficial/ })).toBeChecked();
    await expect(page.getByLabel('Referencia del acto (opcional)')).toHaveValue(
      'Decreto 045 de 2026',
    );

    await page.getByRole('spinbutton', { name: 'Tarifa base' }).fill('10000');
    await expect(page.getByRole('radio', { name: /^No oficial/ })).toBeChecked();
    await expect(page.getByLabel('Referencia del acto (opcional)')).toHaveCount(0);
    await review(page);
    const dialog = page.getByRole('dialog', { name: '¿Guardar la nueva versión de la tarifa?' });
    await expect(dialog).toContainText('Oficial · Decreto 045 de 2026');
    await dialog.getByRole('button', { name: 'Guardar versión' }).click();
    await expect(page.getByText('Tarifa actualizada')).toBeVisible();
    expect(mock.fareBodies[0]).toMatchObject({
      is_official: false,
      official_reference: null,
      base_fare: 10000,
    });
  });

  test('keeps the mark official when the admin affirms it again', async ({ page }) => {
    const mock = await openDetail(page, '/platform/rates/2/taxi');
    await startEditing(page);
    await page.getByRole('spinbutton', { name: 'Tarifa base' }).fill('10000');
    await page.getByRole('radio', { name: /^Oficial/ }).check();
    await page.getByLabel('Referencia del acto (opcional)').fill('Decreto 099 de 2026');
    await review(page);
    await page
      .getByRole('dialog', { name: '¿Guardar la nueva versión de la tarifa?' })
      .getByRole('button', { name: 'Guardar versión' })
      .click();
    await expect(page.getByText('Tarifa actualizada')).toBeVisible();
    expect(mock.fareBodies[0]).toMatchObject({
      is_official: true,
      official_reference: 'Decreto 099 de 2026',
    });
  });

  test('blocks out-of-range values in the field and moves the focus there', async ({ page }) => {
    const mock = await openDetail(page);
    await startEditing(page);
    const input = page.getByRole('spinbutton', { name: 'Tarifa base' });
    await input.fill('500');
    await review(page);

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page.getByText('Este valor está fuera del rango permitido ($1.000 a $1.000.000).'),
    ).toBeVisible();
    await expect(input).toBeFocused();
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(mock.fareBodies).toHaveLength(0);

    await input.fill('9000');
    await expect(page.getByText('fuera del rango permitido')).toHaveCount(0);
  });

  test('requires the search radius not to exceed the expansion radius', async ({ page }) => {
    await openDetail(page);
    await startEditing(page);
    await page.getByRole('spinbutton', { name: 'Radio de búsqueda' }).fill('9');
    await review(page);
    await expect(
      page.getByText('El radio de búsqueda no puede superar el radio de expansión.'),
    ).toBeVisible();
  });

  test('ignores the mouse wheel on number fields', async ({ page }) => {
    await openDetail(page);
    await startEditing(page);
    const input = page.getByRole('spinbutton', { name: 'Tarifa base' });
    await input.focus();
    await input.hover();
    await page.mouse.wheel(0, -200);
    await expect(input).toHaveValue('8000');
    await expect(input).not.toBeFocused();
  });

  test('discards changes, asking first when more than one field changed', async ({ page }) => {
    await openDetail(page);
    await startEditing(page);
    await page.getByRole('spinbutton', { name: 'Tarifa base' }).fill('9000');
    await page.getByRole('button', { name: 'Descartar cambios' }).click();
    await expect(page.getByRole('button', { name: 'Editar valores' })).toBeVisible();

    await startEditing(page);
    await page.getByRole('spinbutton', { name: 'Tarifa base' }).fill('9000');
    await page.getByRole('spinbutton', { name: 'Tiempo de aceptación' }).fill('40');
    await page.getByRole('button', { name: 'Descartar cambios' }).click();
    const dialog = page.getByRole('dialog', { name: '¿Descartar los cambios?' });
    await dialog.getByRole('button', { name: 'Seguir editando' }).click();
    await expect(page.getByRole('spinbutton', { name: 'Tarifa base' })).toHaveValue('9000');
    await page.getByRole('button', { name: 'Descartar cambios' }).click();
    await page
      .getByRole('dialog', { name: '¿Descartar los cambios?' })
      .getByRole('button', { name: 'Descartar cambios' })
      .click();
    await expect(page.getByRole('button', { name: 'Editar valores' })).toBeVisible();
    await expect(page.locator('dt', { hasText: 'Tarifa base' }).locator('xpath=..')).toContainText(
      '$8.000',
    );
  });

  test('asks before leaving with unsaved changes', async ({ page }) => {
    await openDetail(page);
    await startEditing(page);
    await page.getByRole('spinbutton', { name: 'Tarifa base' }).fill('9000');
    await page.getByRole('link', { name: 'Volver a Tarifas' }).click();

    const dialog = page.getByRole('dialog', { name: '¿Salir sin guardar?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Seguir editando' }).click();
    await expect(page).toHaveURL(/\/platform\/rates\/1\/taxi$/);

    await page.getByRole('link', { name: 'Volver a Tarifas' }).click();
    await page
      .getByRole('dialog', { name: '¿Salir sin guardar?' })
      .getByRole('button', { name: 'Salir' })
      .click();
    await expect(page).toHaveURL(/\/platform\/rates$/);
  });

  test('leaves freely when nothing changed', async ({ page }) => {
    await openDetail(page);
    await startEditing(page);
    await page.getByRole('link', { name: 'Volver a Tarifas' }).click();
    await expect(page).toHaveURL(/\/platform\/rates$/);
  });

  test('cannot save without a connection and keeps the draft', async ({ page, context }) => {
    await openDetail(page);
    await startEditing(page);
    await page.getByRole('spinbutton', { name: 'Tarifa base' }).fill('9000');
    await context.setOffline(true);
    await expect(page.getByText('Sin conexión · no se puede guardar ahora.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Revisar y guardar' })).toBeDisabled();
    await context.setOffline(false);
    await expect(page.getByRole('button', { name: 'Revisar y guardar' })).toBeEnabled();
    await expect(page.getByRole('spinbutton', { name: 'Tarifa base' })).toHaveValue('9000');
  });

  test('keeps the draft and says so when the save fails', async ({ page }) => {
    const mock = await openDetail(page);
    mock.failNextFarePut({ status: 500, code: 'INTERNAL' });
    await startEditing(page);
    await page.getByRole('spinbutton', { name: 'Tarifa base' }).fill('9000');
    await review(page);
    await page.getByRole('button', { name: 'Guardar versión' }).click();
    await expect(
      page.getByText('No pudimos guardar los cambios. Inténtalo de nuevo.'),
    ).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'Tarifa base' })).toHaveValue('9000');
  });

  test('shows the server range error on the field', async ({ page }) => {
    const mock = await openDetail(page);
    mock.failNextFarePut({
      status: 400,
      code: 'SETTINGS_OUT_OF_RANGE',
      message: 'fuera de rango',
      extra: { field: 'base_fare' },
    });
    await startEditing(page);
    await page.getByRole('spinbutton', { name: 'Tarifa base' }).fill('9000');
    await review(page);
    await page.getByRole('button', { name: 'Guardar versión' }).click();
    await expect(page.getByText('Este valor está fuera del rango permitido.')).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'Tarifa base' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  test('reports a partial save when the parameters fail after the fare was saved', async ({
    page,
  }) => {
    const mock = await openDetail(page);
    mock.failNextParamsPut({ status: 500, code: 'INTERNAL' });
    await startEditing(page);
    await page.getByRole('spinbutton', { name: 'Tarifa base' }).fill('9000');
    await page.getByRole('spinbutton', { name: 'Tiempo de aceptación' }).fill('45');
    await review(page);
    await page.getByRole('button', { name: 'Guardar versión' }).click();

    await expect(page.getByText(/Se guardó una parte de los cambios/)).toBeVisible();
    expect(mock.fareBodies).toHaveLength(1);
    await expect(page.getByRole('spinbutton', { name: 'Tiempo de aceptación' })).toHaveValue('45');
    await expect(page.getByRole('spinbutton', { name: 'Tarifa base' })).toHaveValue('9000');
    await expect(page.getByText('Modificado')).toHaveCount(1);
  });

  test('has no fare fields when the municipality has no fare yet', async ({ page }) => {
    await mockServiceConfigs(page, [configRow({ fare: null })]);
    await page.goto('/platform/rates/1/taxi');
    await expect(page.getByText(/todavía no tiene tarifa/)).toBeVisible();
    await page.getByRole('button', { name: 'Editar valores' }).click();
    await expect(page.getByRole('spinbutton', { name: 'Tarifa base' })).toHaveCount(0);
    await expect(page.getByRole('spinbutton', { name: 'Radio de búsqueda' })).toBeVisible();
    await expect(page.getByText('Marca de esta versión')).toHaveCount(0);
  });
});

test.describe('rate detail, concurrent edits', () => {
  test('shows the comparison and never overwrites without confirmation', async ({ page }) => {
    const mock = await openDetail(page);
    await startEditing(page);
    await page.getByRole('spinbutton', { name: 'Tarifa base' }).fill('9000');
    mock.changeUnderneath({ base_fare: 8500 });

    await review(page);
    await page.getByRole('button', { name: 'Guardar versión' }).click();

    const conflict = page.getByRole('dialog', { name: 'La tarifa cambió mientras editabas' });
    await expect(conflict).toBeVisible();
    await expect(conflict).toContainText(
      'Alguien más cambió esta tarifa mientras editabas (versión 12, por Luis Gómez).',
    );
    await expect(conflict.getByRole('columnheader', { name: 'Valores actuales' })).toBeVisible();
    await expect(conflict.getByRole('columnheader', { name: 'Tus cambios' })).toBeVisible();
    await expect(conflict.getByRole('row', { name: /Tarifa base/ })).toContainText('$8.500');
    await expect(conflict.getByRole('row', { name: /Tarifa base/ })).toContainText('$9.000');
    expect(mock.fareBodies).toHaveLength(1);

    await conflict.getByRole('button', { name: 'Usar mis valores' }).click();
    const confirm = page.getByRole('dialog', { name: '¿Guardar la nueva versión de la tarifa?' });
    await expect(confirm).toContainText('$8.500');
    await confirm.getByRole('button', { name: 'Guardar versión' }).click();

    await expect(page.getByText('Tarifa actualizada')).toBeVisible();
    expect(mock.fareBodies).toHaveLength(2);
    expect(mock.fareBodies[1]).toMatchObject({ version: 12, base_fare: 9000 });
  });

  test('lets the admin discard their own changes after a conflict', async ({ page }) => {
    const mock = await openDetail(page);
    await startEditing(page);
    await page.getByRole('spinbutton', { name: 'Tarifa base' }).fill('9000');
    mock.changeUnderneath({ base_fare: 8500 });
    await review(page);
    await page.getByRole('button', { name: 'Guardar versión' }).click();

    await page
      .getByRole('dialog', { name: 'La tarifa cambió mientras editabas' })
      .getByRole('button', { name: 'Descartar mis cambios' })
      .click();
    await expect(page.getByRole('button', { name: 'Editar valores' })).toBeVisible();
    await expect(page.locator('dt', { hasText: 'Tarifa base' }).locator('xpath=..')).toContainText(
      '$8.500',
    );
    expect(mock.fareBodies).toHaveLength(1);
  });

  test('keeps the conflict visible and reopenable after closing the comparison', async ({
    page,
  }) => {
    const mock = await openDetail(page);
    await startEditing(page);
    await page.getByRole('spinbutton', { name: 'Tarifa base' }).fill('9000');
    mock.changeUnderneath({ base_fare: 8500 });
    await review(page);
    await page.getByRole('button', { name: 'Guardar versión' }).click();
    const conflict = page.getByRole('dialog', { name: 'La tarifa cambió mientras editabas' });
    await expect(conflict).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(conflict).toHaveCount(0);
    await expect(
      page.getByRole('alert').filter({ hasText: 'Alguien más cambió esta tarifa' }),
    ).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'Tarifa base' })).toHaveValue('9000');
    await page.getByRole('button', { name: 'Comparar con mis cambios' }).click();
    await expect(conflict).toBeVisible();
  });
});
