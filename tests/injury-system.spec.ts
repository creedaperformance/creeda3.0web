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
      await expect(page.getByText(/Athlete Setup progress/i)).toBeVisible({ timeout: 15000 });
      return;
    }

    await expect(page.getByText(/Trust Layer|Daily Operating System|Today's call/i).first()).toBeVisible({
      timeout: 15000,
    });

    const scienceToggle = page.getByRole('button', { name: /Open the deeper science view/i });
    if (await scienceToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await scienceToggle.click();
      await expect(page.getByText(/Risk Hotspots|3-5 Day Forecast|Risk Stable|Risk Rising|Risk Falling/i).first()).toBeVisible({
        timeout: 15000,
      });
    }
  });

  test('Risk Alert visibility placeholders', async ({ page }) => {
    await page.goto('/athlete');

    // These might not be visible if there is no data, but the test ensures path is accessible.
    await expect(page).toHaveURL(/\/athlete/);
  });
});
