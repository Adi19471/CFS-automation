import type { Page } from '@playwright/test';
import { env } from '@config/env';

/**
 * Blocks every request that could change data — anything but GET/HEAD/OPTIONS to
 * the app's /CFS/api/* routes (the backend proxy and the app's own API), sign-in
 * routes excepted — and records what was attempted.
 *
 * Used by the validation tests: "Save with empty required fields" must be stopped
 * by the screen itself. With the guard on, a screen that does send the request
 * creates nothing, and the test can say so. Some screens read with POST
 * (…/search), so call reset() just before the action under test.
 */
export class WriteGuard {
  private attempts: string[] = [];

  private constructor(private readonly page: Page) {}

  static async install(page: Page): Promise<WriteGuard> {
    const guard = new WriteGuard(page);
    const apiPrefix = `${env.basePath}/api/`;
    const authPrefix = `${env.basePath}/api/auth/`;
    await page.route(
      (url) => url.pathname.startsWith(apiPrefix) && !url.pathname.startsWith(authPrefix),
      async (route) => {
        const request = route.request();
        if (['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return route.continue();
        guard.attempts.push(`${request.method()} ${new URL(request.url()).pathname}`);
        return route.abort('blockedbyclient');
      },
    );
    return guard;
  }

  /** Requests blocked since install() or the last reset(). */
  get blocked(): readonly string[] {
    return this.attempts;
  }

  reset(): void {
    this.attempts = [];
  }

  async uninstall(): Promise<void> {
    await this.page.unrouteAll({ behavior: 'ignoreErrors' });
  }
}
