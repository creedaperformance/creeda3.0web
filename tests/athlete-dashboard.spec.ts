import { test, expect } from '@playwright/test';
import {
  completeAthleteOnboardingCurrent,
  submitAthleteQuickCheckInCurrent,
} from './utils/current-flows';

test.describe('Athlete Performance View', () => {
  test.describe.configure({ timeout: 60000 });

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') console.error(`Console Error: "${msg.text()}"`);
    });
    page.on('pageerror', error => {
      console.error(`Page Error: "${error.message}"`);
    });
  });

  test('complete onboarding lands on the 4-zone Performance View', async ({ page }) => {
    await page.goto('/athlete/onboarding');

    await expect(page).toHaveURL(/\/athlete\/onboarding/);
    await completeAthleteOnboardingCurrent(page, 'Test Athlete QA', String(Date.now()));
    await expect(page).toHaveURL(/\/athlete\/dashboard/, { timeout: 30000 });

    await expect(page.locator('[data-persona="athlete"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="zone-decision"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="zone-plan"]')).toBeVisible();
    await expect(page.locator('[data-testid="zone-week"]')).toBeVisible();
    await expect(page.locator('[data-testid="zone-next"]')).toBeVisible();
  });

  test('submit an athlete daily check-in and open video analysis', async ({ page }) => {
    await submitAthleteQuickCheckInCurrent(page);

    await page.goto('/athlete/scan');
    await expect(page.getByRole('heading', { name: /Video Analysis/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Select Sport/i)).toBeVisible({ timeout: 15000 });
  });

  test('shows clip requirements for cricket analysis', async ({ page }) => {
    await page.goto('/athlete/scan/analyze?sport=cricket');

    await expect(page.getByText(/Upload a short clip/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Upload a 5-20 second MP4, MOV, or WEBM clip/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Select Video/i })).toBeVisible({ timeout: 15000 });
  });
});
