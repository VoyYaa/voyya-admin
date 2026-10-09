import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export type Theme = 'light' | 'dark';

export const THEMES: Theme[] = ['light', 'dark'];

const CONTRAST_AND_LABEL_RULES = ['color-contrast', 'label'];

export async function forceTheme(page: Page, theme: Theme): Promise<void> {
  await page.addInitScript((value) => {
    window.localStorage.setItem('voyya_admin_theme', value);
  }, theme);
}

export async function settle(page: Page): Promise<void> {
  await page.waitForTimeout(1300);
}

export async function auditAccessibility(page: Page): Promise<void> {
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

export async function measureUndersizedTargets(page: Page): Promise<string[]> {
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
