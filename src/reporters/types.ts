/** Data model of the CFS HTML report (CfsHtmlReporter → render). */

export type TestState = 'passed' | 'failed' | 'flaky' | 'skipped' | 'interrupted' | 'running' | 'queued';

export interface ErrorInfo {
  message: string;
  snippet?: string;
  stack?: string;
  location?: string;
}

export interface StepInfo {
  title: string;
  durationMs: number;
  error?: string;
  steps: StepInfo[];
}

export interface AttachmentInfo {
  name: string;
  contentType: string;
  /** relative to the report folder */
  href: string;
  size: number;
  /** contents of a small text attachment, shown inline */
  text?: string;
}

export interface TestInfoRow {
  id: string;
  anchor: string;
  title: string;
  describePath: string[];
  /** spec path relative to tests/ */
  file: string;
  line: number;
  /** where test() is declared, relative to the project root, e.g. src/utils/screen-suite.ts:57 */
  location: string;
  project: string;
  folder: string;
  module: string;
  tags: string[];
  state: TestState;
  /** a test that never started because a dependency (the sign-in setup) failed */
  notRun?: boolean;
  retries: number;
  /** last attempt */
  durationMs: number;
  /** all attempts */
  totalMs: number;
  startedAt?: string;
  workerIndex?: number;
  errors: ErrorInfo[];
  steps: StepInfo[];
  annotations: { type: string; description: string }[];
  attachments: AttachmentInfo[];
  stdout: string[];
  stderr: string[];
}

export interface ModuleSummary {
  folder: string;
  name: string;
  total: number;
  passed: number;
  failed: number;
  flaky: number;
  skipped: number;
  pending: number;
  durationMs: number;
  files: number;
  state: TestState;
}

export interface RunCounts extends Record<TestState, number> {
  total: number;
  notRun: number;
}

export interface RunInfo {
  environment: string;
  description: string;
  baseUrl: string;
  browsers: string;
  projects: string;
  readOnly: boolean;
  workers: number;
  retries: number;
  playwright: string;
  node: string;
  platform: string;
  ci: boolean;
  envFile: string;
  user: string;
}

export interface ReportData {
  title: string;
  /** false while the run is still going (live report) */
  final: boolean;
  status: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  counts: RunCounts;
  modules: ModuleSummary[];
  tests: TestInfoRow[];
  globalErrors: ErrorInfo[];
  run: RunInfo;
}
