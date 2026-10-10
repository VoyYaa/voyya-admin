import { expect, test, type Page } from '@playwright/test';
import {
  auditAccessibility,
  forceTheme,
  measureUndersizedTargets,
  settle,
  THEMES,
} from '../fixtures/a11y';
import { GUEST_STATE, seedSession } from '../fixtures/session';
import { mockStartBlockQueue, START_CODE_SENTINEL } from '../fixtures/start-block-mock';

test.use({ storageState: GUEST_STATE });

const BLOCKED_LABEL = 'Inicio bloqueado por código';

async function openQueue(page: Page): Promise<void> {
  await seedSession(page, 'admin');
  await mockStartBlockQueue(page);
  await page.goto('/ops/queue');
  await expect(page.getByRole('row', { name: /Daniela Pérez/ })).toBeVisible();
}

async function openDrawer(page: Page, passenger: string): Promise<void> {
  await page
    .getByRole('button', { name: new RegExp(`Ver detalle de la solicitud de ${passenger}`) })
    .click();
  await expect(page.getByRole('dialog', { name: 'Detalle de la solicitud' })).toBeVisible();
}

test.describe('ops queue: start code block', () => {
  test('a row without failures shows no start-code signal', async ({ page }) => {
    await openQueue(page);
    const row = page.getByRole('row', { name: /Valeria Muñoz/ });
    await expect(row).not.toContainText(BLOCKED_LABEL);
    await expect(row).not.toContainText('intentos fallidos');
    await expect(
      page.getByRole('button', { name: 'Ver detalle de la solicitud de Valeria Muñoz' }),
    ).toBeVisible();
  });

  test('a row with failures shows "n de 5 intentos fallidos" as text', async ({ page }) => {
    await openQueue(page);
    const row = page.getByRole('row', { name: /Julián Cardona/ });
    await expect(row).toContainText('3 de 5 intentos fallidos');
    await expect(row).not.toContainText(BLOCKED_LABEL);
  });

  test('a blocked row shows the label and extends the view button name', async ({ page }) => {
    await openQueue(page);
    const row = page.getByRole('row', { name: /Daniela Pérez/ });
    await expect(row).toContainText(BLOCKED_LABEL);
    await expect(
      row.getByRole('button', {
        name: 'Ver detalle de la solicitud de Daniela Pérez, inicio bloqueado por código',
      }),
    ).toBeVisible();
    await expect(page.getByText(BLOCKED_LABEL)).toHaveCount(1);
  });

  test('the drawer of a blocked trip shows notice, attempts, time and timeline, without actions', async ({
    page,
  }) => {
    await openQueue(page);
    await openDrawer(page, 'Daniela Pérez');
    const drawer = page.getByRole('dialog', { name: 'Detalle de la solicitud' });

    const notice = drawer.getByRole('status').filter({ hasText: BLOCKED_LABEL });
    await expect(notice).toContainText('El conductor se equivocó 5 veces');
    await expect(drawer.getByText('Intentos fallidos', { exact: true })).toBeVisible();
    await expect(drawer.getByText('5 de 5', { exact: true })).toBeVisible();
    await expect(drawer.getByText('Bloqueado', { exact: true })).toBeVisible();
    await expect(drawer.getByText(/6 oct 2026, 10:32/)).toBeVisible();
    await expect(
      drawer.getByText('Por seguridad, el código no se muestra en la consola.'),
    ).toBeVisible();

    const timeline = drawer.getByRole('list');
    await expect(timeline.getByText(BLOCKED_LABEL)).toBeVisible();
    const labels = await timeline.getByRole('listitem').locator('p.text-small').allTextContents();
    expect(labels).toEqual([
      'Creada',
      'Asignada',
      'Conductor llegó',
      BLOCKED_LABEL,
      'Viaje iniciado',
      'Finalizada',
    ]);

    const buttons = await drawer.getByRole('button').allTextContents();
    expect(buttons.join(' | ')).not.toMatch(/desbloquear|iniciar|ver el c[oó]digo|reenviar/i);
    await expect(drawer).not.toContainText(START_CODE_SENTINEL);
  });

  test('the drawer of a trip with failures shows the info notice and no blocked data', async ({
    page,
  }) => {
    await openQueue(page);
    await openDrawer(page, 'Julián Cardona');
    const drawer = page.getByRole('dialog', { name: 'Detalle de la solicitud' });
    await expect(
      drawer.getByText('3 intentos fallidos de 5 al escribir el código de inicio.'),
    ).toBeVisible();
    await expect(drawer.getByText('3 de 5', { exact: true })).toBeVisible();
    await expect(drawer.getByText('Bloqueado', { exact: true })).toHaveCount(0);
    await expect(drawer.getByText(BLOCKED_LABEL)).toHaveCount(0);
    await expect(
      drawer.getByText('Por seguridad, el código no se muestra en la consola.'),
    ).toBeVisible();
  });

  test('the drawer of a trip without failures shows nothing about the code', async ({ page }) => {
    await openQueue(page);
    await openDrawer(page, 'Valeria Muñoz');
    const drawer = page.getByRole('dialog', { name: 'Detalle de la solicitud' });
    await expect(drawer).not.toContainText('código');
    await expect(drawer).not.toContainText('Intentos fallidos');
  });

  test('the page never contains the start code', async ({ page }) => {
    await openQueue(page);
    await expect(page.locator('body')).not.toContainText(START_CODE_SENTINEL);
  });

  for (const theme of THEMES) {
    test(`axe: queue with blocked row (${theme})`, async ({ page }) => {
      await forceTheme(page, theme);
      await openQueue(page);
      await settle(page);
      await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*dark).*$/);
      await auditAccessibility(page);
    });

    test(`axe: blocked trip drawer (${theme})`, async ({ page }) => {
      await forceTheme(page, theme);
      await openQueue(page);
      await openDrawer(page, 'Daniela Pérez');
      await settle(page);
      await auditAccessibility(page);
    });

    test(`axe: failing trip drawer (${theme})`, async ({ page }) => {
      await forceTheme(page, theme);
      await openQueue(page);
      await openDrawer(page, 'Julián Cardona');
      await settle(page);
      await auditAccessibility(page);
    });
  }

  test('touch targets stay at 44px with the new signals', async ({ page }) => {
    await openQueue(page);
    await settle(page);
    expect(await measureUndersizedTargets(page)).toEqual([]);
  });
});
