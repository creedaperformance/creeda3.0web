import { test, expect, type Page } from '@playwright/test';

test.describe('Coach Dashboard Operation', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') console.error(`Console Error: "${msg.text()}"`);
    });
    page.on('pageerror', error => {
      console.error(`Page Error: "${error.message}"`);
    });
  });

  async function completeCoachOnboarding(page: Page, suffix: string) {
    await expect(page.getByRole('heading', { name: /Professional Identity/i })).toBeVisible();
    await page.getByPlaceholder(/Head Coach Anil Kumar/i).fill('Test Coach');
    await page.getByPlaceholder(/coach_anil/i).fill(`testcoach_pro_${suffix}`);
    await page.getByPlaceholder(/\+91 98/i).fill('9876543210');
    await page.getByRole('button', { name: /Next Step/i }).click();

    await expect(page.getByRole('heading', { name: /Squad Blueprint/i })).toBeVisible();
    await page.getByPlaceholder(/Haryana U-19 Elite Squad/i).fill('Haryana Warriors');
    await page.getByRole('button', { name: /Next Step/i }).click();

    await expect(page.getByRole('heading', { name: /Operational Context/i })).toBeVisible();
    await page.getByRole('button', { name: /Next Step/i }).click();

    await expect(page.getByRole('heading', { name: /Priority Matrix/i })).toBeVisible();
    const completeButton = page.getByRole('button', { name: /Complete Setup/i })
    if (await completeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await completeButton.click()
      await page.waitForTimeout(2500)
    }
  }

  async function ensureCoachDashboard(page: Page) {
    await page.goto('/coach');
    await page.waitForLoadState('networkidle');
    if (page.url().match(/\/coach\/onboarding/)) {
      await completeCoachOnboarding(page, String(Date.now()));
      await page.goto('/coach');
      await page.waitForURL(/\/coach/, { timeout: 45000 });
      await page.waitForLoadState('domcontentloaded');
    }
  }

  test('complete coach onboarding', async ({ page }) => {
    await page.goto('/coach/onboarding');
    
    // If we are already redirected to /coach, then it's already completed
    if (page.url().includes('/coach/onboarding')) {
      await completeCoachOnboarding(page, `test_${Date.now()}`);
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
