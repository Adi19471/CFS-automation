/**
 * Display names of the test folders (tests/<folder>/). The fixtures use them for
 * the Allure "epic" label and the CFS report groups its modules by them, in this
 * order. A folder not listed here is shown under its own name.
 */
export const MODULES: Record<string, string> = {
  setup: 'Setup',
  auth: 'Sign-in & session',
  dashboard: 'Dashboard',
  navigation: 'Navigation',
  settings: 'Settings',
  commercial: 'Commercial',
  marine: 'Marine',
  'empty-depot': 'Empty Depot Ops',
  operations: 'Operations',
  mnr: 'MNR',
  invoice: 'Invoice',
  documents: 'Documents',
  edi: 'EDI',
  admin: 'Admin',
};

/**
 * The screens @sanity covers, per test folder. A sanity run proves the core of each
 * module works; regression covers every other screen the same way. CFS-only and
 * Empty Depot-only screens are both listed, so a run exercises whichever the signed-in
 * company has and skips the rest. moduleScreens() refuses a path the menu does not have.
 */
export const SANITY_SCREENS: Record<string, readonly string[]> = {
  dashboard: ['/dashboard/ytd'],
  commercial: ['/commercial/customer-registration', '/commercial/contract-registration', '/commercial/booking'],
  marine: ['/marine/vessel-registration', '/marine/voyage'],
  'empty-depot': ['/operations/depot-pre-advice', '/operations/depot-gate-operations'],
  operations: [
    '/operations/inventory',
    '/operations/storage',
    '/operations/damage',
    '/operations/hold-release',
    '/operations/gate-operations',
    '/operations/work-order',
    '/operations/delivery-order',
    '/operations/destuffing',
    '/operations/stuffing-entry',
  ],
  mnr: ['/mnr/damage-estimate', '/mnr/damage-estimate/approval', '/mnr/damage-estimate/processing', '/mnr/damage-estimate/completed'],
  invoice: ['/invoice/invoices', '/invoice/credit-debit-notes'],
  documents: ['/documents/requirements'],
  edi: ['/edi/inbound-messages', '/edi/outbound-messages', '/edi/customs-integration', '/edi/configuration'],
  /* One master from each Admin group. */
  admin: [
    '/admin/cargo/cargo-type',
    '/admin/commercial/bank',
    '/admin/damage/damage-code',
    '/admin/stores/parts-group',
    '/admin/geography/country',
    '/admin/invoice/charge-code',
    '/admin/equipment/type',
    '/admin/others/status',
    '/admin/security/role',
    '/admin/marine/type-of-vessel',
  ],
};

export function moduleName(folder: string): string {
  return MODULES[folder] ?? folder.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Folder of a spec relative to the tests folder: "commercial/customer.spec.ts" → "commercial". */
export function folderOf(relativeSpecPath: string): string {
  const parts = relativeSpecPath.split(/[\\/]/).filter(Boolean);
  return parts.length > 1 ? parts[0] : 'general';
}
