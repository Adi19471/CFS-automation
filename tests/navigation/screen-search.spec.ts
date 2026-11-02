import { test, expect } from '@fixtures';
import { env } from '@config/env';
import { TAG } from '@utils/tags';

/** The screen search in the top bar (Ctrl+K): every menu screen by name. */
test.describe('Screen search', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.open();
  });

  test('Ctrl+K puts the cursor in the search box', { tag: [TAG.regression] }, async ({ topbar, page }) => {
    await page.locator('body').click({ position: { x: 5, y: 300 } });
    await topbar.focusSearchWithShortcut();
    await expect(topbar.searchInput).toBeFocused();
  });

  test('finds a screen by part of its name and opens it', { tag: [TAG.smoke] }, async ({ topbar, page }) => {
    const labels = await topbar.searchScreens('Customer Reg');
    expect(labels).toContain('Customer Registration');
    await topbar.openFromSearch('Customer Registration');
    await expect.poll(() => env.routeOf(page.url())).toBe('/commercial/customer-registration');
  });

  test('suggestions show where the screen sits in the menu', { tag: [TAG.regression] }, async ({ topbar }) => {
    await topbar.searchScreens('Country');
    const option = topbar.searchOptions.filter({ hasText: /^Country/ }).first();
    await expect(option.locator('.topbar-search-item-path')).toContainText('Admin');
  });

  test('a name that matches nothing offers nothing', { tag: [TAG.regression] }, async ({ topbar, page }) => {
    await topbar.searchInput.click();
    await topbar.searchInput.fill('zzqx-no-such-screen');
    await page.waitForTimeout(600);
    await expect(topbar.searchOptions).toHaveCount(0);
  });
});
