import { test, expect } from '@playwright/test';

test.describe('Athlete injury & risk surfacing', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') console.error(`Console Error: "${msg.text()}"`);
    });
    page.on('pageerror', error => {
      console.error(`Page Error: "${error.message}"`);
    });
  });

  test('Performance View loads and decision zone is visible', async ({ page }) => {
    await page.goto('/athlete');
    await page.waitForURL(/\/athlete(\/onboarding|\/dashboard)?/, { timeout: 15000 });

    if (page.url().includes('/athlete/onboarding')) {
      await expect(page.getByText(/Athlete Setup progress/i)).toBeVisible({ timeout: 15000 });
      return;
    }

    // The 4-zone Performance View renders. Risk and injury context now live inside
    // the decision zone's why-line when applicable, instead of a separate panel.
    await expect(page.locator('[data-persona="athlete"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="zone-decision"]')).toBeVisible();
  });

  test('athlete dashboard route is reachable', async ({ page }) => {
    await page.goto('/athlete');
    await expect(page).toHaveURL(/\/athlete/);
  });
});
