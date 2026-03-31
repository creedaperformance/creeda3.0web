import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CoachDashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get commandCenterHeader() {
    return this.page.getByRole('heading', { name: /command center/i });
  }

  get squadRosterHeader() {
    return this.page.getByRole('heading', { name: /squad roster control/i });
  }

  get athleteRows() {
    return this.page.locator('tbody tr');
  }

  get dataCenterLink() {
    return this.page.getByRole('link', { name: /sync analytics/i }).first();
  }

  async verifyRoster() {
    await expect(this.commandCenterHeader).toBeVisible();
    await expect(this.squadRosterHeader).toBeVisible();
    const count = await this.athleteRows.count();
    // It's okay if it's 0 for a new coach, but we'll expect the table to exist
    await expect(this.page.locator('table')).toBeVisible();
  }

  async navigateToDataCenter() {
    // Note: If no athletes, we might navigate via the main nav if it exists, 
    // or direct URL for this test.
    await this.page.goto('/coach/analytics');
    await expect(this.page.getByRole('heading', { name: /squad bio-intelligence/i })).toBeVisible();
  }

  async verifyTheme() {
    await this.verifyThemeTokens();
    await this.assertNoLegacyColors();
  }
}
