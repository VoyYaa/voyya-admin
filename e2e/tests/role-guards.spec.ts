import { expect, test } from '@playwright/test';
import { ADMIN_AUTH_FILE, PLATFORM_ADMIN_AUTH_FILE } from '../env';

test.describe('guest without a session', () => {
  test('is redirected to /login from any protected route', async ({ page }) => {
    await page.goto('/ops/queue');
    await page.waitForURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  });
});

test.describe('tenant admin session', () => {
  test.use({ storageState: ADMIN_AUTH_FILE });

  test('reaches the ops queue and its own admin pages', async ({ page }) => {
    await page.goto('/ops/queue');
    await expect(page).toHaveURL(/\/ops\/queue$/);

    await page.goto('/ops/drivers');
    await expect(page).toHaveURL(/\/ops\/drivers$/);

    await page.goto('/admin/settings');
    await expect(page).toHaveURL(/\/admin\/settings$/);

    await page.goto('/admin/drivers/new');
    await expect(page).toHaveURL(/\/admin\/drivers\/new$/);
  });

  test('is redirected away from /platform/companies', async ({ page }) => {
    await page.goto('/platform/companies');
    await page.waitForURL(/\/ops\/queue$/);
  });

  test('is redirected away from a nested platform route', async ({ page }) => {
    await page.goto('/platform/companies/1');
    await page.waitForURL(/\/ops\/queue$/);
  });

  test('never renders the platform navigation link', async ({ page }) => {
    await page.goto('/ops/queue');
    await expect(page.getByRole('link', { name: 'Empresas' })).toHaveCount(0);
  });

  test('"/" redirects to the ops queue', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/\/ops\/queue$/);
  });
});

test.describe('platform admin session', () => {
  test.use({ storageState: PLATFORM_ADMIN_AUTH_FILE });

  test('is redirected away from /ops/queue', async ({ page }) => {
    await page.goto('/ops/queue');
    await page.waitForURL(/\/platform\/companies$/);
  });

  test('is redirected away from /ops/drivers', async ({ page }) => {
    await page.goto('/ops/drivers');
    await page.waitForURL(/\/platform\/companies$/);
  });

  test('is redirected away from /admin/drivers/new', async ({ page }) => {
    await page.goto('/admin/drivers/new');
    await page.waitForURL(/\/platform\/companies$/);
  });

  test('is redirected away from /admin/settings', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.waitForURL(/\/platform\/companies$/);
  });

  test('reaches its own console and "/" redirects there', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/\/platform\/companies$/);
    await expect(page.getByRole('heading', { name: 'Empresas' })).toBeVisible();
  });
});
