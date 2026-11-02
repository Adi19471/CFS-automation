import { test, expect } from '@fixtures';
import { buildCustomer } from '@data/testdata/customer.data';
import { TAG } from '@utils/tags';

/**
 * Creates a real customer. @write: runs only with ALLOW_WRITES=true and never on
 * production. The record is named "PW Customer …" so it is easy to find and
 * remove afterwards; CFS has no delete for customers, so it is left Inactive.
 */
test.describe('Customer Registration — create', () => {
  test.describe.configure({ mode: 'serial' });

  test('a new customer is saved and found in the list', { tag: [TAG.write, TAG.regression] }, async ({ customerFormPage, customerRegistrationPage }) => {
    const customer = buildCustomer();

    await test.step('fill in the form', async () => {
      await customerFormPage.openNew();
      await customerFormPage.fillCustomer(customer);
      await customerFormPage.select('Active', 'No');
    });

    await test.step('save', async () => {
      await customerFormPage.save();
      await customerFormPage.toast.expectShown({ severity: 'success', summary: /Success|Customer saved/, timeout: 30_000 });
    });

    await test.step('the customer is in the list', async () => {
      await customerRegistrationPage.open();
      await customerRegistrationPage.searchFor(customer.name);
      const row = customerRegistrationPage.list.rowContaining(customer.name);
      await expect(row).toBeVisible();
      expect(await customerRegistrationPage.statusOf(row)).toBe('Inactive');
    });
  });
});
