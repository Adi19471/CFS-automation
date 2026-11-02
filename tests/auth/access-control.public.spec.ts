import { test, expect } from '@fixtures';
import { env } from '@config/env';
import { TAG } from '@utils/tags';

/**
 * Signed out, the app lets nobody past /login (middleware.ts): screens redirect
 * to the login page with ?callbackUrl, API calls get a JSON 401, and only the
 * branding and company theme can be read.
 */
test.describe('Signed-out access', () => {
  test('the dashboard redirects to the login page', { tag: [TAG.public, TAG.smoke] }, async ({ page, loginPage }) => {
    await page.goto(env.appUrl('/'));
    await expect(page).toHaveURL(/\/CFS\/login(\?|$)/);
    await loginPage.expectVisible();
  });

  for (const path of ['/commercial/customer-registration', '/operations/gate-operations', '/admin/geography/country']) {
    test(`${path} redirects to login and remembers where to return`, { tag: [TAG.public, TAG.regression] }, async ({ page, loginPage }) => {
      await page.goto(env.appUrl(path));
      await expect(page).toHaveURL(/\/CFS\/login\?/);
      expect(new URL(page.url()).searchParams.get('callbackUrl')).toBe(path);
      await loginPage.expectVisible();
    });
  }

  test('the backend proxy answers 401 JSON, not the login page', { tag: [TAG.public, TAG.regression] }, async ({ request }) => {
    const response = await request.get(env.appUrl('/api/backend/masterData/countries'), { maxRedirects: 0 });
    expect(response.status()).toBe(401);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(await response.json()).toMatchObject({ error: 'Unauthorized' });
  });

  test('the company theme and branding are readable for the login page', { tag: [TAG.public, TAG.regression] }, async ({ request }) => {
    for (const route of ['/api/company-theme', '/api/branding-settings']) {
      const response = await request.get(env.appUrl(route));
      expect(response.status(), `${route} status`).toBe(200);
      expect(response.headers()['content-type'], `${route} content type`).toContain('application/json');
    }
  });

  test('writing the company theme needs a sign-in', { tag: [TAG.public, TAG.regression] }, async ({ request }) => {
    const response = await request.post(env.appUrl('/api/company-theme'), { data: {}, maxRedirects: 0 });
    expect(response.status()).toBe(401);
  });

  test('the session endpoint reports no user', { tag: [TAG.public, TAG.regression] }, async ({ request }) => {
    const response = await request.get(env.appUrl('/api/auth/session'));
    expect(response.ok()).toBe(true);
    const session = (await response.json()) as { user?: unknown };
    expect(session.user).toBeUndefined();
  });

  test('an unknown screen also asks for a sign-in first', { tag: [TAG.public, TAG.regression] }, async ({ page }) => {
    await page.goto(env.appUrl('/no-such-screen-pw'));
    await expect(page).toHaveURL(/\/CFS\/login/);
  });
});
