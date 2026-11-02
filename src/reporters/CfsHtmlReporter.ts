import fs from 'fs';
import os from 'os';
import path from 'path';
import { exec } from 'child_process';
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestError, TestResult, TestStep } from '@playwright/test/reporter';
import { env } from '../config/env';
import { MODULES, folderOf, moduleName } from '../config/modules';
import { AUTH_META_FILE } from '../config/paths';
import { SCREENS, screenOpensTitle, type Screen } from '../data/screens';
import { TAG } from '../utils/tags';
import { renderReport } from './render';
import type { AttachmentInfo, ErrorInfo, LevelSummary, ModuleSummary, ReportData, RunCounts, ScreenModule, ScreenResult, ScreenRow, SkipReason, StepInfo, TestInfoRow, TestState } from './types';

/**
 * CFS HTML report — <outputFolder>/index.html (one self-contained page) with
 * attachments/ beside it, plus summary.json for CI.
 *
 *  - verdict, pass rate, counts and run details (environment, address, browsers…)
 *  - "Needs attention": every failed and flaky test with its error, screenshot and trace
 *  - CFS application coverage: every menu screen of the app and how it did, also the
 *    ones this run never reached, so a short run cannot look like a complete one
 *  - test levels (smoke, sanity, regression) and why tests were skipped
 *  - modules: one card per test folder (Commercial, Operations, Admin…)
 *  - every test, filterable by status / module / text, with steps, errors,
 *    screenshots, video, trace and console output
 *
 * The page is rendered here, in Node, so it reads fine with JavaScript off (CI
 * HTML publishers block scripts); the inline script only adds filtering, search
 * and the theme toggle. While a run is going the page is rewritten every few
 * seconds and refreshes itself, so it can be watched live.
 */

export interface CfsReporterOptions {
  outputFolder?: string;
  title?: string;
  /** open the report in the browser when the run ends */
  open?: 'never' | 'on-failure' | 'always';
  /** rewrite the page while the run is going (default true) */
  live?: boolean;
}

const LIVE_WRITE_MS = 3000;
const MAX_OUTPUT_LINES = 200;

const stripAnsi = (s: string): string => s.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');

export default class CfsHtmlReporter implements Reporter {
  private readonly outDir: string;
  private readonly attachDir: string;
  private readonly title: string;
  private readonly openMode: 'never' | 'on-failure' | 'always';
  private readonly live: boolean;

  private config!: FullConfig;
  private rootSuite!: Suite;
  private startedAt = new Date();
  private readonly rows = new Map<string, TestInfoRow>();
  private readonly running = new Set<string>();
  private readonly globalErrors: ErrorInfo[] = [];
  private attachmentCounter = 0;
  private lastLiveWrite = 0;
  private finished = false;
  /** `playwright test --list`: nothing runs, so no report */
  private listOnly = false;

  constructor(options: CfsReporterOptions = {}) {
    this.outDir = path.resolve(options.outputFolder ?? 'cfs-report');
    this.attachDir = path.join(this.outDir, 'attachments');
    this.title = options.title ?? 'CFS Test Report';
    this.openMode = options.open ?? 'never';
    this.live = options.live ?? true;
  }

  printsToStdio(): boolean {
    return false;
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this.listOnly = process.argv.includes('--list');
    if (this.listOnly) return;
    this.rootSuite = suite;
    this.startedAt = new Date();
    fs.rmSync(this.outDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    fs.mkdirSync(this.attachDir, { recursive: true });
    for (const test of suite.allTests()) this.rows.set(test.id, this.baseRow(test));
    this.write(false);
  }

  onTestBegin(test: TestCase): void {
    if (this.listOnly) return;
    this.running.add(test.id);
    const row = this.rows.get(test.id) ?? this.baseRow(test);
    row.state = 'running';
    this.rows.set(test.id, row);
    this.liveWrite();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (this.listOnly) return;
    this.running.delete(test.id);
    const row = this.rows.get(test.id) ?? this.baseRow(test);
    const outcome = test.outcome();
    row.state = outcome === 'expected' ? 'passed' : outcome === 'flaky' ? 'flaky' : outcome === 'skipped' ? 'skipped' : result.status === 'interrupted' ? 'interrupted' : 'failed';
    // A retry that is still to come leaves the test "unexpected" for now; keep it running.
    if (outcome === 'unexpected' && result.retry < test.retries && result.status !== 'skipped') row.state = 'running';
    row.retries = result.retry;
    row.durationMs = result.duration;
    row.totalMs += result.duration;
    row.startedAt = result.startTime.toISOString();
    row.workerIndex = result.workerIndex;
    row.errors = result.errors.map((e) => this.error(e));
    row.steps = this.steps(result.steps);
    row.annotations = [...test.annotations, ...result.annotations].map((a) => ({ type: a.type, description: a.description ?? '' }));
    row.attachments = this.attachments(result);
    row.stdout = this.output(result.stdout);
    row.stderr = this.output(result.stderr);
    this.rows.set(test.id, row);
    this.liveWrite();
  }

  onError(error: TestError): void {
    this.globalErrors.push(this.error(error));
  }

  async onEnd(result: FullResult): Promise<void> {
    if (this.listOnly) return;
    this.finished = true;
    for (const row of this.rows.values()) {
      if (row.state === 'queued' || row.state === 'running') {
        row.state = 'skipped';
        row.notRun = true;
      }
    }
    const data = this.write(true, result);
    this.printSummary(data);
    if (this.openMode === 'always' || (this.openMode === 'on-failure' && data.counts.failed + data.counts.flaky > 0)) {
      this.openInBrowser(path.join(this.outDir, 'index.html'));
    }
  }

  /* ------------------------------------------------------------------ */

  private baseRow(test: TestCase): TestInfoRow {
    const project = test.parent.project();
    const testDir = project?.testDir ?? this.config.rootDir;
    // Group by the spec file, not where test() was called: the per-module screen
    // suites are declared by a helper in src/utils but belong to their spec.
    let fileSuite: Suite | undefined = test.parent;
    while (fileSuite && fileSuite.type !== 'file') fileSuite = fileSuite.parent;
    const specFile = fileSuite?.location?.file ?? test.location.file;
    const file = path.relative(testDir, specFile).split(path.sep).join('/');
    const location = `${path.relative(this.config.rootDir, test.location.file).split(path.sep).join('/')}:${test.location.line}`;
    const describePath = test.titlePath().slice(3, -1); // ['', project, file, ...describes, title]
    const folder = folderOf(file);
    return {
      id: test.id,
      anchor: `t-${test.id.replace(/[^a-zA-Z0-9_-]/g, '')}`,
      title: test.title,
      describePath,
      file,
      line: test.location.line,
      location,
      project: project?.name ?? '',
      folder,
      module: moduleName(folder),
      tags: test.tags,
      state: 'queued',
      retries: 0,
      durationMs: 0,
      totalMs: 0,
      errors: [],
      steps: [],
      annotations: test.annotations.map((a) => ({ type: a.type, description: a.description ?? '' })),
      attachments: [],
      stdout: [],
      stderr: [],
    };
  }

  private error(e: TestError): ErrorInfo {
    const message = stripAnsi(e.message ?? e.value ?? 'Unknown error');
    const location = e.location ? `${path.relative(this.config?.rootDir ?? process.cwd(), e.location.file).split(path.sep).join('/')}:${e.location.line}:${e.location.column}` : undefined;
    return { message, snippet: e.snippet ? stripAnsi(e.snippet) : undefined, stack: e.stack ? stripAnsi(e.stack).split('\n').slice(0, 12).join('\n') : undefined, location };
  }

  /** test.step()s (the readable ones) and failed expects; hooks, fixtures and API calls left out. */
  private steps(steps: TestStep[]): StepInfo[] {
    const out: StepInfo[] = [];
    for (const step of steps) {
      const keep = step.category === 'test.step' || (step.category === 'expect' && !!step.error);
      const children = this.steps(step.steps);
      if (keep) out.push({ title: step.title, durationMs: step.duration, error: step.error ? stripAnsi(step.error.message ?? '').split('\n')[0] : undefined, steps: children });
      else out.push(...children);
    }
    return out;
  }

  private attachments(result: TestResult): AttachmentInfo[] {
    const out: AttachmentInfo[] = [];
    for (const a of result.attachments) {
      // allure-playwright passes its metadata as attachments of its own type.
      if (a.contentType.startsWith('application/vnd.allure')) continue;
      const n = ++this.attachmentCounter;
      const ext = a.path ? path.extname(a.path) : extensionFor(a.contentType);
      const fileName = `${n}-${a.name.replace(/[^a-zA-Z0-9_.-]+/g, '_')}${ext && !a.name.endsWith(ext) ? ext : ''}`;
      const target = path.join(this.attachDir, fileName);
      try {
        if (a.path && fs.existsSync(a.path)) fs.copyFileSync(a.path, target);
        else if (a.body) fs.writeFileSync(target, a.body);
        else continue;
      } catch {
        continue;
      }
      const size = fs.statSync(target).size;
      const text = a.contentType.startsWith('text/') && size < 64 * 1024 ? fs.readFileSync(target, 'utf8') : undefined;
      out.push({ name: a.name, contentType: a.contentType, href: `attachments/${fileName}`, size, text });
    }
    return out;
  }

  private output(chunks: (string | Buffer)[]): string[] {
    const lines = chunks.flatMap((c) => stripAnsi(c.toString()).split(/\r?\n/)).filter((l) => l.trim());
    return lines.length > MAX_OUTPUT_LINES ? [...lines.slice(0, MAX_OUTPUT_LINES), `… ${lines.length - MAX_OUTPUT_LINES} more lines`] : lines;
  }

  private liveWrite(): void {
    if (!this.live || this.finished) return;
    const now = Date.now();
    if (now - this.lastLiveWrite < LIVE_WRITE_MS) return;
    this.lastLiveWrite = now;
    this.write(false);
  }

  private collect(final: boolean, result?: FullResult): ReportData {
    const tests = [...this.rows.values()];
    const counts: RunCounts = { total: tests.length, passed: 0, failed: 0, flaky: 0, skipped: 0, interrupted: 0, running: 0, queued: 0, notRun: 0 };
    for (const t of tests) {
      counts[t.state] += 1;
      if (t.notRun) counts.notRun += 1;
    }

    const order = Object.keys(MODULES);
    const byFolder = new Map<string, TestInfoRow[]>();
    for (const t of tests) byFolder.set(t.folder, [...(byFolder.get(t.folder) ?? []), t]);
    const modules: ModuleSummary[] = [...byFolder.entries()]
      .map(([folder, list]) => {
        const c = (s: TestState) => list.filter((t) => t.state === s).length;
        const failed = c('failed') + c('interrupted');
        return {
          folder,
          name: moduleName(folder),
          total: list.length,
          passed: c('passed'),
          failed,
          flaky: c('flaky'),
          skipped: c('skipped'),
          pending: c('running') + c('queued'),
          durationMs: list.reduce((sum, t) => sum + t.totalMs, 0),
          files: [...new Set(list.map((t) => t.file))].length,
          state: (failed ? 'failed' : c('flaky') ? 'flaky' : c('running') + c('queued') ? 'running' : c('passed') ? 'passed' : 'skipped') as TestState,
        };
      })
      .sort((a, b) => {
        const ia = order.indexOf(a.folder);
        const ib = order.indexOf(b.folder);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.name.localeCompare(b.name);
      });

    const endedAt = new Date();
    return {
      title: this.title,
      final,
      status: result?.status ?? 'running',
      startedAt: this.startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationMs: result?.duration ?? endedAt.getTime() - this.startedAt.getTime(),
      counts,
      modules,
      screens: screenCoverage(tests),
      levels: levelSummaries(tests),
      skipReasons: skipReasons(tests),
      signInProblem: signInProblem(tests),
      tests: tests.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.project.localeCompare(b.project)),
      globalErrors: this.globalErrors,
      run: {
        environment: env.name,
        description: env.description,
        baseUrl: env.baseUrl,
        browsers: env.browsers.join(', '),
        projects: (this.config?.projects ?? []).map((p) => p.name).join(', '),
        readOnly: env.readOnly,
        workers: this.config?.workers ?? env.workers,
        retries: env.retries,
        playwright: this.config?.version ?? '',
        node: process.version,
        platform: `${process.platform} ${process.arch}`,
        ci: env.isCI,
        envFile: env.loadedFrom,
        user: env.username || savedSignInUser() || '(not set)',
        runBy: runBy(),
      },
    };
  }

  private write(final: boolean, result?: FullResult): ReportData {
    const data = this.collect(final, result);
    try {
      fs.mkdirSync(this.outDir, { recursive: true });
      fs.writeFileSync(path.join(this.outDir, 'index.html'), renderReport(data));
      if (final) {
        const summary = {
          title: data.title,
          status: data.status,
          environment: data.run.environment,
          baseUrl: data.run.baseUrl,
          startedAt: data.startedAt,
          durationMs: data.durationMs,
          counts: data.counts,
          signInProblem: data.signInProblem,
          screens: data.screens.map(({ name, screens, counts }) => ({ name, total: screens.length, ...counts })),
          levels: data.levels,
          skipReasons: data.skipReasons,
          modules: data.modules.map(({ name, total, passed, failed, flaky, skipped, durationMs }) => ({ name, total, passed, failed, flaky, skipped, durationMs })),
          failures: data.tests
            .filter((t) => t.state === 'failed' || t.state === 'interrupted' || t.state === 'flaky')
            .map((t) => ({ title: [...t.describePath, t.title].join(' › '), file: `${t.file}:${t.line}`, project: t.project, state: t.state, error: t.errors[0]?.message.split('\n')[0] ?? '' })),
        };
        fs.writeFileSync(path.join(this.outDir, 'summary.json'), JSON.stringify(summary, null, 2));
      }
    } catch (error) {
      console.error(`[cfs-report] could not write the report: ${(error as Error).message}`);
    }
    // keep the root suite referenced for tests added after onBegin (e.g. --repeat-each)
    void this.rootSuite;
    return data;
  }

  private printSummary(data: ReportData): void {
    const pad = (s: string | number, n: number) => String(s).padEnd(n);
    const lines = [
      '',
      `CFS report  ${data.run.environment} · ${data.run.baseUrl}`,
      `${pad('Module', 20)}${pad('Tests', 7)}${pad('Pass', 6)}${pad('Fail', 6)}${pad('Flaky', 7)}${pad('Skip', 6)}Time`,
      ...data.modules.map((m) => `${pad(m.name, 20)}${pad(m.total, 7)}${pad(m.passed, 6)}${pad(m.failed, 6)}${pad(m.flaky, 7)}${pad(m.skipped, 6)}${formatMs(m.durationMs)}`),
      `${pad('Total', 20)}${pad(data.counts.total, 7)}${pad(data.counts.passed, 6)}${pad(data.counts.failed + data.counts.interrupted, 6)}${pad(data.counts.flaky, 7)}${pad(data.counts.skipped, 6)}${formatMs(data.durationMs)}`,
      screenLine(data.screens),
      ...(data.signInProblem ? [`Sign-in failed: ${data.signInProblem}`] : []),
      `Report: ${path.relative(process.cwd(), path.join(this.outDir, 'index.html'))}   (npm run report:open)`,
      '',
    ];
    console.log(lines.join('\n'));
  }

  private openInBrowser(file: string): void {
    const quoted = `"${file}"`;
    const command = process.platform === 'win32' ? `start "" ${quoted}` : process.platform === 'darwin' ? `open ${quoted}` : `xdg-open ${quoted}`;
    exec(command, () => undefined);
  }
}

/** The worst outcome among a screen's tests (one per browser project). No test means this run never reached it. */
function screenResult(rows: TestInfoRow[]): ScreenResult {
  if (!rows.length || rows.some((t) => t.notRun)) return 'not-run';
  if (rows.some((t) => t.state === 'failed' || t.state === 'interrupted')) return 'failed';
  if (rows.some((t) => t.state === 'running' || t.state === 'queued')) return 'pending';
  if (rows.some((t) => t.state === 'flaky')) return 'flaky';
  return rows.some((t) => t.state === 'skipped') ? 'skipped' : 'opened';
}

const skipReasonOf = (t: TestInfoRow): string | undefined => t.annotations.find((a) => a.type === 'skip' || a.type === 'fixme')?.description;

/** Every menu screen by module, in menu order, with the result of the test that opens it. */
function screenCoverage(tests: TestInfoRow[]): ScreenModule[] {
  const opensTests = new Map<string, TestInfoRow[]>();
  for (const t of tests) {
    if (t.tags.includes(TAG.screens)) opensTests.set(t.title, [...(opensTests.get(t.title) ?? []), t]);
  }

  const byFolder = new Map<string, Screen[]>();
  for (const s of SCREENS) byFolder.set(s.folder, [...(byFolder.get(s.folder) ?? []), s]);

  const order = Object.keys(MODULES);
  return [...byFolder.entries()]
    .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
    .map(([folder, list]) => {
      const counts: Record<ScreenResult, number> = { opened: 0, failed: 0, flaky: 0, skipped: 0, 'not-run': 0, pending: 0 };
      const screens = list.map((s): ScreenRow => {
        const rows = opensTests.get(screenOpensTitle(s)) ?? [];
        const result = screenResult(rows);
        counts[result] += 1;
        return { path: s.path, label: s.label, result, reason: result === 'skipped' ? skipReasonOf(rows[0]) : undefined, anchor: rows[0]?.anchor };
      });
      return { folder, name: moduleName(folder), screens, counts };
    });
}

/** Smoke, sanity and regression, each with what became of its tests. */
function levelSummaries(tests: TestInfoRow[]): LevelSummary[] {
  const levels = [
    { tag: TAG.smoke, name: 'Smoke', meaning: 'Is the app up? Sign-in, dashboard, one screen per module' },
    { tag: TAG.sanity, name: 'Sanity', meaning: 'Does the core of each module work? Lists, forms, dialogs' },
    { tag: TAG.regression, name: 'Regression', meaning: 'Everything else: the same checks on every other screen' },
  ];
  return levels.map((level) => {
    const list = tests.filter((t) => t.tags.includes(level.tag));
    const count = (state: TestState) => list.filter((t) => t.state === state).length;
    const notRun = list.filter((t) => t.notRun).length;
    return {
      ...level,
      total: list.length,
      passed: count('passed'),
      failed: count('failed') + count('interrupted'),
      flaky: count('flaky'),
      skipped: count('skipped') - notRun,
      notRun,
      pending: count('running') + count('queued'),
    };
  });
}

/** Skipped tests grouped by reason, most common first. The reason's leading "<screen>: " is dropped so a reason groups across screens. */
function skipReasons(tests: TestInfoRow[]): SkipReason[] {
  const counts = new Map<string, number>();
  for (const t of tests) {
    const reason = t.state === 'skipped' && !t.notRun ? skipReasonOf(t) : undefined;
    if (!reason) continue;
    const general = reason.replace(/^[^:]*: /, '');
    counts.set(general, (counts.get(general) ?? 0) + 1);
  }
  return [...counts.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
}

/** First line of the sign-in setup's error, when that setup failed. */
function signInProblem(tests: TestInfoRow[]): string | undefined {
  const setup = tests.find((t) => t.folder === 'setup' && (t.state === 'failed' || t.state === 'interrupted'));
  return setup ? (setup.errors[0]?.message.split('\n')[0].replace(/^Error:\s*/, '') ?? 'The sign-in setup failed') : undefined;
}

function screenLine(modules: ScreenModule[]): string {
  const sum = (result: ScreenResult) => modules.reduce((total, m) => total + m.counts[result], 0);
  const total = modules.reduce((n, m) => n + m.screens.length, 0);
  return `Screens: ${sum('opened') + sum('flaky')} of ${total} opened · ${sum('failed')} failed · ${sum('skipped')} skipped · ${sum('not-run')} not run`;
}

/** Who a hand sign-in was saved for (npm run auth:dev), when the env file names no user. */
function savedSignInUser(): string {
  try {
    return (JSON.parse(fs.readFileSync(AUTH_META_FILE, 'utf8')) as { username?: string }).username ?? '';
  } catch {
    return '';
  }
}

function runBy(): string {
  try {
    return os.userInfo().username;
  } catch {
    return '';
  }
}

function extensionFor(contentType: string): string {
  if (contentType === 'image/png') return '.png';
  if (contentType === 'image/jpeg') return '.jpg';
  if (contentType === 'video/webm') return '.webm';
  if (contentType === 'application/zip') return '.zip';
  if (contentType === 'application/json') return '.json';
  if (contentType === 'text/html') return '.html';
  if (contentType.startsWith('text/')) return '.txt';
  return '';
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  const rest = Math.round(s % 60);
  return m < 60 ? `${m}m ${String(rest).padStart(2, '0')}s` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}
