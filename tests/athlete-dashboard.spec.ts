import { test, expect } from '@playwright/test';

test.describe('Athlete Dashboard Deep Dive', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') console.error(`Console Error: "${msg.text()}"`);
    });
    page.on('pageerror', error => {
      console.error(`Page Error: "${error.message}"`);
    });
  });

  test('complete onboarding as a new athlete', async ({ page }) => {
    await page.goto('/athlete/onboarding');

    await expect(page).toHaveURL(/\/athlete\/onboarding/);
    await expect(page.getByRole('heading', { name: /Initialize Profile/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Athlete Setup/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Next Phase/i })).toBeVisible({ timeout: 15000 });
  });

  test('submit an athlete daily check-in and open video analysis', async ({ page }) => {
    await page.goto('/athlete/checkin');

    await expect(page.getByText(/Athlete Daily Check-In/i)).toBeVisible({ timeout: 15000 });

    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: /^Continue$/i }).click();
    }

    await page.getByRole('button', { name: /Submit Check-In/i }).click();
    await expect(page.getByText(/Today's Directive/i)).toBeVisible({ timeout: 45000 });
    await expect(page.getByRole('button', { name: /Open Dashboard/i })).toBeVisible({ timeout: 15000 });

    await page.goto('/athlete/scan');
    await expect(page.getByRole('heading', { name: /Video Analysis/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Select Sport/i)).toBeVisible({ timeout: 15000 });
  });
});
