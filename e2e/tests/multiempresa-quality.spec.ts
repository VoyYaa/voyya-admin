import { expect, test, type Page } from '@playwright/test';
import {
  THEMES,
  auditAccessibility,
  forceTheme,
  measureUndersizedTargets,
  settle,
} from '../fixtures/a11y';
import {
  companyDetail,
  mockAdminSettings,
  mockCatalog,
  mockCommissions,
  mockCompanies,
  mockServiceConfigs,
  openAs,
} from '../fixtures/multiempresa-mock';
import { GUEST_STATE } from '../fixtures/session';

test.use({ storageState: GUEST_STATE });

interface Scene {
  name: string;
  open: (page: Page) => Promise<void>;
}

async function platformSetup(page: Page): Promise<void> {
  await openAs(page, 'platform_admin');
  await mockCompanies(page);
}

const PLATFORM_SCENES: Scene[] = [
  {
    name: 'rates list',
    open: async (page) => {
      await platformSetup(page);
      await mockServiceConfigs(page);
      await page.goto('/platform/rates');
      await expect(page.getByText('Puerto Sur')).toBeVisible();
    },
  },
  {
    name: 'rate detail (read)',
    open: async (page) => {
      await platformSetup(page);
      await mockServiceConfigs(page);
      await page.goto('/platform/rates/1/taxi');
      await expect(page.getByText('Versión inicial').first()).toBeVisible();
    },
  },
  {
    name: 'rate detail (official, read)',
    open: async (page) => {
      await platformSetup(page);
      await mockServiceConfigs(page);
      await page.goto('/platform/rates/2/taxi');
      await expect(page.getByText('Referencia: Decreto 045 de 2026')).toBeVisible();
    },
  },
  {
    name: 'rate detail (edit with errors)',
    open: async (page) => {
      await platformSetup(page);
      await mockServiceConfigs(page);
      await page.goto('/platform/rates/2/taxi');
      await page.getByRole('button', { name: 'Editar valores' }).click();
      await page.getByRole('spinbutton', { name: 'Tarifa base' }).fill('500');
      await page.getByRole('radio', { name: /^Oficial/ }).check();
      await page.getByLabel('Referencia del acto (opcional)').fill('ab');
      await page.getByRole('button', { name: 'Revisar y guardar' }).click();
      await expect(page.getByText('fuera del rango permitido').first()).toBeVisible();
    },
  },
  {
    name: 'rate detail (confirm dialog)',
    open: async (page) => {
      await platformSetup(page);
      await mockServiceConfigs(page);
      await page.goto('/platform/rates/1/taxi');
      await page.getByRole('button', { name: 'Editar valores' }).click();
      await page.getByRole('spinbutton', { name: 'Tarifa base' }).fill('9000');
      await page.getByRole('button', { name: 'Revisar y guardar' }).click();
      await expect(
        page.getByRole('dialog', { name: '¿Guardar la nueva versión de la tarifa?' }),
      ).toBeVisible();
    },
  },
  {
    name: 'rate detail (conflict dialog)',
    open: async (page) => {
      await platformSetup(page);
      const mock = await mockServiceConfigs(page);
      await page.goto('/platform/rates/1/taxi');
      await page.getByRole('button', { name: 'Editar valores' }).click();
      await page.getByRole('spinbutton', { name: 'Tarifa base' }).fill('9000');
      mock.changeUnderneath({ base_fare: 8500 });
      await page.getByRole('button', { name: 'Revisar y guardar' }).click();
      await page.getByRole('button', { name: 'Guardar versión' }).click();
      await expect(
        page.getByRole('dialog', { name: 'La tarifa cambió mientras editabas' }),
      ).toBeVisible();
    },
  },
  {
    name: 'commissions list',
    open: async (page) => {
      await platformSetup(page);
      await mockCommissions(page);
      await page.goto('/platform/commissions');
      await expect(page.getByText('Transportes del Sur')).toBeVisible();
    },
  },
  {
    name: 'commission drawer',
    open: async (page) => {
      await platformSetup(page);
      await mockCommissions(page);
      await page.goto('/platform/commissions');
      await page.getByRole('button', { name: 'Editar la comisión de Cooperativa Norte' }).click();
      await expect(page.getByRole('dialog', { name: /^Comisión de / })).toContainText('Ana Ruiz');
    },
  },
  {
    name: 'commission confirm over the drawer',
    open: async (page) => {
      await platformSetup(page);
      await mockCommissions(page);
      await page.goto('/platform/commissions');
      await page.getByRole('button', { name: 'Editar la comisión de Cooperativa Norte' }).click();
      await page.getByLabel('Comisión por viaje (%)').fill('10');
      await page.getByRole('button', { name: 'Revisar y guardar' }).click();
      await expect(
        page.getByRole('dialog', { name: '¿Cambiar la comisión de Cooperativa Norte?' }),
      ).toBeVisible();
    },
  },
  {
    name: 'companies list with coverage pending',
    open: async (page) => {
      await openAs(page, 'platform_admin');
      await mockCompanies(page);
      await page.goto('/platform/companies');
      await expect(
        page.getByRole('row', { name: /Movilidad del Puerto/ }).getByText('Cobertura pendiente'),
      ).toBeVisible();
    },
  },
  {
    name: 'company detail with the approve panel',
    open: async (page) => {
      await openAs(page, 'platform_admin');
      await mockCompanies(page);
      await page.goto('/platform/companies/7');
      await page.getByRole('button', { name: 'Aprobar empresa' }).click();
      await page.getByLabel('Comisión de la empresa (%)').fill('60');
      await expect(page.getByText('fuera del rango permitido (0 a 50 %)')).toBeVisible();
    },
  },
  {
    name: 'company detail without coverage or fare',
    open: async (page) => {
      await openAs(page, 'platform_admin');
      await mockCompanies(
        page,
        undefined,
        companyDetail({
          municipality_coverage_active: false,
          coverage_pending_since: '2026-09-20T10:00:00.000Z',
          municipality_fares: [{ service_type: 'taxi', fare: null }],
          municipality_active_companies: [],
        }),
      );
      await page.goto('/platform/companies/7');
      await page.getByRole('button', { name: 'Aprobar empresa' }).click();
      await expect(page.getByLabel('Tarifa base inicial')).toBeVisible();
    },
  },
];

const ADMIN_SCENES: Scene[] = [
  {
    name: 'admin settings (official)',
    open: async (page) => {
      await mockAdminSettings(page, {
        fare_is_official: true,
        fare_official_reference: 'Decreto 045 de 2026',
      });
      await page.goto('/admin/settings');
      await expect(page.getByText('Referencia: Decreto 045 de 2026')).toBeVisible();
    },
  },
  {
    name: 'admin settings (unofficial)',
    open: async (page) => {
      await mockAdminSettings(page);
      await page.goto('/admin/settings');
      await expect(page.getByText('La tarifa es provisional.', { exact: false })).toBeVisible();
    },
  },
  {
    name: 'admin settings (403 not an error)',
    open: async (page) => {
      await mockAdminSettings(page, {}, { forbidden: true });
      await page.goto('/admin/settings');
      await expect(
        page.getByText('Estos valores los define VoyYa para todo el municipio.'),
      ).toBeVisible();
    },
  },
];

async function chooseMunicipality(page: Page, department: string, name: string): Promise<void> {
  await page.getByLabel('Departamento').selectOption({ label: department });
  await page.getByRole('combobox', { name: 'Municipio' }).click();
  await page.getByRole('listbox').getByRole('option', { name, exact: true }).click();
}

const GUEST_SCENES: Scene[] = [
  {
    name: 'affiliation picker (municipality disabled)',
    open: async (page) => {
      await mockCatalog(page);
      await page.goto('/afiliacion');
      await expect(page.getByLabel('Departamento')).toBeVisible();
    },
  },
  {
    name: 'affiliation picker (list open)',
    open: async (page) => {
      await mockCatalog(page);
      await page.goto('/afiliacion');
      await page.getByLabel('Departamento').selectOption({ label: 'Antioquia' });
      await page.getByRole('combobox', { name: 'Municipio' }).click();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await expect(page.getByRole('listbox')).toBeVisible();
    },
  },
  {
    name: 'affiliation picker (no results)',
    open: async (page) => {
      await mockCatalog(page);
      await page.goto('/afiliacion');
      await page.getByLabel('Departamento').selectOption({ label: 'Antioquia' });
      await page.getByRole('combobox', { name: 'Municipio' }).fill('zzzz');
      await expect(
        page.getByText('No encontramos ese municipio en Antioquia.', { exact: false }).first(),
      ).toBeVisible();
    },
  },
  {
    name: 'affiliation picker (neutral note)',
    open: async (page) => {
      await mockCatalog(page);
      await page.goto('/afiliacion');
      await chooseMunicipality(page, 'Antioquia', 'Villa Norte');
      await expect(page.locator('#municipality-notes')).toContainText('ya operan otras empresas');
    },
  },
  {
    name: 'affiliation picker (no coverage notice)',
    open: async (page) => {
      await mockCatalog(page);
      await page.goto('/afiliacion');
      await chooseMunicipality(page, 'Antioquia', 'Santa Rosa de Osos');
      await expect(page.locator('#municipality-notes')).toContainText('Aún no hay cobertura');
    },
  },
  {
    name: 'affiliation picker (department required)',
    open: async (page) => {
      await mockCatalog(page);
      await page.goto('/afiliacion');
      await page.getByLabel('Departamento').focus();
      await page.getByLabel('Razón social').focus();
      await expect(page.getByText('Elige tu departamento.')).toBeVisible();
    },
  },
  {
    name: 'affiliation picker (municipality required)',
    open: async (page) => {
      await mockCatalog(page);
      await page.goto('/afiliacion');
      await page.getByLabel('Departamento').selectOption({ label: 'Antioquia' });
      await page.getByRole('combobox', { name: 'Municipio' }).focus();
      await page.getByLabel('Razón social').focus();
      await expect(page.getByText('Elige tu municipio de la lista.')).toBeVisible();
    },
  },
  {
    name: 'affiliation picker (catalog error)',
    open: async (page) => {
      const mock = await mockCatalog(page);
      mock.failCatalog({ status: 500 });
      await page.goto('/afiliacion');
      await expect(page.getByText('No pudimos cargar los municipios.')).toBeVisible();
    },
  },
  {
    name: 'affiliation picker (offline notice)',
    open: async (page) => {
      const mock = await mockCatalog(page);
      mock.failCatalog({ status: 0, network: true });
      await page.goto('/afiliacion');
      await expect(page.getByText('Sin conexión. Cuando vuelva', { exact: false })).toBeVisible();
    },
  },
  {
    name: 'affiliation service checkboxes',
    open: async (page) => {
      const mock = await mockCatalog(page);
      mock.setActiveServices(['taxi', 'delivery']);
      await page.goto('/afiliacion');
      await page.getByRole('checkbox', { name: 'Taxi' }).uncheck();
      await expect(page.getByText('Elige al menos un servicio.')).toBeVisible();
    },
  },
];

function register(scenes: Scene[]): void {
  for (const scene of scenes) {
    for (const theme of THEMES) {
      test(`axe: ${scene.name} (${theme}) has no serious or critical violations`, async ({
        page,
      }) => {
        await forceTheme(page, theme);
        await scene.open(page);
        await settle(page);
        await expect(page.locator('html')).toHaveClass(
          theme === 'dark' ? /dark/ : /^(?!.*dark).*$/,
        );
        await auditAccessibility(page);
      });
    }

    test(`touch targets: ${scene.name} is at least 44px`, async ({ page }) => {
      await scene.open(page);
      await settle(page);
      expect(await measureUndersizedTargets(page)).toEqual([]);
    });
  }
}

test.describe('platform screens', () => {
  register(PLATFORM_SCENES);
});

test.describe('tenant admin screens', () => {
  register(ADMIN_SCENES);
});

test.describe('guest screens', () => {
  register(GUEST_SCENES);
});

test.describe('municipality picker at 360px', () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test('keeps every target at 44px, never overflows and fits the list in the viewport', async ({
    page,
  }) => {
    await mockCatalog(page);
    await page.goto('/afiliacion');
    await page.getByLabel('Departamento').selectOption({ label: 'Antioquia' });
    await page.getByRole('combobox', { name: 'Municipio' }).click();
    const list = page.getByRole('listbox');
    await expect(list).toBeVisible();

    expect(await measureUndersizedTargets(page)).toEqual([]);
    const options = list.getByRole('option');
    for (let index = 0; index < (await options.count()); index += 1) {
      const box = await options.nth(index).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    const listBox = await list.boundingBox();
    expect(listBox?.width ?? 0).toBeLessThanOrEqual(360);
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows).toBe(false);
    await auditAccessibility(page);
  });
});

test.describe('platform tables at 1024px', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  for (const path of ['/platform/rates', '/platform/commissions', '/platform/companies']) {
    test(`${path} fits without horizontal scrolling`, async ({ page }) => {
      await platformSetup(page);
      await mockServiceConfigs(page);
      await mockCommissions(page);
      await page.goto(path);
      await expect(page.locator('main table')).toBeVisible();
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflows).toBe(false);
      const scrollers = await page.evaluate(() => {
        const offenders: string[] = [];
        document.querySelectorAll<HTMLElement>('main, main *').forEach((element) => {
          const style = window.getComputedStyle(element);
          const scrolls = style.overflowX === 'auto' || style.overflowX === 'scroll';
          if (scrolls && element.scrollWidth > element.clientWidth + 1) {
            offenders.push(element.tagName.toLowerCase());
          }
        });
        return offenders;
      });
      expect(scrollers).toEqual([]);
    });
  }
});
