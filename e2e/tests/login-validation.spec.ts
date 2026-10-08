import { expect, test } from '@playwright/test';

test.describe('login form validation copy', () => {
  test('shows es-CO messages instead of raw schema errors', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Correo').fill('no-es-un-correo');
    await page.getByLabel('Contraseña', { exact: true }).fill('corta');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page.getByText('Escribe un correo válido.')).toBeVisible();
    await expect(page.getByText('Debe tener al menos 8 caracteres.')).toBeVisible();
    await expect(page.getByText(/Invalid email|String must contain/)).toHaveCount(0);
  });
});
