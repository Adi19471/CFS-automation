import catalog from './screens.json';

/**
 * Every screen of the CFS sidebar menu, generated from the app's own menu model
 * by scripts/sync-screens.mjs (npm run sync:screens). The menu name is also the
 * screen's title and the last breadcrumb, so tests can assert against it.
 */

export type ScreenLayout = 'list' | 'header' | 'custom' | 'missing';
/** dialog = FormDialog over the list (Admin masters); page = full-page form in <route>/edit */
export type ScreenForm = 'dialog' | 'page' | 'none';

export interface Screen {
  /** app route without the /CFS base path, e.g. /commercial/customer-registration */
  path: string;
  /** menu name = page title */
  label: string;
  /** parent menu groups, e.g. "Admin / Cargo" */
  section: string;
  /** top-level menu group, e.g. "Admin" */
  module: string;
  /** test folder of the module, e.g. "admin" */
  folder: string;
  layout: ScreenLayout;
  form: ScreenForm;
  /** route of the full-page form, when form is "page": <path>/edit or <path>/new */
  formPath?: string;
  icon: string | null;
  roles: string[];
}

export const SCREENS: readonly Screen[] = catalog.screens as Screen[];

export function screensIn(folder: string): Screen[] {
  return SCREENS.filter((s) => s.folder === folder);
}

export function screen(path: string): Screen {
  const found = SCREENS.find((s) => s.path === path);
  if (!found) throw new Error(`No menu screen with path ${path}. Run npm run sync:screens if the menu changed.`);
  return found;
}

/** Breadcrumb the app shows for a screen: its menu groups, then its name (lib/screen-titles.ts). The home route is always just "Dashboard". */
export function breadcrumbOf(s: Screen): string[] {
  if (s.path === '/') return [s.label];
  return [...(s.section && s.section !== 'General' ? s.section.split(' / ') : []), s.label];
}

/** Screens a test can open: the menu entry has a page behind it. */
export const OPENABLE_SCREENS = SCREENS.filter((s) => s.layout !== 'missing');
