import { expect, test } from '@playwright/test';
import { PLATFORM_ADMIN_AUTH_FILE } from '../env';

test.use({ storageState: PLATFORM_ADMIN_AUTH_FILE });

test.describe('platform admin console — read-only', () => {
  test('lists companies and filters by status', async ({ page }) => {
    await page.goto('/platform/companies');
    await expect(page.getByRole('heading', { name: 'Empresas' })).toBeVisible();

    const filter = page.getByLabel('Filtrar por estado');

    await filter.selectOption('active');
    await expect(filter).toHaveValue('active');

    await filter.selectOption('rejected');
    await expect(filter).toHaveValue('rejected');

    await filter.selectOption('all');
    await expect(filter).toHaveValue('all');
  });

  test('opens a pending company detail when one exists', async ({ page }) => {
    await page.goto('/platform/companies');
    await page.getByLabel('Filtrar por estado').selectOption('pending');

    const firstViewButton = page.getByRole('button', { name: /^Ver$/ }).first();
    const hasPendingApplication = await firstViewButton.isVisible();
    test.skip(
      !hasPendingApplication,
      'No hay solicitudes pendientes en este entorno para abrir un detalle.',
    );

    await firstViewButton.click();
    await page.waitForURL(/\/platform\/companies\/\d+$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Documentos legales')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aprobar empresa' })).toBeVisible();
  });
});
