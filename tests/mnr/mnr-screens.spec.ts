import { test } from '@fixtures';
import {
  checkEditForm,
  checkListTools,
  checkNewForm,
  checkScreenOpens,
  editFormTitle,
  levelTag,
  listToolsTitle,
  moduleScreens,
  newFormTitle,
  screenTags,
  screenTitle,
} from '@utils/screen-checks';

/**
 * Every MNR screen of the menu:
 *  - opens: role check passed, title and breadcrumb from the menu, first load done,
 *    no error toast or page error
 *  - list tools: search, filter row, column picker, density, quick tabs and Export
 *  - full-page forms: New opens, an empty Save is refused, Back returns; Edit opens a record
 * Nothing here saves. The list comes from src/data/screens.json (npm run sync:screens).
 */
const { screens, smoke, lists, forms } = moduleScreens('mnr');

test.describe('MNR screens', () => {
  test.describe.configure({ mode: 'parallel' });

  for (const screen of screens) {
    test(screenTitle(screen), { tag: screenTags(screen, smoke) }, async ({ menuScreen, topbar, browserIssues }) => {
      await checkScreenOpens({ screen, menuScreen, topbar, browserIssues });
    });
  }

  for (const screen of lists) {
    test(listToolsTitle(screen), { tag: [levelTag(screen)] }, async ({ menuScreen }) => {
      await checkListTools({ screen, menuScreen });
    });
  }

  for (const screen of forms) {
    test(newFormTitle(screen), { tag: [levelTag(screen)] }, async ({ formScreen, browserIssues, page }) => {
      await checkNewForm({ screen, formScreen, browserIssues, page });
    });

    test(editFormTitle(screen), { tag: [levelTag(screen)] }, async ({ formScreen, browserIssues }) => {
      await checkEditForm({ screen, formScreen, browserIssues });
    });
  }
});
