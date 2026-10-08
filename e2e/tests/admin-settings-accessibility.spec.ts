import { expect, test } from '@playwright/test';
import { ADMIN_AUTH_FILE } from '../env';

test.use({ storageState: ADMIN_AUTH_FILE });

const SETTINGS_FIELD_LABELS = [
  'Tarifa base',
  'Recargo nocturno',
  'Recargo festivo',
  'Radio de búsqueda',
  'Timeout de aceptación',
];

test('every numeric setting has an accessible name', async ({ page }) => {
  await page.goto('/admin/settings');
  await expect(page.getByRole('heading', { name: 'Parámetros', exact: true })).toBeVisible({
    timeout: 15_000,
  });

  for (const label of SETTINGS_FIELD_LABELS) {
    await expect(page.getByRole('spinbutton', { name: label })).toBeVisible();
  }
});
