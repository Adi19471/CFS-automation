import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The app's top bar (layout/AppTopbar.tsx): menu toggle, back button and
 * breadcrumb on the left, the screen search (Ctrl+K) in the centre, and dark
 * mode, notifications, settings and the profile menu on the right.
 */
export class Topbar {
  readonly root: Locator;
  readonly menuToggle: Locator;
  readonly backButton: Locator;
  readonly breadcrumb: Locator;
  readonly breadcrumbItems: Locator;

  readonly searchInput: Locator;
  readonly searchPanel: Locator;
  readonly searchOptions: Locator;

  readonly colorSchemeToggle: Locator;
  readonly notificationsButton: Locator;
  readonly notificationsPanel: Locator;
  readonly settingsButton: Locator;

  readonly profileChip: Locator;
  readonly profileName: Locator;
  readonly profileMenu: Locator;
  readonly logoutLink: Locator;
  readonly appearanceLink: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('.layout-topbar');
    this.menuToggle = this.root.getByRole('button', { name: 'Toggle menu' });
    this.backButton = this.root.getByRole('button', { name: 'Go back' });
    this.breadcrumb = this.root.getByRole('navigation', { name: 'Breadcrumb' });
    this.breadcrumbItems = this.breadcrumb.locator('li:not(.layout-breadcrumb-chevron)');

    this.searchInput = this.root.getByPlaceholder(/Search screens/);
    this.searchPanel = page.locator('.topbar-search-panel');
    this.searchOptions = this.searchPanel.locator('li[role="option"]');

    this.colorSchemeToggle = this.root.getByRole('button', { name: /Switch to (dark|light) mode/ });
    this.notificationsButton = this.root.getByRole('button', { name: 'Notifications', exact: true });
    this.notificationsPanel = page.locator('.cfs-notif-panel');
    this.settingsButton = this.root.getByRole('button', { name: 'Settings', exact: true });

    this.profileChip = this.root.locator('a.topbar-profile');
    this.profileName = this.profileChip.locator('.topbar-profile-name');
    this.profileMenu = this.root.locator('.topbar-profile-menu');
    this.logoutLink = this.profileMenu.locator('.topbar-profile-menu-link', { hasText: 'Logout' });
    this.appearanceLink = this.profileMenu.locator('.topbar-profile-menu-link', { hasText: 'Appearance' });
  }

  async expectVisible(): Promise<void> {
    await expect(this.root, 'app top bar').toBeVisible();
  }

  /** The breadcrumb labels, e.g. ["Admin", "Cargo", "Cargo Type"]. */
  async breadcrumbTrail(): Promise<string[]> {
    const items = await this.breadcrumbItems.allTextContents();
    return items.map((t) => t.trim()).filter(Boolean);
  }

  /** Signed-in user's name as the profile chip shows it (waits for the skeleton to go). */
  async signedInUser(): Promise<string> {
    await expect(this.profileName).toBeVisible();
    return ((await this.profileName.textContent()) ?? '').trim();
  }

  async openProfileMenu(): Promise<void> {
    if (await this.profileMenu.isVisible()) return;
    await this.profileChip.click();
    await expect(this.profileMenu).toBeVisible();
  }

  async logout(): Promise<void> {
    await this.openProfileMenu();
    await this.logoutLink.click();
  }

  /** Types into the screen search and returns the suggestion labels. */
  async searchScreens(text: string): Promise<string[]> {
    await this.searchInput.click();
    await this.searchInput.fill(text);
    await expect(this.searchOptions.first()).toBeVisible();
    return (await this.searchOptions.locator('.topbar-search-item-label').allTextContents()).map((t) => t.trim());
  }

  /** Picks a screen from the search suggestions by its exact menu name. */
  async openFromSearch(label: string): Promise<void> {
    await this.searchScreens(label);
    await this.searchOptions.filter({ has: this.page.locator('.topbar-search-item-label', { hasText: new RegExp(`^${escapeRegExp(label)}$`) }) }).first().click();
  }

  /** Ctrl+K anywhere focuses the screen search. */
  async focusSearchWithShortcut(): Promise<void> {
    await this.page.keyboard.press('Control+KeyK');
  }

  async openNotifications(): Promise<void> {
    await this.notificationsButton.click();
    await expect(this.notificationsPanel).toBeVisible();
  }

  /** 'light' | 'dark' — from the toggle's label (it offers the other mode). */
  async colorScheme(): Promise<'light' | 'dark'> {
    const label = (await this.colorSchemeToggle.getAttribute('aria-label')) ?? '';
    return /light mode/i.test(label) ? 'dark' : 'light';
  }
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
