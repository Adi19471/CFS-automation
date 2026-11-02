import { expect, type Locator, type Page } from '@playwright/test';
import { DataList } from '@components/DataList';
import { BasePage } from '../BasePage';

/**
 * Commercial › Customer Registration list (app/(main)/commercial/customer-registration/page.tsx).
 * The reference list of CFS: DataList with All / Active / Inactive tabs, search over
 * ID, name, code, GSTIN, contact and mobile, tick boxes for Export, Status pill and
 * Edit / View actions on the right. "New Customer" opens the full-page form.
 */
export class CustomerRegistrationPage extends BasePage {
  readonly path = '/commercial/customer-registration';

  static readonly COLUMNS = ['Customer ID', 'Company Name', 'Code', 'Primary Contact', 'Mobile', 'GSTIN / Tax ID', 'Status', 'Actions'] as const;
  static readonly TABS = ['All', 'Active', 'Inactive'] as const;
  static readonly SEARCH_PLACEHOLDER = 'Search by code, customer name, GSTIN…';

  readonly list: DataList;
  readonly viewDialog: Locator;
  readonly viewDialogTitle: Locator;
  readonly viewDialogClose: Locator;
  readonly viewDialogEdit: Locator;

  constructor(page: Page) {
    super(page);
    this.list = new DataList(page);
    this.viewDialog = page.locator('.p-dialog.cust-view');
    this.viewDialogTitle = this.viewDialog.locator('.p-dialog-title');
    // The X and the footer button are both named "Close".
    this.viewDialogClose = this.viewDialog.locator('.p-dialog-header-close');
    this.viewDialogEdit = this.viewDialog.getByRole('button', { name: 'Edit', exact: true });
  }

  override async waitForReady(): Promise<void> {
    await this.list.expectVisible('Customer Registration');
    await this.list.waitForLoaded();
  }

  async newCustomer(): Promise<void> {
    await this.list.clickNew();
    await this.page.waitForURL(/\/commercial\/customer-registration\/edit(\?|$)/);
  }

  /** Data columns other than the tick-box column. */
  async dataColumns(): Promise<string[]> {
    return (await this.list.columnHeaders()).filter(Boolean);
  }

  async searchFor(text: string): Promise<void> {
    await this.list.search(text);
  }

  async openView(row: Locator): Promise<string> {
    await this.list.rowAction(row, 'View').click();
    await expect(this.viewDialog).toBeVisible();
    return ((await this.viewDialogTitle.textContent()) ?? '').trim();
  }

  async closeView(): Promise<void> {
    await this.viewDialogClose.click();
    await expect(this.viewDialog).toBeHidden();
  }

  async openEdit(row: Locator): Promise<void> {
    await this.list.rowAction(row, 'Edit').click();
    await this.page.waitForURL(/\/commercial\/customer-registration\/edit\?id=/);
  }

  /** Status pill text of a row: "Active" / "Inactive". */
  async statusOf(row: Locator): Promise<string> {
    const index = await this.list.columnIndex('Status');
    return ((await row.locator(':scope > td').nth(index).textContent()) ?? '').trim();
  }
}
