import { expect, test, type Page, type Response } from '@playwright/test';
import { ADMIN_AUTH_FILE, ADMIN_PASSWORD } from '../../env';
import { GUEST_STATE } from '../../fixtures/session';

test.skip(
  process.env.E2E_REAL_START_BLOCK !== '1',
  'Integración real: exige la API local con un viaje de la empresa del operador con el inicio bloqueado (E2E_REAL_START_BLOCK=1, E2E_START_CODES, E2E_OTHER_ADMIN_EMAIL).',
);

const BLOCKED_LABEL = 'Inicio bloqueado por código';
const KNOWN_CODES = (process.env.E2E_START_CODES ?? '')
  .split(',')
  .filter((code) => code.length === 4);

function collectOpsBodies(page: Page): string[] {
  const bodies: string[] = [];
  page.on('response', (response: Response) => {
    if (response.url().includes('/ops/') || response.url().includes('/admin/')) {
      void response
        .text()
        .then((text) => bodies.push(text))
        .catch(() => undefined);
    }
  });
  return bodies;
}

test.describe('consola contra la API real: inicio bloqueado por código', () => {
  test.use({ storageState: ADMIN_AUTH_FILE });

  test('la cola y el detalle muestran el bloqueo con texto y sin el código', async ({ page }) => {
    const bodies = collectOpsBodies(page);
    await page.goto('/ops/queue');
    const row = page.getByRole('row').filter({ hasText: BLOCKED_LABEL });
    await expect(row).toHaveCount(1, { timeout: 20_000 });
    await row.getByRole('button', { name: /inicio bloqueado por código/ }).click();

    const drawer = page.getByRole('dialog', { name: 'Detalle de la solicitud' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('status').filter({ hasText: BLOCKED_LABEL })).toBeVisible();
    await expect(drawer.getByText('5 de 5', { exact: true })).toBeVisible();
    await expect(drawer.getByText('Bloqueado', { exact: true })).toBeVisible();
    await expect(
      drawer.getByText('Por seguridad, el código no se muestra en la consola.'),
    ).toBeVisible();
    await page.screenshot({ path: 'test-results/start-block-real-api-drawer.png' });

    const visibleText = await page.locator('body').innerText();
    const html = await page.content();
    for (const code of KNOWN_CODES) {
      expect(visibleText).not.toMatch(new RegExp(`(^|\\D)${code}(\\D|$)`));
      expect(html).not.toMatch(new RegExp(`"${code}"`));
    }
    expect(html).not.toContain('start_code');
    await page.waitForTimeout(500);
    const joined = bodies.join('\n');
    expect(joined.length).toBeGreaterThan(0);
    expect(joined).not.toContain('"start_code"');
    for (const code of KNOWN_CODES) expect(joined).not.toContain(`"${code}"`);
  });
});

test.describe('consola contra la API real: otra empresa', () => {
  test.use({ storageState: GUEST_STATE });

  test('un operador de otra empresa no ve el viaje bloqueado de la primera empresa', async ({
    page,
  }) => {
    const email = process.env.E2E_OTHER_ADMIN_EMAIL;
    expect(email, 'E2E_OTHER_ADMIN_EMAIL').toBeTruthy();
    await page.goto('/login');
    await page.getByLabel('Correo').fill(email ?? '');
    await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL(/\/ops\/queue$/, { timeout: 15_000 });
    await expect(page.getByRole('link', { name: 'Cola en vivo' })).toBeVisible();
    await expect(page.getByText(BLOCKED_LABEL)).toHaveCount(0);
  });
});
