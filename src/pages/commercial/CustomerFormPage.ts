import { expect, type Locator, type Page } from '@playwright/test';
import { FormPageHeader } from '@components/FormPageHeader';
import { escapeRegExp } from '@components/Topbar';
import { BasePage } from '../BasePage';

export interface CustomerData {
  name: string;
  code: string;
  gstin: string;
  mobile: string;
  email: string;
  country: string;
  state: string;
  city: string;
  /** option text of Credit Terms (Days); omit to take the first one */
  creditTerms?: string;
  contactPerson?: string;
  address1?: string;
  zip?: string;
  pan?: string;
  remarks?: string;
  /** customer types to tick; omit to tick the first one */
  types?: string[];
}

/**
 * Customer Registration form, /commercial/customer-registration/edit (new) and
 * …/edit?id=<partyId> (edit). Title "New Customer Registration" /
 * "Edit Customer Registration", Back to List + Save at the top right.
 *
 * Tab "Customer Details": Identity, Address, Contact, Billing, Remarks panels.
 * Each field is a <div> in .gate-edit-grid with label.gate-edit-lbl and the
 * control under it; errors are small.gate-edit-err. The text boxes all share
 * id="field", so fields are found by their label, never by id.
 * Tab "Customer Type": tick at least one (All / None buttons).
 *
 * Which fields are required comes from the field configuration
 * (lib/field-config/registry.ts, editable in the app).
 */
export class CustomerFormPage extends BasePage {
  readonly path = '/commercial/customer-registration/edit';

  readonly header: FormPageHeader;
  readonly detailsTab: Locator;
  readonly typesTab: Locator;
  readonly panelTitles: Locator;
  readonly fieldErrors: Locator;
  readonly remarks: Locator;
  readonly selectAllTypes: Locator;
  readonly selectNoTypes: Locator;
  readonly typeRows: Locator;

  constructor(page: Page) {
    super(page);
    this.header = new FormPageHeader(page);
    this.detailsTab = page.getByRole('tab', { name: 'Customer Details' });
    this.typesTab = page.getByRole('tab', { name: /^Customer Type/ });
    this.panelTitles = page.locator('.gate-edit-panel-title');
    this.fieldErrors = page.locator('.gate-edit-err');
    this.remarks = page.getByRole('textbox', { name: 'Enter remarks' });
    this.selectAllTypes = page.getByRole('button', { name: 'All', exact: true });
    this.selectNoTypes = page.getByRole('button', { name: 'None', exact: true });
    this.typeRows = page.locator('table.cust-type-table tbody tr');
  }

  override async waitForReady(): Promise<void> {
    await expect(this.header.title).toBeVisible();
    await expect(this.detailsTab).toBeVisible();
  }

  async openNew(): Promise<void> {
    await this.open();
    await this.header.expectTitle('New Customer Registration');
  }

  /** The field cell whose label starts with `label` (a trailing * is ignored). */
  field(label: string): Locator {
    return this.page
      .locator('.gate-edit-grid > div')
      .filter({ has: this.page.locator('label.gate-edit-lbl', { hasText: new RegExp(`^\\s*${escapeRegExp(label)}\\s*\\*?\\s*$`) }) })
      .first();
  }

  input(label: string): Locator {
    return this.field(label).locator('input').first();
  }

  async fill(label: string, value: string): Promise<void> {
    await this.input(label).fill(value);
  }

  /** Picks an option of a filterable PrimeReact Dropdown field. */
  async select(label: string, option?: string): Promise<string> {
    const dropdown = this.field(label).locator('.p-dropdown');
    await expect(dropdown).not.toHaveClass(/p-disabled/);
    await dropdown.click();
    const panel = this.page.locator('.p-dropdown-panel').last();
    await expect(panel).toBeVisible();
    const filter = panel.locator('.p-dropdown-filter');
    if (option && (await filter.count())) await filter.fill(option);
    const item = option ? panel.getByRole('option', { name: option, exact: true }) : panel.getByRole('option').first();
    await expect(item.first()).toBeVisible();
    const picked = ((await item.first().textContent()) ?? '').trim();
    await item.first().click();
    await expect(panel).toBeHidden();
    return picked;
  }

  async errorUnder(label: string): Promise<string | null> {
    const error = this.field(label).locator('.gate-edit-err');
    return (await error.count()) ? ((await error.textContent()) ?? '').trim() : null;
  }

  async panelNames(): Promise<string[]> {
    return (await this.panelTitles.allTextContents()).map((t) => t.trim());
  }

  async save(): Promise<void> {
    await this.header.saveButton.click();
  }

  async backToList(): Promise<void> {
    await this.header.backButton.click();
    await this.page.waitForURL((url) => /\/commercial\/customer-registration$/.test(new URL(url).pathname));
  }

  async openTypesTab(): Promise<void> {
    await this.typesTab.click();
    await expect(this.typesTab).toHaveAttribute('aria-selected', 'true');
  }

  async tickType(name?: string): Promise<void> {
    await this.openTypesTab();
    const row = name ? this.typeRows.filter({ hasText: name }).first() : this.typeRows.first();
    await row.locator('.p-checkbox').first().click();
  }

  /** Fills every field the default configuration requires, plus the optional ones given. */
  async fillCustomer(data: CustomerData): Promise<void> {
    await this.fill('Customer Name', data.name);
    await this.fill('Code', data.code);
    await this.fill('GSTIN', data.gstin);
    if (data.pan) await this.fill('PAN #', data.pan);
    if (data.address1) await this.fill('Address 1', data.address1);
    await this.select('Country', data.country);
    await this.select('State', data.state);
    await this.select('City', data.city);
    if (data.zip) await this.fill('PIN #', data.zip);
    if (data.contactPerson) await this.fill('Contact Person', data.contactPerson);
    await this.fill('Mobile #', data.mobile);
    await this.fill('Email ID', data.email);
    await this.select('Credit Terms (Days)', data.creditTerms);
    if (data.remarks) await this.remarks.fill(data.remarks);
    if (data.types?.length) for (const type of data.types) await this.tickType(type);
    else await this.tickType();
  }
}
