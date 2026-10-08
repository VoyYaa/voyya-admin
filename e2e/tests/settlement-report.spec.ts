import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { addDays, settlementToday } from '@voyyaa/shared';
import { ADMIN_AUTH_FILE, PLATFORM_ADMIN_AUTH_FILE } from '../env';
import { mockQueueRows } from '../fixtures/queue-mock';
import {
  currentWeekRange,
  lastWeekRange,
  mockOpsDrivers,
  mockSettlement,
  settlementRow,
  type SettlementMock,
} from '../fixtures/settlement-mock';

test.use({ storageState: ADMIN_AUTH_FILE });

async function openReport(
  page: Page,
  rows?: Parameters<typeof mockSettlement>[1],
): Promise<SettlementMock> {
  await mockOpsDrivers(page);
  const mock = await mockSettlement(page, rows);
  await page.goto('/reports/settlement');
  return mock;
}

function carlosRow(page: Page) {
  return page.getByRole('row', { name: /Carlos Mejía/ });
}

test.describe('settlement report', () => {
  test('is reachable from the sidebar and opens on last week with totals', async ({ page }) => {
    await mockOpsDrivers(page);
    const mock = await mockSettlement(page);
    await page.goto('/ops/queue');
    await page.getByRole('link', { name: 'Conciliación' }).click();

    await expect(page).toHaveURL(/\/reports\/settlement$/);
    await expect(page.getByRole('heading', { level: 1, name: /^Semana del / })).toBeVisible();
    await expect(page.getByRole('row', { name: /Diana Ríos/ })).toBeVisible();

    const last = lastWeekRange();
    expect(mock.reportQueries.at(-1)?.get('from')).toBe(last.from);
    expect(mock.reportQueries.at(-1)?.get('to')).toBe(last.to);

    await expect(page.getByLabel('Resumen de la conciliación')).toContainText('$54.000');
    await expect(page.getByText('Hay 2 viajes con cobro pendiente por $24.000.')).toBeVisible();
    const totals = page.getByRole('row', { name: /^Totales/ });
    await expect(totals).toContainText('25');
    await expect(totals).toContainText('$540.000');
    await expect(page.getByRole('button', { name: 'Descargar CSV' })).toBeEnabled();
  });

  test('moves between weeks and flags the week in progress', async ({ page }) => {
    const mock = await openReport(page);
    await expect(carlosRow(page)).toBeVisible();

    const next = page.getByRole('button', { name: 'Semana siguiente ›' });
    await expect(next).toBeEnabled();
    await next.click();

    await expect(page.getByText('Semana en curso', { exact: true })).toBeVisible();
    await expect(page.getByText('Las cifras pueden cambiar.')).toBeVisible();
    await expect(next).toBeDisabled();
    expect(mock.reportQueries.at(-1)?.get('from')).toBe(currentWeekRange().from);
    await expect(page.getByText('La semana aún no termina').first()).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^Marcar como remitido/ }).first(),
    ).toBeDisabled();

    await page.getByRole('button', { name: '‹ Semana anterior' }).click();
    await expect(page.getByText('Semana en curso', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Esta semana (en curso)' }).click();
    await expect(page.getByText('Semana en curso', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Semana pasada' }).click();
    await expect(page.getByText('Semana en curso', { exact: true })).toHaveCount(0);
  });

  test('validates a custom range in the field without calling the server', async ({ page }) => {
    const mock = await openReport(page);
    await expect(carlosRow(page)).toBeVisible();
    const before = mock.reportQueries.length;

    await page.getByRole('button', { name: 'Otro rango' }).click();
    const from = page.getByLabel('Desde');
    const to = page.getByLabel('Hasta');
    await from.fill('2026-03-10');
    await to.fill('2026-03-01');
    await page.getByRole('button', { name: 'Generar reporte' }).click();
    await expect(from).toHaveAttribute('aria-invalid', 'true');
    await expect(from).toBeFocused();
    await expect(
      page.getByText('La fecha inicial no puede ser posterior a la final.'),
    ).toBeVisible();

    await from.fill('2026-01-01');
    await to.fill('2026-03-01');
    await page.getByRole('button', { name: 'Generar reporte' }).click();
    await expect(to).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('El rango no puede superar 31 días.')).toBeVisible();

    await from.fill('');
    await page.getByRole('button', { name: 'Generar reporte' }).click();
    await expect(page.getByText('Escribe una fecha válida.')).toBeVisible();
    expect(mock.reportQueries.length).toBe(before);
  });

  test('generates a custom range, hides the remittance column and warns about unsent changes', async ({
    page,
  }) => {
    const mock = await openReport(page);
    await expect(carlosRow(page)).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Remisión' })).toBeVisible();

    await page.getByRole('button', { name: 'Otro rango' }).click();
    const today = settlementToday(new Date());
    await page.getByLabel('Desde').fill(addDays(today, -9));
    await page.getByLabel('Hasta').fill(addDays(today, -2));
    await expect(page.getByText('Cambiaste el rango. Genera el reporte para verlo.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Descargar CSV' })).toBeDisabled();

    await page.getByRole('button', { name: 'Generar reporte' }).click();
    await expect(page.getByRole('heading', { level: 1, name: /^Del / })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Remisión' })).toHaveCount(0);
    expect(mock.reportQueries.at(-1)?.get('from')).toBe(addDays(today, -9));
    await expect(page.getByText('Cambiaste el rango.')).toHaveCount(0);
  });

  test('filters by driver and offers a way back when the driver has no trips', async ({ page }) => {
    const mock = await openReport(page);
    await expect(carlosRow(page)).toBeVisible();

    await page.getByLabel('Conductor').selectOption({ label: 'Luis Ospina' });
    await expect(page.getByRole('row', { name: /Luis Ospina/ })).toBeVisible();
    await expect(carlosRow(page)).toHaveCount(0);
    expect(mock.reportQueries.at(-1)?.get('driver_id')).toBe('3');

    mock.setRows([]);
    await page.getByLabel('Conductor').selectOption({ label: 'Carlos Mejía' });
    await expect(page.getByText('Este conductor no tiene viajes en ese rango.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Descargar CSV' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Imprimir' })).toHaveCount(0);

    mock.setRows([settlementRow()]);
    await page.getByRole('button', { name: 'Ver todos los conductores' }).click();
    await expect(carlosRow(page)).toBeVisible();
    expect(mock.reportQueries.at(-1)?.get('driver_id')).toBeNull();
  });

  test('shows the empty state without export actions', async ({ page }) => {
    await openReport(page, []);
    await expect(page.getByText('No hay viajes registrados en ese rango.')).toBeVisible();
    await expect(page.getByText('Prueba con otra semana.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Descargar CSV' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Imprimir' })).toHaveCount(0);
  });

  test('shows pending-only weeks as a table, not as empty', async ({ page }) => {
    await openReport(page, [
      settlementRow({
        trip_count: 0,
        cash_collected: 0,
        commission: 0,
        driver_net: 0,
        amount_to_remit: 0,
        pending_cash_trip_count: 1,
        pending_cash_amount: 12_000,
      }),
    ]);
    await expect(carlosRow(page)).toBeVisible();
    await expect(page.getByText('Hay 1 viaje con cobro pendiente por $12.000.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Descargar CSV' })).toBeEnabled();
    await expect(page.getByText('Pendiente', { exact: true })).toBeVisible();
  });

  test('shows an error with retry and recovers', async ({ page }) => {
    await mockOpsDrivers(page);
    const mock = await mockSettlement(page);
    mock.setReportFailure({ status: 500, code: 'INTERNAL' });
    await page.goto('/reports/settlement');

    await expect(page.getByText('No pudimos generar el reporte.')).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount(0);
    mock.setReportFailure(null);
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(carlosRow(page)).toBeVisible();
  });

  test('shows the offline state when the server cannot be reached', async ({ page }) => {
    await mockOpsDrivers(page);
    const mock = await mockSettlement(page);
    mock.setReportFailure({ status: 0, network: true });
    await page.goto('/reports/settlement');

    await expect(page.getByText('Sin conexión.', { exact: true })).toBeVisible();
    mock.setReportFailure(null);
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(carlosRow(page)).toBeVisible();
  });

  test('keeps the loaded report visible, with a notice, when the connection drops', async ({
    page,
  }) => {
    await openReport(page);
    await expect(carlosRow(page)).toBeVisible();

    await page.context().setOffline(true);
    await expect(
      page.getByText(/Sin conexión\. Estás viendo el reporte generado el/),
    ).toBeVisible();
    await expect(carlosRow(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Descargar CSV' })).toBeDisabled();
    await expect(
      page.getByRole('button', { name: 'Marcar como remitido: Carlos Mejía' }),
    ).toBeDisabled();

    await page.context().setOffline(false);
    await expect(page.getByText(/Estás viendo el reporte generado el/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Descargar CSV' })).toBeEnabled();
  });

  test('shows the no-access state for a forbidden report', async ({ page }) => {
    await mockOpsDrivers(page);
    const mock = await mockSettlement(page);
    mock.setReportFailure({ status: 403, code: 'FORBIDDEN' });
    await page.goto('/reports/settlement');
    await expect(page.getByText('No tienes acceso a esta pantalla.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(0);
  });
});

test.describe('settlement CSV and print', () => {
  test('downloads the server CSV for the shown range through a Blob', async ({ page }) => {
    const mock = await openReport(page);
    await expect(carlosRow(page)).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar CSV' }).click();
    const download = await downloadPromise;

    const last = lastWeekRange();
    expect(download.suggestedFilename()).toBe(`conciliacion_cootrayal_${last.from}_${last.to}.csv`);
    const path = await download.path();
    const bytes = readFileSync(path);
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(mock.exportQueries.at(-1)?.get('from')).toBe(last.from);
    await expect(page.getByText(/^Descargamos conciliacion_cootrayal_/)).toBeVisible();
  });

  test('reports a failed download and retries', async ({ page }) => {
    const mock = await openReport(page);
    await expect(carlosRow(page)).toBeVisible();
    mock.failNextExport({ status: 500, code: 'INTERNAL' });

    await page.getByRole('button', { name: 'Descargar CSV' }).click();
    const alert = page.getByRole('alert').filter({ hasText: 'No pudimos descargar el archivo.' });
    await expect(alert).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await alert.getByRole('button', { name: 'Reintentar' }).click();
    await downloadPromise;
    await expect(alert).toHaveCount(0);
  });

  test('explains offline and forbidden download failures', async ({ page }) => {
    const mock = await openReport(page);
    await expect(carlosRow(page)).toBeVisible();

    mock.failNextExport({ status: 0, network: true });
    await page.getByRole('button', { name: 'Descargar CSV' }).click();
    await expect(page.getByText('Sin conexión: no se descargó el archivo.')).toBeVisible();

    mock.failNextExport({ status: 403, code: 'FORBIDDEN' });
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByText('No tienes permiso para descargar este reporte.')).toBeVisible();
  });

  test('prints a clean landscape document without the app chrome', async ({ page }) => {
    await openReport(page);
    await expect(carlosRow(page)).toBeVisible();
    await page.emulateMedia({ media: 'print' });

    await expect(page.getByText('VoyYa · Conciliación semanal')).toBeVisible();
    await expect(page.getByText(/^Del \d+ de \w+ de \d{4} al/)).toBeVisible();
    await expect(page.getByText(/^Generado el /).first()).toBeVisible();
    await expect(
      page.getByText('Documento con datos personales (cédula). Uso interno de la empresa.'),
    ).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeHidden();
    await expect(page.getByRole('banner')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Descargar CSV' })).toBeHidden();
    await expect(page.getByRole('button', { name: /Marcar como remitido/ }).first()).toBeHidden();
    await expect(page.getByRole('columnheader', { name: 'Remisión' })).toBeHidden();
    await expect(page.getByText('Cobro pendiente', { exact: true })).toBeVisible();
    await expect(page.getByRole('row', { name: /^Totales/ })).toBeVisible();
  });
});

test.describe('settlement remittances', () => {
  test('marks a week as remitted, shows the history and undoes it', async ({ page }) => {
    const mock = await openReport(page);
    await expect(carlosRow(page)).toBeVisible();
    await expect(carlosRow(page)).toContainText('Sin remitir');

    await page.getByRole('button', { name: 'Marcar como remitido: Carlos Mejía' }).click();
    const dialog = page.getByRole('dialog', { name: 'Marcar como remitido' });
    await expect(dialog).toContainText(
      'Vas a registrar que Carlos Mejía remitió $30.000 de comisión',
    );
    await expect(dialog).toContainText('el registro original se conserva');
    await dialog.getByRole('button', { name: 'Marcar como remitido' }).click();

    await expect(page.getByText('Marcado como remitido: Carlos Mejía, $30.000.')).toBeVisible();
    expect(mock.recordedBodies).toEqual([
      { driver_id: 1, week_start: lastWeekRange().from, expected_amount: 30_000 },
    ]);
    await expect(carlosRow(page)).toContainText(/Remitido \$30\.000 · \d+ \w+/);

    await carlosRow(page)
      .getByRole('button', { name: /Historial de remisiones de Carlos/ })
      .click();
    const drawer = page.getByRole('dialog', { name: 'Remisiones de Carlos Mejía' });
    await expect(drawer).toContainText('Remisión · $30.000');
    await expect(drawer).toContainText('por Admin Cootrayal');

    await drawer.getByRole('button', { name: 'Deshacer' }).click();
    const undo = page.getByRole('dialog', { name: '¿Deshacer la remisión?' });
    await expect(undo).toContainText('aún no remitió $30.000 de esa semana');
    await undo.getByRole('button', { name: 'Deshacer remisión' }).click();

    await expect(page.getByText('Remisión deshecha: $30.000.')).toBeVisible();
    await expect(drawer).toContainText('Reversión · $30.000');
    await expect(drawer.getByRole('button', { name: 'Deshacer' })).toHaveCount(0);
    expect(mock.reversalIds).toHaveLength(1);
    await drawer.getByRole('button', { name: 'Cerrar' }).click();
    await expect(carlosRow(page)).toContainText('Sin remitir');
  });

  test('offers the balance after a late cash confirmation', async ({ page }) => {
    const mock = await openReport(page);
    await expect(carlosRow(page)).toBeVisible();
    mock.seedEntry({ driver_id: 1, amount: 20_000 });
    await page.getByRole('button', { name: '‹ Semana anterior' }).click();
    await page.getByRole('button', { name: 'Semana siguiente ›' }).click();

    await expect(carlosRow(page)).toContainText('Remitido $20.000');
    await expect(carlosRow(page)).toContainText('saldo por remitir $10.000');
    await expect(
      carlosRow(page).getByRole('button', { name: 'Marcar saldo $10.000' }),
    ).toBeVisible();
  });

  test('asks to refresh when the balance changed', async ({ page }) => {
    const mock = await openReport(page);
    await expect(carlosRow(page)).toBeVisible();
    mock.failNextRecord({ status: 409, code: 'SETTLEMENT_BALANCE_CHANGED' });

    await page.getByRole('button', { name: 'Marcar como remitido: Carlos Mejía' }).click();
    const dialog = page.getByRole('dialog', { name: 'Marcar como remitido' });
    await dialog.getByRole('button', { name: 'Marcar como remitido' }).click();
    await expect(dialog).toContainText(
      'El saldo cambió mientras mirabas la pantalla. Actualiza el reporte y vuelve a intentar.',
    );
    const before = mock.reportQueries.length;
    await dialog.getByRole('button', { name: 'Actualizar reporte' }).click();
    await expect(dialog).toBeHidden();
    await expect.poll(() => mock.reportQueries.length).toBeGreaterThan(before);
  });

  test('explains that the week has not ended when the server rejects the remittance', async ({
    page,
  }) => {
    const mock = await openReport(page);
    await expect(carlosRow(page)).toBeVisible();
    mock.failNextRecord({ status: 409, code: 'SETTLEMENT_WEEK_IN_PROGRESS' });

    await page.getByRole('button', { name: 'Marcar como remitido: Carlos Mejía' }).click();
    const dialog = page.getByRole('dialog', { name: 'Marcar como remitido' });
    await dialog.getByRole('button', { name: 'Marcar como remitido' }).click();
    await expect(dialog).toContainText(
      'La semana aún no termina. Podrás marcarla como remitida desde el lunes.',
    );
    await expect(dialog.getByRole('button', { name: 'Marcar como remitido' })).toBeVisible();
  });

  test('closes the dialog when there is nothing left to remit', async ({ page }) => {
    const mock = await openReport(page);
    await expect(carlosRow(page)).toBeVisible();
    mock.failNextRecord({ status: 409, code: 'NOTHING_TO_REMIT' });

    await page.getByRole('button', { name: 'Marcar como remitido: Carlos Mejía' }).click();
    await page
      .getByRole('dialog', { name: 'Marcar como remitido' })
      .getByRole('button', { name: 'Marcar como remitido' })
      .click();
    await expect(page.getByText('Esta semana ya no tiene nada por remitir.')).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Marcar como remitido' })).toBeHidden();
  });

  test('keeps the dialog open with a message when saving fails or the connection drops', async ({
    page,
  }) => {
    const mock = await openReport(page);
    await expect(carlosRow(page)).toBeVisible();
    await page.getByRole('button', { name: 'Marcar como remitido: Carlos Mejía' }).click();
    const dialog = page.getByRole('dialog', { name: 'Marcar como remitido' });

    mock.failNextRecord({ status: 500, code: 'INTERNAL' });
    await dialog.getByRole('button', { name: 'Marcar como remitido' }).click();
    await expect(dialog).toContainText(
      'No pudimos registrar la remisión. No se guardó nada. Inténtalo de nuevo.',
    );

    mock.failNextRecord({ status: 0, network: true });
    await dialog.getByRole('button', { name: 'Marcar como remitido' }).click();
    await expect(dialog).toContainText(
      'Sin conexión: no se registró nada. Inténtalo cuando vuelva la señal.',
    );

    await dialog.getByRole('button', { name: 'Marcar como remitido' }).click();
    await expect(page.getByText('Marcado como remitido: Carlos Mejía, $30.000.')).toBeVisible();
  });

  test('explains reversal failures', async ({ page }) => {
    const mock = await openReport(page);
    await expect(carlosRow(page)).toBeVisible();

    mock.seedEntry({ driver_id: 1, amount: 30_000 });
    await page.getByRole('button', { name: '‹ Semana anterior' }).click();
    await page.getByRole('button', { name: 'Semana siguiente ›' }).click();
    await carlosRow(page)
      .getByRole('button', { name: /Historial de remisiones de Carlos/ })
      .click();
    const drawer = page.getByRole('dialog', { name: 'Remisiones de Carlos Mejía' });

    mock.failNextReversal({ status: 409, code: 'REMITTANCE_NOT_REVERSIBLE' });
    await drawer.getByRole('button', { name: 'Deshacer' }).click();
    const undo = page.getByRole('dialog', { name: '¿Deshacer la remisión?' });
    await undo.getByRole('button', { name: 'Deshacer remisión' }).click();
    await expect(undo).toContainText('Esta remisión ya no se puede deshacer.');

    mock.failNextReversal({ status: 404, code: 'REMITTANCE_NOT_FOUND' });
    await undo.getByRole('button', { name: 'Deshacer remisión' }).click();
    await expect(undo).toContainText('No encontramos esa remisión. Actualiza el historial.');

    mock.failNextReversal({ status: 0, network: true });
    await undo.getByRole('button', { name: 'Deshacer remisión' }).click();
    await expect(undo).toContainText('Sin conexión: no se deshizo nada.');
  });
});

test.describe('settlement access', () => {
  test('is hidden from the operator and its URL falls back to the queue', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    try {
      await page.addInitScript(() => {
        const user = {
          user_id: 7,
          first_name: 'Olga',
          last_name: 'Operadora',
          role: 'operator',
          tenant: {
            company_id: 1,
            company_name: 'Cootrayal',
            municipality_id: 1,
            municipality_name: 'Yarumal',
          },
          profile_complete: true,
          pin_change_required: false,
        };
        window.localStorage.setItem('voyya_admin_access_token', 'fake-access');
        window.localStorage.setItem('voyya_admin_refresh_token', 'fake-refresh');
        window.localStorage.setItem('voyya_admin_user', JSON.stringify(user));
        window.localStorage.setItem(
          'voyya_admin_access_token_expires_at',
          String(Date.now() + 3_600_000),
        );
      });
      await mockQueueRows(page);
      await mockOpsDrivers(page);
      await page.goto('/reports/settlement');
      await page.waitForURL(/\/ops\/queue$/);
      await expect(page.getByRole('link', { name: 'Cola en vivo' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Conciliación' })).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('shows the sidebar entry to the tenant admin', async ({ page }) => {
    await mockOpsDrivers(page);
    await mockSettlement(page);
    await page.goto('/ops/queue');
    await expect(page.getByRole('link', { name: 'Conciliación' })).toBeVisible();
  });
});

test.describe('settlement access (platform admin)', () => {
  test.use({ storageState: PLATFORM_ADMIN_AUTH_FILE });

  test('is redirected to the companies console and sees no entry', async ({ page }) => {
    await page.goto('/reports/settlement');
    await page.waitForURL(/\/platform\/companies$/);
    await expect(page.getByRole('link', { name: 'Conciliación' })).toHaveCount(0);
  });
});
