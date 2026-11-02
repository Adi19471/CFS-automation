import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { ENVIRONMENTS, ENVIRONMENT_DEFAULTS, type EnvName } from './environments';

/**
 * Single source of truth for the run's settings. playwright.config.ts, the
 * fixtures and the page objects read `env` instead of process.env.
 *
 * Where values come from (a variable that is already set always wins, because
 * dotenv never overrides one):
 *   1. Real environment variables — CI secrets, Jenkins, the shell.
 *   2. ENV_FILE if set, otherwise .env.<TEST_ENV> in the project root.
 *   3. .env in the project root.
 *   4. The defaults in environments.ts (addresses only).
 */

export const ROOT_DIR = path.resolve(__dirname, '..', '..');

const name = (process.env.TEST_ENV || 'local').trim().toLowerCase() as EnvName;
if (!ENVIRONMENTS.includes(name)) {
  throw new Error(`Unknown TEST_ENV "${name}". Expected one of: ${ENVIRONMENTS.join(', ')}.`);
}

// CI passes an unset secret as "" and dotenv never replaces a variable that exists,
// even an empty one — so an empty value would hide the env file. Treat empty as unset.
for (const key of Object.keys(process.env)) {
  if (process.env[key] === '' && /^(BASE_URL|CFS_|ENV_FILE|ALLOW_WRITES|BROWSERS|HEADLESS|SLOW_MO|WORKERS|RETRIES)/.test(key)) {
    delete process.env[key];
  }
}

const envFile = process.env.ENV_FILE || path.join(ROOT_DIR, `.env.${name}`);
const loadedFrom = [envFile, path.join(ROOT_DIR, '.env')].find((file) => fs.existsSync(file));
if (loadedFrom) dotenv.config({ path: loadedFrom, quiet: true });

const defaults = ENVIRONMENT_DEFAULTS[name];

function text(key: string, fallback = ''): string {
  return (process.env[key] ?? fallback).trim();
}

function flag(key: string, fallback: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return /^(1|true|yes|on)$/i.test(value.trim());
}

function int(key: string, fallback: number): number {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : fallback;
}

const isCI = flag('CI', false);
const baseUrl = text('BASE_URL', defaults.baseUrl).replace(/\/+$/, '');
const parsedBase = new URL(baseUrl);

/** /CFS — every app route sits under it (next.config.js basePath). */
const basePath = parsedBase.pathname.replace(/\/+$/, '');

const username = text('CFS_USERNAME');
const password = process.env.CFS_PASSWORD ?? '';

const writesRequested = flag('ALLOW_WRITES', false);
const readOnly = defaults.alwaysReadOnly || !writesRequested;

export const BROWSER_NAMES = ['chromium', 'firefox', 'webkit', 'msedge', 'chrome'] as const;
export type BrowserName = (typeof BROWSER_NAMES)[number];

const browsers = text('BROWSERS', 'chromium')
  .split(',')
  .map((b) => b.trim().toLowerCase())
  .filter(Boolean) as BrowserName[];
const unknownBrowser = browsers.find((b) => !BROWSER_NAMES.includes(b));
if (unknownBrowser) {
  throw new Error(`Unknown browser "${unknownBrowser}" in BROWSERS. Expected: ${BROWSER_NAMES.join(', ')}.`);
}

export const env = {
  name,
  description: defaults.description,
  /** e.g. http://localhost:3000/CFS — no trailing slash */
  baseUrl,
  origin: parsedBase.origin,
  basePath,
  /** the env file that was read, for the report header */
  loadedFrom: loadedFrom ? path.relative(ROOT_DIR, loadedFrom) : '(none — defaults and environment variables)',

  username,
  password,
  hasCredentials: Boolean(username && password),
  /** true = the setup waits for a person to sign in in the browser window (npm run auth:dev); nothing reads or stores a password */
  handSignIn: flag('HAND_SIGN_IN', false),

  /** true = @write tests are skipped */
  readOnly,
  /** ALLOW_WRITES=true was asked for on an environment that never allows it */
  writesRefused: defaults.alwaysReadOnly && writesRequested,

  isCI,
  browsers: browsers.length ? browsers : (['chromium'] as BrowserName[]),
  headless: flag('HEADLESS', true),
  slowMo: int('SLOW_MO', 0),
  workers: int('WORKERS', isCI ? 1 : 2) || 1,
  retries: int('RETRIES', isCI ? 2 : 0),
  ignoreHttpsErrors: flag('IGNORE_HTTPS_ERRORS', false),
  reportOpen: (text('CFS_REPORT_OPEN', 'never') as 'never' | 'on-failure' | 'always'),

  timeouts: {
    test: int('TEST_TIMEOUT', 90_000),
    expect: int('EXPECT_TIMEOUT', 15_000),
    action: int('ACTION_TIMEOUT', 20_000),
    navigation: int('NAVIGATION_TIMEOUT', 60_000),
    /** role screen-access check after a navigation (15–25 s on next dev) */
    screenReady: int('SCREEN_READY_TIMEOUT', 45_000),
  },

  /** Absolute URL of an app route: appUrl('/commercial/booking') → http://host/CFS/commercial/booking */
  appUrl(route = '/'): string {
    const clean = route.startsWith('/') ? route : `/${route}`;
    return `${baseUrl}${clean === '/' ? '/' : clean}`;
  },

  /** App route of a full URL or pathname: /CFS/commercial/booking → /commercial/booking */
  routeOf(urlOrPath: string): string {
    const pathname = /^https?:/i.test(urlOrPath) ? new URL(urlOrPath).pathname : urlOrPath.split('?')[0];
    const bare = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname;
    return bare.replace(/\/+$/, '') || '/';
  },
};

/** The sign-in, or a clear error saying where to put it. */
export function requireCredentials(): { username: string; password: string } {
  if (!env.hasCredentials) {
    throw new Error(
      `CFS_USERNAME / CFS_PASSWORD are not set for [${env.name}]. Sign in by hand with npm run auth:${env.name}, ` +
        `add them to .env.${env.name} (see .env.example), or set them in the environment (CI: repository secrets).`,
    );
  }
  return { username: env.username, password: env.password };
}

export type Env = typeof env;
