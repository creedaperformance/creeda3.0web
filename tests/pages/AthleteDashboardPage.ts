import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AthleteDashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get performanceDirectivesHeader() {
    return this.page.getByText(/Athlete Training Guide|Today/i).first();
  }

  get readinessScore() {
    return this.page.locator('text=/readiness score/i').first();
  }

  get tacticalDirectivesSection() {
    return this.page.getByText(/tactical directives/i);
  }

  get todayConclusionSection() {
    return this.page.getByText(/Elite Target|Performance Coach|Start Check-up|Lifestyle Pulse/i).first();
  }

  async verifyDataIntegrity() {
    await expect(this.performanceDirectivesHeader).toBeVisible();
    await expect(this.page.getByText(/Something went wrong/i)).toHaveCount(0);
    await expect(this.todayConclusionSection).toBeVisible();
  }

  async verifyTheme() {
    await this.verifyThemeTokens();
    await this.assertNoLegacyColors();

    const card = this.page.locator('.glass').first();
    await expect(card).toBeVisible();
  }
}
