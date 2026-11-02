import type { Locator, Page } from '@playwright/test';
import { env } from '@config/env';

/**
 * Outcome of the role check every signed-in screen goes through
 * (components/RoleScreenAccessBoundary.tsx):
 *  granted       — the screen itself is shown
 *  restricted    — "Screen access restricted": none of the user's roles grants it
 *  company-type  — "Not available for your company type": the signed-in company's
 *                  category (CFS / Empty Depot) has no such module
 *                  (lib/company-module-access.ts)
 *  unverified    — still loading at the timeout, usually "Screen access couldn't be
 *                  verified" (the backend's role lookup is failing)
 *  not-found     — the app's 404 page
 */
export type ScreenAccess = 'granted' | 'restricted' | 'company-type' | 'unverified' | 'not-found';

type Phase = ScreenAccess | 'loading';

/**
 * Waits out the access check and the loading states around it.
 *
 * Right after a navigation the boundary renders, in order: the route's loading
 * skeleton (.cfs-skeleton-page), "couldn't be verified" (its first render, before
 * the lookup starts), the page skeleton (.cfs-page-skeleton) while it runs, and
 * then the screen. On `next dev` the lookup takes 15–25 s.
 */
export class ScreenState {
  readonly routeSkeleton: Locator;
  readonly pageSkeleton: Locator;
  readonly unverified: Locator;
  readonly restricted: Locator;
  readonly companyTypeBlocked: Locator;
  readonly content: Locator;
  /** Next.js crash page / dev overlay */
  readonly appCrash: Locator;
  readonly notFound: Locator;

  constructor(private readonly page: Page) {
    // .first() throughout: isVisible() is strict and would throw (read as "not visible") on two matches.
    this.routeSkeleton = page.locator('.cfs-skeleton-page').first();
    this.pageSkeleton = page.locator('.cfs-page-skeleton[aria-busy="true"]').first();
    this.unverified = page.locator('.cfs-state-title', { hasText: /Screen access couldn.t be verified/ }).first();
    this.restricted = page.locator('.cfs-state-title', { hasText: 'Screen access restricted' }).first();
    this.companyTypeBlocked = page.locator('.cfs-state-title', { hasText: 'Not available for your company type' }).first();
    this.content = page.locator('.layout-content').first();
    this.appCrash = page.getByText(/Application error: a (client|server)-side exception has occurred/i).or(page.locator('nextjs-portal [data-nextjs-dialog]')).first();
    this.notFound = page.getByText('The page that you are looking for does not exist').first();
  }

  private async phase(): Promise<Phase> {
    if (await this.restricted.isVisible().catch(() => false)) return 'restricted';
    if (await this.companyTypeBlocked.isVisible().catch(() => false)) return 'company-type';
    if (await this.notFound.isVisible().catch(() => false)) return 'not-found';
    const busy =
      (await this.routeSkeleton.isVisible().catch(() => false)) ||
      (await this.pageSkeleton.isVisible().catch(() => false)) ||
      (await this.unverified.isVisible().catch(() => false)) ||
      !(await this.content.isVisible().catch(() => false));
    return busy ? 'loading' : 'granted';
  }

  /**
   * Resolves once the screen is shown or refused. "granted" has to hold for two
   * reads in a row, so the gap between two loading states is not mistaken for it.
   */
  async waitForAccess(timeout = env.timeouts.screenReady): Promise<ScreenAccess> {
    const deadline = Date.now() + timeout;
    let grantedSince = 0;
    while (Date.now() < deadline) {
      const phase = await this.phase();
      if (phase === 'restricted' || phase === 'company-type' || phase === 'not-found') return phase;
      if (phase === 'granted') {
        if (!grantedSince) grantedSince = Date.now();
        else if (Date.now() - grantedSince >= 400) return 'granted';
      } else {
        grantedSince = 0;
      }
      await this.page.waitForTimeout(250);
    }
    // Still loading at the deadline counts as unverified: the screen never appeared.
    const last = await this.phase();
    return last === 'loading' ? 'unverified' : last;
  }

  async hasCrashed(): Promise<boolean> {
    return this.appCrash.isVisible().catch(() => false);
  }
}
