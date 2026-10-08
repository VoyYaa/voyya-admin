import { expect, test, type Page, type Route } from '@playwright/test';
import { ADMIN_AUTH_FILE } from '../env';
import { mockOpsDrivers } from '../fixtures/settlement-mock';

test.use({ storageState: ADMIN_AUTH_FILE });

const SUSPEND_PATH = /\/admin\/drivers\/\d+\/suspend$/;
const CONFIRM_DIALOG_NAME = '¿Suspender a este conductor?';

async function openFirstActiveDriverDetail(page: Page): Promise<void> {
  await page.goto('/ops/drivers');
  const viewButtons = page.getByRole('button', { name: /^Ver detalle de / });
  await expect(viewButtons.first()).toBeVisible({ timeout: 15_000 });
  const count = await viewButtons.count();
  for (let index = 0; index < count; index += 1) {
    await viewButtons.nth(index).click();
    const suspend = page.getByRole('button', { name: 'Suspender conductor' });
    const appeared = await suspend
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (appeared) return;
    await page.keyboard.press('Escape');
  }
  test.skip(true, 'No hay conductores sin suspender en este entorno.');
}

async function confirmSuspension(page: Page): Promise<void> {
  await page
    .getByRole('dialog', { name: CONFIRM_DIALOG_NAME })
    .getByRole('button', { name: 'Suspender conductor' })
    .click();
}

async function fulfillSuspend(route: Route, status: number, body: object): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  });
}

test.describe('suspend driver action', () => {
  test('asks for confirmation and can be cancelled without calling the backend', async ({
    page,
  }) => {
    await mockOpsDrivers(page);
    let suspendCalls = 0;
    await page.route(SUSPEND_PATH, async (route) => {
      suspendCalls += 1;
      await route.continue();
    });
    await openFirstActiveDriverDetail(page);

    await page.getByRole('button', { name: 'Suspender conductor' }).click();
    const dialog = page.getByRole('dialog', { name: CONFIRM_DIALOG_NAME });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancelar' }).click();

    await expect(dialog).toBeHidden();
    expect(suspendCalls).toBe(0);
  });

  test('shows an error message when the backend fails', async ({ page }) => {
    await mockOpsDrivers(page);
    await page.route(SUSPEND_PATH, (route) =>
      fulfillSuspend(route, 500, { code: 'INTERNAL', message: 'fallo simulado' }),
    );
    await openFirstActiveDriverDetail(page);

    await page.getByRole('button', { name: 'Suspender conductor' }).click();
    await confirmSuspension(page);

    await expect(
      page.getByRole('alert').filter({ hasText: 'No pudimos suspender al conductor.' }),
    ).toBeVisible();
  });

  test('explains that a driver with a trip in progress cannot be suspended', async ({ page }) => {
    await mockOpsDrivers(page);
    await page.route(SUSPEND_PATH, (route) =>
      fulfillSuspend(route, 409, {
        code: 'DRIVER_HAS_ACTIVE_TRIP',
        message: 'El conductor tiene un viaje en curso. Espera a que termine para suspenderlo.',
      }),
    );
    await openFirstActiveDriverDetail(page);

    await page.getByRole('button', { name: 'Suspender conductor' }).click();
    await confirmSuspension(page);

    await expect(
      page
        .getByRole('alert')
        .filter({ hasText: 'No se puede suspender mientras tiene un viaje en curso.' }),
    ).toBeVisible();
  });

  test('shows the Suspendido status and hides the action once the driver is suspended', async ({
    page,
  }) => {
    const mock = await mockOpsDrivers(page);
    await page.route(SUSPEND_PATH, async (route) => {
      const target = mock.drivers.find((driver) => driver.driver_id === 1);
      if (target) target.status = 'suspended';
      await fulfillSuspend(route, 200, { ok: true });
    });
    await openFirstActiveDriverDetail(page);

    await page.getByRole('button', { name: 'Suspender conductor' }).click();
    await confirmSuspension(page);

    await expect(page.getByText('Este conductor ya está suspendido.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Suspender conductor' })).toHaveCount(0);
    await expect(
      page
        .getByRole('dialog', { name: 'Detalle del conductor' })
        .getByText('Suspendido', { exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Detalle del conductor' })).toBeHidden();
    await expect(
      page.getByRole('row').getByText('Suspendido', { exact: true }).first(),
    ).toBeVisible();
  });

  test('confirms success and refreshes the drivers list', async ({ page }) => {
    await mockOpsDrivers(page);
    await page.route(SUSPEND_PATH, (route) => fulfillSuspend(route, 200, { ok: true }));
    let listRequests = 0;
    await page.route(/\/ops\/drivers(\?|$)/, async (route) => {
      if (route.request().resourceType() === 'fetch') listRequests += 1;
      await route.fallback();
    });
    await openFirstActiveDriverDetail(page);
    const requestsBeforeSuspend = listRequests;

    await page.getByRole('button', { name: 'Suspender conductor' }).click();
    await confirmSuspension(page);

    await expect(page.getByText(/quedó suspendido y se cerraron sus sesiones/)).toBeVisible();
    await expect.poll(() => listRequests).toBeGreaterThan(requestsBeforeSuspend);
  });
});
