import { test, expect, type Page } from '@playwright/test';
import { CoachDashboardPage } from '../pages/CoachDashboardPage';

test.describe('Coach End-to-End Journey', () => {
  let coachDashboard: CoachDashboardPage;

  test.beforeEach(async ({ page }) => {
    coachDashboard = new CoachDashboardPage(page);
  });

  async function completeCoachOnboardingIfNeeded(page: Page) {
    if (!page.url().includes('/coach/onboarding')) return;

    await page.waitForSelector('input', { state: 'visible' });
    await page.getByPlaceholder(/Coach Anil/i).fill('Master Coach');
    await page.getByPlaceholder(/coach_anil/i).fill('master_coach_' + Date.now());
    await page.getByPlaceholder(/91 98/i).fill('9198765432');
    await page.getByPlaceholder(/e\.g\. Haryana U-19 Squad/i).fill('Master Squad');
    await page.getByRole('button', { name: /Initialize Coach Dashboard/i }).click();
    await page.waitForTimeout(1200);
    await page.goto('/coach');
    await page.waitForURL(/\/coach/, { timeout: 30000 });
  }

  test('Coach Login, Roster Management and Data Center Verification', async ({ page }) => {
    const coachEmail = `coach_journey_${Date.now()}@example.com`;
    const coachPass = 'TestPass123!';

    // 1. Create a fresh coach account for deterministic flow stability
    await page.goto('/signup');
    await page.getByRole('button', { name: /I am a Coach/i }).click();
    await page.getByLabel(/Full Name/i).fill('Master Coach');
    await page.getByLabel(/Email Address/i).fill(coachEmail);
    await page.getByLabel(/Password/i).fill(coachPass);
    await page.locator('#consent').check();
    await page.getByRole('button', { name: /Complete Signup/i }).click();

    await page.waitForURL(/\/(coach\/dashboard|coach\/onboarding|verify-email)/, { timeout: 45000 });

    if (page.url().includes('/verify-email')) {
      await page.goto('/login');
      await page.getByLabel(/Email/i).fill(coachEmail);
      await page.getByLabel(/Password/i).fill(coachPass);
      await page.getByRole('button', { name: /Log in/i }).click();
      await page.waitForURL(/\/(coach\/dashboard|coach\/onboarding)/, { timeout: 30000 });
    }
    
    await completeCoachOnboardingIfNeeded(page);

    // 2. Navigate to Coach Dashboard
    await coachDashboard.goto('/coach');
    await completeCoachOnboardingIfNeeded(page);

    // 3. Verify Roster Visibility
    await coachDashboard.verifyRoster();

    // 4. Navigate to Data Center & Verify Intelligence Flow
    await coachDashboard.navigateToDataCenter();
    
    // 5. Theme & Stability Assertion
    await coachDashboard.verifyTheme();
    
    // 6. Performance check: No layout shifts or console errors
    const consoleErrors = await coachDashboard.verifyNoConsoleErrors();
    expect(consoleErrors, `Found console errors during coach journey: ${consoleErrors.join(', ')}`).toHaveLength(0);
  });
});
