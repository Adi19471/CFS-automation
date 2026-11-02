import { test, expect } from '@fixtures';
import { screen } from '@data/screens';
import { TAG } from '@utils/tags';

/**
 * EDI: the messages received from and sent to the lines, the records from Customs,
 * and the configuration behind them. Read-only: the row action "Reprocess message"
 * sends a message again, so it is only looked at, and the configuration's Save and
 * Add line are never pressed.
 */
const INBOUND = screen('/edi/inbound-messages');
const OUTBOUND = screen('/edi/outbound-messages');
const CUSTOMS = screen('/edi/customs-integration');
const CONFIGURATION = screen('/edi/configuration');

/** One page of the list holds 50 rows, so a tab's count only equals the rows up to that. */
const ROWS_PER_PAGE = 50;

test.describe('EDI Inbound Messages', () => {
  test('lists each message with its outcome', { tag: [TAG.sanity] }, async ({ menuScreen }) => {
    const inbound = menuScreen(INBOUND);
    await inbound.open();
    await expect(inbound.list.subtitle).toHaveText('EDI messages received, with the outcome of each');
    const columns = await inbound.list.columnHeaders();
    for (const column of ['Message ID', 'Severity Code', 'Actions']) expect(columns, `column "${column}"`).toContain(column);
    expect(await inbound.list.tabNames()).toEqual(['All', 'Success', 'Failed', 'Pending']);
  });

  test('each severity tab shows as many rows as it counts', { tag: [TAG.regression] }, async ({ menuScreen }) => {
    const inbound = menuScreen(INBOUND);
    await inbound.open();
    for (const name of await inbound.list.tabNames()) {
      await inbound.list.selectTab(name);
      const count = await inbound.list.tabCount(name);
      await expect.poll(() => inbound.list.rowCount(), { message: `rows on "${name}"` }).toBe(Math.min(count ?? 0, ROWS_PER_PAGE));
    }
  });

  test('Search Criteria offers the message fields', { tag: [TAG.regression] }, async ({ menuScreen }) => {
    const inbound = menuScreen(INBOUND);
    await inbound.open();
    const labels = await inbound.list.criteriaLabels();
    for (const label of ['Message ID', 'Voyage #', 'Vessel Name', 'Booking #', 'Transaction Type', 'From Date Time', 'To Date Time']) expect(labels, `field "${label}"`).toContain(label);
  });

  test('a message opens its status details', { tag: [TAG.regression] }, async ({ menuScreen }) => {
    const inbound = menuScreen(INBOUND);
    await inbound.open();
    test.skip((await inbound.list.rowCount()) === 0, 'No inbound messages to open');
    await inbound.list.rowAction(inbound.list.row(0), 'View status details').click();
    const dialog = inbound.dialogTitled('Message Status Details');
    await expect(dialog).toBeVisible();
    await inbound.closeDialog(dialog);
  });

  test('a message opens from its Message ID', { tag: [TAG.regression] }, async ({ menuScreen, page }) => {
    const inbound = menuScreen(INBOUND);
    await inbound.open();
    test.skip((await inbound.list.rowCount()) === 0, 'No inbound messages to open');
    await page.getByTitle('Open the message').first().click();
    const dialog = inbound.dialogTitled('Message Details');
    await expect(dialog).toBeVisible();
    await inbound.closeDialog(dialog);
  });
});

test.describe('EDI Outbound Messages', () => {
  test('lists each message with its delivery outcome', { tag: [TAG.sanity] }, async ({ menuScreen }) => {
    const outbound = menuScreen(OUTBOUND);
    await outbound.open();
    await expect(outbound.list.subtitle).toHaveText('EDI messages sent to the lines, with the delivery outcome of each');
    const columns = await outbound.list.columnHeaders();
    for (const column of ['Message ID', 'Attempts', 'Generated At', 'Posted At', 'Delivery Status', 'Actions']) expect(columns, `column "${column}"`).toContain(column);
    expect(await outbound.list.tabNames()).toEqual(['All', 'Delivered', 'Errors']);
  });

  test('each delivery tab shows as many rows as it counts', { tag: [TAG.regression] }, async ({ menuScreen }) => {
    const outbound = menuScreen(OUTBOUND);
    await outbound.open();
    for (const name of await outbound.list.tabNames()) {
      await outbound.list.selectTab(name);
      const count = await outbound.list.tabCount(name);
      await expect.poll(() => outbound.list.rowCount(), { message: `rows on "${name}"` }).toBe(Math.min(count ?? 0, ROWS_PER_PAGE));
    }
  });

  test('Search Criteria offers the message and delivery fields', { tag: [TAG.regression] }, async ({ menuScreen }) => {
    const outbound = menuScreen(OUTBOUND);
    await outbound.open();
    const labels = await outbound.list.criteriaLabels();
    for (const label of ['From Date', 'To Date', 'Message ID', 'Message Type', 'Transaction Type', 'Client Code', 'Vessel Name', 'Voyage #', 'Booking #', 'BL #', 'Delivery Status']) {
      expect(labels, `field "${label}"`).toContain(label);
    }
  });

  test('a message offers Reprocess (not pressed: it sends the message again)', { tag: [TAG.regression] }, async ({ menuScreen }) => {
    const outbound = menuScreen(OUTBOUND);
    await outbound.open();
    test.skip((await outbound.list.rowCount()) === 0, 'No outbound messages to look at');
    await expect(outbound.list.rowAction(outbound.list.row(0), 'Reprocess message')).toBeVisible();
  });
});

test.describe('EDI Customs Integration', () => {
  test('lists the records received from Customs', { tag: [TAG.sanity] }, async ({ menuScreen }) => {
    const customs = menuScreen(CUSTOMS);
    await customs.open();
    await expect(customs.list.subtitle).toHaveText('Bill of entry, IGM and out-of-charge records received from Customs');
    expect(await customs.list.columnHeaders()).toContain('ICD Code');
  });

  test('Search Criteria offers the Customs fields', { tag: [TAG.regression] }, async ({ menuScreen }) => {
    const customs = menuScreen(CUSTOMS);
    await customs.open();
    const labels = await customs.list.criteriaLabels();
    for (const label of ['ICD Code', 'BL Number', 'Container Number', 'IGM Number', 'From Date', 'To Date']) expect(labels, `field "${label}"`).toContain(label);
  });
});

test.describe('EDI Configuration', () => {
  const VIEWS = ['Shipping lines', 'Default settings', 'Event types & rules', 'Change history'] as const;

  test('opens on the four configuration views', { tag: [TAG.sanity] }, async ({ menuScreen, page }) => {
    await menuScreen(CONFIGURATION).open();
    const views = page.getByRole('tablist', { name: 'EDI configuration' }).getByRole('tab');
    await expect(views).toHaveCount(VIEWS.length);
    for (const [index, name] of VIEWS.entries()) await expect(views.nth(index)).toHaveText(name);
  });

  test('every view opens without an error', { tag: [TAG.regression] }, async ({ menuScreen, page }) => {
    const configuration = menuScreen(CONFIGURATION);
    await configuration.open();
    for (const name of VIEWS) {
      const view = page.getByRole('tablist', { name: 'EDI configuration' }).getByRole('tab', { name, exact: true });
      await view.click();
      await expect(view, name).toHaveAttribute('aria-selected', 'true');
      expect(await configuration.toast.visibleErrors(), `error toasts on "${name}"`).toEqual([]);
    }
  });

  test('Shipping lines can be searched', { tag: [TAG.regression] }, async ({ menuScreen, page }) => {
    await menuScreen(CONFIGURATION).open();
    const search = page.getByPlaceholder('Find a line');
    await search.fill('zz-pw-no-such-line-zz');
    await expect(page.locator('.edicfg-line-list .cfs-state-title')).toHaveText('No lines');
  });
});
