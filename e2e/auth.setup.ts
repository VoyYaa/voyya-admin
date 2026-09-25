import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { expect, test as setup, type Page } from '@playwright/test';
import {
  ADMIN_AUTH_FILE,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  PLATFORM_ADMIN_AUTH_FILE,
  PLATFORM_ADMIN_EMAIL,
  PLATFORM_ADMIN_PASSWORD,
} from './env';

mkdirSync(dirname(ADMIN_AUTH_FILE), { recursive: true });

async function loginThroughUi(
  page: Page,
  email: string,
  password: string,
  expectedPath: RegExp,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL(expectedPath, { timeout: 15_000 });
}

setup('authenticate as tenant admin', async ({ page }) => {
  await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD, /\/ops\/queue$/);
  await expect(page.getByRole('link', { name: 'Cola en vivo' })).toBeVisible();
  await page.context().storageState({ path: ADMIN_AUTH_FILE });
});

setup('authenticate as platform admin', async ({ page }) => {
  await loginThroughUi(page, PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD, /\/platform\/companies$/);
  await expect(page.getByRole('heading', { name: 'Empresas' })).toBeVisible();
  await page.context().storageState({ path: PLATFORM_ADMIN_AUTH_FILE });
});
