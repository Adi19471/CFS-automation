#!/usr/bin/env node
/** Opens the CFS HTML report (cfs-report/index.html) in the default browser. */
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = path.join(ROOT, 'cfs-report', 'index.html');

if (!fs.existsSync(report)) {
  console.error('No CFS report yet — run the tests first (npm test).');
  process.exit(1);
}

const quoted = `"${report}"`;
const command = process.platform === 'win32' ? `start "" ${quoted}` : process.platform === 'darwin' ? `open ${quoted}` : `xdg-open ${quoted}`;
exec(command, (error) => {
  if (error) {
    console.error(`Could not open the report: ${error.message}\nOpen it by hand: ${report}`);
    process.exit(1);
  }
  console.log(`Opened ${path.relative(process.cwd(), report)}`);
});
