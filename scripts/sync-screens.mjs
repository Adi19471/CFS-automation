#!/usr/bin/env node
/**
 * Builds src/data/screens.json — every screen of the CFS sidebar menu — from the
 * CFS app's own menu model (layout/AppMenu.tsx, MENU_MODEL), flattened the way
 * the app flattens it (lib/role-screen-access.ts, flattenMenuScreens). Page titles,
 * breadcrumbs and role-screen access are all derived from that same model, so the
 * per-module screen tests stay in step with the app.
 *
 * Run it after the menu changes:
 *   npm run sync:screens                       (app at C:/CFS-ECLIPSE/CFS/CFS)
 *   npm run sync:screens -- D:/work/CFS        (app somewhere else)
 *   CFS_APP_DIR=D:/work/CFS npm run sync:screens
 *
 * The app folder is only read, never changed.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_DIR = path.resolve(process.argv[2] || process.env.CFS_APP_DIR || 'C:/CFS-ECLIPSE/CFS/CFS');
const MENU_FILE = path.join(APP_DIR, 'layout', 'AppMenu.tsx');
const PAGES_DIR = path.join(APP_DIR, 'app', '(main)');
const OUT_FILE = path.join(ROOT, 'src', 'data', 'screens.json');

/** Test folder for each top-level menu section. Anything else gets a slug of its label. */
const MODULE_FOLDERS = {
  Dashboards: 'dashboard',
  Commercial: 'commercial',
  Marine: 'marine',
  'Empty Depot Ops': 'empty-depot',
  Operations: 'operations',
  MNR: 'mnr',
  Invoice: 'invoice',
  Documents: 'documents',
  EDI: 'edi',
  Admin: 'admin',
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Index just past the bracket that closes the one at `open`, skipping strings and comments. */
function matchBracket(src, open) {
  const pairs = { '[': ']', '{': '}', '(': ')' };
  const stack = [];
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];
    if (c === '/' && next === '/') {
      i = src.indexOf('\n', i);
      if (i < 0) break;
      continue;
    }
    if (c === '/' && next === '*') {
      i = src.indexOf('*/', i + 2) + 1;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++;
      continue;
    }
    if (pairs[c]) stack.push(pairs[c]);
    else if (c === ']' || c === '}' || c === ')') {
      if (stack.pop() !== c) throw new Error(`Unbalanced "${c}" at offset ${i} of ${MENU_FILE}`);
      if (stack.length === 0) return i + 1;
    }
  }
  throw new Error(`MENU_MODEL in ${MENU_FILE} is never closed`);
}

function readMenuModel() {
  if (!fs.existsSync(MENU_FILE)) {
    throw new Error(`Menu file not found: ${MENU_FILE}\nPass the CFS app folder: npm run sync:screens -- <path-to-CFS-app>`);
  }
  const src = fs.readFileSync(MENU_FILE, 'utf8');
  const decl = src.indexOf('export const MENU_MODEL');
  if (decl < 0) throw new Error(`No "export const MENU_MODEL" in ${MENU_FILE}`);
  const open = src.indexOf('[', src.indexOf('=', decl));
  const literal = src.slice(open, matchBracket(src, open));
  const js = ts.transpileModule(`module.exports = ${literal};`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const sandbox = { module: { exports: null } };
  vm.runInNewContext(js, sandbox, { filename: 'MENU_MODEL.js' });
  return sandbox.module.exports;
}

/** lib/role-screen-access.ts normalizePath */
const normalizePath = (p) => {
  const bare = (p || '/').replace(/^\/CFS(?=\/|$)/, '') || '/';
  return bare === '/' ? '/' : bare.replace(/\/+$/, '');
};

/** lib/role-screen-access.ts flattenMenuScreens, plus the roles and the top-level section. */
function flatten(model, parents = []) {
  const out = [];
  for (const item of model) {
    if (!item || item.separator) continue;
    const hierarchy = item.label ? [...parents, item.label] : parents;
    if (item.to && item.label) {
      out.push({
        path: normalizePath(item.to),
        label: item.label,
        section: parents.join(' / ') || 'General',
        trail: [...parents, item.label],
        icon: item.icon || null,
        roles: item.roles || [],
      });
    }
    if (item.items?.length) out.push(...flatten(item.items, hierarchy));
  }
  return out;
}

/**
 * How the screen draws its title, so the tests know what to assert:
 *  list   — DataList: h1.cfs-list-title = menu name, toolbar, table
 *  header — PageHeader / FormPage: h1.cfs-page-title = menu name
 *  custom — its own layout (yard views, reports…): only "it opens" is checked
 *  missing — the menu links to a route with no page
 * and how it creates a record:
 *  dialog — FormDialog over the list ("New <Title>"), the Admin master pattern
 *  page   — a full-page form in <route>/edit or <route>/new (formPath)
 *  none   — neither
 */
function inspectPage(route) {
  const dir = path.join(PAGES_DIR, ...route.split('/').filter(Boolean));
  const page = path.join(dir, 'page.tsx');
  if (!fs.existsSync(page)) return { layout: 'missing', form: 'none' };
  const sources = fs
    .readdirSync(dir)
    .filter((f) => /\.(t|j)sx?$/.test(f))
    .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
    .join('\n');
  const layout = /<DataList[\s>]/.test(sources) ? 'list' : /<(PageHeader|FormPageHeader|FormPage)[\s>]/.test(sources) ? 'header' : 'custom';
  const formDir = ['edit', 'new'].find((sub) => fs.existsSync(path.join(dir, sub, 'page.tsx')));
  const form = /<FormDialog[\s>]/.test(sources) ? 'dialog' : formDir ? 'page' : 'none';
  return { layout, form, ...(form === 'page' ? { formPath: `${route}/${formDir}` } : {}) };
}

const model = readMenuModel();
const flat = flatten(model);

const seen = new Set();
const screens = [];
for (const s of flat) {
  if (seen.has(s.path)) continue; // the app keys screens by path; the first one wins there too
  seen.add(s.path);
  const top = s.trail[0];
  screens.push({
    path: s.path,
    label: s.label,
    section: s.section,
    module: s.trail.length > 1 ? top : 'General',
    folder: s.trail.length > 1 ? MODULE_FOLDERS[top] ?? slug(top) : 'general',
    ...inspectPage(s.path),
    icon: s.icon,
    roles: s.roles,
  });
}

const byFolder = screens.reduce((acc, s) => ((acc[s.folder] = (acc[s.folder] || 0) + 1), acc), {});
const output = {
  $comment: 'Generated by scripts/sync-screens.mjs from the CFS app menu (layout/AppMenu.tsx). Do not edit by hand — run npm run sync:screens.',
  source: path.relative(ROOT, MENU_FILE).split(path.sep).join('/') || MENU_FILE,
  generatedAt: new Date().toISOString(),
  count: screens.length,
  screens,
};

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, `${JSON.stringify(output, null, 2)}\n`);

console.log(`Wrote ${screens.length} screens to ${path.relative(ROOT, OUT_FILE)}`);
for (const [folder, count] of Object.entries(byFolder)) console.log(`  ${folder.padEnd(14)} ${count}`);
const missing = screens.filter((s) => s.layout === 'missing');
if (missing.length) console.log(`\nMenu entries without a page (${missing.length}): ${missing.map((s) => s.path).join(', ')}`);
