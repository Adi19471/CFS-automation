import { expect, test, type Locator, type Page } from '@playwright/test';
import { env } from '@config/env';
import type { Screen } from '@data/screens';
import { MenuScreenPage } from './MenuScreenPage';

/**
 * The full-page form behind a list screen, driven by its catalog entry
 * (form: "page", formPath). CFS has several generations of form heads
 * (.gate-page-title, .wo-page-title, .sr-page-title, FormPageHeader…), but they
 * share what a user relies on: Save or Update, a way back to the list, and fields.
 * So the form is found by those, not by any one head's classes.
 *
 * It is always opened from its list, as a user does. Gate Operations leaves with
 * router.back(), which needs a list to go back to, and "New" is what starts a
 * new record on every screen.
 */
export class FormScreenPage extends MenuScreenPage {
  readonly saveButton: Locator;
  readonly backButton: Locator;
  readonly cancelButton: Locator;
  /** text boxes and dropdowns of the form */
  readonly controls: Locator;
  /** what a refused Save shows: a toast (warn or error) or a message under a field */
  readonly refusal: Locator;

  constructor(page: Page, screen: Screen) {
    super(page, screen);
    const content = this.state.content;
    this.saveButton = content.getByRole('button', { name: /^(Save|Update)$/ }).first();
    this.backButton = content.getByRole('button', { name: /^Back( to list)?$/i }).first();
    this.cancelButton = content.getByRole('button', { name: 'Cancel', exact: true }).first();
    this.controls = content.locator('input:not([type="hidden"]):not([type="checkbox"]), textarea, .p-dropdown');
    this.refusal = page.locator('.cfs-toast-warn, .cfs-toast-error, .cfs-field-error').first();
  }

  /** The list's "New" opens the empty form. The list must be open; a test skips first when the button is missing. */
  async openNewFromList(): Promise<void> {
    await this.list.clickNew();
    await this.page.waitForURL((url) => env.routeOf(url.toString()) === this.screen.formPath);
    await this.waitForForm();
  }

  /** The first row's Edit opens that record, /edit?id=… or /<id> depending on the screen. Skips when there is none to open. */
  async openFirstRecordFromList(): Promise<void> {
    test.skip((await this.list.rowCount()) === 0, `${this.screen.label}: no record to open`);
    const edit = this.list.rowAction(this.list.row(0), 'Edit');
    test.skip(!(await edit.count()) || !(await edit.isEnabled()), `${this.screen.label}: the first record has no Edit action for this user`);
    await edit.click();
    await this.page.waitForURL((url) => env.routeOf(url.toString()).startsWith(`${this.screen.path}/`));
    await this.waitForForm();
  }

  private async waitForForm(): Promise<void> {
    await this.state.waitForAccess();
    await expect(this.controls.first(), `${this.screen.label}: form fields`).toBeVisible();
  }

  /** Back to List where the form has it, otherwise Cancel, and waits for the list's route. */
  async backToList(): Promise<void> {
    const leave = (await this.backButton.count()) ? this.backButton : this.cancelButton;
    await leave.click();
    await this.page.waitForURL((url) => env.routeOf(url.toString()) === this.screen.path);
  }
}
