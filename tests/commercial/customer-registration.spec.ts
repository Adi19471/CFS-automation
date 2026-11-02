import { test, expect } from '@fixtures';
import { CustomerRegistrationPage } from '@pages/commercial/CustomerRegistrationPage';
import { TAG } from '@utils/tags';

/**
 * Commercial › Customer Registration — the reference list of CFS. Read-only:
 * nothing here saves.
 */
test.describe('Customer Registration list', () => {
  test.beforeEach(async ({ customerRegistrationPage }) => {
    await customerRegistrationPage.open();
  });

  test('shows the list with its title, record count and New Customer', { tag: [TAG.smoke] }, async ({ customerRegistrationPage: crp }) => {
    await expect(crp.list.title).toHaveText('Customer Registration');
    await expect(crp.list.totalChip).toHaveText(/\d[\d,]* Total Records/);
    await expect(crp.list.subtitle).toContainText('customer billing profiles');
    await expect(crp.list.newButton).toHaveText(/New Customer/);
    await expect(crp.list.exportButton).toBeVisible();
  });

  test('has the agreed columns, Status beside Actions on the right', { tag: [TAG.regression] }, async ({ customerRegistrationPage: crp }) => {
    const columns = await crp.dataColumns();
    for (const column of CustomerRegistrationPage.COLUMNS) expect(columns, `column "${column}"`).toContain(column);
    expect(columns.slice(-2), 'Status then Actions, last').toEqual(['Status', 'Actions']);
  });

  test('quick tabs: All = Active + Inactive', { tag: [TAG.regression] }, async ({ customerRegistrationPage: crp }) => {
    expect((await crp.list.tabLabels()).map((t) => t.replace(/\s*\(.*\)$/, ''))).toEqual([...CustomerRegistrationPage.TABS]);
    const all = await crp.list.tabCount('All');
    const active = await crp.list.tabCount('Active');
    const inactive = await crp.list.tabCount('Inactive');
    expect(all).toBe((active ?? 0) + (inactive ?? 0));
    expect(all).toBe(await crp.list.totalRecords());
  });

  test('the Active tab lists only active customers', { tag: [TAG.regression] }, async ({ customerRegistrationPage: crp }) => {
    await crp.list.selectTab('Active');
    test.skip((await crp.list.rowCount()) === 0, 'No active customers to check');
    const statuses = await crp.list.columnValues('Status', 25);
    expect(new Set(statuses)).toEqual(new Set(['Active']));
  });

  test('search narrows the list and Clear brings it back', { tag: [TAG.regression] }, async ({ customerRegistrationPage: crp }) => {
    const total = await crp.list.totalRecords();
    test.skip(total === 0, 'No customers to search');
    await expect(crp.list.searchInput).toHaveAttribute('placeholder', CustomerRegistrationPage.SEARCH_PLACEHOLDER);

    const name = await crp.list.cellText(0, 'Company Name');
    await crp.searchFor(name);
    await expect(crp.list.rowContaining(name)).toBeVisible();
    expect(await crp.list.rowCount()).toBeLessThanOrEqual(total);

    await crp.searchFor('zz-pw-no-such-customer-zz');
    await expect(crp.list.emptyState).toContainText('No matching records');

    await crp.list.clickClear();
    await expect(crp.list.searchInput).toHaveValue('');
    await expect.poll(() => crp.list.rowCount()).toBeGreaterThan(0);
  });

  test('the column picker hides and restores a column', { tag: [TAG.regression] }, async ({ customerRegistrationPage: crp }) => {
    await crp.list.toggleColumn('Mobile');
    await expect.poll(() => crp.dataColumns()).not.toContain('Mobile');
    await crp.list.toggleColumn('Mobile');
    await expect.poll(() => crp.dataColumns()).toContain('Mobile');
  });

  test('row density switches to compact and back', { tag: [TAG.regression] }, async ({ customerRegistrationPage: crp }) => {
    const before = await crp.list.isDense();
    await crp.list.toggleDensity();
    await expect.poll(() => crp.list.isDense()).toBe(!before);
    await crp.list.toggleDensity();
    await expect.poll(() => crp.list.isDense()).toBe(before);
  });

  test('Export offers Excel, CSV and Print / PDF', { tag: [TAG.regression] }, async ({ customerRegistrationPage: crp }) => {
    test.skip((await crp.list.totalRecords()) === 0, 'Export is disabled on an empty list');
    const items = await crp.list.exportMenuItems();
    for (const item of ['Excel (.xlsx)', 'CSV (.csv)', 'Print / PDF']) expect(items).toContain(item);
  });

  test('Export → CSV downloads the list', { tag: [TAG.regression] }, async ({ customerRegistrationPage: crp }) => {
    test.skip((await crp.list.totalRecords()) === 0, 'Export is disabled on an empty list');
    const download = await crp.list.download('CSV (.csv)');
    expect(download.suggestedFilename()).toMatch(/Customer_Registration.*\.csv$/i);
    const file = await download.path();
    expect(file, 'downloaded file').toBeTruthy();
  });

  test('View shows a customer without leaving the list', { tag: [TAG.regression] }, async ({ customerRegistrationPage: crp }) => {
    test.skip((await crp.list.rowCount()) === 0, 'No customers to view');
    const name = await crp.list.cellText(0, 'Company Name');
    const title = await crp.openView(crp.list.row(0));
    expect(title).toBe(name || 'Customer');
    await crp.closeView();
    await crp.expectRoute();
  });

  test('Edit opens the customer in the form', { tag: [TAG.regression] }, async ({ customerRegistrationPage: crp, customerFormPage }) => {
    test.skip((await crp.list.rowCount()) === 0, 'No customers to edit');
    await crp.openEdit(crp.list.row(0));
    await customerFormPage.header.expectTitle('Edit Customer Registration');
    await expect(customerFormPage.input('Customer Name')).not.toHaveValue('');
  });

  test('New Customer opens an empty form', { tag: [TAG.regression] }, async ({ customerRegistrationPage: crp, customerFormPage }) => {
    await crp.newCustomer();
    await customerFormPage.header.expectTitle('New Customer Registration');
    await expect(customerFormPage.input('Customer #')).toHaveAttribute('placeholder', 'Auto-generated');
  });
});
