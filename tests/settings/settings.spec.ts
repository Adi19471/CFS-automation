import { test, expect } from '@fixtures';
import { TAG } from '@utils/tags';

/**
 * Settings — the company theme editor (layout/AppConfig.tsx). Open to every
 * signed-in user. "Save company theme" changes the look for EVERY user of the
 * site, so these tests only preview a change and then Discard it.
 */
test.describe('Settings panel', () => {
  test.beforeEach(async ({ dashboardPage, settingsPanel }) => {
    await dashboardPage.open();
    await settingsPanel.open();
  });

  test.afterEach(async ({ settingsPanel }) => {
    // Whatever a test did, leave the saved theme as it was.
    if (await settingsPanel.root.isVisible()) await settingsPanel.discard();
  });

  test('opens on the company theme with its six tabs', { tag: [TAG.smoke] }, async ({ settingsPanel }) => {
    await expect(settingsPanel.title).toHaveText('Company theme');
    expect(await settingsPanel.tabLabels()).toEqual(['Templates', 'Theme', 'Layout', 'Colors', 'Branding', 'Pages']);
    await expect(settingsPanel.saveCompanyThemeButton).toBeVisible();
  });

  const SECTIONS: Record<string, string[]> = {
    Templates: ['UI template', 'Color mode'],
    Theme: ['Mode', 'Presets', 'Theme colour', 'Custom accent'],
    Layout: ['Nav', 'Font', 'Behaviour'],
    Colors: ['Sidebar', 'Sidebar icons', 'Menu labels', 'Table header', 'Column search boxes', 'Scrollbars'],
    Branding: ['Logo & images'],
    Pages: ['Page', 'Cards & corners', 'Lists', 'Forms', 'Dialogs', 'Loading'],
  };
  for (const [tab, sections] of Object.entries(SECTIONS)) {
    test(`${tab} tab shows its sections`, { tag: [TAG.regression] }, async ({ settingsPanel }) => {
      await settingsPanel.openTab(tab);
      const titles = await settingsPanel.sectionTitles();
      for (const section of sections) expect(titles, `section "${section}" on ${tab}`).toContain(section);
    });
  }

  test('a preset is only a preview until saved, and Discard undoes it', { tag: [TAG.regression] }, async ({ settingsPanel }) => {
    await expect(settingsPanel.discardButton, 'nothing to discard on open').toBeDisabled();
    await settingsPanel.previewOtherPreset();
    await expect(settingsPanel.discardButton, 'preview marks the theme as changed').toBeEnabled();
    await settingsPanel.discard();
    await expect(settingsPanel.discardButton).toBeDisabled();
  });

  test('closes with Escape', { tag: [TAG.regression] }, async ({ settingsPanel }) => {
    await settingsPanel.close();
  });
});
