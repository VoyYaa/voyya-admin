import { expect, test } from '@playwright/test';
import { PLATFORM_ADMIN_AUTH_FILE } from '../env';
import { e2eEmail, e2eLegalName, e2ePhone, e2eSeed, e2eTaxId, pdfFile } from '../fixtures/test-data';

const COMPANY_DOCUMENT_LABELS = [
  'Cámara de comercio',
  'RUT',
  'Habilitación Min. Transporte',
  'Póliza de responsabilidad civil',
];

test(
  'a company submits its affiliation application end-to-end, then a platform admin closes it @data-creating',
  async ({ page, browser }) => {
    const seed = e2eSeed();
    const legalName = e2eLegalName(seed);
    const taxId = e2eTaxId(seed);
    const contactEmail = e2eEmail(seed);
    const contactPhone = e2ePhone(seed);

    await page.goto('/afiliacion');
    await expect(
      page.getByRole('heading', { name: 'Afilia tu empresa de taxis a VoyYa' }),
    ).toBeVisible();

    await page.getByLabel('Razón social').fill(legalName);
    await page.getByLabel('NIT').fill(taxId);
    await page.getByLabel('Forma jurídica').selectOption('cooperative');
    await page.getByLabel('Municipio').selectOption({ index: 1 }, { timeout: 15_000 });
    await page.getByLabel('Flota declarada').fill('3');

    await page.getByLabel('Nombres').fill('E2E');
    await page.getByLabel('Apellidos').fill('Playwright');
    await page.getByLabel('Correo').fill(contactEmail);
    await page.getByLabel('Teléfono').fill(contactPhone);

    for (const label of COMPANY_DOCUMENT_LABELS) {
      await page.getByLabel(`Subir archivo de ${label}`).setInputFiles(pdfFile(`${label}.pdf`));
      await expect(page.getByText(`${label}.pdf`)).toBeVisible();
    }
    await expect(page.getByText('4 de 4 documentos cargados')).toBeVisible();

    await page.getByRole('checkbox', { name: /tratamiento de mis datos personales/i }).check();

    await page.getByRole('button', { name: 'Enviar solicitud' }).click();

    await expect(
      page.getByRole('heading', { name: '¡Listo! Recibimos tu solicitud.' }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(contactEmail)).toBeVisible();

    const platformContext = await browser.newContext({ storageState: PLATFORM_ADMIN_AUTH_FILE });
    const platformPage = await platformContext.newPage();
    try {
      await platformPage.goto('/platform/companies');
      const createdRow = platformPage.getByRole('row', { name: new RegExp(legalName) });
      await expect(createdRow).toBeVisible({ timeout: 15_000 });

      await createdRow.getByRole('button', { name: /^Ver$/ }).click();
      await platformPage.waitForURL(/\/platform\/companies\/\d+$/);
      await expect(platformPage.getByRole('heading', { name: legalName })).toBeVisible();

      await platformPage.getByRole('button', { name: 'Rechazar solicitud' }).click();
      await platformPage
        .getByLabel('Motivo del rechazo')
        .fill('Cierre automático de datos sintéticos creados por el suite de Playwright.');
      await platformPage.getByRole('button', { name: 'Rechazar solicitud' }).click();
      await platformPage
        .getByRole('dialog')
        .getByRole('button', { name: 'Rechazar solicitud' })
        .click();

      await expect(platformPage.getByText(/ya fue rechazada/)).toBeVisible({ timeout: 15_000 });
    } finally {
      await platformContext.close();
    }
  },
);
