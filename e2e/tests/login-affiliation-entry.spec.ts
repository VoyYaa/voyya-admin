import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const GUEST_STATE = { cookies: [], origins: [] };

test.use({ storageState: GUEST_STATE });

test.beforeEach(async ({ page }) => {
  await page.route('**/affiliation/municipalities*', (route) =>
    route.fulfill({ json: { data: [] } }),
  );
});

test('login leads to the affiliation form and back without reloading', async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(() => {
    (window as unknown as { spaMarker: boolean }).spaMarker = true;
  });

  const affiliationLink = page.getByRole('link', { name: 'Solicitar afiliación de mi empresa' });
  await expect(affiliationLink).toBeVisible();
  const box = await affiliationLink.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  await affiliationLink.click();
  await expect(page).toHaveURL(/\/afiliacion$/);
  expect(await page.evaluate(() => 'spaMarker' in window)).toBe(true);

  await page.getByRole('link', { name: 'Inicia sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => 'spaMarker' in window)).toBe(true);
});

test('the affiliation link comes after the submit button in tab order', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Correo').focus();
  const order: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press('Tab');
    order.push(await page.evaluate(() => document.activeElement?.textContent?.trim() ?? ''));
  }
  expect(order.indexOf('Ingresar')).toBeGreaterThan(-1);
  expect(order.indexOf('Solicitar afiliación de mi empresa')).toBeGreaterThan(
    order.indexOf('Ingresar'),
  );
});

for (const theme of ['light', 'dark'] as const) {
  test(`entry block and back link meet contrast in ${theme} mode`, async ({ page }) => {
    await page.addInitScript((value) => {
      window.localStorage.setItem('voyya_admin_theme', value);
    }, theme);
    for (const path of ['/login', '/afiliacion']) {
      await page.goto(path);
      await page.waitForTimeout(1300);
      const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
      expect(results.violations).toEqual([]);
    }
  });
}
