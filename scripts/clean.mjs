#!/usr/bin/env node
/**
 * Removes the output of earlier runs: reports, results and test artefacts.
 *   npm run clean            reports and results
 *   npm run clean -- --auth  also the saved sign-ins (playwright/.auth)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['allure-results', 'allure-report', 'playwright-report', 'test-results', 'blob-report', 'cfs-report'];
if (process.argv.includes('--auth')) targets.push(path.join('playwright', '.auth'));

for (const target of targets) {
  const full = path.join(ROOT, target);
  if (!fs.existsSync(full)) continue;
  fs.rmSync(full, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  console.log(`removed ${target}`);
}
