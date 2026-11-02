/**
 * Test tags. Filter a run with --grep, e.g. `npm test -- --grep @smoke`,
 * or leave a group out with --grep-invert @write.
 */
export const TAG = {
  /** quick health check of the app: sign-in, dashboard, one screen per module */
  smoke: '@smoke',
  /** the core screens of each module really work: list tools, forms, dialogs (SANITY_SCREENS) */
  sanity: '@sanity',
  /** everything else that is read-only */
  regression: '@regression',
  /** creates or changes records — runs only with ALLOW_WRITES=true, never on production */
  write: '@write',
  /** opens every screen of a module from the menu catalog */
  screens: '@screens',
  /** runs signed out */
  public: '@public',
} as const;

export type Tag = (typeof TAG)[keyof typeof TAG];
