import { expect, test, type Page } from '@playwright/test';
import { ADMIN_AUTH_FILE } from '../env';

test.use({ storageState: ADMIN_AUTH_FILE });

type QueueFailure = { kind: 'status'; status: number } | { kind: 'network' } | null;

async function failQueueFetchesWith(page: Page, readFailure: () => QueueFailure): Promise<void> {
  await page.route(/\/ops\/trip-requests/, async (route) => {
    const failure = readFailure();
    if (route.request().resourceType() !== 'fetch' || failure === null) {
      await route.continue();
      return;
    }
    if (failure.kind === 'network') {
      await route.abort('connectionrefused');
      return;
    }
    await route.fulfill({
      status: failure.status,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ code: 'INTERNAL', message: 'fallo simulado' }),
    });
  });
}

async function openQueueThenBreakIt(page: Page, failure: QueueFailure): Promise<void> {
  let current: QueueFailure = null;
  await failQueueFetchesWith(page, () => current);
  await page.goto('/ops/queue');
  await expect(page.getByText('En vivo', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  current = failure;
}

test.describe('ops queue connection chip', () => {
  test('a 500 from the backend is reported as a server error, not as being offline', async ({
    page,
  }) => {
    await openQueueThenBreakIt(page, { kind: 'status', status: 500 });

    await expect(page.getByText('Error del servidor · reintentando…').first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Sin conexión · reintentando…')).toHaveCount(0);
    await expect(page.getByText('En vivo', { exact: true })).toHaveCount(0);
  });

  test('a 429 from the backend says there were too many requests', async ({ page }) => {
    await openQueueThenBreakIt(page, { kind: 'status', status: 429 });

    await expect(page.getByText('Demasiadas consultas · reintentando…').first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Sin conexión · reintentando…')).toHaveCount(0);
  });

  test('a network failure is reported as being offline', async ({ page }) => {
    await openQueueThenBreakIt(page, { kind: 'network' });

    await expect(page.getByText('Sin conexión · reintentando…').first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Error del servidor · reintentando…')).toHaveCount(0);
  });
});
