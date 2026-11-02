import { test, expect } from '@fixtures';
import { screen } from '@data/screens';
import { TAG } from '@utils/tags';

/**
 * MNR: a repair estimate moves from Damage Estimate through approval and processing
 * to completed. The queues have their own list tests in mnr-screens.spec.ts; here is
 * how estimates start. Read-only: no estimate is created, submitted or approved.
 */
const DAMAGE_ESTIMATE = screen('/mnr/damage-estimate');

test.describe('Damage Estimate', () => {
  test('sorts estimates by where they stand', { tag: [TAG.sanity] }, async ({ menuScreen }) => {
    const estimates = menuScreen(DAMAGE_ESTIMATE);
    await estimates.open();
    expect(await estimates.list.tabNames()).toEqual(['All', 'Not Submitted', 'Awaiting Approval', 'Sent Back', 'Approved']);
    await expect(estimates.list.subtitle).toContainText('Repair estimates for damaged containers');
  });

  test('estimates start from a search for damaged containers', { tag: [TAG.sanity] }, async ({ menuScreen }) => {
    const estimates = menuScreen(DAMAGE_ESTIMATE);
    await estimates.open();
    await estimates.list.root.locator('.cfs-list-head-actions').getByRole('button', { name: 'Search Damaged Containers' }).click();
    const dialog = estimates.dialogTitled('Search Damaged Containers');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Search', exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toBeHidden();
  });
});
