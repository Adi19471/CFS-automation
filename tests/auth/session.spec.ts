import { test, expect } from '@fixtures';
import { env, requireCredentials } from '@config/env';
import { LoginPage } from '@pages/auth/LoginPage';
import { TAG } from '@utils/tags';

/**
 * Signed-in session behaviour. Tests that sign out or sign in again do it in a
 * context of their own, so the saved session the other tests use is untouched.
 */
test.describe('Session', () => {
  test('the saved sign-in opens the dashboard with the user in the top bar', { tag: [TAG.smoke] }, async ({ dashboardPage }) => {
    await dashboardPage.open();
    expect(await dashboardPage.topbar.signedInUser()).not.toBe('');
  });

  test('opening /login while signed in goes to the dashboard', { tag: [TAG.regression] }, async ({ page }) => {
    await page.goto(env.appUrl('/login'));
    await expect.poll(() => env.routeOf(page.url())).toBe('/');
  });

  test('logout ends the session and protects the screens again', { tag: [TAG.regression] }, async ({ dashboardPage, page }) => {
    await dashboardPage.open();
    await dashboardPage.topbar.logout();
    await expect(page).toHaveURL(/\/login/);
    await new LoginPage(page).expectVisible();

    await page.goto(env.appUrl('/commercial/customer-registration'));
    await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  });

  test('a sign-in returns to the screen that asked for it', { tag: [TAG.regression] }, async ({ browser }) => {
    const { username, password } = requireCredentials();
    const context = await browser.newContext({ ignoreHTTPSErrors: env.ignoreHttpsErrors, viewport: { width: 1536, height: 864 } });
    try {
      const page = await context.newPage();
      await page.goto(env.appUrl('/marine/vessel-registration'));
      await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fmarine%2Fvessel-registration/);
      await new LoginPage(page).signInAndWait(username, password);
      await expect.poll(() => env.routeOf(page.url())).toBe('/marine/vessel-registration');
    } finally {
      await context.close();
    }
  });

  test('without an open tab the sign-in no longer counts', { tag: [TAG.regression] }, async ({ context, page }) => {
    // lib/tab-lease.ts: when the cfs_tab cookie has lapsed (every tab of the app closed),
    // the next page request deletes the login cookies and shows the login page.
    await context.clearCookies({ name: 'cfs_tab' });
    await page.goto(env.appUrl('/'));
    await expect(page).toHaveURL(/\/login/);
    const sessionCookies = (await context.cookies()).filter((c) => /next-auth\.session-token/.test(c.name) && c.value);
    expect(sessionCookies, 'login cookies cleared by the app').toEqual([]);
  });
});
