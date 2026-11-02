import { expect, type Locator, type Page } from '@playwright/test';
import { env } from '@config/env';
import type { ScreenAccess } from '@components/ScreenState';
import { DataList } from '@components/DataList';
import { breadcrumbOf, type Screen } from '@data/screens';
import { BasePage } from '../BasePage';

export interface ScreenCheck {
  access: ScreenAccess;
  /** h1 text, when the screen has a standard title */
  title?: string;
  /** "N Total Records" of a list screen */
  records?: number;
  errorToasts: string[];
  loadMs: number;
}

/**
 * Any screen of the menu catalog (src/data/screens.json), driven by its entry:
 * list screens (DataList) are checked for title, first load and toolbar; header
 * screens for the title; custom screens (yard views, reports) only for opening
 * cleanly. Module-specific page objects extend this for one screen.
 */
export class MenuScreenPage extends BasePage {
  readonly path: string;
  readonly list: DataList;
  readonly pageTitle: Locator;

  constructor(
    page: Page,
    readonly screen: Screen,
  ) {
    super(page);
    this.path = screen.path;
    this.list = new DataList(page);
    this.pageTitle = page.locator('h1.cfs-list-title, h1.cfs-page-title').first();
  }

  override async waitForReady(): Promise<void> {
    if (this.screen.layout === 'list') await this.list.waitForLoaded();
    else if (this.screen.layout === 'header') await expect(this.pageTitle).toBeVisible();
  }

  /** The heading the app gives this screen: always its menu name (lib/screen-titles.ts). */
  get expectedTitle(): string {
    return this.screen.label;
  }

  get expectedBreadcrumb(): string[] {
    return breadcrumbOf(this.screen);
  }

  /** An open dialog by its header text. */
  dialogTitled(title: string | RegExp): Locator {
    return this.page.locator('.p-dialog').filter({ has: this.page.locator('.p-dialog-title', { hasText: title }) }).last();
  }

  /** Closes a dialog with the X in its header. A dialog's footer button is also named "Close", so the name alone matches two. */
  async closeDialog(dialog: Locator): Promise<void> {
    await dialog.locator('.p-dialog-header-close').click();
    await expect(dialog).toBeHidden();
  }

  /**
   * Opens the screen and reports what came up, without asserting — the caller
   * decides what is a failure. Used by the per-module screen tests.
   */
  async openAndInspect(): Promise<ScreenCheck> {
    const started = Date.now();
    await this.page.goto(env.appUrl(this.path));
    const access = await this.state.waitForAccess();
    const check: ScreenCheck = { access, errorToasts: [], loadMs: 0 };
    if (access !== 'granted') {
      check.loadMs = Date.now() - started;
      return check;
    }

    if (this.screen.layout === 'list') {
      await expect(this.list.root, `${this.screen.label}: list frame`).toBeVisible();
      check.records = await this.list.waitForLoaded();
    }
    if (this.screen.layout === 'list' || this.screen.layout === 'header') {
      await expect(this.pageTitle).toBeVisible();
      check.title = ((await this.pageTitle.textContent()) ?? '').trim();
    }
    // A failed backend call surfaces as an error toast right after the load.
    await this.page.waitForTimeout(500);
    check.errorToasts = await this.toast.visibleErrors();
    check.loadMs = Date.now() - started;
    return check;
  }
}
