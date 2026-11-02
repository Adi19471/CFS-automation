import { test, expect } from '@fixtures';
import { screen } from '@data/screens';
import { TAG } from '@utils/tags';
import { checkLandmarks, levelTag } from '@utils/screen-checks';

/**
 * Operations screens with a layout of their own (no DataList), which
 * operations-screens.spec.ts can only check for opening cleanly. These tests check
 * each one's title and main controls. Read-only: nothing is searched for, shifted
 * or saved.
 */
const LANDMARKS: Record<string, readonly string[]> = {
  '/operations/yard-ops': ['Yard Operations'],
  '/operations/yard-3d': ['3D Yard View'],
  '/operations/stuffing': ['Stuffing Management'],
  '/operations/rail': ['Rail Management'],
  '/operations/customs': ['Customs Management'],
  '/operations/container-service': ['Container Service', 'Search', 'Bulk Search', 'Reset', 'Activity', 'VIA (Voyage)', 'Liner', 'Origin (CFS)'],
  '/operations/container-shiftings': ['Container Shiftings', 'Reset', 'Refresh', 'Activity', 'VIA (Voyage)'],
};

test.describe('Operations custom screens', () => {
  test.describe.configure({ mode: 'parallel' });

  for (const [path, landmarks] of Object.entries(LANDMARKS)) {
    const target = screen(path);
    test(`${target.label} shows its title and main controls`, { tag: [levelTag(target)] }, async ({ menuScreen, page }) => {
      await checkLandmarks({ screen: target, menuScreen, landmarks, page });
    });
  }

  test('Reports groups the reports and can be searched', { tag: [TAG.regression] }, async ({ menuScreen, page }) => {
    await menuScreen(screen('/operations/reports')).open();
    const groups = page.getByRole('tablist', { name: 'Report group' });
    for (const group of ['All Reports', 'Import', 'DeStuffing', 'Export', 'Vehicle', 'Stock & Hold']) await expect(groups, `group "${group}"`).toContainText(group);
    await page.getByPlaceholder('Search reports…').fill('zz-pw-no-such-report-zz');
    await expect(page.getByRole('button', { name: 'Clear search' })).toBeVisible();
  });
});
