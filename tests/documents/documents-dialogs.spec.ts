import { test } from '@fixtures';
import { checkCreateDialog, checkEditDialog, dialogTitle, editDialogTitle, levelTag, moduleScreens } from '@utils/screen-checks';

/**
 * Every Documents screen that keeps its records in a dialog. New: Save with the
 * required fields empty is refused (no request leaves the browser) and Cancel closes
 * it. Edit: the first record opens filled in and Cancel closes it. Nothing is saved.
 */
const { dialogScreens } = moduleScreens('documents');

test.describe('Documents master dialogs', () => {
  test.describe.configure({ mode: 'parallel' });

  for (const screen of dialogScreens) {
    test(dialogTitle(screen), { tag: [levelTag(screen)] }, async ({ adminMaster, page }) => {
      await checkCreateDialog({ screen, adminMaster, page });
    });

    test(editDialogTitle(screen), { tag: [levelTag(screen)] }, async ({ adminMaster }) => {
      await checkEditDialog({ screen, adminMaster });
    });
  }
});
