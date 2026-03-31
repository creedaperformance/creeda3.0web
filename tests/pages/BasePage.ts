import { Page, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly baseUrl: string = 'http://localhost:3000';

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string = '/') {
    await this.page.goto(path, { waitUntil: 'load' });
    await this.page.waitForSelector('body');
  }

  async verifyNoConsoleErrors() {
    const logs: string[] = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error') logs.push(msg.text());
    });
    // This is a reactive check, usually best used during a session
    return logs;
  }

  async verifyThemeTokens() {
    // Brand Tokens to verify
    const tokens = [
      '--color-india-saffron',
      '--color-india-green',
      '--color-elite-blue',
      '--color-primary'
    ];

    for (const token of tokens) {
      const value = await this.page.evaluate((t) => {
        return getComputedStyle(document.documentElement).getPropertyValue(t);
      }, token);
      expect(value, `Theme token ${token} should be defined`).not.toBe('');
    }
  }

  async assertNoLegacyColors() {
    const legacySelectors = [
      '[class*="text-blue-200"]',
      '[class*="bg-blue-200"]',
      '[class*="text-emerald-500"]',
      '[class*="bg-emerald-500"]'
    ];

    for (const selector of legacySelectors) {
      const count = await this.page.locator(selector).count();
      expect(count, `Found ${count} elements with legacy color selector: ${selector}`).toBe(0);
    }
  }

  async waitForHydration() {
    await this.page.waitForSelector('body.hydrated', { state: 'attached', timeout: 5000 }).catch(() => {
      // If we don't use a 'hydrated' class, we can check for a common component
      return this.page.waitForLoadState('domcontentloaded');
    });
  }
}
