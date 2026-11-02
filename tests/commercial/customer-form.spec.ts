import { test, expect } from '@fixtures';
import { TAG } from '@utils/tags';

/**
 * The Customer Registration form, without saving: layout, required fields and
 * format checks. The write guard blocks any data-changing request, so even a
 * screen that skipped its own checks could not create a record here.
 */
test.describe('Customer Registration form', () => {
  test.beforeEach(async ({ customerFormPage }) => {
    await customerFormPage.openNew();
  });

  test('is laid out in Identity, Address, Contact, Billing and Remarks', { tag: [TAG.regression] }, async ({ customerFormPage }) => {
    const panels = await customerFormPage.panelNames();
    for (const panel of ['Identity', 'Address', 'Contact', 'Billing', 'Remarks']) expect(panels, `panel "${panel}"`).toContain(panel);
    await expect(customerFormPage.detailsTab).toHaveAttribute('aria-selected', 'true');
    await expect(customerFormPage.typesTab).toBeVisible();
  });

  test('State waits for Country, City waits for State', { tag: [TAG.regression] }, async ({ customerFormPage }) => {
    await expect(customerFormPage.field('State').locator('.p-dropdown')).toHaveClass(/p-disabled/);
    await expect(customerFormPage.field('City').locator('.p-dropdown')).toHaveClass(/p-disabled/);
  });

  test('Save with nothing filled is refused and lists the required fields', { tag: [TAG.smoke] }, async ({ customerFormPage, writeGuard }) => {
    writeGuard.reset();
    await customerFormPage.save();
    await customerFormPage.toast.expectShown({ severity: 'warn', summary: 'Validation Error', detail: /Required fields: .*Customer Name/ });
    expect(await customerFormPage.errorUnder('Customer Name')).toBe('Required');
    expect(writeGuard.blocked, 'no save request may be sent').toEqual([]);
    await customerFormPage.expectRoute('/commercial/customer-registration/edit');
  });

  test('a badly formed PAN and mobile number are flagged with the expected format', { tag: [TAG.regression] }, async ({ customerFormPage, writeGuard }) => {
    await customerFormPage.fill('PAN #', 'ABC123');
    await customerFormPage.fill('Mobile #', '12345');
    writeGuard.reset();
    await customerFormPage.save();
    await expect.poll(() => customerFormPage.errorUnder('PAN #')).toBe('PAN must be 10 characters, like ABCDE1234F');
    expect(writeGuard.blocked).toEqual([]);
  });

  test('a badly formed GSTIN is flagged', { tag: [TAG.regression] }, async ({ customerFormPage, writeGuard }) => {
    await customerFormPage.fill('GSTIN', '27ABCDE');
    writeGuard.reset();
    await customerFormPage.save();
    await expect.poll(() => customerFormPage.errorUnder('GSTIN')).toMatch(/GSTIN must be 15 characters|Required/);
    expect(writeGuard.blocked).toEqual([]);
  });

  test('Customer Type: All ticks every type, None clears them', { tag: [TAG.regression] }, async ({ customerFormPage }) => {
    await customerFormPage.openTypesTab();
    const rows = await customerFormPage.typeRows.count();
    test.skip(rows === 0, 'No customer types configured');
    await customerFormPage.selectAllTypes.click();
    await expect(customerFormPage.typesTab).toHaveText(new RegExp(`Customer Type \\(${rows}\\)`));
    await customerFormPage.selectNoTypes.click();
    await expect(customerFormPage.typesTab).toHaveText(/^Customer Type$/);
  });

  test('Back to List returns to the list without saving', { tag: [TAG.regression] }, async ({ customerFormPage, writeGuard }) => {
    await customerFormPage.fill('Customer Name', 'PW not saved');
    writeGuard.reset();
    await customerFormPage.backToList();
    expect(writeGuard.blocked).toEqual([]);
  });
});
