import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ADMIN_AUTH_FILE, PLATFORM_ADMIN_AUTH_FILE } from '../env';
import { mockQueueRows } from '../fixtures/queue-mock';

type Theme = 'light' | 'dark';

const THEMES: Theme[] = ['light', 'dark'];
const GUEST_STATE = { cookies: [], origins: [] };
const CONTRAST_AND_LABEL_RULES = ['color-contrast', 'label'];

interface Scene {
  name: string;
  open: (page: Page) => Promise<void>;
}

async function forceTheme(page: Page, theme: Theme): Promise<void> {
  await page.addInitScript((value) => {
    window.localStorage.setItem('voyya_admin_theme', value);
  }, theme);
}

async function settle(page: Page): Promise<void> {
  await page.waitForTimeout(1300);
}

const GUEST_SCENES: Scene[] = [
  {
    name: 'login',
    open: async (page) => {
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    },
  },
  {
    name: 'affiliation application',
    open: async (page) => {
      await page.goto('/afiliacion');
      await expect(
        page.getByRole('heading', { name: 'Afilia tu empresa de taxis a VoyYa' }),
      ).toBeVisible();
    },
  },
  {
    name: 'affiliation invalid link',
    open: async (page) => {
      await page.goto('/afiliacion/documentos?token=not-a-real-token');
      await expect(page.getByRole('alert').first()).toBeVisible();
    },
  },
];

const ADMIN_SCENES: Scene[] = [
  {
    name: 'ops queue',
    open: async (page) => {
      await mockQueueRows(page);
      await page.goto('/ops/queue');
      await expect(page.getByRole('row', { name: /Laura Restrepo/ })).toBeVisible();
    },
  },
  {
    name: 'ops queue trip drawer',
    open: async (page) => {
      await mockQueueRows(page);
      await page.goto('/ops/queue');
      await page.getByRole('button', { name: /Ver detalle de la solicitud de Mateo/ }).click();
      await expect(page.getByRole('dialog', { name: 'Detalle de la solicitud' })).toBeVisible();
      await expect(page.getByText('Línea de tiempo')).toBeVisible();
    },
  },
  {
    name: 'ops drivers',
    open: async (page) => {
      await page.goto('/ops/drivers');
      await expect(page.getByRole('button', { name: /^Ver detalle de / }).first()).toBeVisible();
    },
  },
  {
    name: 'ops drivers drawer',
    open: async (page) => {
      await page.goto('/ops/drivers');
      await page
        .getByRole('button', { name: /^Ver detalle de / })
        .first()
        .click();
      await expect(page.getByRole('dialog', { name: 'Detalle del conductor' })).toBeVisible();
      await expect(page.getByText('Cédula')).toBeVisible();
    },
  },
  {
    name: 'admin settings',
    open: async (page) => {
      await page.goto('/admin/settings');
      await expect(page.getByRole('spinbutton', { name: 'Tarifa base' })).toBeVisible();
    },
  },
  {
    name: 'admin new driver',
    open: async (page) => {
      await page.goto('/admin/drivers/new');
      await expect(page.getByRole('heading', { name: 'Registrar conductor' })).toBeVisible();
    },
  },
];

const PLATFORM_SCENES: Scene[] = [
  {
    name: 'platform companies',
    open: async (page) => {
      await page.goto('/platform/companies');
      await expect(page.getByRole('heading', { name: 'Empresas' })).toBeVisible();
      await page.getByLabel('Filtrar por estado').selectOption('all');
      await expect(page.getByRole('button', { name: /^Ver detalle de / }).first()).toBeVisible();
    },
  },
  {
    name: 'platform company detail',
    open: async (page) => {
      await page.goto('/platform/companies');
      await page.getByLabel('Filtrar por estado').selectOption('all');
      await page
        .getByRole('button', { name: /^Ver detalle de / })
        .first()
        .click();
      await page.waitForURL(/\/platform\/companies\/\d+$/);
      await expect(page.getByText('Documentos legales')).toBeVisible();
    },
  },
];

async function auditAccessibility(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = results.violations.filter(
    (violation) =>
      violation.impact === 'serious' ||
      violation.impact === 'critical' ||
      CONTRAST_AND_LABEL_RULES.includes(violation.id),
  );
  const summary = blocking.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(' '))
        .join(' | ')}`,
  );
  expect(summary, summary.join('\n')).toEqual([]);
}

async function measureUndersizedTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const minimum = 44;
    const selector = 'button, a[href], input, select, textarea, [role=button], [role=tab]';
    const failures: string[] = [];
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      const style = window.getComputedStyle(element);
      if (style.visibility === 'hidden' || style.display === 'none') return;
      const isCheckable =
        element instanceof HTMLInputElement &&
        (element.type === 'checkbox' || element.type === 'radio');
      const target = isCheckable ? (element.closest('label') ?? element) : element;
      const rect = target.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1) return;
      if (target.closest('[data-compact-chrome]')) return;
      if (rect.height + 0.5 < minimum) {
        const label = element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '';
        failures.push(
          `${element.tagName.toLowerCase()} "${label.slice(0, 40)}" ${Math.round(rect.height)}px`,
        );
      }
    });
    return failures;
  });
}

function registerSceneTests(scenes: Scene[]): void {
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

test.describe('guest screens', () => {
  test.use({ storageState: GUEST_STATE });
  registerSceneTests(GUEST_SCENES);
});

test.describe('tenant admin screens', () => {
  test.use({ storageState: ADMIN_AUTH_FILE });
  registerSceneTests(ADMIN_SCENES);
});

test.describe('platform admin screens', () => {
  test.use({ storageState: PLATFORM_ADMIN_AUTH_FILE });
  registerSceneTests(PLATFORM_SCENES);
});

async function findHorizontalOverflow(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const offenders: string[] = [];
    document.querySelectorAll<HTMLElement>('main, main *').forEach((element) => {
      const style = window.getComputedStyle(element);
      const scrolls = style.overflowX === 'auto' || style.overflowX === 'scroll';
      if (scrolls && element.scrollWidth > element.clientWidth + 1) {
        offenders.push(
          `${element.tagName.toLowerCase()}.${element.className.toString().slice(0, 50)}`,
        );
      }
    });
    return offenders;
  });
}

test.describe('layout at 1024px', () => {
  test.use({ viewport: { width: 1024, height: 768 }, storageState: ADMIN_AUTH_FILE });

  test('the ops tables fit without horizontal scrolling', async ({ page }) => {
    await mockQueueRows(page);
    await page.goto('/ops/queue');
    await expect(page.getByRole('row', { name: /Laura Restrepo/ })).toBeVisible();
    expect(await findHorizontalOverflow(page)).toEqual([]);

    await page.goto('/ops/drivers');
    await expect(page.getByRole('button', { name: /^Ver detalle de / }).first()).toBeVisible();
    expect(await findHorizontalOverflow(page)).toEqual([]);
  });
});

test.describe('layout at 1024px (platform)', () => {
  test.use({ viewport: { width: 1024, height: 768 }, storageState: PLATFORM_ADMIN_AUTH_FILE });

  test('the companies table fits without horizontal scrolling', async ({ page }) => {
    await page.goto('/platform/companies');
    await page.getByLabel('Filtrar por estado').selectOption('all');
    await expect(page.getByRole('button', { name: /^Ver detalle de / }).first()).toBeVisible();
    expect(await findHorizontalOverflow(page)).toEqual([]);
  });
});

test.describe('reduced motion', () => {
  test.use({ storageState: ADMIN_AUTH_FILE, reducedMotion: 'reduce' });

  test('no animation runs on the queue, the drawer or the login', async ({ page }) => {
    await mockQueueRows(page);
    await page.goto('/ops/queue');
    await expect(page.getByRole('row', { name: /Laura Restrepo/ })).toBeVisible();
    await settle(page);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);

    await page.getByRole('button', { name: /Ver detalle de la solicitud de Mateo/ }).click();
    await expect(page.getByRole('dialog', { name: 'Detalle de la solicitud' })).toBeVisible();
    await settle(page);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  });

  test('the public pages and the login are still on reduced motion', async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: 'reduce',
      storageState: GUEST_STATE,
    });
    const page = await context.newPage();
    try {
      for (const path of ['/login', '/afiliacion']) {
        await page.goto(path);
        await settle(page);
        expect(await page.evaluate(() => document.getAnimations().length), path).toBe(0);
      }
    } finally {
      await context.close();
    }
  });
});

test.describe('overlays', () => {
  test.use({ storageState: ADMIN_AUTH_FILE });

  test('Tab never leaves the suspend dialog and focus returns to its trigger on close', async ({
    page,
  }) => {
    await page.goto('/ops/drivers');
    const viewButtons = page.getByRole('button', { name: /^Ver detalle de / });
    await expect(viewButtons.first()).toBeVisible({ timeout: 15_000 });
    await viewButtons.first().click();
    const trigger = page.getByRole('button', { name: 'Suspender conductor' });
    await trigger.waitFor({ state: 'visible' });
    await trigger.click();

    const dialog = page.getByRole('dialog', { name: '¿Suspender a este conductor?' });
    await expect(dialog).toBeVisible();

    for (let step = 0; step < 8; step += 1) {
      await page.keyboard.press('Tab');
      const insideDialog = await page.evaluate(() => {
        const active = document.activeElement;
        return Boolean(
          active?.closest('[role="dialog"][aria-labelledby]')?.textContent?.includes('¿Suspender'),
        );
      });
      expect(insideDialog, `Tab ${step + 1} salió del diálogo`).toBe(true);
    }
    for (let step = 0; step < 4; step += 1) {
      await page.keyboard.press('Shift+Tab');
      const insideDialog = await page.evaluate(() =>
        Boolean(
          document.activeElement?.closest('[role="dialog"]')?.textContent?.includes('¿Suspender'),
        ),
      );
      expect(insideDialog, `Shift+Tab ${step + 1} salió del diálogo`).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('dialog', { name: 'Detalle del conductor' })).toBeVisible();
    await expect(trigger).toBeFocused();
  });

  test('clicking the backdrop closes the confirm dialog without confirming', async ({ page }) => {
    let suspendCalls = 0;
    await page.route(/\/admin\/drivers\/\d+\/suspend$/, async (route) => {
      suspendCalls += 1;
      await route.continue();
    });
    await page.goto('/ops/drivers');
    await page
      .getByRole('button', { name: /^Ver detalle de / })
      .first()
      .click();
    await page.getByRole('button', { name: 'Suspender conductor' }).click();
    const dialog = page.getByRole('dialog', { name: '¿Suspender a este conductor?' });
    await expect(dialog).toBeVisible();
    await page.mouse.click(30, 450);
    await expect(dialog).toBeHidden();
    expect(suspendCalls).toBe(0);
  });
});

test.describe('theme selector', () => {
  test.use({ storageState: ADMIN_AUTH_FILE });

  test('switches to dark, persists it and keeps it after a reload', async ({ page }) => {
    await page.goto('/ops/queue');
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    await page.getByRole('button', { name: /^Admin/ }).click();
    await page.getByRole('menuitemradio', { name: 'Oscuro' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    expect(await page.evaluate(() => window.localStorage.getItem('voyya_admin_theme'))).toBe(
      'dark',
    );

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.getByRole('button', { name: /^Admin/ }).click();
    await page.getByRole('menuitemradio', { name: 'Claro' }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});
