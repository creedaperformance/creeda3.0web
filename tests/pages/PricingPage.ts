import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class PricingPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get athleteToggle() {
    return this.page.getByRole('button', { name: /for athletes/i });
  }

  get coachToggle() {
    return this.page.getByRole('button', { name: /for coaches/i });
  }

  get athleteProCard() {
    return this.page.getByRole('heading', { name: 'Athlete Pro', exact: true });
  }

  get coachProCard() {
    return this.page.getByRole('heading', { name: 'Coach Pro', exact: true });
  }

  async selectAthleteView() {
    await this.athleteToggle.click();
    await expect(this.athleteProCard).toBeVisible();
  }

  async selectCoachView() {
    await this.coachToggle.click();
    await expect(this.coachProCard).toBeVisible();
  }

  async verifyThemeCompliance() {
    // Assert primary brand color is visible in CTA buttons
    const upgradeButton = this.page.getByRole('link', { name: /upgrade to pro/i });
    if (await upgradeButton.count() > 0) {
      await expect(upgradeButton).toHaveCSS('background-color', /rgb\(245, 124, 0\)/); // Saffron approx
    }
    await this.verifyThemeTokens();
    await this.assertNoLegacyColors();
  }
}
