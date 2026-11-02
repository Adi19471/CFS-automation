import path from 'path';
import { ROOT_DIR, env } from './env';

/** Saved sign-in, one per environment so switching TEST_ENV never reuses another host's cookies. */
export const AUTH_DIR = path.join(ROOT_DIR, 'playwright', '.auth');
export const AUTH_FILE = path.join(AUTH_DIR, `${env.name}.json`);
/** who and where AUTH_FILE was saved for */
export const AUTH_META_FILE = path.join(AUTH_DIR, `${env.name}.meta.json`);

export const TESTS_DIR = path.join(ROOT_DIR, 'tests');
export const ALLURE_RESULTS_DIR = path.join(ROOT_DIR, 'allure-results');
export const CFS_REPORT_DIR = path.join(ROOT_DIR, 'cfs-report');
