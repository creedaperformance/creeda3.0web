import { test, expect, type Page } from '@playwright/test';
import { completeCoachOnboardingCurrent } from './utils/current-flows';

test.describe('Coach Performance View', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') console.error(`Console Error: "${msg.text()}"`);
    });
    page.on('pageerror', error => {
      console.error(`Page Error: "${error.message}"`);
    });
  });

  async function ensureCoachDashboard(page: Page) {
    await page.goto('/coach');
    await page.waitForLoadState('networkidle');
    if (page.url().match(/\/coach\/onboarding/)) {
      await completeCoachOnboardingCurrent(page, 'Test Coach', String(Date.now()), 'Haryana Warriors');
      await page.goto('/coach');
      await page.waitForURL(/\/coach/, { timeout: 45000 });
      await page.waitForLoadState('domcontentloaded');
    }
  }

  test('complete coach onboarding lands on Performance View', async ({ page }) => {
    await page.goto('/coach/onboarding');

    if (page.url().includes('/coach/onboarding')) {
      await completeCoachOnboardingCurrent(page, 'Test Coach', `test_${Date.now()}`, 'Haryana Warriors');
      await page.goto('/coach');
    }

    await expect(page).toHaveURL(/\/coach/, { timeout: 45000 });
    await expect(page.locator('[data-persona="coach"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="zone-decision"]')).toBeVisible({ timeout: 15000 });
  });

  test('all four squad zones render', async ({ page }) => {
    await ensureCoachDashboard(page);

    await expect(page.locator('[data-persona="coach"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="zone-decision"]')).toBeVisible();
    await expect(page.locator('[data-testid="zone-plan"]')).toBeVisible();
    await expect(page.locator('[data-testid="zone-week"]')).toBeVisible();
    await expect(page.locator('[data-testid="zone-next"]')).toBeVisible();

    // Squad-pulse zone always shows the headline + the four pulse stats (Red/Amber/Green/Low data)
    // OR the empty-squad message if no athletes are linked.
    const pulseHeadline = page.locator('[data-testid="zone-decision"]').getByText(/Squad pulse|No athletes linked yet/i);
    await expect(pulseHeadline.first()).toBeVisible();

    await page.goto('/coach/reports');
    await expect(page.getByRole('heading', { name: /Coach Reports/i })).toBeVisible({ timeout: 15000 });
  });
});
