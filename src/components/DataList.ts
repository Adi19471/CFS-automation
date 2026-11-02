import { expect, type Download, type Locator, type Page } from '@playwright/test';
import { escapeRegExp } from './Topbar';

/**
 * The one list layout of CFS (components/ui/DataList.tsx), used by Customer
 * Registration and every master screen:
 *
 *   header   .cfs-list-head  — h1.cfs-list-title (= menu name), "N Total Records"
 *                              chip (appears when the first load is done),
 *                              Export, Filters, "New <Title>"
 *   toolbar  .cfs-list-bar   — quick tabs, search box, Clear, Columns, Row density,
 *                              Saved views, "N of N records"
 *   table    .cfs-list-table — PrimeReact DataTable, 50 rows a page, skeleton rows
 *                              on the first load, Actions column frozen right
 *
 * EDI and Invoice lists also carry a collapsible "Search Criteria" panel between
 * the toolbar and the table.
 */
export class DataList {
  readonly root: Locator;
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly totalChip: Locator;
  readonly exportButton: Locator;
  readonly filtersToggle: Locator;
  readonly newButton: Locator;

  readonly tabs: Locator;
  readonly searchInput: Locator;
  readonly clearButton: Locator;
  readonly columnsButton: Locator;
  readonly columnsPanel: Locator;
  readonly densityButton: Locator;
  readonly savedViewsButton: Locator;
  readonly showing: Locator;

  readonly table: Locator;
  readonly headerCells: Locator;
  readonly filterRow: Locator;
  readonly bodyRows: Locator;
  readonly dataRows: Locator;
  readonly skeletonRows: Locator;
  readonly emptyState: Locator;
  readonly paginator: Locator;
  readonly exportMenu: Locator;
  readonly criteriaPanel: Locator;

  constructor(
    private readonly page: Page,
    root?: Locator,
  ) {
    this.root = root ?? page.locator('.cfs-list').first();
    const head = this.root.locator('.cfs-list-head');
    this.title = head.locator('h1.cfs-list-title');
    this.subtitle = head.locator('.cfs-list-subtitle');
    this.totalChip = head.locator('.cfs-list-head-title .cfs-tag');
    this.exportButton = head.getByRole('button', { name: 'Export' });
    this.filtersToggle = head.getByRole('button', { name: 'Filters', exact: true });
    // .first(): Stuffing Request has two, "New (Shipping Bill)" and "New (Container)".
    this.newButton = head.locator('.cfs-list-head-actions').getByRole('button', { name: /^New\b/ }).first();

    this.tabs = this.root.locator('.cfs-list-tabs [role="tab"]');
    const tools = this.root.locator('.cfs-list-tools');
    this.searchInput = tools.locator('.cfs-list-search input');
    this.clearButton = tools.getByRole('button', { name: 'Clear', exact: true });
    this.columnsButton = tools.getByRole('button', { name: 'Choose columns' });
    this.columnsPanel = page.locator('.cfs-list-columns');
    this.densityButton = tools.getByRole('button', { name: 'Row density' });
    this.savedViewsButton = tools.getByRole('button', { name: 'Saved views' });
    this.showing = tools.locator('.cfs-list-showing');

    this.table = this.root.locator('.cfs-list-table .p-datatable');
    this.headerCells = this.table.locator('.p-datatable-thead > tr').first().locator(':scope > th');
    this.filterRow = this.table.locator('.p-datatable-thead > tr').nth(1);
    this.bodyRows = this.table.locator('.p-datatable-tbody > tr');
    this.dataRows = this.table.locator('.p-datatable-tbody > tr:not(.p-datatable-emptymessage)').filter({ hasNot: page.locator('.p-skeleton') });
    this.skeletonRows = this.bodyRows.filter({ has: page.locator('.p-skeleton') });
    this.emptyState = this.table.locator('.p-datatable-emptymessage');
    this.paginator = this.root.locator('.p-paginator');
    this.exportMenu = page.locator('.cfs-dl-menu');
    this.criteriaPanel = this.root.locator('.p-panel').filter({ has: page.locator('.p-panel-title', { hasText: 'Search Criteria' }) });
  }

  async expectVisible(title?: string): Promise<void> {
    await expect(this.root, 'list').toBeVisible();
    if (title) await expect(this.title).toHaveText(title);
  }

  /**
   * Waits for the first load: the "Total Records" chip appears only then, and
   * the skeleton rows are gone. Returns the record count.
   */
  async waitForLoaded(timeout?: number): Promise<number> {
    await expect(this.totalChip, 'list finished its first load ("N Total Records")').toBeVisible({ timeout });
    await expect(this.skeletonRows).toHaveCount(0, { timeout });
    return this.totalRecords();
  }

  async totalRecords(): Promise<number> {
    const text = await this.totalChip.innerText();
    return Number(text.replace(/[^\d]/g, '')) || 0;
  }

  async rowCount(): Promise<number> {
    return this.dataRows.count();
  }

  async isEmpty(): Promise<boolean> {
    return this.emptyState.isVisible();
  }

  /**
   * Header texts in table order; the tick-box column comes back as "". Read as
   * textContent: the app shows headers in capitals with CSS, and innerText returns
   * that ("MESSAGE ID") rather than the column's name.
   */
  async columnHeaders(): Promise<string[]> {
    const cells = await this.headerCells.all();
    const names: string[] = [];
    for (const cell of cells) {
      const title = cell.locator('.p-column-title');
      names.push((((await title.count()) ? await title.textContent() : await cell.textContent()) ?? '').trim());
    }
    return names;
  }

  async columnIndex(header: string): Promise<number> {
    const headers = await this.columnHeaders();
    const index = headers.findIndex((h) => h === header);
    if (index < 0) throw new Error(`Column "${header}" not found. Columns: ${headers.filter(Boolean).join(', ')}`);
    return index;
  }

  row(index: number): Locator {
    return this.dataRows.nth(index);
  }

  /** First row whose text contains `text`. */
  rowContaining(text: string | RegExp): Locator {
    return this.dataRows.filter({ hasText: text }).first();
  }

  async cellText(rowIndex: number, header: string): Promise<string> {
    const col = await this.columnIndex(header);
    return ((await this.row(rowIndex).locator(':scope > td').nth(col).textContent()) ?? '').trim();
  }

  async columnValues(header: string, limit = 50): Promise<string[]> {
    const col = await this.columnIndex(header);
    const count = Math.min(await this.rowCount(), limit);
    const values: string[] = [];
    for (let i = 0; i < count; i++) values.push(((await this.row(i).locator(':scope > td').nth(col).textContent()) ?? '').trim());
    return values;
  }

  /** An icon button of a row's Actions column, by its label ("Edit", "View", "Delete"…). */
  rowAction(row: Locator, label: string): Locator {
    return row.locator('.cfs-row-actions').getByRole('button', { name: label, exact: true });
  }

  /** Types into the search box; the table filters as you type. */
  async search(text: string): Promise<void> {
    await this.searchInput.fill(text);
    await this.page.waitForTimeout(300);
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.fill('');
  }

  async clickClear(): Promise<void> {
    await this.clearButton.click();
  }

  /** "12 of 340 match" → { shown: 12, total: 340 } */
  async showingCounts(): Promise<{ shown: number; total: number } | null> {
    const text = (await this.showing.innerText().catch(() => '')).replace(/,/g, '');
    const match = text.match(/(\d+)\s+of\s+(\d+)/);
    return match ? { shown: Number(match[1]), total: Number(match[2]) } : null;
  }

  async tabLabels(): Promise<string[]> {
    return (await this.tabs.allTextContents()).map((t) => t.trim());
  }

  /** Tab names without their counts: "Active (12)" → "Active". */
  async tabNames(): Promise<string[]> {
    return (await this.tabLabels()).map((t) => t.replace(/\s*\([\d,]*\)$/, ''));
  }

  tab(label: string): Locator {
    return this.tabs.filter({ hasText: new RegExp(`^${escapeRegExp(label)}\\b`) }).first();
  }

  async selectTab(label: string): Promise<void> {
    const tab = this.tab(label);
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  }

  /** "Active (12)" → 12 */
  async tabCount(label: string): Promise<number | null> {
    const text = await this.tab(label).locator('.cfs-list-tab-count').innerText().catch(() => '');
    const match = text.replace(/,/g, '').match(/\d+/);
    return match ? Number(match[0]) : null;
  }

  async openColumnPicker(): Promise<void> {
    await this.columnsButton.click();
    await expect(this.columnsPanel).toBeVisible();
  }

  /** The button toggles the panel, so this works in every PrimeReact version; Escape is not guaranteed to. */
  async closeColumnPicker(): Promise<void> {
    await this.columnsButton.click();
    await expect(this.columnsPanel).toBeHidden();
  }

  /** The column names the picker offers. */
  async columnChoices(): Promise<string[]> {
    await this.openColumnPicker();
    const choices = (await this.columnsPanel.locator('.cfs-list-columns-item').allTextContents()).map((t) => t.trim());
    await this.closeColumnPicker();
    return choices;
  }

  /** Ticks or unticks a column in the column picker. */
  async toggleColumn(header: string): Promise<void> {
    await this.openColumnPicker();
    await this.columnsPanel.locator('.cfs-list-columns-item', { hasText: new RegExp(`^\\s*${escapeRegExp(header)}\\s*$`) }).click();
    await this.closeColumnPicker();
  }

  async toggleDensity(): Promise<void> {
    await this.densityButton.click();
  }

  async isDense(): Promise<boolean> {
    return (await this.root.getAttribute('class'))?.includes('cfs-list-dense') ?? false;
  }

  async toggleFilterRow(): Promise<void> {
    await this.filtersToggle.click();
  }

  async openExportMenu(): Promise<void> {
    await this.exportButton.click();
    await expect(this.exportMenu).toBeVisible();
  }

  async exportMenuItems(): Promise<string[]> {
    await this.openExportMenu();
    const items = (await this.exportMenu.locator('.p-menuitem-text').allTextContents()).map((t) => t.trim());
    await this.page.keyboard.press('Escape');
    return items;
  }

  /** Downloads the list through Export → "CSV (.csv)" or "Excel (.xlsx)". */
  async download(kind: 'CSV (.csv)' | 'Excel (.xlsx)'): Promise<Download> {
    await this.openExportMenu();
    const [download] = await Promise.all([this.page.waitForEvent('download'), this.exportMenu.locator('.p-menuitem-link', { hasText: kind }).click()]);
    return download;
  }

  async clickNew(): Promise<void> {
    await this.newButton.click();
  }

  /** Field labels of the "Search Criteria" panel, opening it when it is collapsed. */
  async criteriaLabels(): Promise<string[]> {
    const labels = this.criteriaPanel.locator('.cfs-field-label');
    if (!(await labels.first().isVisible())) await this.criteriaPanel.locator('.p-panel-toggler').click();
    await expect(labels.first(), 'Search Criteria fields').toBeVisible();
    return (await labels.allTextContents()).map((t) => t.replace(/\*/g, '').trim());
  }
}
