import { expect, type Locator, type Page } from '@playwright/test';
import { escapeRegExp } from './Topbar';

/**
 * The create/edit dialog of the Admin master screens (components/ui/FormDialog.tsx):
 * a PrimeReact Dialog headed "New <Title>" / "Edit <Title>", FormField cells
 * (label.cfs-field-label above the control, a * for required, small.cfs-field-error
 * under it), and Cancel + Save in the footer. Esc and the close icon cancel.
 */
export class FormDialog {
  readonly root: Locator;
  readonly header: Locator;
  readonly fields: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly closeIcon: Locator;
  readonly fieldErrors: Locator;

  constructor(
    private readonly page: Page,
    root?: Locator,
  ) {
    this.root = root ?? page.locator('.p-dialog.cfs-form-dialog').last();
    this.header = this.root.locator('.p-dialog-title');
    this.fields = this.root.locator('.cfs-field');
    const footer = this.root.locator('.cfs-form-dialog-footer');
    this.saveButton = footer.getByRole('button').last();
    this.cancelButton = footer.getByRole('button', { name: 'Cancel', exact: true });
    this.closeIcon = this.root.locator('.p-dialog-header-close');
    this.fieldErrors = this.root.locator('.cfs-field-error');
  }

  async expectOpen(title?: string | RegExp): Promise<void> {
    await expect(this.root, 'form dialog').toBeVisible();
    if (title) await expect(this.header).toHaveText(title);
  }

  async expectClosed(): Promise<void> {
    await expect(this.root).toBeHidden();
  }

  async title(): Promise<string> {
    return ((await this.header.textContent()) ?? '').trim();
  }

  /** The FormField cell whose label reads `label` (the required * is ignored). */
  field(label: string): Locator {
    return this.fields.filter({ has: this.page.locator('.cfs-field-label', { hasText: new RegExp(`^\\s*${escapeRegExp(label)}\\s*\\*?\\s*$`) }) }).first();
  }

  /** The text box, number box or text area of a field. */
  input(label: string): Locator {
    return this.field(label).locator('input:not([type="hidden"]):not([type="checkbox"]), textarea').first();
  }

  async fieldLabels(): Promise<string[]> {
    const labels = await this.fields.locator('.cfs-field-label').allTextContents();
    return labels.map((l) => l.replace(/\*/g, '').trim());
  }

  /** How many fields hold a value: text boxes with text, and dropdowns showing a choice. */
  async filledFieldCount(): Promise<number> {
    const texts = await this.fields.locator('input:not([type="hidden"]):not([type="checkbox"]), textarea').evaluateAll((boxes) => boxes.filter((box) => (box as HTMLInputElement).value.trim() !== '').length);
    return texts + (await this.fields.locator('.p-dropdown-label:not(.p-placeholder)').count());
  }

  async requiredFieldLabels(): Promise<string[]> {
    const required: string[] = [];
    for (const field of await this.fields.all()) {
      if (await field.locator('.cfs-field-required').count()) {
        required.push(((await field.locator('.cfs-field-label').textContent()) ?? '').replace(/\*/g, '').trim());
      }
    }
    return required;
  }

  async fill(label: string, value: string): Promise<void> {
    await this.input(label).fill(value);
  }

  /** Opens a PrimeReact Dropdown in the field and picks the option. */
  async select(label: string, option: string | RegExp): Promise<void> {
    await this.field(label).locator('.p-dropdown').click();
    const panel = this.page.locator('.p-dropdown-panel').last();
    await expect(panel).toBeVisible();
    const filter = panel.locator('.p-dropdown-filter');
    if (typeof option === 'string' && (await filter.count())) await filter.fill(option);
    await panel.getByRole('option', { name: option }).first().click();
  }

  async setChecked(label: string, checked: boolean): Promise<void> {
    const box = this.field(label).locator('.p-checkbox').first();
    const isChecked = (await box.getAttribute('class'))?.includes('p-checkbox-checked') ?? false;
    if (isChecked !== checked) await box.click();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await this.expectClosed();
  }

  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.expectClosed();
  }

  async errorTexts(): Promise<string[]> {
    return (await this.fieldErrors.allTextContents()).map((t) => t.trim()).filter(Boolean);
  }
}
