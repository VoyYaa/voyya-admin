import { expect, test } from '@playwright/test';

function encodeBase64UrlPayload(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
}

function expiredAffiliationToken(): string {
  const oneHourAgoInSeconds = Math.floor(Date.now() / 1000) - 3_600;
  const payload = { companyId: 1, exp: oneHourAgoInSeconds };
  return `${encodeBase64UrlPayload(payload)}.e2e-fake-signature`;
}

test.describe('affiliation documents reload link — client-side token states', () => {
  test('a missing token shows the missing-link screen', async ({ page }) => {
    await page.goto('/afiliacion/documentos');
    await expect(
      page.getByRole('alert', { name: 'Este enlace no tiene la información necesaria.' }),
    ).toBeVisible();
  });

  test('a malformed token shows the invalid-link screen', async ({ page }) => {
    await page.goto('/afiliacion/documentos?token=not-a-real-token');
    await expect(page.getByRole('alert', { name: 'Este enlace no es válido.' })).toBeVisible();
  });

  test('an expired token shows the expired-link screen', async ({ page }) => {
    await page.goto(`/afiliacion/documentos?token=${expiredAffiliationToken()}`);
    await expect(page.getByRole('alert', { name: 'Este enlace venció.' })).toBeVisible();
  });
});
