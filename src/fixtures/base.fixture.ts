import fs from 'fs';
import path from 'path';
import { test as base, expect, type BrowserContext, type ConsoleMessage } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { env } from '@config/env';
import { folderOf, moduleName } from '@config/modules';
import { AUTH_FILE } from '@config/paths';
import { SettingsPanel } from '@components/SettingsPanel';
import { SideMenu } from '@components/SideMenu';
import { Toast } from '@components/Toast';
import { Topbar } from '@components/Topbar';
import type { Screen } from '@data/screens';
import { AdminMasterPage } from '@pages/admin/AdminMasterPage';
import { LoginPage } from '@pages/auth/LoginPage';
import { CustomerFormPage } from '@pages/commercial/CustomerFormPage';
import { CustomerRegistrationPage } from '@pages/commercial/CustomerRegistrationPage';
import { FormScreenPage } from '@pages/common/FormScreenPage';
import { MenuScreenPage } from '@pages/common/MenuScreenPage';
import { DashboardPage } from '@pages/dashboard/DashboardPage';
import { TAG } from '@utils/tags';
import { WriteGuard } from '@utils/write-guard';

/** Set per project in playwright.config.ts. */
export interface CfsOptions {
  /** true = the project starts from the saved sign-in (storageState); "public" sets false */
  signedIn: boolean;
}

/** What the browser complained about during a test. */
export interface BrowserIssues {
  /** uncaught exceptions in the page */
  uncaught: string[];
  /** console.error lines */
  consoleErrors: string[];
}

interface CfsFixtures {
  /** auto: tab lease, session check, @write gate, Allure labels */
  appSession: void;
  /** auto: collects page errors and attaches them to the report */
  browserIssues: BrowserIssues;

  topbar: Topbar;
  sideMenu: SideMenu;
  toast: Toast;
  settingsPanel: SettingsPanel;

  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  customerRegistrationPage: CustomerRegistrationPage;
  customerFormPage: CustomerFormPage;

  /** page object for any menu screen: menuScreen(screen('/marine/voyage')) */
  menuScreen: (screen: Screen) => MenuScreenPage;
  /** page object for an Admin master screen (list + FormDialog) */
  adminMaster: (screen: Screen) => AdminMasterPage;
  /** page object for a list screen and its full-page form */
  formScreen: (screen: Screen) => FormScreenPage;

  /** blocks data-changing API calls for the test (validation tests) */
  writeGuard: WriteGuard;
}

const TESTS_DIR = path.resolve(__dirname, '..', '..', 'tests');

/**
 * Writes the context's cookies back to the saved sign-in. The backend may rotate the
 * refresh token, and the app only shares a refresh result for 30 s, so a run longer
 * than the access token's life would otherwise keep presenting a spent token from the
 * saved file and fail every remaining test. Written to a temporary file and renamed so
 * a worker never reads half a file. A failed rename (Windows, another worker reading)
 * is harmless: the next test writes it again.
 */
async function saveRenewedSession(context: BrowserContext, workerIndex: number): Promise<void> {
  const temporary = `${AUTH_FILE}.${workerIndex}.tmp`;
  await context.storageState({ path: temporary });
  try {
    fs.renameSync(temporary, AUTH_FILE);
  } catch {
    fs.rmSync(temporary, { force: true });
  }
}

export const test = base.extend<CfsFixtures & CfsOptions>({
  signedIn: [true, { option: true }],

  appSession: [
    async ({ context, signedIn }, use, testInfo) => {
      // Allure: module from the test's folder, severity from its tags.
      // titlePath[0] is the spec file (relative to tests/), also for tests a helper declares.
      const folder = folderOf(testInfo.titlePath[0] ?? path.relative(TESTS_DIR, testInfo.file));
      await allure.epic(moduleName(folder));
      if (testInfo.titlePath.length > 2) await allure.feature(testInfo.titlePath[1]);
      await allure.severity(testInfo.tags.includes(TAG.smoke) ? 'critical' : 'normal');
      await allure.label('environment', env.name);

      testInfo.skip(
        testInfo.tags.includes(TAG.write) && env.readOnly,
        env.writesRefused
          ? `[${env.name}] is always read-only — @write tests never run here`
          : `Read-only run — set ALLOW_WRITES=true in .env.${env.name} to run @write tests`,
      );

      // A sign-in only counts while a tab of the app is open: the open tab keeps the
      // cfs_tab cookie alive and middleware drops the session without it
      // (lib/tab-lease.ts). A new test context has no tab yet, so give it the lease
      // a tab would have written; the app's own heartbeat renews it from then on.
      await context.addCookies([{ name: 'cfs_tab', value: '1', url: env.origin, expires: Math.floor(Date.now() / 1000) + 600, sameSite: 'Lax' }]);

      if (signedIn) {
        // Middleware only decodes the session cookie; it is /api/auth/session that runs
        // the refresh. Calling it first renews an access token that lapsed since the
        // setup signed in, the way the app's own session polling does.
        const response = await context.request.get(env.appUrl('/api/auth/session'));
        const session = (await response.json().catch(() => ({}))) as { user?: unknown; error?: string };
        if (!response.ok() || !session.user || session.error) {
          throw new Error(
            `The saved CFS sign-in is not usable (${session.error ?? `HTTP ${response.status()}, no user`}). ` +
              'Run the suite again — the setup project signs in afresh when the saved session no longer works.',
          );
        }
        await saveRenewedSession(context, testInfo.workerIndex);
      }
      await use();
    },
    { auto: true },
  ],

  browserIssues: [
    async ({ page }, use, testInfo) => {
      const issues: BrowserIssues = { uncaught: [], consoleErrors: [] };
      page.on('pageerror', (error) => issues.uncaught.push(`${error.name}: ${error.message}`));
      page.on('console', (message: ConsoleMessage) => {
        if (message.type() === 'error') issues.consoleErrors.push(message.text());
      });
      await use(issues);

      const lines = [
        ...issues.uncaught.map((e) => `UNCAUGHT  ${e}`),
        ...issues.consoleErrors.map((e) => `CONSOLE   ${e}`),
      ];
      if (lines.length) await testInfo.attach('browser-errors', { body: lines.join('\n'), contentType: 'text/plain' });
      if (testInfo.status !== testInfo.expectedStatus) {
        await testInfo.attach('page-url', { body: page.url(), contentType: 'text/plain' });
      }
    },
    { auto: true },
  ],

  topbar: async ({ page }, use) => use(new Topbar(page)),
  sideMenu: async ({ page }, use) => use(new SideMenu(page)),
  toast: async ({ page }, use) => use(new Toast(page)),
  settingsPanel: async ({ page }, use) => use(new SettingsPanel(page)),

  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  dashboardPage: async ({ page }, use) => use(new DashboardPage(page)),
  customerRegistrationPage: async ({ page }, use) => use(new CustomerRegistrationPage(page)),
  customerFormPage: async ({ page }, use) => use(new CustomerFormPage(page)),

  menuScreen: async ({ page }, use) => use((screen: Screen) => new MenuScreenPage(page, screen)),
  adminMaster: async ({ page }, use) => use((screen: Screen) => new AdminMasterPage(page, screen)),
  formScreen: async ({ page }, use) => use((screen: Screen) => new FormScreenPage(page, screen)),

  writeGuard: async ({ page }, use) => {
    const guard = await WriteGuard.install(page);
    await use(guard);
    await guard.uninstall();
  },
});

export { expect };
