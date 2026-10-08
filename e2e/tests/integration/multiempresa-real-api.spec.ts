import { expect, test, type Page } from '@playwright/test';
import { ADMIN_AUTH_FILE, PLATFORM_ADMIN_AUTH_FILE } from '../../env';
import { GUEST_STATE } from '../../fixtures/session';
import { e2eEmail, e2ePhone, e2eSeed, pdfFile } from '../../fixtures/test-data';

test.skip(
  process.env.E2E_REAL_MULTICOMPANY !== '1',
  'Integración real: exige la API local con el estado que deja test/http/01 a 06 (E2E_REAL_MULTICOMPANY=1).',
);

test.describe.configure({ mode: 'serial' });

const DOCUMENT_LABELS = [
  'Cámara de comercio',
  'RUT',
  'Habilitación Min. Transporte',
  'Póliza de responsabilidad civil',
];

function municipality(page: Page) {
  return page.getByRole('combobox', { name: 'Municipio' });
}

async function chooseDepartment(page: Page, name: string): Promise<void> {
  const department = page.getByLabel('Departamento');
  await expect(department.locator('option').nth(1)).toBeAttached({ timeout: 20_000 });
  await department.selectOption({ label: name });
}

test.describe('afiliación contra el catálogo real', () => {
  test.use({ storageState: GUEST_STATE });
  let createdLegalName = '';

  test('el selector en dos pasos usa los 1.104+ municipios del catálogo DANE', async ({ page }) => {
    await page.goto('/afiliacion');
    const department = page.getByLabel('Departamento');
    await expect(department.locator('option').nth(1)).toBeAttached({ timeout: 20_000 });

    const departments = await department.locator('option').allTextContents();
    expect(departments.length - 1).toBeGreaterThanOrEqual(32);
    expect(departments).toContain('Antioquia');
    expect(departments).toContain('Bogotá, D.C.');

    await chooseDepartment(page, 'Antioquia');
    await municipality(page).click();
    const antioquia = await page.getByRole('listbox').getByRole('option').count();
    expect(antioquia).toBeGreaterThanOrEqual(120);
    expect(antioquia).toBeLessThanOrEqual(130);

    await municipality(page).fill('MEDELLIN');
    const filtered = page.getByRole('listbox').getByRole('option');
    await expect(filtered).toHaveText(['Medellín']);

    await chooseDepartment(page, 'Bogotá, D.C.');
    await municipality(page).click();
    await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(1);
  });

  test('un municipio con empresas activas muestra la nota neutra y la solicitud se envía con servicio y nombre público', async ({
    page,
  }) => {
    const seed = e2eSeed();
    createdLegalName = `Taxis Horizonte ${seed.slice(-5)} S.A.S.`;
    await page.goto('/afiliacion');
    await chooseDepartment(page, 'Antioquia');
    await municipality(page).fill('yarumal');
    await page.getByRole('listbox').getByRole('option', { name: 'Yarumal', exact: true }).click();
    await expect(
      page.getByText('En este municipio ya operan otras empresas. Tu solicitud se revisa igual.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText('limitación')).toHaveCount(0);

    await page.getByLabel('Razón social').fill(createdLegalName);
    await page.getByLabel('Nombre público (opcional)').fill('Horizonte Taxis');
    await page.getByLabel('NIT').fill(`901${seed.slice(-6)}-1`);
    await page.getByLabel('Forma jurídica').selectOption('cooperative');
    await expect(page.getByRole('group', { name: 'Servicio que ofreces' })).toBeVisible();
    await expect(page.getByText('Por ahora VoyYa ofrece solo taxi.')).toBeVisible();
    await page.getByLabel('Flota declarada').fill('4');
    await page.getByLabel('Nombres').fill('Marta');
    await page.getByLabel('Apellidos').fill('Rojas');
    await page.getByLabel('Correo').fill(e2eEmail(seed));
    await page.getByLabel('Teléfono').fill(e2ePhone(seed));
    for (const label of DOCUMENT_LABELS) {
      await page.getByLabel(`Subir archivo de ${label}`).setInputFiles(pdfFile(`${label}.pdf`));
      await expect(page.getByText(`${label}.pdf`)).toBeVisible();
    }
    await page.getByRole('checkbox', { name: /tratamiento de mis datos personales/i }).check();
    await page.getByRole('button', { name: 'Enviar solicitud' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: '¡Listo! Recibimos tu solicitud.' }),
    ).toBeVisible({ timeout: 20_000 });
    test.info().annotations.push({ type: 'legal-name', description: createdLegalName });
  });

  test('la plataforma ve la solicitud, aprueba la tercera empresa de Yarumal con comisión y sin bloqueo', async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: PLATFORM_ADMIN_AUTH_FILE });
    const page = await context.newPage();
    try {
      await page.goto('/platform/companies');
      const row = page.getByRole('row', { name: /Taxis Horizonte .* S\.A\.S\./ }).first();
      await expect(row).toBeVisible({ timeout: 20_000 });
      await expect(row).toContainText('Taxi');
      await expect(row).toContainText('Horizonte Taxis');
      await row.getByRole('button', { name: /^Ver detalle de / }).click();
      await page.waitForURL(/\/platform\/companies\/\d+$/);

      const data = page.getByRole('region', { name: 'Datos de la empresa' });
      await expect(data.getByText('Ya operan 2 empresas en este municipio:')).toBeVisible();
      await expect(data.getByRole('listitem').filter({ hasText: 'Cootrayal' })).toBeVisible();
      await expect(data.getByRole('listitem').filter({ hasText: 'Taxis Norte' })).toBeVisible();
      await expect(data.getByRole('alert')).toHaveCount(0);

      await page.getByRole('button', { name: 'Aprobar empresa' }).click();
      await expect(page.getByRole('checkbox')).toHaveCount(0);
      const submit = page.getByRole('button', { name: 'Aprobar empresa' }).last();
      await expect(submit).toBeDisabled();
      await page.getByLabel('Comisión de la empresa (%)').fill('9');
      await expect(submit).toBeEnabled();
      await submit.click();
      const dialog = page.getByRole('dialog', { name: '¿Confirmar aprobación?' });
      await expect(dialog).toContainText('Compartirá Yarumal con 2 empresas activas.');
      await dialog.getByRole('button', { name: 'Aprobar empresa' }).click();
      await expect(
        page.getByText('Empresa aprobada · ya puede registrar conductores.'),
      ).toBeVisible({ timeout: 20_000 });
    } finally {
      await context.close();
    }
  });
});

test.describe('tarifa y comisión con la API real', () => {
  test.use({ storageState: PLATFORM_ADMIN_AUTH_FILE });

  async function openYarumalRate(page: Page): Promise<void> {
    await page.goto('/platform/rates');
    const row = page
      .getByRole('row')
      .filter({ hasText: 'Yarumal' })
      .filter({ hasText: 'Antioquia' });
    await expect(row.first()).toBeVisible({ timeout: 20_000 });
    await row
      .first()
      .getByRole('button', { name: /^Ver la tarifa/ })
      .click();
    await expect(page).toHaveURL(/\/platform\/rates\/\d+\/taxi$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Yarumal · Taxi' })).toBeVisible();
  }

  test('edita la tarifa del municipio con versión y marca oficial, y la lista la refleja', async ({
    page,
  }) => {
    await openYarumalRate(page);
    await page.getByRole('button', { name: 'Editar valores' }).click();
    await page.getByRole('spinbutton', { name: 'Tarifa base' }).fill('9500');
    await page.getByRole('radio', { name: /^Oficial/ }).check();
    await page.getByLabel('Referencia del acto (opcional)').fill('Resolución 0150 de 2026');
    await page.getByRole('button', { name: 'Revisar y guardar' }).click();
    const dialog = page.getByRole('dialog', { name: '¿Guardar la nueva versión de la tarifa?' });
    await expect(dialog).toContainText('$9.500');
    await expect(dialog).toContainText(
      /Aplica a las solicitudes nuevas de \d empresas de Yarumal\./,
    );
    await dialog.getByRole('button', { name: 'Guardar versión' }).click();
    await expect(
      page.getByText('Tarifa actualizada · aplica a las solicitudes nuevas.'),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('dt', { hasText: 'Tarifa base' }).locator('xpath=..')).toContainText(
      '$9.500',
    );
    await expect(page.getByText('Referencia: Resolución 0150 de 2026')).toBeVisible();
    const history = page.getByRole('region', { name: 'Historial de la tarifa' });
    await expect(history.getByRole('listitem').first()).toBeVisible();
  });

  test('dos pestañas: la segunda recibe el conflicto de versión con quién cambió y qué', async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: PLATFORM_ADMIN_AUTH_FILE });
    const first = await context.newPage();
    const second = await context.newPage();
    try {
      await openYarumalRate(first);
      await openYarumalRate(second);
      for (const [page, value] of [
        [first, '10000'],
        [second, '10500'],
      ] as const) {
        await page.getByRole('button', { name: 'Editar valores' }).click();
        await page.getByRole('spinbutton', { name: 'Tarifa base' }).fill(value);
      }
      await first.getByRole('button', { name: 'Revisar y guardar' }).click();
      await first.getByRole('button', { name: 'Guardar versión' }).click();
      await expect(first.getByText('Tarifa actualizada')).toBeVisible({ timeout: 20_000 });

      await second.getByRole('button', { name: 'Revisar y guardar' }).click();
      await second.getByRole('button', { name: 'Guardar versión' }).click();
      const conflict = second.getByRole('dialog', { name: 'La tarifa cambió mientras editabas' });
      await expect(conflict).toBeVisible({ timeout: 20_000 });
      await expect(conflict).toContainText(
        /Alguien más cambió esta tarifa mientras editabas \(versión \d+, por Plataforma VoyYa\)\./,
      );
      await expect(conflict.getByRole('row', { name: /Tarifa base/ })).toContainText('$10.000');
      await expect(conflict.getByRole('row', { name: /Tarifa base/ })).toContainText('$10.500');

      await conflict.getByRole('button', { name: 'Usar mis valores' }).click();
      await second
        .getByRole('dialog', { name: '¿Guardar la nueva versión de la tarifa?' })
        .getByRole('button', { name: 'Guardar versión' })
        .click();
      await expect(second.getByText('Tarifa actualizada')).toBeVisible({ timeout: 20_000 });
      await expect(
        second.locator('dt', { hasText: 'Tarifa base' }).locator('xpath=..'),
      ).toContainText('$10.500');
    } finally {
      await context.close();
    }
  });

  test('edita la comisión de Taxis Norte y muestra el conflicto de versión', async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: PLATFORM_ADMIN_AUTH_FILE });
    const first = await context.newPage();
    const second = await context.newPage();
    try {
      for (const page of [first, second]) {
        await page.goto('/platform/commissions');
        await page.getByRole('button', { name: 'Editar la comisión de Taxis Norte' }).click();
      }
      const drawer = (page: Page) => page.getByRole('dialog', { name: /^Comisión de / });
      await drawer(first).getByLabel('Comisión por viaje (%)').fill('13');
      await drawer(second).getByLabel('Comisión por viaje (%)').fill('14');

      await drawer(first).getByRole('button', { name: 'Revisar y guardar' }).click();
      await first.getByRole('button', { name: 'Guardar comisión' }).click();
      await expect(first.getByText('Comisión de Taxis Norte actualizada.')).toBeVisible({
        timeout: 20_000,
      });

      await drawer(second).getByRole('button', { name: 'Revisar y guardar' }).click();
      await second.getByRole('button', { name: 'Guardar comisión' }).click();
      await expect(
        drawer(second).getByText(
          /Alguien más cambió esta comisión mientras editabas \(versión \d+, por Plataforma VoyYa\)/,
        ),
      ).toBeVisible({ timeout: 20_000 });
      await expect(drawer(second).getByLabel('Comisión por viaje (%)')).toHaveValue('14');
      await expect(drawer(second)).toContainText('Comisión actual: 13 %');
    } finally {
      await context.close();
    }
  });
});

test.describe('la empresa ve todo en solo lectura', () => {
  test.use({ storageState: ADMIN_AUTH_FILE });

  test('Cootrayal ve la tarifa y la comisión como texto, sin controles de edición', async ({
    page,
  }) => {
    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { name: 'Parámetros', level: 1 })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Servicio: Taxi · Municipio: Yarumal')).toBeVisible();
    await expect(
      page
        .getByRole('note')
        .filter({ hasText: 'Estos valores los define VoyYa para todo el municipio.' }),
    ).toBeVisible();
    await expect(page.locator('dt', { hasText: 'Tarifa base' }).locator('xpath=..')).toContainText(
      '$10.500',
    );
    await expect(
      page.locator('dt', { hasText: 'Comisión por viaje' }).locator('xpath=..'),
    ).toContainText('8 %');
    await expect(page.getByRole('spinbutton')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /guardar/i })).toHaveCount(0);
  });

  test('la empresa recibe 403 al editar la tarifa o la configuración con su propio token', async ({
    page,
  }) => {
    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { name: 'Parámetros', level: 1 })).toBeVisible({
      timeout: 20_000,
    });
    const result = await page.evaluate(async () => {
      const token = window.localStorage.getItem('voyya_admin_access_token') ?? '';
      const api = (window as unknown as { __API__?: string }).__API__ ?? 'http://localhost:3000';
      const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
      const settings = await fetch(`${api}/admin/settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ version: 'mf:1|op:1', base_fare: 12000 }),
      });
      const fare = await fetch(`${api}/platform/municipalities/1/services/taxi/fare`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          version: 1,
          base_fare: 12000,
          night_surcharge_pct: 20,
          holiday_surcharge_pct: 15,
          is_official: false,
        }),
      });
      return [settings.status, fare.status];
    });
    expect(result).toEqual([403, 403]);
  });
});
