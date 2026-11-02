import { test, expect } from '@fixtures';
import { env } from '@config/env';
import { TAG } from '@utils/tags';

/** Top bar controls other than the search. */
test.describe('Top bar', () => {
  test('profile menu shows the user, Appearance and Logout', { tag: [TAG.regression] }, async ({ dashboardPage, topbar }) => {
    await dashboardPage.open();
    const user = await topbar.signedInUser();
    await topbar.openProfileMenu();
    await expect(topbar.profileMenu.locator('.topbar-profile-name')).toHaveText(user);
    await expect(topbar.appearanceLink).toBeVisible();
    await expect(topbar.logoutLink).toBeVisible();
  });

  test('dark mode toggles and back', { tag: [TAG.regression] }, async ({ dashboardPage, topbar }) => {
    await dashboardPage.open();
    const before = await topbar.colorScheme();
    await topbar.colorSchemeToggle.click();
    await expect.poll(() => topbar.colorScheme()).not.toBe(before);
    await topbar.colorSchemeToggle.click();
    await expect.poll(() => topbar.colorScheme()).toBe(before);
  });

  test('notifications open a panel of recent activity', { tag: [TAG.regression] }, async ({ dashboardPage, topbar }) => {
    await dashboardPage.open();
    await topbar.openNotifications();
    await expect(topbar.notificationsPanel.locator('.cfs-notif-head')).toContainText('Notifications');
    await expect(topbar.notificationsPanel.locator('.cfs-notif-count')).not.toHaveText('loading…', { timeout: 30_000 });
  });

  test('the back button returns to the previous screen', { tag: [TAG.regression] }, async ({ dashboardPage, customerRegistrationPage, page }) => {
    await dashboardPage.open();
    await customerRegistrationPage.open();
    await customerRegistrationPage.topbar.backButton.click();
    await expect.poll(() => env.routeOf(page.url())).toBe('/');
  });

  test('an unknown screen shows the not-found page', { tag: [TAG.regression] }, async ({ page, dashboardPage }) => {
    await page.goto(env.appUrl('/pw-no-such-screen'));
    expect(await dashboardPage.state.waitForAccess()).toBe('not-found');
    await expect(page.getByRole('button', { name: 'Go back to home' })).toBeVisible();
  });
});
