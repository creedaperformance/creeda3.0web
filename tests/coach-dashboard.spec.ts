import { test, expect, type Page } from '@playwright/test';
import { completeCoachOnboardingCurrent } from './utils/current-flows';

test.describe('Coach Dashboard Operation', () => {
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

  test('complete coach onboarding', async ({ page }) => {
    await page.goto('/coach/onboarding');
    
    // If we are already redirected to /coach, then it's already completed
    if (page.url().includes('/coach/onboarding')) {
      await completeCoachOnboardingCurrent(page, 'Test Coach', `test_${Date.now()}`, 'Haryana Warriors');
      await page.goto('/coach');
    }
    
    await expect(page).toHaveURL(/\/coach/, { timeout: 45000 });
    await expect(page.getByText(/Command Center Active/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('squad management and report surfaces render', async ({ page }) => {
    await ensureCoachDashboard(page);
    
    await expect(page).toHaveURL(/\/coach/);
    await expect(page.getByText(/Command Center Active/i)).toBeVisible();
    await expect(
      page.getByText(/Active Roster|No Active Squad Detected/i).first()
    ).toBeVisible();
    await expect(page.getByText(/Squad Technical Repository/i)).toBeVisible();

    await page.goto('/coach/reports');
    await expect(page.getByRole('heading', { name: /Coach Reports/i })).toBeVisible({ timeout: 15000 });
  });
});
