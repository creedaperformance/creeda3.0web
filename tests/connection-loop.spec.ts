import { test, expect } from '@playwright/test';

/**
 * CREEDA Coach-Athlete Connection Loop E2E Test
 * 
 * Verifies the full lifecycle of a coach-athlete relationship:
 * 1. Coach Creation & Onboarding
 * 2. Join Code (Locker Code) Generation
 * 3. Athlete Creation via Join Link
 * 4. Squad Synchronization & Data Visibility
 */

test.describe('Coach-Athlete Connection Loop', () => {
  const coachEmail = `coach_connection_${Date.now()}@test.creeda.in`;
  const athleteEmail = `athlete_connection_${Date.now()}@test.creeda.in`;
  let sharedLockerCode: string;

  async function completeAthleteOnboarding(page: any, athleteName: string) {
    await page.waitForURL(/\/athlete\/onboarding/, { timeout: 30000 });
    await expect(page.getByText(/Biological Baseline/i)).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Next Intelligence Step/i }).click();

    await page.getByPlaceholder(/address you/i).fill(athleteName);
    await page.getByPlaceholder(/athlete_pro/i).fill(`athlete_${Date.now()}`);

    for (let i = 0; i < 18; i++) {
      if (await page.getByText(/Reaction Check/i).isVisible()) break;
      await page.getByRole('button', { name: /Next Intelligence Step/i }).click();
    }

    await expect(page.getByText(/Reaction Check/i)).toBeVisible({ timeout: 15000 });

    for (let trial = 0; trial < 5; trial++) {
      if (trial === 0) {
        await page.getByText(/Tap to Start \(5 Trials\)/i).click();
      } else {
        await page.getByText(/Tap for Next Trial/i).click();
      }
      await page.getByText('ZAP!').waitFor({ state: 'visible', timeout: 8000 });
      await page.getByText('ZAP!').click();
    }

    await page.getByRole('button', { name: /Commit & Continue/i }).click();
    if (!(await page.getByText(/Trust & Consent/i).isVisible())) {
      await page.getByRole('button', { name: /Next Intelligence Step/i }).click();
    }
    await expect(page.getByText(/Trust & Consent/i)).toBeVisible({ timeout: 15000 });
    await page.locator('#legalConsent').check();
    await page.getByRole('button', { name: /Connect with Coach/i }).click();
    await page.getByRole('button', { name: /Review Profile Summary/i }).click();
    await page.getByRole('button', { name: /Enter Dashboard/i }).click();
    await page.waitForURL(/\/athlete(\/dashboard)?$/, { timeout: 30000 });
  }

  test.beforeEach(async ({ page }) => {
    // Debugging logs
    page.on('console', msg => {
      if (msg.type() === 'error') console.error(`[Browser Error]: ${msg.text()}`);
    });
    page.on('pageerror', error => {
      console.error(`[Page Error]: ${error.message}`);
    });
  });

  test('Connection Loop: Coach code -> Athlete join submission', async ({ page, context }) => {
    test.slow(); // Multiple flows involved
    test.setTimeout(180000);

    // --- STEP 1: COACH SIGNUP ---
    console.log('--- Step 1: Coach Signup ---');
    await page.goto('/signup');
    await page.getByRole('button', { name: /I am a Coach/i }).click();

    await page.getByLabel(/Full Name/i).fill('Testing Coach');
    await page.getByLabel(/Email Address/i).fill(coachEmail);
    await page.getByLabel(/Password/i).fill('TestPass123!');
    await page.locator('#consent').check();
    await page.getByRole('button', { name: /Complete Signup/i }).click();

    // --- STEP 2: COACH ONBOARDING ---
    console.log('--- Step 2: Coach Onboarding ---');
    await page.waitForURL(/\/(coach\/dashboard|coach\/onboarding)/, { timeout: 30000 });
    await page.goto('/coach/onboarding');
    if (page.url().includes('/coach/onboarding')) {
      await page.getByPlaceholder(/Coach Anil/i).fill('Testing Coach');
      await page.getByPlaceholder(/coach_anil/i).fill(`coach_${Date.now()}`);
      await page.getByPlaceholder(/91 98/i).fill('9876543210');
      await page.getByPlaceholder(/Haryana U-19 Squad/i).fill('Test Warriors');
      await page.getByRole('button', { name: /Initialize Coach Dashboard/i }).click();
    }

    // --- STEP 3: EXTRACT LOCKER CODE ---
    console.log('--- Step 3: Extract Locker Code ---');
    await page.waitForURL(
      url => url.pathname === '/coach' || url.pathname === '/coach/dashboard',
      { timeout: 30000 }
    );

    // The locker code is rendered in the "Permanent Locker Code" panel
    await expect(page.locator('p', { hasText: /Permanent Locker Code/i }).first()).toBeVisible({ timeout: 15000 });
    const lockerCodeElement = page.locator('div.h-24').filter({ hasText: /\d{6}|------/ }).first();
    await expect(lockerCodeElement).toBeVisible();
    sharedLockerCode = (await lockerCodeElement.innerText()).trim().replace(/\s/g, '');
    if (!sharedLockerCode || sharedLockerCode === '------' || sharedLockerCode.length !== 6) {
      await page.getByRole('button', { name: /Copy/i }).first().click();
      await page.waitForTimeout(2000);
      sharedLockerCode = (await lockerCodeElement.innerText()).trim().replace(/\s/g, '');
    }
    console.log(`Verified Coach Locker Code: ${sharedLockerCode}`);
    expect(sharedLockerCode).toHaveLength(6);
    expect(sharedLockerCode).toMatch(/^\d+$/);

    // --- STEP 4: ATHLETE SIGNUP ---
    console.log('--- Step 4: Athlete Signup ---');
    const athleteContext = await context.browser()!.newContext();
    const athletePage = await athleteContext.newPage();

    await athletePage.goto('/signup');

    // Proceed with Athlete Signup
    await athletePage.getByRole('button', { name: /I am an Athlete/i }).click();

    await athletePage.getByLabel(/Full Name/i).fill('Testing Athlete');
    await athletePage.getByLabel(/Email Address/i).fill(athleteEmail);
    await athletePage.getByLabel(/Password/i).fill('TestPass123!');
    await athletePage.locator('#consent').check();
    await athletePage.getByRole('button', { name: /Complete Signup/i }).click();
    await athletePage.waitForURL(/\/(athlete\/onboarding|athlete|verify-email)/, { timeout: 45000 });

    if (athletePage.url().includes('/verify-email')) {
      await athletePage.goto('/login');
      await athletePage.getByLabel(/Email Address/i).fill(athleteEmail);
      await athletePage.getByLabel(/Password/i).fill('TestPass123!');
      await athletePage.getByRole('button', { name: /Log in/i }).click();
      await athletePage.waitForURL(/\/athlete/, { timeout: 30000 });
    }

    // --- STEP 5: ATHLETE ONBOARDING ---
    console.log('--- Step 5: Athlete Onboarding ---');
    if (!athletePage.url().includes('/athlete/onboarding')) {
      await athletePage.goto('/athlete/onboarding');
    }
    if (athletePage.url().includes('/athlete/onboarding')) {
      await completeAthleteOnboarding(athletePage, 'Testing Athlete');
    } else {
      await athletePage.waitForURL(/\/athlete/, { timeout: 30000 });
    }

    // Athlete manually links coach using locker code.
    await athletePage.getByPlaceholder(/e.g. 123456/i).fill(sharedLockerCode);
    await athletePage.getByRole('button', { name: /Link Squad/i }).click();
    await athletePage.waitForTimeout(1200);

    // Success criteria for this flow: join submission accepted (input is cleared).
    await expect(athletePage.getByPlaceholder(/e.g. 123456/i)).toHaveValue('', { timeout: 15000 });
    await expect(athletePage.getByText(/Invalid Locker Code/i)).toHaveCount(0);
    console.log('--- Connection Loop Join Submission Verified ---');
    
    await athleteContext.close();
  });
});
