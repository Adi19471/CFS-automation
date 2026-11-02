import { expect, type Page } from '@playwright/test';
import { FormDialog } from '@components/FormDialog';
import type { Screen } from '@data/screens';
import { MenuScreenPage } from '../common/MenuScreenPage';

/**
 * An Admin master screen (Cargo Type, Country, Bank, Charge Code…): a DataList
 * whose "New <Title>" and row "Edit" open a FormDialog — the pattern of 71 Admin
 * screens. Driven by the screen's menu catalog entry, so one page object serves
 * them all; a screen with special fields can extend it.
 */
export class AdminMasterPage extends MenuScreenPage {
  readonly dialog: FormDialog;

  constructor(page: Page, screen: Screen) {
    super(page, screen);
    this.dialog = new FormDialog(page);
  }

  /** "New <menu name>" — FormDialog's title in new mode. */
  get newDialogTitle(): string {
    return `New ${this.screen.label}`;
  }

  async openNewDialog(): Promise<void> {
    await expect(this.list.newButton, `${this.screen.label}: "New" button`).toBeVisible();
    await this.list.clickNew();
    await this.dialog.expectOpen();
  }

  async openEditDialog(rowIndex = 0): Promise<void> {
    await this.list.rowAction(this.list.row(rowIndex), 'Edit').click();
    await this.dialog.expectOpen(/^Edit /);
  }
}
