import { test, expect } from '@fixtures';
import { screen } from '@data/screens';
import { TAG } from '@utils/tags';

/**
 * Invoice: the two stages of an invoice (proforma, finalized) and of a credit note.
 * Read-only: Bulk Print and Bulk Email are only looked at, and no invoice or note is
 * finalized, cancelled or e-mailed.
 */
const INVOICES = screen('/invoice/invoices');
const CREDIT_NOTES = screen('/invoice/credit-debit-notes');

test.describe('Invoice list', () => {
  test('opens on proforma invoices, with the finalized ones a tab away', { tag: [TAG.sanity] }, async ({ menuScreen }) => {
    const invoices = menuScreen(INVOICES);
    await invoices.open();
    await expect(invoices.list.subtitle).toHaveText('Proforma and finalized customer invoices');
    expect(await invoices.list.tabNames()).toEqual(['Proforma Invoices', 'Finalized Invoices']);
    const columns = await invoices.list.columnHeaders();
    for (const column of ['Proforma Invoice #', 'Proforma Date', 'Customer', 'Billing Party', 'Invoice Amount', 'Tax Amount', 'Actions']) expect(columns, `column "${column}"`).toContain(column);
  });

  test('Finalized Invoices shows invoice numbers, e-mail status and bulk actions', { tag: [TAG.sanity] }, async ({ menuScreen }) => {
    const invoices = menuScreen(INVOICES);
    await invoices.open();
    await invoices.list.selectTab('Finalized Invoices');
    await expect.poll(() => invoices.list.columnHeaders()).toContain('Invoice #');
    expect(await invoices.list.columnHeaders()).toContain('Email Status');
    const actions = invoices.list.root.locator('.cfs-list-head-actions');
    await expect(actions.getByRole('button', { name: 'Single / Bulk Print' })).toBeVisible();
    await expect(actions.getByRole('button', { name: 'Single / Bulk Email' })).toBeVisible();
  });

  test('Search Criteria offers the proforma fields', { tag: [TAG.regression] }, async ({ menuScreen }) => {
    const invoices = menuScreen(INVOICES);
    await invoices.open();
    const labels = await invoices.list.criteriaLabels();
    for (const label of ['From Date', 'To Date', 'Proforma Invoice #', 'Cancel']) expect(labels, `field "${label}"`).toContain(label);
  });

  test('Search Criteria offers the finalized fields', { tag: [TAG.regression] }, async ({ menuScreen }) => {
    const invoices = menuScreen(INVOICES);
    await invoices.open();
    await invoices.list.selectTab('Finalized Invoices');
    await expect.poll(() => invoices.list.columnHeaders()).toContain('Invoice #');
    const labels = await invoices.list.criteriaLabels();
    for (const label of ['From Date', 'To Date', 'Invoice #']) expect(labels, `field "${label}"`).toContain(label);
  });

  test('a proforma invoice opens its details', { tag: [TAG.regression] }, async ({ menuScreen }) => {
    const invoices = menuScreen(INVOICES);
    await invoices.open();
    test.skip((await invoices.list.rowCount()) === 0, 'No proforma invoices to open');
    await invoices.list.rowAction(invoices.list.row(0), 'Details').click();
    const dialog = invoices.dialogTitled(/^Proforma Invoice Details/);
    await expect(dialog).toBeVisible();
    await invoices.closeDialog(dialog);
  });
});

test.describe('Credit Debit Note list', () => {
  test('separates proforma credit notes from issued ones', { tag: [TAG.sanity] }, async ({ menuScreen }) => {
    const notes = menuScreen(CREDIT_NOTES);
    await notes.open();
    await expect(notes.list.subtitle).toHaveText('Proforma and issued credit / debit notes');
    expect(await notes.list.tabNames()).toEqual(['Proforma Credit Note', 'Credit Note']);
    const columns = await notes.list.columnHeaders();
    for (const column of ['Credit Note #', 'Type', 'Billing Party', 'Date', 'Actions']) expect(columns, `column "${column}"`).toContain(column);
  });
});
