import { expect, test, type Page } from '@playwright/test';
import { env } from '@config/env';
import { ScreenState, type ScreenAccess } from '@components/ScreenState';
import { SideMenu } from '@components/SideMenu';
import { Toast } from '@components/Toast';
import { Topbar } from '@components/Topbar';

/**
 * What every CFS page object shares: the app shell (top bar, menu, toasts),
 * the role check after each navigation, and route helpers. A page object
 * subclass sets `path` and adds the screen's own locators and actions.
 */
export abstract class BasePage {
  /** app route without /CFS, e.g. /commercial/customer-registration */
  abstract readonly path: string;

  readonly topbar: Topbar;
  readonly menu: SideMenu;
  readonly toast: Toast;
  readonly state: ScreenState;

  constructor(readonly page: Page) {
    this.topbar = new Topbar(page);
    this.menu = new SideMenu(page);
    this.toast = new Toast(page);
    this.state = new ScreenState(page);
  }

  /** Navigates to the screen (with an optional ?query) and waits out the role check. */
  async goto(query = ''): Promise<ScreenAccess> {
    await this.page.goto(env.appUrl(`${this.path}${query}`));
    return this.state.waitForAccess();
  }

  /**
   * Opens the screen for a test: skips the test when the user's roles do not
   * grant it, fails it when the screen does not come up.
   */
  async open(query = ''): Promise<void> {
    const access = await this.goto(query);
    skipUnlessGranted(access, this.path);
    await this.waitForReady();
  }

  /** Subclasses wait for their own content here (a list's first load, a form's fields). */
  async waitForReady(): Promise<void> {}

  /** Current app route without /CFS and query string. */
  route(): string {
    return env.routeOf(this.page.url());
  }

  async expectRoute(route: string | RegExp = this.path): Promise<void> {
    await expect.poll(() => this.route(), { message: `route should be ${route}` }).toMatch(typeof route === 'string' ? new RegExp(`^${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) : route);
  }

  async reload(): Promise<ScreenAccess> {
    await this.page.reload();
    return this.state.waitForAccess();
  }
}

/** Skips the running test when a screen is refused for the role or company type; fails it for any other outcome. */
export function skipUnlessGranted(access: ScreenAccess, what: string): void {
  test.skip(access === 'restricted', `${what}: "Screen access restricted" — the test user's roles do not grant this screen`);
  test.skip(access === 'company-type', `${what}: "Not available for your company type" — this module is not part of the signed-in company (CFS / Empty Depot)`);
  expect(access, `${what} should open (got "${access}")`).toBe('granted');
}
