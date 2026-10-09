import { expect, test, type Page } from '@playwright/test';
import { catalogRow, mockCatalog, type CatalogMock } from '../fixtures/multiempresa-mock';
import { GUEST_STATE } from '../fixtures/session';
import { pdfFile } from '../fixtures/test-data';

test.use({ storageState: GUEST_STATE });

const DOCUMENT_LABELS = [
  'Cámara de comercio',
  'RUT',
  'Habilitación Min. Transporte',
  'Póliza de responsabilidad civil',
];

async function openForm(page: Page): Promise<CatalogMock> {
  const mock = await mockCatalog(page);
  await page.goto('/afiliacion');
  await expect(page.getByLabel('Departamento')).toBeVisible();
  return mock;
}

function municipality(page: Page) {
  return page.getByRole('combobox', { name: 'Municipio' });
}

function options(page: Page) {
  return page.getByRole('listbox').getByRole('option');
}

async function chooseDepartment(page: Page, name: string): Promise<void> {
  const department = page.getByLabel('Departamento');
  await department.focus();
  await department.selectOption({ label: name });
}

async function chooseMunicipality(page: Page, department: string, name: string): Promise<void> {
  await chooseDepartment(page, department);
  await municipality(page).click();
  await options(page)
    .filter({ hasText: new RegExp(`^${name}$`) })
    .click();
}

async function fillRest(page: Page): Promise<void> {
  await page.getByLabel('Razón social').fill('Taxis Horizonte S.A.S.');
  await page.getByLabel('NIT').fill('900123456-7');
  await page.getByLabel('Forma jurídica').selectOption('cooperative');
  await page.getByLabel('Flota declarada').fill('5');
  await page.getByLabel('Nombres').fill('Marta');
  await page.getByLabel('Apellidos').fill('Rojas');
  await page.getByLabel('Correo').fill('contacto@empresa.test');
  await page.getByLabel('Teléfono').fill('3001234567');
  for (const label of DOCUMENT_LABELS) {
    await page.getByLabel(`Subir archivo de ${label}`).setInputFiles(pdfFile(`${label}.pdf`));
    await expect(page.getByText(`${label}.pdf`)).toBeVisible();
  }
  await page.getByRole('checkbox', { name: /tratamiento de mis datos personales/i }).check();
}

test.describe('department and municipality', () => {
  test('derives the departments from the catalog and sorts them like Spanish', async ({ page }) => {
    await openForm(page);
    await expect(page.getByLabel('Departamento').locator('option')).toHaveText([
      'Elige un departamento',
      'Antioquia',
      'Bogotá, D.C.',
      'Bolívar',
    ]);
  });

  test('disables the municipality with its reason in text until a department is chosen', async ({
    page,
  }) => {
    await openForm(page);
    const field = municipality(page);
    await expect(field).toBeDisabled();
    await expect(field).toHaveAttribute('placeholder', 'Primero elige un departamento');
    await expect(page.getByText('Elige un departamento para ver sus municipios.')).toBeVisible();

    await chooseDepartment(page, 'Antioquia');
    await expect(field).toBeEnabled();
    await expect(field).toHaveAttribute('placeholder', 'Escribe tu municipio');
    await expect(page.getByText('Municipios de Antioquia. Escribe para buscar.')).toBeVisible();
    await expect(page.getByLabel('Departamento')).toBeFocused();
  });

  test('opens the whole department list on click, sorted and without any added text', async ({
    page,
  }) => {
    await openForm(page);
    await chooseDepartment(page, 'Antioquia');
    await municipality(page).click();

    const list = page.getByRole('listbox', { name: 'Municipios de Antioquia' });
    await expect(list.getByRole('option')).toHaveText([
      'Medellín',
      'Nariño',
      'Santa Rosa de Osos',
      'Villa Norte',
    ]);
    await expect(municipality(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(list).not.toContainText('ya tiene');
    await expect(list).not.toContainText('no disponible');
    await expect(list.locator('[aria-disabled]')).toHaveCount(0);
  });

  test('filters without accents or capitals', async ({ page }) => {
    await openForm(page);
    await chooseDepartment(page, 'Antioquia');
    const field = municipality(page);
    await field.fill('MEDELLIN');
    await expect(options(page)).toHaveText(['Medellín']);
    await field.fill('narino');
    await expect(options(page)).toHaveText(['Nariño']);
    await field.fill('osos');
    await expect(options(page)).toHaveText(['Santa Rosa de Osos']);
  });

  test('has no minimum length: one letter already filters', async ({ page }) => {
    await openForm(page);
    await chooseDepartment(page, 'Antioquia');
    await municipality(page).fill('v');
    await expect(options(page)).toHaveText(['Villa Norte']);
  });

  test('works with the keyboard and never submits the form with Enter', async ({ page }) => {
    const mock = await openForm(page);
    await chooseDepartment(page, 'Antioquia');
    const field = municipality(page);
    await field.focus();
    await page.keyboard.press('ArrowDown');
    await expect(field).toHaveAttribute('aria-expanded', 'true');
    const first = options(page).first();
    await expect(field).toHaveAttribute(
      'aria-activedescendant',
      (await first.getAttribute('id')) ?? '',
    );

    await page.keyboard.press('ArrowDown');
    await expect(field).toHaveAttribute(
      'aria-activedescendant',
      (await options(page).nth(1).getAttribute('id')) ?? '',
    );
    await page.keyboard.press('End');
    await expect(options(page).last()).toHaveAttribute('id', /.+/);
    await expect(field).toHaveAttribute(
      'aria-activedescendant',
      (await options(page).last().getAttribute('id')) ?? '',
    );
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowUp');
    await expect(field).not.toHaveAttribute('aria-activedescendant', /.+/);

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(field).toHaveValue('Nariño');
    await expect(field).toHaveAttribute('aria-expanded', 'false');
    await expect(field).toBeFocused();
    await page.keyboard.press('Enter');
    expect(mock.submitted).toHaveLength(0);
    await expect(page.getByText('Datos de la empresa')).toBeVisible();
  });

  test('closes with Escape keeping the text, and Tab does not pick the active option', async ({
    page,
  }) => {
    await openForm(page);
    await chooseDepartment(page, 'Antioquia');
    const field = municipality(page);
    await field.fill('vil');
    await expect(options(page)).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(field).toHaveValue('vil');

    await page.keyboard.press('ArrowDown');
    await expect(options(page)).toHaveCount(1);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(page.getByText('Elige tu municipio de la lista.')).toBeVisible();
  });

  test('announces the results and the selection in a polite live region', async ({ page }) => {
    await openForm(page);
    await chooseDepartment(page, 'Antioquia');
    const regions = page.locator('div[aria-live="polite"][aria-atomic="true"]');
    const fieldRegion = regions.first();
    const departmentRegion = regions.last();
    await expect(departmentRegion).toContainText('Departamento elegido: Antioquia.');
    await expect(departmentRegion).toContainText('4 municipios disponibles');
    await municipality(page).click();
    await expect(fieldRegion).toContainText('4 municipios en Antioquia', { timeout: 3000 });
    await municipality(page).fill('vil');
    await expect(fieldRegion).toContainText('1 municipio encontrado.', { timeout: 3000 });
    await options(page).filter({ hasText: 'Villa Norte' }).click();
    await expect(fieldRegion).toContainText('Municipio elegido: Villa Norte.');
    await expect(fieldRegion).toContainText('En este municipio ya operan otras empresas.');
  });

  test('shows the neutral note for a municipality with active companies: no figures, no names', async ({
    page,
  }) => {
    await openForm(page);
    await chooseMunicipality(page, 'Antioquia', 'Villa Norte');
    const region = page.locator('#municipality-notes');
    await expect(
      region.getByText('En este municipio ya operan otras empresas. Tu solicitud se revisa igual.'),
    ).toBeVisible();
    await expect(region.getByText('Aún no hay cobertura')).toHaveCount(0);
    await expect(region).not.toContainText(/\d/);
    await expect(region).not.toContainText('Cooperativa');
    await expect(region.getByRole('alert')).toHaveCount(0);
    await expect(municipality(page)).toHaveValue('Villa Norte');
    await expect(page.getByRole('button', { name: 'Borrar municipio' })).toBeVisible();
  });

  test('warns before sending when the municipality has no coverage yet', async ({ page }) => {
    await openForm(page);
    await chooseMunicipality(page, 'Antioquia', 'Santa Rosa de Osos');
    await expect(
      page.getByText(
        'Aún no hay cobertura en este municipio. Si tu empresa es aprobada, la cobertura se habilita después de la aprobación.',
      ),
    ).toBeVisible();
    await expect(
      page.locator('#municipality-notes').getByText('En este municipio ya operan otras empresas.'),
    ).toHaveCount(0);
  });

  test('stacks both notes when the municipality has companies and no coverage', async ({
    page,
  }) => {
    await mockCatalog(page, [
      catalogRow({
        municipality_id: 9,
        name: 'Costa Brava',
        has_active_companies: true,
        coverage_active: false,
      }),
    ]);
    await page.goto('/afiliacion');
    await chooseMunicipality(page, 'Antioquia', 'Costa Brava');
    const region = page.locator('#municipality-notes');
    await expect(region.getByText('Aún no hay cobertura en este municipio.')).toBeVisible();
    await expect(
      region.getByText('En este municipio ya operan otras empresas. Tu solicitud se revisa igual.'),
    ).toBeVisible();
  });

  test('says VoyYa reviews the request when coverage exists and nobody operates yet', async ({
    page,
  }) => {
    await openForm(page);
    await chooseMunicipality(page, 'Antioquia', 'Medellín');
    await expect(
      page.getByText('VoyYa revisará tu solicitud antes de aprobar a tu empresa.'),
    ).toBeVisible();
  });

  test('handles Bogotá and its single municipality like any other department', async ({ page }) => {
    await openForm(page);
    await chooseDepartment(page, 'Bogotá, D.C.');
    await municipality(page).click();
    await expect(options(page)).toHaveText(['Bogotá, D.C.']);
    await expect(options(page)).toHaveCount(1);
    await expect(municipality(page)).toHaveAttribute('aria-activedescendant', /.+/);
    await expect(municipality(page)).toHaveValue('');
    await page.keyboard.press('Enter');
    await expect(municipality(page)).toHaveValue('Bogotá, D.C.');
  });

  test('says nothing matches, names the department and offers no contact channel', async ({
    page,
  }) => {
    await openForm(page);
    await chooseDepartment(page, 'Antioquia');
    await municipality(page).fill('zzzz');
    await expect(
      page.getByText(
        'No encontramos ese municipio en Antioquia. Revisa cómo lo escribiste o si elegiste el departamento correcto.',
      ),
    ).toBeVisible();
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(municipality(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
    await expect(page.getByText(/Escríbenos/)).toHaveCount(0);
  });

  test('clears the municipality when the department changes and says so', async ({ page }) => {
    await openForm(page);
    await chooseMunicipality(page, 'Antioquia', 'Medellín');
    await expect(municipality(page)).toHaveValue('Medellín');

    await chooseDepartment(page, 'Bolívar');
    await expect(municipality(page)).toHaveValue('');
    await expect(
      page.getByText('Cambiaste de departamento. Elige de nuevo tu municipio.').first(),
    ).toBeVisible();
    await expect(page.getByLabel('Departamento')).toBeFocused();
    await expect(page.getByText('Municipios de Bolívar. Escribe para buscar.')).toBeVisible();
    await municipality(page).click();
    await expect(options(page)).toHaveText(['Puerto Sur']);
  });

  test('does nothing when the same department is chosen again', async ({ page }) => {
    await openForm(page);
    await chooseMunicipality(page, 'Antioquia', 'Medellín');
    await chooseDepartment(page, 'Antioquia');
    await expect(municipality(page)).toHaveValue('Medellín');
  });

  test('clears with the delete button and returns the focus to the field', async ({ page }) => {
    await openForm(page);
    await chooseMunicipality(page, 'Antioquia', 'Medellín');
    await page.getByRole('button', { name: 'Borrar municipio' }).click();
    await expect(municipality(page)).toHaveValue('');
    await expect(municipality(page)).toBeFocused();
  });

  test('drops the selection as soon as the text is edited', async ({ page }) => {
    await openForm(page);
    await chooseMunicipality(page, 'Antioquia', 'Medellín');
    await municipality(page).fill('Medell');
    await page.getByLabel('Razón social').click();
    await expect(page.getByText('Elige tu municipio de la lista.')).toBeVisible();
    await expect(page.getByText('VoyYa revisará tu solicitud')).toHaveCount(0);
  });

  test('asks for the department when leaving the field empty', async ({ page }) => {
    await openForm(page);
    await page.getByLabel('Departamento').focus();
    await page.getByLabel('Razón social').focus();
    await expect(page.getByText('Elige tu departamento.')).toBeVisible();
  });

  test('shows the source line with the cut date', async ({ page }) => {
    await openForm(page);
    const line = page.locator('p', { hasText: 'Corte 30 de junio de 2025.' });
    await expect(line).toContainText(
      'Fuente: Departamento Administrativo Nacional de Estadística: www.dane.gov.co, adaptado. Licencia',
    );
    const link = line.getByRole('link', { name: /CC BY-SA 4\.0/ });
    await expect(link).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by-sa/4.0/deed.es',
    );
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('falls back to the local attribution when the API sends it empty', async ({ page }) => {
    const mock = await mockCatalog(page);
    mock.setSource({ attribution: '', license: '' });
    await page.goto('/afiliacion');
    await expect(
      page.getByText(
        'Fuente: DIVIPOLA (DANE, www.dane.gov.co), adaptado. Licencia CC BY-SA 4.0 (se abre en una pestaña nueva). Corte 30 de junio de 2025.',
      ),
    ).toBeVisible();
  });
});

test.describe('catalog states', () => {
  test('shows both fields as skeletons while loading, then a slow-connection hint', async ({
    page,
  }) => {
    await mockCatalog(page);
    await page.route(/\/affiliation\/municipalities/, async (route) => {
      if (route.request().resourceType() === 'document') return route.fallback();
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return route.fallback();
    });
    await page.goto('/afiliacion');
    await expect(page.getByText('Cargando municipios…')).toBeVisible();
    await expect(page.getByLabel('Departamento')).toHaveCount(0);
    await expect(page.getByLabel('Razón social')).toBeVisible();
    await expect(page.getByLabel('Departamento')).toBeVisible();
  });

  test('shows an error with retry and no fields until it recovers', async ({ page }) => {
    const mock = await mockCatalog(page);
    mock.failCatalog({ status: 500, code: 'INTERNAL' });
    await page.goto('/afiliacion');
    await expect(page.getByText('No pudimos cargar los municipios.')).toBeVisible();
    await expect(page.getByLabel('Departamento')).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Municipio' })).toHaveCount(0);

    mock.failCatalog(null);
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByLabel('Departamento')).toBeVisible();
  });

  test('says it is offline and retries by itself when the connection returns', async ({ page }) => {
    const mock = await mockCatalog(page);
    mock.failCatalog({ status: 0, network: true });
    await page.goto('/afiliacion');
    await expect(
      page.getByText('Sin conexión. Cuando vuelva, cargamos los municipios solos.'),
    ).toBeVisible();
    await expect(page.getByLabel('Departamento')).toHaveCount(0);

    mock.failCatalog(null);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(page.getByLabel('Departamento')).toBeVisible();
  });

  test('offers only a retry when the catalog comes back empty', async ({ page }) => {
    await mockCatalog(page, []);
    await page.goto('/afiliacion');
    await expect(
      page.getByText(
        'Por ahora no hay municipios para elegir. Vuelve a intentarlo en unos minutos.',
      ),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  });

  test('keeps working when the connection drops after the catalog loaded', async ({
    page,
    context,
  }) => {
    await openForm(page);
    await context.setOffline(true);
    await chooseMunicipality(page, 'Antioquia', 'Medellín');
    await expect(municipality(page)).toHaveValue('Medellín');
    await expect(page.getByRole('button', { name: 'Enviar solicitud' })).toBeDisabled();
    await context.setOffline(false);
  });
});

test.describe('service and public name', () => {
  test('shows the only active service as plain text, not as a control', async ({ page }) => {
    await openForm(page);
    const group = page.getByRole('group', { name: 'Servicio que ofreces' });
    await expect(group).toContainText('Taxi');
    await expect(group).toContainText('Por ahora VoyYa ofrece solo taxi.');
    await expect(group.getByRole('checkbox')).toHaveCount(0);
  });

  test('offers one checkbox per active service and requires at least one', async ({ page }) => {
    const mock = await mockCatalog(page);
    mock.setActiveServices(['taxi', 'delivery']);
    await page.goto('/afiliacion');
    const group = page.getByRole('group', { name: 'Servicio que ofreces' });
    await expect(group.getByRole('checkbox')).toHaveCount(2);
    await expect(group.getByRole('checkbox', { name: 'Taxi' })).toBeChecked();
    await group.getByRole('checkbox', { name: 'Taxi' }).uncheck();
    await expect(group.getByText('Elige al menos un servicio.')).toBeVisible();
    await group.getByRole('checkbox', { name: 'Taxi' }).check();
    await expect(group.getByText('Elige al menos un servicio.')).toHaveCount(0);
  });

  test('previews the public name, falling back to the legal name', async ({ page }) => {
    await openForm(page);
    const preview = (name: string) => page.getByText(`Así te verán los pasajeros: ${name}`);
    await page.getByLabel('Razón social').fill('Taxis Horizonte S.A.S.');
    await expect(preview('Taxis Horizonte S.A.S.')).toBeVisible();
    await page.getByLabel('Nombre público (opcional)').fill('Horizonte');
    await expect(preview('Horizonte')).toBeVisible();
    await page.getByLabel('Nombre público (opcional)').fill('');
    await expect(preview('Taxis Horizonte S.A.S.')).toBeVisible();
    await expect(
      page.getByText(
        'Es el nombre con el que te verán los pasajeros. Si lo dejas vacío, usamos tu razón social.',
      ),
    ).toBeVisible();
  });

  test('accepts an empty public name and rejects one that is too short or too long', async ({
    page,
  }) => {
    await openForm(page);
    const field = page.getByLabel('Nombre público (opcional)');
    await field.fill('A');
    await expect(
      page.getByText('Escribe entre 2 y 60 caracteres, sin símbolos invisibles ni de control.'),
    ).toBeVisible();
    await field.fill('Ab');
    await expect(
      page.getByText('Escribe entre 2 y 60 caracteres, sin símbolos invisibles ni de control.'),
    ).toHaveCount(0);
    await field.fill('x'.repeat(61));
    await expect(
      page.getByText('Escribe entre 2 y 60 caracteres, sin símbolos invisibles ni de control.'),
    ).toBeVisible();
    await field.fill('');
    await expect(
      page.getByText('Escribe entre 2 y 60 caracteres, sin símbolos invisibles ni de control.'),
    ).toHaveCount(0);
  });
});

test.describe('submission', () => {
  test('sends the municipality id, the service and the public name, never the department', async ({
    page,
  }) => {
    const mock = await openForm(page);
    await page.getByLabel('Nombre público (opcional)').fill('Horizonte');
    await chooseMunicipality(page, 'Antioquia', 'Villa Norte');
    await fillRest(page);
    await page.getByRole('button', { name: 'Enviar solicitud' }).click();

    await expect(page.getByText('¡Listo! Recibimos tu solicitud.')).toBeVisible();
    expect(mock.submitted).toHaveLength(1);
    const body = mock.submitted[0];
    expect(body).toMatchObject({
      municipality_id: 1,
      public_name: 'Horizonte',
      service_types: ['taxi'],
      legal_name: 'Taxis Horizonte S.A.S.',
    });
    expect(Object.keys(body ?? {})).not.toContain('department_code');
    expect(Object.keys(body ?? {})).not.toContain('department');
  });

  test('rejects invisible and control characters in the public name with a clear error', async ({
    page,
  }) => {
    await openForm(page);
    const field = page.getByLabel('Nombre público (opcional)');
    for (const hidden of ['‮', '​', '']) {
      await field.fill(`Taxis${hidden}Horizonte`);
      await expect(
        page.getByText('Escribe entre 2 y 60 caracteres, sin símbolos invisibles ni de control.'),
      ).toBeVisible();
      await expect(field).toHaveAttribute('aria-invalid', 'true');
    }
    await field.fill('Taxis Horizonte');
    await expect(page.getByText('sin símbolos invisibles ni de control')).toHaveCount(0);
  });

  test('normalizes the public name to NFC on submit', async ({ page }) => {
    const mock = await openForm(page);
    await page.getByLabel('Nombre público (opcional)').fill('Café Taxi');
    await chooseMunicipality(page, 'Antioquia', 'Villa Norte');
    await fillRest(page);
    await page.getByRole('button', { name: 'Enviar solicitud' }).click();
    await expect(page.getByText('¡Listo! Recibimos tu solicitud.')).toBeVisible();
    expect(mock.submitted[0]?.public_name).toBe('Café Taxi');
  });

  test('omits the public name when it is left empty', async ({ page }) => {
    const mock = await openForm(page);
    await chooseMunicipality(page, 'Antioquia', 'Medellín');
    await fillRest(page);
    await page.getByRole('button', { name: 'Enviar solicitud' }).click();
    await expect(page.getByText('¡Listo! Recibimos tu solicitud.')).toBeVisible();
    expect(Object.keys(mock.submitted[0] ?? {})).not.toContain('public_name');
  });

  test('blocks the submission without a municipality chosen from the list', async ({ page }) => {
    await openForm(page);
    await chooseDepartment(page, 'Antioquia');
    await municipality(page).fill('Medell');
    await fillRest(page);
    await expect(page.getByRole('button', { name: 'Enviar solicitud' })).toBeDisabled();
  });

  test('keeps the department, the form and the documents when the municipality is gone', async ({
    page,
  }) => {
    const mock = await openForm(page);
    await chooseMunicipality(page, 'Antioquia', 'Medellín');
    await fillRest(page);
    mock.failNextSubmit({ status: 404, code: 'MUNICIPALITY_NOT_FOUND', message: 'No existe' });
    await page.getByRole('button', { name: 'Enviar solicitud' }).click();

    await expect(
      page.getByText('Este municipio ya no está disponible. Elige otro de la lista.'),
    ).toBeVisible();
    await expect(page.getByLabel('Departamento')).toHaveValue('05');
    await expect(municipality(page)).toHaveValue('');
    await expect(municipality(page)).toBeFocused();
    await expect(page.getByLabel('Razón social')).toHaveValue('Taxis Horizonte S.A.S.');
    await expect(page.getByText('4 de 4 documentos cargados')).toBeVisible();
    expect(mock.requests).toBeGreaterThanOrEqual(2);

    await municipality(page).click();
    await options(page).filter({ hasText: 'Nariño' }).click();
    await page.getByRole('button', { name: 'Enviar solicitud' }).click();
    await expect(page.getByText('¡Listo! Recibimos tu solicitud.')).toBeVisible();
    expect(mock.submitted).toHaveLength(2);
  });

  test('shows the unavailable service error on its field and keeps everything else', async ({
    page,
  }) => {
    const mock = await openForm(page);
    await chooseMunicipality(page, 'Antioquia', 'Medellín');
    await fillRest(page);
    mock.failNextSubmit({ status: 409, code: 'SERVICE_NOT_AVAILABLE', message: 'inactivo' });
    await page.getByRole('button', { name: 'Enviar solicitud' }).click();
    await expect(
      page
        .getByRole('group', { name: 'Servicio que ofreces' })
        .getByText('Ese servicio no está disponible por ahora.'),
    ).toBeVisible();
    await expect(page.getByText('4 de 4 documentos cargados')).toBeVisible();
    await expect(municipality(page)).toHaveValue('Medellín');
  });
});
