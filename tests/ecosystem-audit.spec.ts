
import { test, expect } from '@playwright/test';

/**
 * Creeda Ecosystem Full Audit
 * This test suite verifies the end-to-end functionality for all 3 user pathways:
 * 1. Athlete (Diagnostic -> Dashboard -> Daily Log)
 * 2. Coach (Team Creation -> Squad Intelligence)
 * 3. Individual (FitStart -> Journey Dashboard)
 */

test.describe('Creeda Ecosystem Full Audit', () => {
  // Global configuration
  test.setTimeout(300000); // 5 minutes for the full multi-role audit
  test.describe.configure({ mode: 'serial' }); // Run tests one after another for clean state

  test.beforeEach(async ({ page }) => {
    // Navigate to landing and ensure we are logged out (if possible)
    await page.goto('/');
    // Check if we are already logged in (landing page shows "Go to Dashboard")
    const dashboardBtn = page.getByRole('link', { name: /Go to Dashboard/i });
    if (await dashboardBtn.isVisible()) {
      await dashboardBtn.click();
      // Wait for dashboard to load and then logout
      await page.waitForURL(/\/(athlete|coach|individual)\//);
      // Logout logic - looking for the LogOut icon/button in Sidebar
      const logoutBtn = page.locator('button[title="Sign Out"], button:has-text("Sign Out")').first();
      if (await logoutBtn.isVisible()) {
         await logoutBtn.click();
      } else {
         // Fallback: search for LogOut icon specifically in mobile menu if needed
         const menuBtn = page.getByRole('button', { name: /Menu/i });
         if (await menuBtn.isVisible()) {
            await menuBtn.click();
            await page.getByRole('button', { name: /Sign Out/i }).click();
         }
      }
      await page.waitForURL('/');
    }
  });

  test('Athlete End-to-End Pathway', async ({ page }) => {
    const timestamp = Date.now();
    const email = `audit_athlete_${timestamp}@example.com`;
    const fullName = `Audit Athlete ${timestamp}`;
    
    // 1. Signup Flow
    console.log('--- Phase 1: Athlete Signup ---');
    await page.goto('/signup');
    await page.waitForURL('/signup');

    console.log('Selecting Athlete role...');
    await page.locator('button').filter({ hasText: /Athlete/i }).first().click();
    
    console.log('Filling Athlete credentials...');
    await page.getByLabel(/Legal Full Name/i).fill(fullName);
    await page.getByLabel(/Email Connection/i).fill(email);
    await page.getByLabel(/Security Access/i).fill('AuditPass123!');
    await page.locator('#consent').check();
    await page.getByRole('button', { name: /Complete Signup/i }).click();

    // 2. Wait for Onboarding
    console.log('Waiting for welcome or onboarding redirect...');
    await page.waitForURL(/\/(athlete\/onboarding|verify-email|login)/, { timeout: 60000 });
    
    if (page.url().includes('/verify-email') || page.url().includes('/login')) {
      await page.goto('/login');
      await page.getByLabel(/Email/i).fill(email);
      await page.getByLabel(/Password/i).fill('AuditPass123!');
      await page.getByRole('button', { name: /Log in/i }).click();
    }

    // 3. Diagnostic Onboarding
    console.log('Completing Diagnostic Onboarding...');
    await page.waitForURL(/\/athlete\/onboarding/, { timeout: 30000 });
    
    // Cycle through athlete onboarding steps
    for (let i = 0; i < 20; i++) {
      const completeBtn = page.getByRole('button', { name: /Complete Setup/i });
      if (await completeBtn.isVisible() && await completeBtn.isEnabled()) {
        console.log('Submitting final Athlete diagnostic...');
        await completeBtn.click();
        break;
      }
      const nextBtn = page.getByRole('button', { name: /Next Step/i });
      if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
        await nextBtn.click();
        await page.waitForTimeout(400); // Wait for transition
      } else {
        // If neither is visible/enabled, we might be at the end or stuck
        await page.waitForTimeout(500);
      }
    }

    // 4. Dashboard Verification
    console.log('Verifying Athlete Dashboard...');
    await page.waitForURL(/\/athlete\/dashboard/, { timeout: 30000 });
    // Look for the V5 Hero Decision text
    await expect(page.getByText(/Your Sports Scientist Says/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/TRAIN|MODIFY|RECOVER/i)).toBeVisible();
    await expect(page.getByText(new RegExp(fullName, 'i'))).toBeVisible();

    // 5. Daily Log Submission
    console.log('Submitting Daily Sync Log...');
    await page.goto('/athlete/log');
    await expect(page.getByText(/Daily Sync/i)).toBeVisible();
    await page.getByRole('button', { name: /Sync Data/i }).click();
    
    await expect(page.getByText(/Log Complete/i)).toBeVisible({ timeout: 15000 });
    console.log('Athlete Pathway Verified.');
  });

  test('Coach End-to-End Pathway', async ({ page }) => {
    const timestamp = Date.now();
    const email = `audit_coach_${timestamp}@example.com`;
    const fullName = `Audit Coach ${timestamp}`;
    const teamName = `Audit Squad ${timestamp}`;
    
    // 1. Signup Flow
    console.log('--- Phase 2: Coach Signup ---');
    await page.goto('/signup');
    console.log('Selecting Coach role...');
    await page.locator('button').filter({ hasText: /Coach/i }).first().click();
    
    console.log('Filling Coach credentials...');
    await page.getByLabel(/Legal Full Name/i).fill(fullName);
    await page.getByLabel(/Email Connection/i).fill(email);
    await page.getByLabel(/Security Access/i).fill('AuditPass123!');
    await page.locator('#consent').check();
    await page.getByRole('button', { name: /Complete Signup/i }).click();

    // 2. Dashboard/Team Creation
    await page.waitForURL(/\/(coach\/dashboard|verify-email|login)/, { timeout: 60000 });
    
    if (page.url().includes('/verify-email') || page.url().includes('/login')) {
      await page.goto('/login');
      await page.getByLabel(/Email/i).fill(email);
      await page.getByLabel(/Password/i).fill('AuditPass123!');
      await page.getByRole('button', { name: /Log in/i }).click();
    }

    // 3. Coach Onboarding
    console.log('Verifying Coach Dashboard and Onboarding...');
    await page.waitForURL(/\/(coach\/dashboard|coach\/onboarding)/, { timeout: 30000 });
    
    if (page.url().includes('/coach/onboarding')) {
      console.log('Completing Coach Onboarding...');
      
      // Fill required fields for Step 1
      await page.getByLabel(/Full Name & Title/i).fill(fullName);
      await page.getByLabel(/Professional Handle/i).fill(`coach_${timestamp}`);
      await page.getByLabel(/Verification Number/i).fill('9876543210');
      await page.getByRole('button', { name: /Next Step/i }).click();
      
      // Step 2: Squad Blueprint
      await page.getByPlaceholder(/Enter Team Name/i).or(page.getByPlaceholder(/e.g. Haryana U-19 Elite Squad/i)).fill(teamName);
      await page.getByRole('button', { name: /Next Step/i }).click();
      
      // Step 3: Operational Context
      await page.getByRole('button', { name: /Next Step/i }).click();
      
      // Step 4: Priority Matrix & Submit
      const finishBtn = page.getByRole('button', { name: /Complete Setup/i });
      await expect(finishBtn).toBeEnabled();
      await finishBtn.click();
    }

    await page.waitForURL(/\/coach\/dashboard/, { timeout: 30000 });
    await expect(page.getByText(/Coach Dashboard/i)).toBeVisible();

    console.log('Coach Pathway Verified.');
  });

  test('Individual End-to-End Pathway', async ({ page }) => {
    const timestamp = Date.now();
    const email = `audit_ind_${timestamp}@example.com`;
    const fullName = `Audit Individual ${timestamp}`;
    
    // 1. Signup Flow
    console.log('--- Phase 3: Individual Signup ---');
    await page.goto('/signup');
    console.log('Selecting Individual role...');
    await page.locator('button').filter({ hasText: /Individual/i }).first().click();
    
    console.log('Filling Individual credentials...');
    await page.getByLabel(/Legal Full Name/i).fill(fullName);
    await page.getByLabel(/Email Connection/i).fill(email);
    await page.getByLabel(/Security Access/i).fill('AuditPass123!');
    await page.locator('#consent').check();
    await page.getByRole('button', { name: /Complete Signup/i }).click();

    // 2. FitStart Onboarding
    console.log('Completing FitStart Onboarding...');
    await page.waitForURL(/\/(fitstart|verify-email|login)/, { timeout: 60000 });
    
    if (page.url().includes('/verify-email') || page.url().includes('/login')) {
      await page.goto('/login');
      await page.getByLabel(/Email/i).fill(email);
      await page.getByLabel(/Password/i).fill('AuditPass123!');
      await page.getByRole('button', { name: /Log in/i }).click();
    }

    await page.waitForURL(/\/fitstart/, { timeout: 60000 });
    console.log('FitStart URL confirmed.');
    
    // FitStart loop - click Continue until Launch
    for (let i = 0; i < 20; i++) {
       const launchBtn = page.getByRole('button', { name: /Launch My Peak Journey/i });
       if (await launchBtn.isVisible()) {
          console.log('Launching individual journey...');
          await launchBtn.click();
          break;
       }
       
       const continueBtn = page.getByRole('button', { name: /Continue/i }).first();
       if (await continueBtn.isVisible() && await continueBtn.isEnabled()) {
          await continueBtn.click();
       } else {
          break;
       }
       await page.waitForTimeout(500); // Wait for animation
    }

    // 3. Dashboard Verification
    console.log('Verifying Individual Dashboard...');
    await page.waitForURL(/\/individual\/dashboard/, { timeout: 20000 });
    await expect(page.getByText(/Performance Intelligence/i)).toBeVisible();
    console.log('Individual Pathway Verified.');
  });
});
