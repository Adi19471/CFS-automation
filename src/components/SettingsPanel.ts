import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The Settings sidebar (layout/AppConfig.tsx), opened from the cog in the top
 * bar. Tabs: Templates, Theme, Layout, Colors, Branding, Pages. Every change is a preview until
 * "Save company theme", which applies it to EVERY user of the site — so the
 * tests only preview and then Discard. Never call Save from a test.
 */
export class SettingsPanel {
  readonly root: Locator;
  readonly title: Locator;
  readonly tabs: Locator;
  readonly sections: Locator;
  readonly discardButton: Locator;
  readonly saveCompanyThemeButton: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('.p-sidebar.cfs-settings');
    this.title = this.root.locator('.cfs-settings-title');
    this.tabs = this.root.locator('.p-tabview-nav [role="tab"]');
    this.sections = this.root.locator('.p-tabview-panels');
    this.discardButton = this.root.getByRole('button', { name: 'Discard' });
    this.saveCompanyThemeButton = this.root.getByRole('button', { name: /Save company theme/ });
  }

  async open(): Promise<void> {
    if (await this.root.isVisible()) return;
    await this.page.locator('.layout-topbar').getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(this.root, 'Settings panel').toBeVisible();
  }

  async close(): Promise<void> {
    await this.page.keyboard.press('Escape');
    if (await this.root.isVisible()) await this.root.locator('.p-sidebar-close').click();
    await expect(this.root).toBeHidden();
  }

  async tabLabels(): Promise<string[]> {
    return (await this.tabs.allTextContents()).map((t) => t.trim()).filter(Boolean);
  }

  async openTab(label: string): Promise<void> {
    const tab = this.tabs.filter({ hasText: label }).first();
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  }

  /** Section titles on the open tab. */
  async sectionTitles(): Promise<string[]> {
    const active = this.root.locator('.p-tabview-panel:not([hidden])');
    const titles = await active.locator('.cfs-set-title').allTextContents();
    return titles.map((t) => t.trim()).filter(Boolean);
  }

  /** Previews a theme preset other than the current one (Theme tab). Returns its name. */
  async previewOtherPreset(): Promise<string> {
    await this.openTab('Theme');
    const preset = this.root.locator('.cfs-preset-card').filter({ hasNot: this.page.locator('.pi-check') }).first();
    const name = ((await preset.locator('.cfs-preset-name').textContent()) ?? '').trim();
    await preset.click();
    return name;
  }

  async hasUnsavedChanges(): Promise<boolean> {
    return this.discardButton.isEnabled();
  }

  /** Leaves the saved company theme as it was. */
  async discard(): Promise<void> {
    if (await this.discardButton.isEnabled()) await this.discardButton.click();
    await expect(this.discardButton).toBeDisabled();
  }
}
