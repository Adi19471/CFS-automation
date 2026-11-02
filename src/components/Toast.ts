import { expect, type Locator, type Page } from '@playwright/test';

export type ToastSeverity = 'success' | 'info' | 'warn' | 'error';

/**
 * The app's toast (layout/context/toastcontext.tsx): PrimeReact Toast at top
 * centre with custom content —
 *   .cfs-toast.cfs-toast-<severity> > .cfs-toast-summary + .cfs-toast-detail
 * Transport errors are reworded before they are shown ("HTTP 503" becomes
 * "The service is not available right now…"), and the same toast is not shown
 * twice within 4 s.
 */
export class Toast {
  readonly all: Locator;

  constructor(private readonly page: Page) {
    this.all = page.locator('.cfs-toast');
  }

  ofSeverity(severity: ToastSeverity): Locator {
    return this.page.locator(`.cfs-toast-${severity}`);
  }

  /** A toast whose summary matches, optionally of one severity. */
  withSummary(summary: string | RegExp, severity?: ToastSeverity): Locator {
    const base = severity ? this.ofSeverity(severity) : this.all;
    return base.filter({ has: this.page.locator('.cfs-toast-summary', { hasText: summary }) });
  }

  async expectShown(options: { summary: string | RegExp; severity?: ToastSeverity; detail?: string | RegExp; timeout?: number }): Promise<void> {
    const toast = this.withSummary(options.summary, options.severity).first();
    await expect(toast, `toast "${options.summary}"`).toBeVisible({ timeout: options.timeout });
    if (options.detail) await expect(toast.locator('.cfs-toast-detail')).toContainText(options.detail);
  }

  /** Text of every toast on screen, "summary — detail". */
  async visibleTexts(): Promise<string[]> {
    const texts: string[] = [];
    for (const toast of await this.all.all()) {
      if (!(await toast.isVisible().catch(() => false))) continue;
      const summary = (await toast.locator('.cfs-toast-summary').textContent().catch(() => ''))?.trim() ?? '';
      const detail = (await toast.locator('.cfs-toast-detail').textContent().catch(() => ''))?.trim() ?? '';
      texts.push(detail ? `${summary} — ${detail}` : summary);
    }
    return texts;
  }

  /** Error toasts on screen right now (a failed backend call shows one). */
  async visibleErrors(): Promise<string[]> {
    const errors: string[] = [];
    for (const toast of await this.ofSeverity('error').all()) {
      if (!(await toast.isVisible().catch(() => false))) continue;
      errors.push(((await toast.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim());
    }
    return errors;
  }
}
