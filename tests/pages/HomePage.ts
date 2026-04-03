import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get heroJoinButton() {
    return this.page.locator('a[href="/signup?role=individual"], a[href="/signup?role=athlete"]').first();
  }

  async navigateToFeatures() {
    await this.page.goto('/features', { waitUntil: 'load' });
    await this.page.waitForURL(/\/features/);
  }

  async navigateToMission() {
    await this.page.goto('/mission', { waitUntil: 'load' });
    await this.page.waitForURL(/\/mission/);
  }

  async verifyValueProps() {
    await expect(this.page.getByText(/CREEDA is not another tracker/i)).toBeVisible();
    await expect(this.page.getByRole('heading', { name: /One brand for/i })).toBeVisible();
  }
}
