import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

test.describe('Marketing & Routing Flow', () => {
  let homePage: HomePage;
  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    await homePage.goto();
  });

  test('Navigate across public marketing routes and verify role pathways', async ({ page }) => {
    // 1. Verify Homepage Core CTA and messaging
    await expect(homePage.heroJoinButton).toBeVisible();
    await homePage.verifyValueProps();

    // 2. Verify all role pathways are visible and linked
    await expect(page.locator('a[href="/signup?role=athlete"]')).toHaveCount(1);
    await expect(page.locator('a[href="/signup?role=coach"]')).toHaveCount(1);
    await expect(page.locator('a[href="/signup?role=individual"]')).toHaveCount(1);
    await expect(page.locator('a[href="/signup?role=practitioner"]')).toHaveCount(1);

    // 3. Navigate to Features and validate render
    await homePage.navigateToFeatures();
    await expect(page.getByRole('heading', { name: /powering the modern athlete/i })).toBeVisible();

    // 4. Navigate to Mission and validate render
    await homePage.goto('/');
    await homePage.navigateToMission();
    await expect(page.getByRole('heading', { name: /our mission/i })).toBeVisible();

    // 5. Ensure no console errors occurred during the flow
    expect(consoleErrors, `Found console errors during flow: ${consoleErrors.join(', ')}`).toHaveLength(0);
  });
});
