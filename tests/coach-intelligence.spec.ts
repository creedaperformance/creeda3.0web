import { test, expect, type Page } from '@playwright/test';

import { completeCoachOnboardingCurrent } from './utils/current-flows'

test.describe('Coach Squad Intelligence', () => {
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
      await completeCoachOnboardingCurrent(page, 'Test Coach', String(Date.now()), 'Haryana warriors')
      await page.waitForLoadState('networkidle');
    }
  }

  test('Coach view of squad risk indicators', async ({ page }) => {
    await ensureCoachDashboard(page);
    
    await expect(page.getByText(/Command Center Active/i).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/No Active Squad Detected|Intervention Queue/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Squad Technical Repository/i)).toBeVisible({ timeout: 15000 });
  });

  test('Coach management intelligence labels', async ({ page }) => {
    await ensureCoachDashboard(page);
    
    await expect(page.getByText(/Command Center Active/i)).toBeVisible();
    await expect(page.getByText(/Operator Locker Code/i)).toBeVisible();
    await expect(page.getByText(/Weekly Operating View/i)).toBeVisible();
    await expect(page.getByText(/Academy Layer/i)).toBeVisible();
  });
});
