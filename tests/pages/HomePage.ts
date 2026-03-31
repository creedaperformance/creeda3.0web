import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get heroJoinButton() {
    return this.page.getByRole('link', { name: /get started|enter dashboard|continue setup/i }).first();
  }

  async navigateToFeatures() {
    await this.page.getByRole('link', { name: /features/i }).click();
    await this.page.waitForURL(/\/features/);
  }

  async navigateToMission() {
    await this.page.getByRole('link', { name: /our mission/i }).click();
    await this.page.waitForURL(/\/mission/);
  }

  async verifyValueProps() {
    await expect(this.page.getByText(/decision engine for performance, health, and lifestyle/i)).toBeVisible();
    await expect(this.page.getByText(/choose your pathway/i)).toBeVisible();
  }
}
