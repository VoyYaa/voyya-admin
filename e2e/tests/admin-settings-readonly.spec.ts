import { expect, test } from '@playwright/test';
import { mockAdminSettings } from '../fixtures/multiempresa-mock';
import { GUEST_STATE } from '../fixtures/session';

test.use({ storageState: GUEST_STATE });

test.describe('admin settings, read only', () => {
  test('shows the municipality values as text, grouped, with the permanent notice', async ({
    page,
  }) => {
    await mockAdminSettings(page);
    await page.goto('/admin/settings');

    await expect(page.getByRole('heading', { name: 'Parámetros', level: 1 })).toBeVisible();
    await expect(page.getByText('Servicio: Taxi · Municipio: Villa Norte')).toBeVisible();

    const notice = page
      .getByRole('note')
      .filter({ hasText: 'Estos valores los define VoyYa para todo el municipio.' });
    await expect(notice).toContainText(
      'Son los mismos para todas las empresas que operan en Villa Norte',
    );
    await expect(notice).toContainText(
      'Si crees que alguno debe cambiar, díselo a tu contacto en VoyYa.',
    );
    await expect(notice).not.toContainText('@');

    for (const heading of [
      'Tarifa del municipio',
      'Recargos',
      'Comisión de tu empresa',
      'Parámetros de asignación',
      'Reglas para el pasajero',
    ]) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }
    const expected: Record<string, string> = {
      'Tarifa base': '$8.000',
      'Recargo nocturno': '25 %',
      'Comisión por viaje': '8 %',
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
    await expect(
      page.getByText('La define VoyYa, igual para todas las empresas del municipio.'),
    ).toBeVisible();
    await expect(page.getByText('La fija VoyYa para tu empresa.')).toBeVisible();
  });

  test('has nothing to edit or save', async ({ page }) => {
    await mockAdminSettings(page);
    await page.goto('/admin/settings');
    await expect(page.getByText('Tarifa base')).toBeVisible();

    await expect(page.locator('main input, main select, main textarea')).toHaveCount(0);
    await expect(page.getByRole('spinbutton')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Guardar|Descartar/ })).toHaveCount(0);
  });

  test('shows the provisional mark and notice for an unofficial fare', async ({ page }) => {
    await mockAdminSettings(page);
    await page.goto('/admin/settings');
    await expect(page.getByText('No oficial', { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        'La tarifa es provisional. Todavía no se ha cargado la tarifa oficial de la Alcaldía de Villa Norte.',
      ),
    ).toBeVisible();
  });

  test('shows the official mark with its reference and without the provisional notice', async ({
    page,
  }) => {
    await mockAdminSettings(page, {
      fare_is_official: true,
      fare_official_reference: 'Decreto 045 de 2026',
    });
    await page.goto('/admin/settings');
    await expect(page.getByText('Oficial', { exact: true })).toBeVisible();
    await expect(page.getByText('Referencia: Decreto 045 de 2026')).toBeVisible();
    await expect(page.getByText('La tarifa es provisional.')).toHaveCount(0);
  });

  test('does not present the platform 403 as an error', async ({ page }) => {
    await mockAdminSettings(page, {}, { forbidden: true });
    await page.goto('/admin/settings');
    await expect(
      page.getByText('Estos valores los define VoyYa para todo el municipio.'),
    ).toBeVisible();
    await expect(page.getByText('No pudimos cargar los parámetros.')).toHaveCount(0);
    await expect(page.getByText('Error 403')).toHaveCount(0);
    await expect(page.getByText(/SETTINGS_MANAGED_BY_PLATFORM/)).toHaveCount(0);
  });

  test('shows an error with a retry when the load fails', async ({ page }) => {
    await mockAdminSettings(page, {}, { failure: { status: 500 } });
    await page.goto('/admin/settings');
    await expect(page.getByText('No pudimos cargar los parámetros.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  });

  test('warns that the data may be outdated when the connection drops', async ({
    page,
    context,
  }) => {
    await mockAdminSettings(page);
    await page.goto('/admin/settings');
    await expect(page.getByText('Tarifa base')).toBeVisible();
    await context.setOffline(true);
    await expect(
      page.getByText('Sin conexión · los datos pueden estar desactualizados.'),
    ).toBeVisible();
    await expect(page.getByText('Tarifa base')).toBeVisible();
    await context.setOffline(false);
  });
});
