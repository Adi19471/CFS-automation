import { expect, type Locator, type Page } from '@playwright/test';
import { env } from '@config/env';
import type { Screen } from '@data/screens';
import { escapeRegExp } from './Topbar';

/**
 * The sidebar menu (layout/AppSidebar.tsx, AppMenuitem.tsx). Every item is in the
 * DOM even when its group is collapsed; a group is an <li> whose <a> holds
 * .layout-menuitem-text, and a screen is a Next <Link> whose href carries the
 * /CFS base path. Items the user's roles do not grant are left out.
 *
 * The menu type (static, overlay, slim, horizontal…) is part of the company theme,
 * so opening a group is done the same way in all of them: click the group until
 * its list shows, then the screen.
 */
export class SideMenu {
  readonly root: Locator;
  readonly container: Locator;
  readonly rootGroups: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('.layout-sidebar');
    this.container = this.root.locator('.layout-menu-container');
    this.rootGroups = this.container.locator('.layout-menuitem-root-text');
  }

  /** The <a> of a screen. */
  screenLink(path: string): Locator {
    return this.container.locator(`a[href="${path === '/' ? env.basePath : `${env.basePath}${path}`}"]`);
  }

  /** The <li> of a group, matched on its own label (not a child's). */
  group(label: string): Locator {
    return this.container
      .locator('li')
      .filter({ has: this.page.locator(':scope > a > .layout-menuitem-text', { hasText: new RegExp(`^${escapeRegExp(label)}$`) }) })
      .first();
  }

  async rootGroupLabels(): Promise<string[]> {
    return (await this.rootGroups.allTextContents()).map((t) => t.trim()).filter(Boolean);
  }

  /** Whether the menu offers the screen at all (role-filtered). */
  async hasScreen(path: string): Promise<boolean> {
    return (await this.screenLink(path).count()) > 0;
  }

  /** Makes the sidebar visible when the menu type hides it (overlay / mobile). */
  async ensureOpen(): Promise<void> {
    if (await this.root.isVisible()) return;
    await this.page.locator('.layout-topbar').getByRole('button', { name: 'Toggle menu' }).click();
    await expect(this.root).toBeVisible();
  }

  /** Opens a screen through the menu, expanding the groups on its trail first. */
  async open(screen: Pick<Screen, 'path' | 'section'>): Promise<void> {
    await this.ensureOpen();
    const link = this.screenLink(screen.path).first();
    await expect(link, `menu entry for ${screen.path} (is it granted to the test user's role?)`).toBeAttached();

    if (!(await link.isVisible())) {
      const groups = screen.section && screen.section !== 'General' ? screen.section.split(' / ') : [];
      for (const label of groups) {
        const group = this.group(label);
        const list = group.locator(':scope > ul');
        const anchor = group.locator(':scope > a');
        if ((await list.isVisible()) || !(await anchor.isVisible())) continue;
        await anchor.click();
        await expect(list).toBeVisible();
      }
    }

    await link.scrollIntoViewIfNeeded();
    await link.click();
    await this.page.waitForURL((url) => env.routeOf(url.toString()) === screen.path);
  }
}
