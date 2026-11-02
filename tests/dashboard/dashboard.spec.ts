import { test, expect } from '@fixtures';
import { breadcrumbOf, screen } from '@data/screens';
import { DashboardPage } from '@pages/dashboard/DashboardPage';
import { checkScreenOpens, moduleScreens, screenTags, screenTitle } from '@utils/screen-checks';
import { TAG } from '@utils/tags';

/** Both dashboards of the menu open cleanly, like every other screen. */
const { screens, smoke } = moduleScreens('dashboard');

test.describe('Dashboard screens', () => {
  for (const target of screens) {
    test(screenTitle(target), { tag: screenTags(target, smoke) }, async ({ menuScreen, topbar, browserIssues }) => {
      await checkScreenOpens({ screen: target, menuScreen, topbar, browserIssues });
    });
  }
});

/** The home screen: KPI cards, then section cards. */
test.describe('Dashboard', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.open();
  });

  test('shows the four KPI cards', { tag: [TAG.smoke] }, async ({ dashboardPage }) => {
    for (const label of DashboardPage.KPI_LABELS) {
      await expect(dashboardPage.kpiCard(label), `KPI card "${label}"`).toBeVisible();
    }
  });

  test('KPI figures load (no card left on its placeholder)', { tag: [TAG.regression] }, async ({ dashboardPage }) => {
    for (const label of DashboardPage.KPI_LABELS) {
      await expect.poll(() => dashboardPage.kpiValue(label), { message: `${label} figure`, timeout: 30_000 }).toMatch(/^[\d,.]+/);
    }
  });

  test('shows every section card', { tag: [TAG.smoke] }, async ({ dashboardPage }) => {
    for (const title of DashboardPage.SECTION_TITLES) {
      await expect(dashboardPage.section(title), `section "${title}"`).toBeVisible();
    }
  });

  test('breadcrumb and title name the dashboard', { tag: [TAG.regression] }, async ({ dashboardPage }) => {
    await expect(dashboardPage.heading).toBeAttached();
    expect(await dashboardPage.topbar.breadcrumbTrail()).toEqual(['Dashboard']);
    await expect(dashboardPage.topbar.backButton, 'no back button on the home screen').toHaveCount(0);
  });

  test('Container Movement switches between periods', { tag: [TAG.regression] }, async ({ dashboardPage }) => {
    const periods = await dashboardPage.movementPeriodNames();
    expect(periods.length, 'period buttons').toBeGreaterThan(1);
    for (const name of periods) await dashboardPage.selectMovementPeriod(name);
  });

  test('Recent Gate Transactions can be filtered', { tag: [TAG.regression] }, async ({ dashboardPage }) => {
    await expect(dashboardPage.gateTransactionsFilter).toBeVisible();
    await dashboardPage.gateTransactionsFilter.fill('PW-NO-SUCH-TRUCK');
    await expect(dashboardPage.gateTransactionsFilter).toHaveValue('PW-NO-SUCH-TRUCK');
    await dashboardPage.gateTransactionsFilter.fill('');
  });

  test('loads without error toasts or page errors', { tag: [TAG.regression] }, async ({ dashboardPage, browserIssues, page }) => {
    await page.waitForTimeout(1500);
    expect(await dashboardPage.toast.visibleErrors()).toEqual([]);
    expect(browserIssues.uncaught).toEqual([]);
  });
});

/** The year-to-date dashboard: figures per month, under Dashboards in the menu. */
test.describe('YTD Dashboard', () => {
  const YTD = screen('/dashboard/ytd');

  test('shows the year so far by service and by customer service', { tag: [TAG.sanity] }, async ({ menuScreen, topbar, page }) => {
    await menuScreen(YTD).open();
    await expect(page.getByRole('heading', { name: 'YTD Dashboard', level: 1 })).toBeAttached();
    expect(await topbar.breadcrumbTrail()).toEqual(breadcrumbOf(YTD));
    await expect(page.locator('.cfs-section-title', { hasText: 'Service Wise Handled' })).toBeVisible();
    await expect(page.locator('.cfs-section-title', { hasText: 'Customer Services by Month' })).toBeVisible();
  });

  test('loads without error toasts or page errors', { tag: [TAG.regression] }, async ({ menuScreen, browserIssues, page }) => {
    const ytd = menuScreen(YTD);
    await ytd.open();
    await page.waitForTimeout(1500);
    expect(await ytd.toast.visibleErrors()).toEqual([]);
    expect(browserIssues.uncaught).toEqual([]);
  });
});
