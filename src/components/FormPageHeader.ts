import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Title bar of a full-page form (components/ui/FormPage.tsx, FormPageHeader):
 * h1.cfs-page-title "New <Title>" / "Edit <Title>", then "Back to List" (outline)
 * and "Save" (primary) on the right. It sticks under the top bar.
 */
export class FormPageHeader {
  readonly root: Locator;
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly backButton: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.root = page.locator('.cfs-form-page-header').first();
    this.title = this.root.locator('h1.cfs-page-title');
    this.subtitle = this.root.locator('.cfs-page-subtitle');
    const actions = this.root.locator('.cfs-page-actions');
    this.backButton = actions.getByRole('button', { name: /Back to List/ });
    this.saveButton = actions.getByRole('button', { name: /^Save/ });
  }

  async expectTitle(title: string | RegExp): Promise<void> {
    await expect(this.title).toHaveText(title);
  }
}
