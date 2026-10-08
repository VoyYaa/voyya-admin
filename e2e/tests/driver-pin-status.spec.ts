import { expect, test, type Page } from '@playwright/test';
import { ADMIN_AUTH_FILE } from '../env';
import { mockQueueRows } from '../fixtures/queue-mock';
import { mockOpsDrivers, type OpsDriversMock } from '../fixtures/settlement-mock';

test.use({ storageState: ADMIN_AUTH_FILE });

async function openDrivers(page: Page): Promise<OpsDriversMock> {
  const mock = await mockOpsDrivers(page);
  await page.goto('/ops/drivers');
  await expect(page.getByRole('row', { name: /Carlos Mejía/ })).toBeVisible();
  return mock;
}

function rowOf(page: Page, name: RegExp) {
  return page.getByRole('row', { name });
}

test.describe('driver PIN status', () => {
  test('shows a status badge per driver, with text and not only color', async ({ page }) => {
    await openDrivers(page);
    await expect(page.getByRole('columnheader', { name: 'PIN' })).toBeVisible();

    await expect(rowOf(page, /Carlos Mejía/)).toContainText('PIN personal');
    await expect(rowOf(page, /Diana Ríos/)).toContainText('PIN temporal');
    await expect(rowOf(page, /Diana Ríos/)).not.toContainText('PIN temporal vencido');
    await expect(rowOf(page, /Luis Ospina/)).toContainText('PIN temporal vencido');
    await expect(rowOf(page, /Marta Gil/)).toContainText('PIN no entregado');
  });

  test('offers the resend action in the row only when the PIN is unusable', async ({ page }) => {
    await openDrivers(page);
    await expect(
      rowOf(page, /Luis Ospina/).getByRole('button', { name: 'Reenviar PIN a Luis Ospina' }),
    ).toBeVisible();
    await expect(
      rowOf(page, /Marta Gil/).getByRole('button', { name: 'Reenviar PIN a Marta Gil' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reenviar PIN a Diana Ríos' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reenviar PIN a Carlos Mejía' })).toHaveCount(0);
  });

  test('resends a not-delivered PIN without confirmation and reports the expiry', async ({
    page,
  }) => {
    const mock = await openDrivers(page);
    await page.getByRole('button', { name: 'Reenviar PIN a Marta Gil' }).click();
    await expect(page.getByText(/^PIN reenviado\. Vence el /)).toBeVisible();
    expect(mock.resendCalls).toEqual([4]);
  });

  test('asks for confirmation before replacing a temporary PIN that expired', async ({ page }) => {
    const mock = await openDrivers(page);
    await page.getByRole('button', { name: 'Reenviar PIN a Luis Ospina' }).click();
    const dialog = page.getByRole('dialog', { name: 'Reenviar PIN' });
    await expect(dialog).toContainText(
      'Reenviar el PIN reemplaza el actual de Luis Ospina y cierra sus sesiones. Tendrá que crear un PIN nuevo.',
    );
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    expect(mock.resendCalls).toEqual([]);

    await page.getByRole('button', { name: 'Reenviar PIN a Luis Ospina' }).click();
    await dialog.getByRole('button', { name: 'Reenviar PIN' }).click();
    await expect(page.getByText(/^PIN reenviado\. Vence el /)).toBeVisible();
    expect(mock.resendCalls).toEqual([3]);
  });

  test('shows the SMS failure with a retry', async ({ page }) => {
    const mock = await openDrivers(page);
    mock.resendDeliveryFailed(true);
    await page.getByRole('button', { name: 'Reenviar PIN a Marta Gil' }).click();
    const alert = page.getByRole('alert').filter({ hasText: 'No se pudo enviar el PIN.' });
    await expect(alert).toContainText('El PIN anterior ya no sirve; vuelve a intentarlo.');

    mock.resendDeliveryFailed(false);
    await alert.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByText(/^PIN reenviado\. Vence el /)).toBeVisible();
  });

  test('explains a lost connection while resending', async ({ page }) => {
    const mock = await openDrivers(page);
    mock.failNextResend({ status: 0, network: true });
    await page.getByRole('button', { name: 'Reenviar PIN a Marta Gil' }).click();
    await expect(page.getByRole('alert')).toContainText('Sin conexión: no se reenvió el PIN.');
  });

  test('describes the temporary PIN and allows resending from the drawer', async ({ page }) => {
    const mock = await openDrivers(page);
    await page.getByRole('button', { name: 'Ver detalle de Diana Ríos' }).click();
    const drawer = page.getByRole('dialog', { name: 'Detalle del conductor' });
    await expect(drawer).toContainText('Aún no crea su PIN. Vence el ');
    await drawer.getByRole('button', { name: 'Reenviar PIN a Diana Ríos' }).click();
    await page
      .getByRole('dialog', { name: 'Reenviar PIN' })
      .getByRole('button', { name: 'Reenviar PIN' })
      .click();
    await expect(page.getByText(/^PIN reenviado\. Vence el /)).toBeVisible();
    expect(mock.resendCalls).toEqual([2]);
  });

  test('also lets an admin resend a personal PIN from the drawer', async ({ page }) => {
    await openDrivers(page);
    await page.getByRole('button', { name: 'Ver detalle de Carlos Mejía' }).click();
    const drawer = page.getByRole('dialog', { name: 'Detalle del conductor' });
    await expect(drawer).toContainText('Ya creó su PIN personal.');
    await expect(drawer.getByRole('button', { name: 'Reenviar PIN a Carlos Mejía' })).toBeVisible();
  });
});

test.describe('trip detail with purged addresses', () => {
  test('explains why the addresses are missing', async ({ page }) => {
    await mockQueueRows(page, [9004]);
    await page.goto('/ops/queue');
    await page.getByRole('button', { name: /Ver detalle de la solicitud de Andrés/ }).click();
    const drawer = page.getByRole('dialog', { name: 'Detalle de la solicitud' });
    await expect(drawer.getByText('Dirección eliminada por política de retención.')).toHaveCount(2);
  });
});
