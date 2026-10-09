import { expect, test } from '@playwright/test';
import { mockCommissions, mockCompanies, openAs } from '../fixtures/multiempresa-mock';
import { GUEST_STATE } from '../fixtures/session';

test.use({ storageState: GUEST_STATE });

test.beforeEach(async ({ page }) => {
  await openAs(page, 'platform_admin');
  await mockCompanies(page);
});

function drawer(page: import('@playwright/test').Page) {
  return page.getByRole('dialog', { name: /^Comisión de / });
}

test.describe('commissions list', () => {
  test('lists the active companies with their current commission and author', async ({ page }) => {
    await mockCommissions(page);
    await page.goto('/platform/commissions');

    await expect(page.getByRole('heading', { name: 'Comisiones', level: 1 })).toBeVisible();
    await expect(page.getByText('2 empresas habilitadas')).toBeVisible();
    const first = page.getByRole('row', { name: /Cooperativa Norte/ });
    await expect(first).toContainText('Cooperativa Norte de Transporte');
    await expect(first).toContainText('Villa Norte');
    await expect(first).toContainText('8 %');
    await expect(first).toContainText('Ana Ruiz');
    await expect(page.getByRole('row', { name: /Transportes del Sur/ })).toContainText(
      'Sin comisión',
    );
  });

  test('shows the empty state', async ({ page }) => {
    await mockCommissions(page, []);
    await page.goto('/platform/commissions');
    await expect(page.getByText('Aún no hay empresas habilitadas.')).toBeVisible();
  });

  test('shows an error with a working retry', async ({ page }) => {
    const mock = await mockCommissions(page);
    mock.failList({ status: 500 });
    await page.goto('/platform/commissions');
    await expect(page.getByText('No pudimos cargar las comisiones.')).toBeVisible();
    mock.failList(null);
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByText('Cooperativa Norte', { exact: true })).toBeVisible();
  });

  test('keeps the list and warns when offline', async ({ page, context }) => {
    await mockCommissions(page);
    await page.goto('/platform/commissions');
    await expect(page.getByText('Cooperativa Norte', { exact: true })).toBeVisible();
    await context.setOffline(true);
    await expect(
      page.getByText('Sin conexión · la lista puede estar desactualizada.'),
    ).toBeVisible();
    await expect(page.getByText('Cooperativa Norte', { exact: true })).toBeVisible();
    await context.setOffline(false);
  });

  test('is reachable from the platform sidebar', async ({ page }) => {
    await mockCommissions(page);
    await page.goto('/platform/companies');
    await page.getByRole('link', { name: 'Comisiones' }).click();
    await expect(page).toHaveURL(/\/platform\/commissions$/);
  });
});

test.describe('commission editing', () => {
  test('edits after a confirmation that states the scope, then updates the row', async ({
    page,
  }) => {
    const mock = await mockCommissions(page);
    await page.goto('/platform/commissions');
    await page.getByRole('button', { name: 'Editar la comisión de Cooperativa Norte' }).click();

    const panel = drawer(page);
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Villa Norte');
    await expect(panel).toContainText('Comisión actual: 8 %');
    await expect(panel).toContainText('Aplica a los viajes que se acepten desde ahora.');
    await expect(panel.getByRole('region', { name: 'Historial' })).toContainText('Ana Ruiz');
    await expect(panel.getByRole('button', { name: 'Revisar y guardar' })).toBeDisabled();

    await panel.getByLabel('Comisión por viaje (%)').fill('10');
    await panel.getByRole('button', { name: 'Revisar y guardar' }).click();

    const confirm = page.getByRole('dialog', {
      name: '¿Cambiar la comisión de Cooperativa Norte?',
    });
    await expect(confirm).toContainText(
      'Cooperativa Norte: 8 % → 10 %. Aplica a los viajes que se acepten desde ahora.',
    );
    expect(mock.putBodies).toHaveLength(0);
    await confirm.getByRole('button', { name: 'Guardar comisión' }).click();

    await expect(page.getByText('Comisión de Cooperativa Norte actualizada.')).toBeVisible();
    expect(mock.putBodies).toEqual([{ version: 31, commission_pct: 10 }]);
    await expect(panel).toHaveCount(0);
    await expect(page.getByRole('row', { name: /Cooperativa Norte/ })).toContainText('10 %');
  });

  test('sends a null version for a company that never had a commission', async ({ page }) => {
    const mock = await mockCommissions(page);
    await page.goto('/platform/commissions');
    await page.getByRole('button', { name: 'Editar la comisión de Transportes del Sur' }).click();
    await expect(drawer(page)).toContainText('Esta empresa todavía no tiene comisión.');
    await drawer(page).getByLabel('Comisión por viaje (%)').fill('6.5');
    await drawer(page).getByRole('button', { name: 'Revisar y guardar' }).click();
    await page
      .getByRole('dialog', { name: '¿Cambiar la comisión de Transportes del Sur?' })
      .getByRole('button', { name: 'Guardar comisión' })
      .click();
    await expect(page.getByText('Comisión de Transportes del Sur actualizada.')).toBeVisible();
    expect(mock.putBodies).toEqual([{ version: null, commission_pct: 6.5 }]);
  });

  test('blocks values outside 0 to 50 and moves the focus to the field', async ({ page }) => {
    const mock = await mockCommissions(page);
    await page.goto('/platform/commissions');
    await page.getByRole('button', { name: 'Editar la comisión de Cooperativa Norte' }).click();
    const input = drawer(page).getByLabel('Comisión por viaje (%)');
    await input.fill('51');
    await drawer(page).getByRole('button', { name: 'Revisar y guardar' }).click();
    await expect(
      drawer(page).getByText('Este valor está fuera del rango permitido (0 a 50 %).'),
    ).toBeVisible();
    await expect(input).toBeFocused();
    expect(mock.putBodies).toHaveLength(0);
  });

  test('explains a concurrent change and keeps what the admin typed', async ({ page }) => {
    const mock = await mockCommissions(page);
    await page.goto('/platform/commissions');
    await page.getByRole('button', { name: 'Editar la comisión de Cooperativa Norte' }).click();
    const input = drawer(page).getByLabel('Comisión por viaje (%)');
    await input.fill('10');

    const row = mock.rows[0];
    if (!row?.commission) throw new Error('missing fixture');
    row.commission = { ...row.commission, company_commission_id: 32, commission_pct: 9 };

    await drawer(page).getByRole('button', { name: 'Revisar y guardar' }).click();
    await page
      .getByRole('dialog', { name: '¿Cambiar la comisión de Cooperativa Norte?' })
      .getByRole('button', { name: 'Guardar comisión' })
      .click();

    await expect(
      drawer(page).getByText(
        /Alguien más cambió esta comisión mientras editabas \(versión 32, por Luis Gómez\)/,
      ),
    ).toBeVisible();
    await expect(input).toHaveValue('10');
    await expect(drawer(page)).toContainText('Comisión actual: 9 %');
    expect(mock.putBodies).toHaveLength(1);
  });

  test('keeps the draft when the save fails', async ({ page }) => {
    const mock = await mockCommissions(page);
    mock.failNextPut({ status: 500 });
    await page.goto('/platform/commissions');
    await page.getByRole('button', { name: 'Editar la comisión de Cooperativa Norte' }).click();
    await drawer(page).getByLabel('Comisión por viaje (%)').fill('10');
    await drawer(page).getByRole('button', { name: 'Revisar y guardar' }).click();
    await page.getByRole('button', { name: 'Guardar comisión' }).click();
    await expect(
      drawer(page).getByText('No pudimos guardar la comisión. Inténtalo de nuevo.'),
    ).toBeVisible();
    await expect(drawer(page).getByLabel('Comisión por viaje (%)')).toHaveValue('10');
  });

  test('cannot save without a connection', async ({ page, context }) => {
    await mockCommissions(page);
    await page.goto('/platform/commissions');
    await page.getByRole('button', { name: 'Editar la comisión de Cooperativa Norte' }).click();
    await drawer(page).getByLabel('Comisión por viaje (%)').fill('10');
    await context.setOffline(true);
    await expect(drawer(page).getByText('Sin conexión · no se puede guardar ahora.')).toBeVisible();
    await expect(drawer(page).getByRole('button', { name: 'Revisar y guardar' })).toBeDisabled();
    await context.setOffline(false);
  });

  test('keeps the keyboard inside the drawer and returns the focus to its trigger', async ({
    page,
  }) => {
    await mockCommissions(page);
    await page.goto('/platform/commissions');
    const trigger = page.getByRole('button', { name: 'Editar la comisión de Cooperativa Norte' });
    await trigger.click();
    await expect(drawer(page)).toBeVisible();
    for (let step = 0; step < 8; step += 1) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() =>
        Boolean(document.activeElement?.closest('[role="dialog"]')),
      );
      expect(inside, `Tab ${step + 1} salió del cajón`).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(drawer(page)).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});
