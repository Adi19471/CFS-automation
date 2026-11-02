import { test, expect, type BrowserIssues } from '@fixtures';
import type { Page } from '@playwright/test';
import { SANITY_SCREENS } from '@config/modules';
import type { Topbar } from '@components/Topbar';
import { breadcrumbOf, screenOpensTitle, screensIn, type Screen } from '@data/screens';
import type { AdminMasterPage } from '@pages/admin/AdminMasterPage';
import { skipUnlessGranted } from '@pages/BasePage';
import type { FormScreenPage } from '@pages/common/FormScreenPage';
import type { MenuScreenPage } from '@pages/common/MenuScreenPage';
import { TAG, type Tag } from './tags';
import { WriteGuard } from './write-guard';

/**
 * Shared checks for the per-module screen specs. The specs declare the tests
 * themselves (so every report groups them under their module's folder) and
 * call these for the body. Screens come from src/data/screens.json
 * (npm run sync:screens).
 *
 * Which level a test runs at follows its screen: the module's first list screen
 * opens in @smoke, the screens in SANITY_SCREENS run in @sanity, the rest in
 * @regression. Nothing here saves: forms and dialogs are only checked up to their
 * validation, and those steps run behind a write guard.
 */

/** Text no record contains, for searching a list down to nothing. */
const NO_MATCH = 'zz-pw-no-such-record-zz';

/**
 * Forms whose Save has nothing to refuse on an empty record, so the empty-Save step
 * would really send a request. Other Cargo Services saves a request with no lines;
 * New Invoice saves the charges found by a search, and does nothing without any.
 */
const SAVES_WHEN_EMPTY = new Set(['/operations/other-cargo-services', '/invoice/invoices']);

/** A module's screens, sorted by what can be checked on them, and the one that also runs in @smoke (its first list screen). */
export function moduleScreens(folder: string): { screens: Screen[]; smoke?: Screen; lists: Screen[]; forms: Screen[]; dialogScreens: Screen[] } {
  const screens = screensIn(folder);
  if (!screens.length) throw new Error(`No screens for folder "${folder}" in src/data/screens.json — run npm run sync:screens`);
  const unknown = (SANITY_SCREENS[folder] ?? []).filter((path) => !screens.some((s) => s.path === path));
  if (unknown.length) throw new Error(`SANITY_SCREENS.${folder} lists screens the menu does not have: ${unknown.join(', ')}`);
  return {
    screens,
    smoke: screens.find((s) => s.layout === 'list') ?? screens.find((s) => s.layout !== 'missing'),
    lists: screens.filter((s) => s.layout === 'list'),
    forms: screens.filter((s) => s.form === 'page'),
    dialogScreens: screens.filter((s) => s.form === 'dialog' && s.layout === 'list'),
  };
}

/** @sanity for the module's core screens, @regression for the others. */
export function levelTag(s: Screen): Tag {
  return SANITY_SCREENS[s.folder]?.includes(s.path) ? TAG.sanity : TAG.regression;
}

export function screenTags(s: Screen, smoke?: Screen): Tag[] {
  return [TAG.screens, s === smoke ? TAG.smoke : levelTag(s)];
}

export function screenTitle(s: Screen): string {
  return screenOpensTitle(s);
}

/**
 * Opens a menu screen straight from its URL and checks what every CFS screen
 * promises: it opens (a screen the role does not grant is skipped), list and
 * header screens carry their menu name, the breadcrumb is the menu trail, and
 * no error toast or uncaught page error follows the load.
 */
export async function checkScreenOpens(args: { screen: Screen; menuScreen: (s: Screen) => MenuScreenPage; topbar: Topbar; browserIssues: BrowserIssues }): Promise<void> {
  const { screen: s, menuScreen, topbar, browserIssues } = args;

  if (s.layout === 'missing') {
    test.fail(true, `Known defect: the menu entry "${s.label}" links to ${s.path}, which has no page. Remove this once the page exists or the entry is gone.`);
  }

  const screenPage = menuScreen(s);
  const check = await test.step(`open ${s.path}`, () => screenPage.openAndInspect());
  test.info().annotations.push({ type: 'load', description: `${check.loadMs} ms${typeof check.records === 'number' ? ` · ${check.records} records` : ''}` });
  skipUnlessGranted(check.access, s.label);

  await test.step('title and breadcrumb follow the menu', async () => {
    if (s.layout === 'list' || s.layout === 'header') expect(check.title, 'screen title = menu name').toBe(s.label);
    expect(await topbar.breadcrumbTrail(), 'breadcrumb = menu trail').toEqual(breadcrumbOf(s));
  });

  await test.step('no errors on screen', async () => {
    expect(check.errorToasts, 'error toasts shown after the screen loaded').toEqual([]);
    expect(await screenPage.state.hasCrashed(), 'Next.js error page').toBe(false);
    expect(browserIssues.uncaught, 'uncaught errors in the page').toEqual([]);
  });
}

export function listToolsTitle(s: Screen): string {
  return `${s.label}: search, filters, columns, density and export work`;
}

/**
 * What every DataList promises, on a real screen: search narrows the rows and gives
 * them back, the filter row and a column can be hidden and restored, row density
 * switches, every quick tab can be chosen and Export offers its formats. A list can
 * turn each of these off, so a tool that is not on the screen is noted, not failed.
 * Export only opens its menu; nothing is downloaded or changed.
 */
export async function checkListTools(args: { screen: Screen; menuScreen: (s: Screen) => MenuScreenPage }): Promise<void> {
  const { screen: s, menuScreen } = args;
  const screenPage = menuScreen(s);
  await screenPage.open();
  const { list } = screenPage;
  const note = (description: string): void => {
    test.info().annotations.push({ type: 'note', description });
  };

  await test.step('search', async () => {
    if (!(await list.searchInput.isVisible())) return note('No search box on this list');
    const before = await list.rowCount();
    await list.search(NO_MATCH);
    await expect(list.dataRows, 'a search that matches nothing leaves no rows').toHaveCount(0);
    await list.clearSearch();
    await expect(list.dataRows, 'clearing the search brings the rows back').toHaveCount(before);
  });

  await test.step('filter row', async () => {
    if (!(await list.filtersToggle.isVisible())) return note('No column filters on this list');
    await expect(list.filterRow, 'filter row shows by default').toBeVisible();
    await list.toggleFilterRow();
    await expect(list.filterRow, 'Filters hides the row').toBeHidden();
    await list.toggleFilterRow();
    await expect(list.filterRow, 'Filters shows the row again').toBeVisible();
  });

  await test.step('column picker', async () => {
    if (!(await list.columnsButton.isVisible())) return note('No column picker on this list');
    const [choice] = (await list.columnChoices()).filter((name) => name && name !== 'Actions');
    if (!choice) return note('Column picker offers nothing to hide');
    const columnCount = async () => (await list.columnHeaders()).length;
    const before = await columnCount();
    await list.toggleColumn(choice);
    await expect.poll(columnCount, { message: `"${choice}" changes the columns` }).not.toBe(before);
    await list.toggleColumn(choice);
    await expect.poll(columnCount, { message: `"${choice}" comes back` }).toBe(before);
  });

  await test.step('row density', async () => {
    if (!(await list.densityButton.isVisible())) return note('No density switch on this list');
    const before = await list.isDense();
    await list.toggleDensity();
    await expect.poll(() => list.isDense()).toBe(!before);
    await list.toggleDensity();
    await expect.poll(() => list.isDense()).toBe(before);
  });

  await test.step('quick tabs', async () => {
    const names = await list.tabNames();
    if (!names.length) return note('No quick tabs on this list');
    for (const name of names) await list.selectTab(name);
    await list.selectTab(names[0]);
  });

  await test.step('export menu', async () => {
    if (!(await list.exportButton.isVisible())) return note('No Export on this list');
    if (!(await list.exportButton.isEnabled())) return note('Export is disabled on an empty list');
    const items = await list.exportMenuItems();
    for (const item of ['Excel (.xlsx)', 'CSV (.csv)', 'Print / PDF']) expect(items, `Export offers ${item}`).toContain(item);
  });

  await test.step('no errors on screen', async () => {
    expect(await screenPage.toast.visibleErrors(), 'error toasts after using the list').toEqual([]);
    expect(await screenPage.state.hasCrashed(), 'Next.js error page').toBe(false);
  });
}

export function newFormTitle(s: Screen): string {
  return `${s.label}: New form opens, refuses an empty Save and goes back`;
}

/**
 * A list screen's full-page form. "New" opens it, Save on the empty form is refused
 * by the screen, and Back returns to the list. The guard goes on just before Save:
 * earlier it would also stop the lookups that read with POST (…/search) and leave the
 * form half loaded. Any request Save sends is blocked, so nothing is created even if
 * a screen skipped its checks; the test then fails and names the request.
 */
export async function checkNewForm(args: { screen: Screen; formScreen: (s: Screen) => FormScreenPage; browserIssues: BrowserIssues; page: Page }): Promise<void> {
  const { screen: s, formScreen, browserIssues, page } = args;
  const form = formScreen(s);
  await form.open();
  test.skip(!(await form.list.newButton.isVisible()), `${s.label}: new records do not start from the list, or this user has no "New" button`);

  await test.step('New opens the empty form', async () => {
    await form.openNewFromList();
    await expect(form.saveButton, 'Save button').toBeVisible();
    expect(await form.topbar.breadcrumbTrail(), 'breadcrumb names the screen').toContain(s.label);
    expect(await form.toast.visibleErrors(), 'error toasts after the form loaded').toEqual([]);
  });

  if (SAVES_WHEN_EMPTY.has(s.path)) {
    test.info().annotations.push({ type: 'note', description: 'This form has nothing required on an empty record — Save is not pressed' });
  } else {
    await test.step('Save on the empty form is refused', async () => {
      const guard = await WriteGuard.install(page);
      await form.saveButton.click();
      await expect(form.refusal, 'a message about what is missing').toBeVisible();
      expect(guard.blocked, 'Save sent a request on an empty form').toEqual([]);
      await form.expectRoute(s.formPath);
      await guard.uninstall();
    });
  }

  await test.step('Back returns to the list', async () => {
    await form.backToList();
    await form.list.expectVisible(s.label);
  });
  expect(browserIssues.uncaught, 'uncaught errors in the page').toEqual([]);
}

export function editFormTitle(s: Screen): string {
  return `${s.label}: Edit opens an existing record`;
}

/** The first record of a list opens in its form with no error. Nothing is pressed there, so nothing is saved. */
export async function checkEditForm(args: { screen: Screen; formScreen: (s: Screen) => FormScreenPage; browserIssues: BrowserIssues }): Promise<void> {
  const { screen: s, formScreen, browserIssues } = args;
  const form = formScreen(s);
  await form.open();
  await form.openFirstRecordFromList();
  await test.step('the record loads', async () => {
    expect(await form.topbar.breadcrumbTrail(), 'breadcrumb names the screen').toContain(s.label);
    expect(await form.toast.visibleErrors(), 'error toasts after the record loaded').toEqual([]);
    expect(await form.state.hasCrashed(), 'Next.js error page').toBe(false);
    expect(browserIssues.uncaught, 'uncaught errors in the page').toEqual([]);
  });
}

export function dialogTitle(s: Screen): string {
  return `${s.label}: New dialog validates and cancels`;
}

/**
 * A screen that creates records in a FormDialog: "New" opens it, Save with the
 * required fields empty is refused by the screen, Cancel closes it. The write
 * guard goes on once the list has loaded (some lists read with POST) and blocks
 * every data-changing request, so nothing is created even if a screen skipped its
 * checks — the test then fails and names the request.
 */
export async function checkCreateDialog(args: { screen: Screen; adminMaster: (s: Screen) => AdminMasterPage; page: Page }): Promise<void> {
  const { screen: s, adminMaster, page } = args;
  const master = adminMaster(s);
  await master.open();
  test.skip(!(await master.list.newButton.isVisible()), `${s.label}: no "New" button for this user`);
  const writeGuard = await WriteGuard.install(page);

  await test.step('New opens the dialog', async () => {
    await master.openNewDialog();
    expect(await master.dialog.title(), 'dialog title').toMatch(/^New\b/);
    expect((await master.dialog.fieldLabels()).length, 'dialog has fields').toBeGreaterThan(0);
  });

  await test.step('Save with the required fields empty is refused', async () => {
    const emptyRequired: string[] = [];
    for (const label of await master.dialog.requiredFieldLabels()) {
      const input = master.dialog.input(label);
      if ((await input.count()) && (await input.isEditable()) && (await input.inputValue()) === '') emptyRequired.push(label);
    }
    if (!emptyRequired.length) {
      test.info().annotations.push({ type: 'note', description: 'No empty required text field to leave out — validation step not applicable' });
      return;
    }
    writeGuard.reset();
    await master.dialog.save();
    const feedback = master.dialog.fieldErrors.first().or(page.locator('.cfs-toast-warn, .cfs-toast-error').first());
    await expect(feedback, `a message about ${emptyRequired.join(', ')}`).toBeVisible();
    await expect(master.dialog.root, 'dialog stays open').toBeVisible();
    expect(writeGuard.blocked, 'Save sent a request with required fields empty').toEqual([]);
  });

  await test.step('Cancel closes it', async () => {
    await master.dialog.cancel();
  });
}

export function editDialogTitle(s: Screen): string {
  return `${s.label}: Edit dialog shows the record and cancels`;
}

/** The first record of a master opens filled in, and Cancel closes it. Save is never pressed. */
export async function checkEditDialog(args: { screen: Screen; adminMaster: (s: Screen) => AdminMasterPage }): Promise<void> {
  const { screen: s, adminMaster } = args;
  const master = adminMaster(s);
  await master.open();
  test.skip((await master.list.rowCount()) === 0, `${s.label}: no record to open`);
  test.skip(!(await master.list.rowAction(master.list.row(0), 'Edit').count()), `${s.label}: no Edit action for this user`);

  await test.step('Edit opens the record', async () => {
    await master.openEditDialog();
    await expect.poll(() => master.dialog.filledFieldCount(), { message: 'the dialog shows the record' }).toBeGreaterThan(0);
  });

  await test.step('Cancel closes it', async () => {
    await master.dialog.cancel();
  });
}

/** Text a custom screen must show once it has opened: its title and main controls. */
export async function checkLandmarks(args: { screen: Screen; menuScreen: (s: Screen) => MenuScreenPage; landmarks: readonly string[]; page: Page }): Promise<void> {
  const { screen: s, menuScreen, landmarks, page } = args;
  await menuScreen(s).open();
  for (const text of landmarks) {
    await expect(page.locator('.layout-content').getByText(text, { exact: true }).first(), `"${text}" on ${s.label}`).toBeVisible();
  }
}
