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

  test('Squad pulse zone surfaces red/amber/green or empty-squad state', async ({ page }) => {
    await ensureCoachDashboard(page);

    await expect(page.locator('[data-persona="coach"]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-testid="zone-decision"]')).toBeVisible();

    // Either the populated pulse heading shows up, or the empty-squad CTA does.
    const populatedOrEmpty = page
      .locator('[data-testid="zone-decision"]')
      .getByText(/Squad pulse|No athletes linked yet/i);
    await expect(populatedOrEmpty.first()).toBeVisible({ timeout: 15000 });
  });

  test('Triage and video review zones are visible', async ({ page }) => {
    await ensureCoachDashboard(page);

    await expect(page.locator('[data-testid="zone-plan"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="zone-week"]')).toBeVisible();
    await expect(page.locator('[data-testid="zone-next"]')).toBeVisible();
  });
});
