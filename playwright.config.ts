import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import { env, type BrowserName } from './src/config/env';
import { AUTH_FILE } from './src/config/paths';
import type { CfsOptions } from './src/fixtures/base.fixture';

/**
 * CFS end-to-end suite. Which app it runs against is TEST_ENV (local | dev | uat |
 * production) — see src/config/env.ts and the .env.<name> files.
 *
 * Projects
 *   setup      tests/setup/auth.setup.ts — signs in once, saves playwright/.auth/<env>.json
 *   public     *.public.spec.ts — signed-out checks (login screen, redirects)
 *   <browser>  every other spec, signed in from the saved session, one project per
 *              browser in BROWSERS (chromium by default)
 *
 * Reports
 *   playwright-report/  Playwright HTML        npm run report:playwright
 *   allure-results/     Allure raw results     npm run allure:report
 *   cfs-report/         CFS HTML report        npm run report:open
 */

const DEVICES: Record<BrowserName, (typeof devices)[string] & { channel?: string }> = {
  chromium: { ...devices['Desktop Chrome'] },
  firefox: { ...devices['Desktop Firefox'] },
  webkit: { ...devices['Desktop Safari'] },
  msedge: { ...devices['Desktop Edge'], channel: 'msedge' },
  chrome: { ...devices['Desktop Chrome'], channel: 'chrome' },
};

/* The office screens are 1920 px at 125 % scaling: 1536 CSS px wide. */
const VIEWPORT = { width: 1536, height: 864 };

const [primaryBrowser] = env.browsers;

/* `playwright test --list` runs nothing; the file reporters would still write empty
 * results (Allure would then show every test as skipped next to the real run). */
const listing = process.argv.includes('--list');

/* The config is evaluated in every worker too; only print from the main process. */
if (!process.env.TEST_WORKER_INDEX) {
  console.log(
    `\nCFS e2e → [${env.name}] ${env.baseUrl}  ·  browsers: ${env.browsers.join(', ')}  ·  workers: ${env.workers}` +
      `  ·  ${env.readOnly ? 'read-only' : 'WRITES ALLOWED'}  ·  sign-in: ${env.hasCredentials ? env.username : 'not set'}  ·  env file: ${env.loadedFrom}\n`,
  );
  if (env.writesRefused) console.log(`ALLOW_WRITES is ignored on [${env.name}]: it is always read-only.\n`);
}

const REPORTERS: ReporterDescription[] = [
  [env.isCI ? 'line' : 'list'],
  ['html', { outputFolder: 'playwright-report', open: 'never' }],
  [
    'allure-playwright',
    {
      resultsDir: 'allure-results',
      detail: true,
      suiteTitle: true,
      environmentInfo: {
        Environment: env.name,
        Base_URL: env.baseUrl,
        Browsers: env.browsers.join(', '),
        Read_only: String(env.readOnly),
        Workers: String(env.workers),
        Env_file: env.loadedFrom,
        Node: process.version,
        Platform: `${process.platform} ${process.arch}`,
        CI: String(env.isCI),
      },
      categories: [
        {
          name: 'Sign-in / session',
          messageRegex: '.*([Ss]ign-in|[Ss]ign in|saved CFS sign-in|CFS_USERNAME|session).*',
          matchedStatuses: ['failed', 'broken'],
        },
        {
          name: 'Screen access (role check)',
          messageRegex: '.*(Screen access|should open \\(got).*',
          matchedStatuses: ['failed', 'broken'],
        },
        {
          name: 'Backend errors shown on screen',
          messageRegex: '.*(error toast|not available right now|could not complete the request).*',
          matchedStatuses: ['failed', 'broken'],
        },
        {
          name: 'Timeouts / element not found',
          messageRegex: '.*(Timeout|timed out|exceeded|not visible|not found|waiting for).*',
          matchedStatuses: ['failed', 'broken'],
        },
        { name: 'Product defects', matchedStatuses: ['failed'] },
        { name: 'Test defects', matchedStatuses: ['broken'] },
      ],
    },
  ],
  ['./src/reporters/CfsHtmlReporter.ts', { outputFolder: 'cfs-report', title: 'CFS Test Report', open: env.isCI ? 'never' : env.reportOpen }],
];

export default defineConfig<CfsOptions>({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: env.isCI,
  retries: env.retries,
  workers: env.workers,
  timeout: env.timeouts.test,
  expect: { timeout: env.timeouts.expect },
  /* Prints the slowest spec files at the end of the run. */
  reportSlowTests: { max: 5, threshold: 60_000 },

  reporter: listing ? [['list']] : REPORTERS,

  use: {
    baseURL: `${env.baseUrl}/`,
    viewport: VIEWPORT,
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    headless: env.headless,
    ignoreHTTPSErrors: env.ignoreHttpsErrors,
    actionTimeout: env.timeouts.action,
    navigationTimeout: env.timeouts.navigation,
    trace: (process.env.TRACE as 'on' | 'off' | 'retain-on-failure' | 'on-first-retry') || 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: (process.env.VIDEO as 'on' | 'off' | 'retain-on-failure') || 'retain-on-failure',
    launchOptions: { slowMo: env.slowMo },
  },

  projects: [
    {
      name: 'setup',
      testMatch: /setup[\\/].*\.setup\.ts$/,
      use: { ...DEVICES[primaryBrowser], viewport: VIEWPORT, signedIn: false },
    },
    {
      name: 'public',
      testMatch: /.*\.public\.spec\.ts$/,
      use: { ...DEVICES[primaryBrowser], viewport: VIEWPORT, signedIn: false },
    },
    ...env.browsers.map((browser) => ({
      name: browser,
      testMatch: /.*\.spec\.ts$/,
      testIgnore: /.*\.public\.spec\.ts$/,
      dependencies: ['setup'],
      use: { ...DEVICES[browser], viewport: VIEWPORT, storageState: AUTH_FILE, signedIn: true },
    })),
  ],
});
