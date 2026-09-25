import { expect, test, type Locator, type Page } from '@playwright/test';
import { ADMIN_AUTH_FILE } from '../env';
import { e2eNationalId, e2ePhone, e2ePlate, e2eSeed, pdfFile } from '../fixtures/test-data';

const DRIVER_DOCUMENT_LABELS = [
  'Licencia de conducción',
  'SOAT',
  'Revisión técnico-mecánica',
  'Tarjeta de operación',
];

test.use({ storageState: ADMIN_AUTH_FILE });

test('shows the fleet quota banner with live data from the backend', async ({ page }) => {
  await page.goto('/admin/drivers/new');
  await expect(page.getByRole('heading', { name: 'Registrar conductor' })).toBeVisible();
  await expect(
    page.getByText(
      /Sin tope de flota declarada|Queda \d+ cupos? de los \d+ declarados|Alcanzaste tu flota declarada/,
    ),
  ).toBeVisible({ timeout: 15_000 });
});

async function uploadDriverDocument(page: Page, label: string): Promise<Locator> {
  const fileInput = page.getByLabel(`Subir archivo de ${label}`);
  await fileInput.setInputFiles(pdfFile(`${label}.pdf`));
  const row = fileInput.locator('xpath=ancestor::div[contains(@class, "rounded-item")][1]');
  await expect(row.getByLabel('Vence')).toBeVisible({ timeout: 15_000 });
  return row;
}

test('admin registers a new driver with its 4 required documents @data-creating', async ({
  page,
}) => {
  const seed = e2eSeed();
  const nationalId = e2eNationalId(seed);
  const phone = e2ePhone(seed);
  const plate = e2ePlate(seed);

  await page.goto('/admin/drivers/new');
  await expect(page.getByRole('heading', { name: 'Registrar conductor' })).toBeVisible();

  const quotaExhausted = await page.getByText('Alcanzaste tu flota declarada').isVisible();
  test.skip(
    quotaExhausted,
    'El cupo de flota de este tenant ya está agotado; no se puede registrar otro conductor.',
  );

  await page.getByLabel('Nombres').fill('E2E');
  await page.getByLabel('Apellidos').fill('Playwright');
  await page.getByLabel('Cédula').fill(nationalId);
  await page.getByLabel('Teléfono').fill(phone);
  await page.getByLabel('Placa').fill(plate);
  await page.getByLabel('Modelo').fill('Playwright Test Model');

  for (const label of DRIVER_DOCUMENT_LABELS) {
    const row = await uploadDriverDocument(page, label);
    await row.getByLabel('Vence').fill('2030-01-01');
  }

  await expect(page.getByText('4 de 4 documentos cargados')).toBeVisible();

  await page.getByRole('button', { name: 'Guardar y enviar PIN' }).click();
  await page.waitForURL(/\/ops\/drivers$/, { timeout: 15_000 });

  await page.getByLabel('Buscar por nombre, cédula o placa').fill(nationalId);
  await expect(page.getByText(nationalId)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(plate)).toBeVisible();
});
