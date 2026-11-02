import { test, expect } from '@fixtures';
import { MODULES, moduleName } from '@config/modules';
import { OPENABLE_SCREENS, breadcrumbOf } from '@data/screens';
import { DataList } from '@components/DataList';
import { TAG } from '@utils/tags';

/** The sidebar menu: its groups, and reaching one screen of every module through it. */
test.describe('Sidebar menu', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.open();
  });

  test('lists the module groups the role is granted', { tag: [TAG.smoke] }, async ({ sideMenu }) => {
    await sideMenu.ensureOpen();
    const groups = await sideMenu.rootGroupLabels();
    expect(groups.length, 'at least one module in the menu').toBeGreaterThan(0);
    const known = new Set(OPENABLE_SCREENS.map((s) => s.module));
    for (const group of groups) expect(known, `menu group "${group}" is in the screen catalog (npm run sync:screens)`).toContain(group);
  });

  // One screen per module, through the menu clicks a user would make. Every test here
  // starts on the dashboard, so there is nothing to navigate to for that module.
  const folders = Object.keys(MODULES).filter((f) => f !== 'dashboard' && OPENABLE_SCREENS.some((s) => s.folder === f));
  for (const folder of folders) {
    const target = OPENABLE_SCREENS.find((s) => s.folder === folder && s.layout === 'list') ?? OPENABLE_SCREENS.find((s) => s.folder === folder)!;

    test(`${moduleName(folder)}: opens ${target.label} from the menu`, { tag: [TAG.regression] }, async ({ sideMenu, topbar, page }) => {
      await sideMenu.ensureOpen();
      test.skip(!(await sideMenu.hasScreen(target.path)), `${target.label} is not in this user's menu (role)`);

      await sideMenu.open(target);
      await expect.poll(() => topbar.breadcrumbTrail(), { timeout: 45_000 }).toEqual(breadcrumbOf(target));
      if (target.layout === 'list') await new DataList(page).expectVisible(target.label);
      await expect(sideMenu.screenLink(target.path).first()).toHaveClass(/active-route/);
    });
  }
});
