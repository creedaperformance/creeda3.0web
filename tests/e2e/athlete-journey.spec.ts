import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { AthleteDashboardPage } from '../pages/AthleteDashboardPage';

test.describe('Athlete End-to-End Journey', () => {
  let loginPage: LoginPage;
  let athleteDashboard: AthleteDashboardPage;

  const MASTER_EMAIL = 'v2_master_test@creeda.app';
  const MASTER_PASS = 'Creeda_V2_Stable!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    athleteDashboard = new AthleteDashboardPage(page);
  });

  test('Athlete Login and Dashboard Intelligence Verification', async ({ page }) => {
    test.slow();

    // 1. Perform Login
    await loginPage.login(MASTER_EMAIL, MASTER_PASS);

    const invalidLoginVisible = await page.getByText(/Invalid login credentials/i).isVisible().catch(() => false);
    test.skip(invalidLoginVisible, 'Master athlete credentials are unavailable in this environment.');
    
    // 2. Verify Dashboard Navigation
    await page.waitForURL(/\/athlete/);
    
    // 3. Verify dashboard integrity and rendered intelligence blocks.
    await athleteDashboard.verifyDataIntegrity();

    // 4. Verify Brand & Theme Calibration
    // Asserts brand tokens are present and legacy colors are eradicated.
    await athleteDashboard.verifyTheme();

    // 5. Verify either the lock-state or active dashboard module is visible.
    const hasPerformanceLock = (await page.getByText(/performance lock active/i).count()) > 0;
    if (hasPerformanceLock) {
      await expect(page.getByText(/performance lock active/i)).toBeVisible();
    } else {
      await expect(athleteDashboard.todayConclusionSection).toBeVisible();
    }
  });
});
