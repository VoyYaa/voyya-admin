import type { Page } from '@playwright/test';

export type MockRole = 'admin' | 'platform_admin';

const ADMIN_USER = {
  user_id: 3,
  first_name: 'Admin',
  last_name: 'VoyYa',
  role: 'admin',
  tenant: {
    company_id: 1,
    company_name: 'Cooperativa Norte',
    municipality_id: 1,
    municipality_name: 'Villa Norte',
  },
  profile_complete: true,
  pin_change_required: false,
};

const PLATFORM_USER = {
  user_id: 1,
  first_name: 'Plataforma',
  last_name: 'VoyYa',
  role: 'platform_admin',
  tenant: null,
  profile_complete: true,
  pin_change_required: false,
};

export const GUEST_STATE = { cookies: [], origins: [] };

export async function seedSession(page: Page, role: MockRole): Promise<void> {
  const user = role === 'admin' ? ADMIN_USER : PLATFORM_USER;
  await page.addInitScript((payload) => {
    window.localStorage.setItem('voyya_admin_user', JSON.stringify(payload));
    window.localStorage.setItem('voyya_admin_access_token', 'mock-access-token');
    window.localStorage.setItem('voyya_admin_refresh_token', 'mock-refresh-token');
    window.localStorage.setItem(
      'voyya_admin_access_token_expires_at',
      String(Date.now() + 6 * 60 * 60 * 1000),
    );
  }, user);
}
