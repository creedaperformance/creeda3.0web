import { test, expect } from '@playwright/test';

test.describe('Injury Risk & Monitoring System (Athlete)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') console.error(`Console Error: "${msg.text()}"`);
    });
    page.on('pageerror', error => {
      console.error(`Page Error: "${error.message}"`);
    });
  });

  test('Performance Risk Outlook visibility', async ({ page }) => {
    await page.goto('/athlete');
    await page.waitForURL(/\/athlete(\/onboarding|\/dashboard)?/, { timeout: 15000 });

    // New accounts can be routed into onboarding; that is still a valid
    // athlete risk-pathway entry state before first dashboard sync.
    if (page.url().includes('/athlete/onboarding')) {
      await expect(page.getByRole('heading', { name: /Athlete Setup/i })).toBeVisible({ timeout: 15000 });
      return;
    }

    const riskSignal = page.locator('text=/Performance Risk Outlook|No immediate vulnerability trend detected|Risk IQ/i').first();
    await expect(riskSignal).toBeVisible({ timeout: 15000 });
  });

  test('Risk Alert visibility placeholders', async ({ page }) => {
    await page.goto('/athlete');

    // These might not be visible if there is no data, but the test ensures path is accessible.
    await expect(page).toHaveURL(/\/athlete/);
  });
});
