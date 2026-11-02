import { test } from '@fixtures';
import { checkListTools, checkScreenOpens, levelTag, listToolsTitle, moduleScreens, screenTags, screenTitle } from '@utils/screen-checks';

/**
 * Every Documents screen of the menu:
 *  - opens: role check passed, title and breadcrumb from the menu, first load done,
 *    no error toast or page error
 *  - list tools: search, filter row, column picker, density, quick tabs and Export
 * Nothing here saves. The list comes from src/data/screens.json (npm run sync:screens).
 */
const { screens, smoke, lists } = moduleScreens('documents');

test.describe('Documents screens', () => {
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
});
