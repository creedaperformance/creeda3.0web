import { test, expect } from '@playwright/test';

test.describe('Coach Squad Intelligence', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') console.error(`Console Error: "${msg.text()}"`);
    });
    page.on('pageerror', error => {
      console.error(`Page Error: "${error.message}"`);
    });
  });

  async function ensureCoachDashboard(page: any) {
    await page.goto('/coach');
    await page.waitForLoadState('networkidle');
    if (page.url().match(/\/coach\/onboarding/)) {
      await page.getByPlaceholder(/Coach Anil/i).fill('Test Coach');
      await page.getByPlaceholder(/coach_anil/i).fill('testcoach_pro_' + Date.now());
      const phoneInput = page.getByPlaceholder(/91 98/i);
      await phoneInput.fill('9876543210');
      await page.getByPlaceholder(/Haryana U-19 Squad/i).fill('Haryana warriors');
      await page.getByRole('button', { name: /Initialize Coach Dashboard/i }).click();
      await page.waitForURL(/\/coach/, { timeout: 15000 });
      await page.waitForLoadState('networkidle');
    }
  }

  test('Coach view of squad risk indicators', async ({ page }) => {
    await ensureCoachDashboard(page);
    
    await expect(page.getByText(/Top 3 Problems/i).first()).toBeVisible({ timeout: 20000 });
    
    await expect(page.getByText(/Zero critical flags in the current cycle/i)).toBeVisible({ timeout: 15000 });
  });

  test('Coach management intelligence labels', async ({ page }) => {
    await ensureCoachDashboard(page);
    
    await expect(page.getByText(/Command Alpha Active/i)).toBeVisible();
    await expect(page.getByText(/Squad Intelligence Summary/i)).toBeVisible();
    await expect(page.getByText(/Squad Command Intelligence/i)).toBeVisible();
    await expect(page.getByText(/Squad Roster Control/i)).toBeVisible();
  });
});
