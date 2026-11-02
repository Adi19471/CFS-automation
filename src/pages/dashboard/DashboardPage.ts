import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * Dashboard, the home route / (app/(main)/page.tsx). No title row — the top bar
 * names the screen; a visually hidden h1 "Dashboard" is there for screen readers.
 * Welcome banner + station board slides, four KPI cards, then section cards
 * (Yard Occupancy, Container Movement, Recent Gate Transactions, Operations
 * Snapshot, Top Customers, the "… Wise Handled" chart, Customer Services).
 */
export class DashboardPage extends BasePage {
  readonly path = '/';

  static readonly KPI_LABELS = ['Containers in Yard', 'Gate In (Today)', 'Gate Out (Today)', 'Awaiting Arrival'] as const;
  static readonly SECTION_TITLES = ['Yard Occupancy', 'Container Movement', 'Recent Gate Transactions', 'Operations Snapshot', 'Top Customers', 'Customer Services'] as const;

  readonly heading: Locator;
  readonly stationBoard: Locator;
  readonly sectionTitles: Locator;
  readonly movementPeriods: Locator;
  readonly gateTransactionsFilter: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Dashboard', level: 1 });
    this.stationBoard = page.locator('[aria-label="Station board"]');
    this.sectionTitles = page.locator('.cfs-section-title');
    this.movementPeriods = page.getByRole('group', { name: 'Period' }).getByRole('button');
    this.gateTransactionsFilter = page.getByPlaceholder('Filter by truck or container…');
  }

  override async waitForReady(): Promise<void> {
    await expect(this.heading).toBeAttached();
    await expect(this.section('Yard Occupancy')).toBeVisible();
  }

  /** A KPI card (components/ui/KpiCard.tsx): label on top, the figure in .tw-tabular-nums. */
  kpiCard(label: string): Locator {
    return this.page
      .locator('div.tw-rounded-2xl')
      .filter({ has: this.page.getByText(label, { exact: true }) })
      .filter({ has: this.page.locator('.tw-tabular-nums') })
      .last();
  }

  /** The figure on a KPI card, e.g. "1,240" ("" while its skeleton shows). */
  async kpiValue(label: string): Promise<string> {
    const figure = this.kpiCard(label).locator('.tw-text-3xl.tw-tabular-nums').first();
    await expect(figure.locator('.p-skeleton')).toHaveCount(0);
    return ((await figure.textContent()) ?? '').trim();
  }

  section(title: string): Locator {
    return this.page.locator('section.cfs-section-card').filter({ has: this.page.locator('.cfs-section-title', { hasText: title }) }).first();
  }

  async visibleSectionTitles(): Promise<string[]> {
    return (await this.sectionTitles.allTextContents()).map((t) => t.trim()).filter(Boolean);
  }

  async selectMovementPeriod(name: string): Promise<void> {
    const button = this.movementPeriods.filter({ hasText: name }).first();
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }

  async movementPeriodNames(): Promise<string[]> {
    return (await this.movementPeriods.allTextContents()).map((t) => t.trim());
  }
}
