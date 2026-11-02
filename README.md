# CFS Playwright automation

End-to-end UI tests for the CFS (Container Freight Station) web app, frontend only.
Built with Playwright and TypeScript, using page objects and fixtures, and producing Allure and a custom CFS HTML report.

- 557 tests at three levels (smoke, sanity, regression): sign-in and session, dashboards, navigation, settings, every one of the 135 menu screens, the tools of every list, the full-page form of every Operations, MNR, Invoice, Commercial and Empty Depot screen, the New and Edit dialogs of every Admin and Documents master, and the EDI messages.
- One set of env files per environment: `local`, `dev`, `uat` and `production`. Production is always read-only.
- Three reports from every run: the CFS report, Allure and the Playwright HTML report.

## Setup

```bash
npm install
npx playwright install chromium
```

Allure needs Java 8 or later (`java -version`).

Fill in the sign-in in the env file of the environment you test. These files are gitignored; `.env.example` is the template.

```
# .env.local
BASE_URL=http://localhost:3000/CFS
CFS_USERNAME=<test user>
CFS_PASSWORD=<password>
```

| Env file | App |
| --- | --- |
| `.env.local` | `http://localhost:3000/CFS` — CFS dev server on this machine |
| `.env.dev` | `http://app.infyz.corp/CFS` — shared dev deployment (office network) |
| `.env.uat` | `https://cfsuat.containeroncloud.com/CFS` |
| `.env.production` | `https://vplpl.containeroncloud.com/CFS` — read-only |

Real environment variables (CI secrets, the shell) always override the files. All settings are listed in `.env.example`: browsers, workers, timeouts, `ALLOW_WRITES` and when to open the report.

## Test levels

Tests stay in their module's folder and the level is a tag, so one test never has to be written twice.

| Level | Tag | Tests | What it answers |
| --- | --- | --- | --- |
| Smoke | `@smoke` | 19 | Is the app up? Sign-in, dashboard, one screen per module |
| Sanity | `@sanity` | 123 | Does the core of each module work? List tools, forms and dialogs of the screens in `SANITY_SCREENS` (`src/config/modules.ts`), the EDI messages, the invoice stages |
| Regression | `@regression` | 415 | Everything else: the same checks on every other screen |

`test:regression` runs all three levels together, which is the complete read-only suite.

## Run

```bash
npm run test:dev:smoke
```

| Command | What it runs |
| --- | --- |
| `npm run test:dev:smoke` (also `local`, `uat`, `production`) | `@smoke` only |
| `npm run test:dev:sanity` (also `local`, `uat`) | `@sanity` only |
| `npm run test:dev:regression` (also `local`, `uat`) | Smoke, sanity and regression together |
| `npm run test:local` / `test:dev` / `test:uat` / `test:production` | Everything, against that environment |
| `npm run test:public` | Signed-out tests only (no credentials needed) |
| `npm run test:commercial`, `test:operations`, `test:admin` … | One module folder |
| `npm test -- --grep @screens` | Every menu screen opens |
| `npm run test:headed` / `test:ui` / `test:debug` | Watch it, Playwright UI mode, or step through |
| `npm run test:list` | List the tests without running them |

The default environment is `local`, so `npm test` is the same as `npm run test:local`.

Tags: `@smoke`, `@sanity`, `@regression`, `@screens`, `@public` and `@write`. Combine them with `--grep` and `--grep-invert`.

## Reports

| Report | Folder | Open with |
| --- | --- | --- |
| CFS report | `cfs-report/` | `npm run report:open` |
| Allure | `allure-results/` → `allure-report/` | `npm run allure:report` (or `allure:serve`) |
| Playwright HTML | `playwright-report/` | `npm run report:playwright` |

The CFS report is one self-contained page (`cfs-report/index.html`) with these parts:

- The verdict and pass rate.
- **Needs attention**: every failed or flaky test, with its error, screenshot and trace.
- A card per module.
- The slowest tests and the run details.
- The full test list, which you can filter by result, module or text. Each test shows its steps, errors, screenshots, video, trace and browser console errors.

The page also rewrites itself while the run is going, so you can watch it live. `cfs-report/summary.json` has the same results for CI. Set `CFS_REPORT_OPEN=on-failure` (or `always`) to open the report automatically after the run.

Allure groups tests by module (Epic) and by spec (Feature). It also sorts failures into categories: sign-in, screen access, backend errors, timeouts, product defects and test defects.

## How it works

- **Sign-in once.** The `setup` project signs in through the real login screen and saves the session to `playwright/.auth/<env>.json`. The next run reuses that file while the app still accepts it.
- **Tab lease.** CFS drops a session when no tab of the app is open: there must be a `cfs_tab` cookie (`lib/tab-lease.ts` in the app). The fixtures give each test context that cookie, as an open tab would, and check the saved session through `/api/auth/session`, which also renews the token. Renewed cookies are written back to the saved session, so a long run never presents a spent refresh token.
- **Role check.** Every screen first checks the user's role access. This takes 15–25 s on `next dev` and much less on a build. `ScreenState` waits it out. A screen the role does not grant is **skipped**, not failed, and the report says why.
- **Company type.** A company is CFS or Empty Depot (`lib/company-module-access.ts`), and each has different modules. A screen shown as "Not available for your company type" is also **skipped** with that reason. An Empty Depot company therefore skips most of Operations, MNR and part of EDI, and a CFS company skips the Empty Depot screens. To cover both, run once with a sign-in of each type.
- **Screen list from the app's own menu.** `src/data/screens.json` is generated from the CFS menu model (`layout/AppMenu.tsx`). When the menu changes, run `npm run sync:screens` (the app folder defaults to `C:/CFS-ECLIPSE/CFS/CFS`; pass another path after `--`).

## Safety

- Read-only by default. Tests tagged `@write` (today only *Customer Registration — create*) run only with `ALLOW_WRITES=true`, and never on production.
- Validation tests (Save with required fields empty) run behind a **write guard**. It blocks every data-changing API call and reports any that was attempted, so nothing can be saved even if a screen skipped its own checks.
- Other Cargo Services and New Invoice have nothing required on an empty record, so their Save is never pressed.
- EDI *Reprocess message*, invoice bulk print and e-mail, and the EDI configuration's Save are only looked at, never pressed. Edit tests open a record and leave without saving.
- The Settings tests only preview a theme and then press **Discard**. Nothing presses *Save company theme*, which changes the look for every user.
- The only credentials the signed-out tests send are made up and must be refused.

## Folder layout

```
playwright.config.ts        projects (setup, public, one per browser), reporters, timeouts
.env.example / .env.<env>   environment settings and sign-in
src/
  config/                   env.ts (loads .env.<env>), environments.ts (addresses), modules.ts, paths.ts
  components/               UI parts shared by every screen
                            Topbar, SideMenu, Toast, ScreenState (role check), DataList, FormDialog,
                            FormPageHeader, SettingsPanel
  pages/                    page objects, one folder per area
    BasePage.ts             shell + goto/open + role check
    auth/LoginPage.ts
    dashboard/DashboardPage.ts
    commercial/             CustomerRegistrationPage, CustomerFormPage
    admin/AdminMasterPage   any Admin master (list + FormDialog)
    common/MenuScreenPage   any menu screen, driven by its catalog entry
    common/FormScreenPage   a list screen's full-page form, whichever form head it uses
  fixtures/                 test = base.extend(...): page objects, tab lease, session check,
                            browser-error capture, Allure labels, write guard
  data/                     screens.json (generated), screens.ts, testdata/
  reporters/                CfsHtmlReporter + renderer, styles, script
  utils/                    tags, screen-checks, write-guard, unique test data, logger
tests/
  setup/                    auth.setup.ts
  auth/                     *.public.spec.ts (signed out), session.spec.ts
  dashboard/ navigation/ settings/
  commercial/ marine/ empty-depot/ operations/ mnr/ invoice/ documents/ edi/ admin/
                            <module>-screens.spec.ts in each: opens, list tools, forms
                            admin + documents: <module>-dialogs.spec.ts (New and Edit)
                            edi-messages, invoice-flows, mnr-flows, operations-custom,
                            Customer Registration: what is specific to those screens
scripts/                    sync-screens.mjs, open-report.mjs, clean.mjs
```

## Adding tests

1. **A screen with its own behaviour.** Add `src/pages/<module>/<Screen>Page.ts`. Extend `BasePage` (and set `path`), or extend `MenuScreenPage` and pass in its catalog entry. Use the shared components: `DataList` for the list, `FormDialog` or `FormPageHeader` for forms, and `Toast`.
2. **Register it** as a fixture in `src/fixtures/base.fixture.ts`.
3. **Write the spec** in `tests/<module>/`. Import `test` and `expect` from `@fixtures`, tag it, and use `test.step` for readable steps in the reports.
4. **Signed-out tests** go in a `*.public.spec.ts` file. Anything that saves gets `TAG.write`.
5. **To move a screen into sanity,** add its path to `SANITY_SCREENS` in `src/config/modules.ts`.

Locators follow the app's own markup. The list is `.cfs-list` (title `h1.cfs-list-title`, the "N Total Records" chip appears when the first load is done). Dialogs are `.cfs-form-dialog`, fields are `.cfs-field` with `label.cfs-field-label`, toasts are `.cfs-toast-<severity>`. The Customer form's text boxes all share `id="field"`, so its fields are found by label.

Read labels with `textContent()`, not `innerText()`. The app capitalises table headers, menu groups and section titles with CSS, and `innerText()` returns the capitals, so `Message ID` would come back as `MESSAGE ID`.

## CI

`.github/workflows/playwright.yml` has two jobs:

- **Push and pull request:** type check and test discovery.
- **Run workflow** (Actions tab): runs the suite against the chosen environment and uploads all three reports as artifacts. It needs `CFS_USERNAME` and `CFS_PASSWORD` set as secrets in the matching GitHub Environment. `local` and `dev` are only reachable from the office network, so pick the self-hosted runner for those.

## Known items

- `checkScreenOpens` marks a menu entry with no page as `test.fail`, so it documents the gap. No entry is in that state today; *Admin › Commercial › Company Type* now has a page.
- Routes outside the menu are not tested because nothing links to them: `operations/gate`, `operations/WorkOrder`, `operations/inventory-new`, `operations/invoice-management`, `operations/delivery-order-old`, `mnr/WorkOrder` and `mnr/work-order/*`.
