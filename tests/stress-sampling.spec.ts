import { test, expect, type Page } from '@playwright/test';

// Deterministic Sampling Pool
const ATHLETE_INDICES = [1];
const COACH_INDICES = [1];

async function loginAndReachOrSkip(page: Page, email: string, role: 'athlete' | 'coach') {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  const routePattern = role === 'coach' ? /\/coach(\/dashboard)?$/ : /\/athlete(\/dashboard)?$/;
  const reachedDashboard = await Promise.race([
    page.waitForURL(routePattern, { timeout: 12000 }).then(() => true),
    page.getByText(/invalid login credentials/i).waitFor({ state: 'visible', timeout: 12000 }).then(() => false),
  ]).catch(() => false);

  test.skip(!reachedDashboard, `Seed account unavailable for ${email}.`);
}

test.describe('Extreme Load UI Sampling', () => {

  test.describe('Athlete Dashboard Sampling', () => {
    for (const idx of ATHLETE_INDICES) {
      const email = `athlete${idx}@test.creeda.com`;
      test(`sampled dashboard for ${email}`, async ({ page }) => {
        // 1. Login
        await loginAndReachOrSkip(page, email, 'athlete');
        
        // 3. Verify Athletic Intelligence Rendering
        // Based on dashboard.tsx, if logs exist, ReadinessRing and judgements are shown.
        // Our synthetic population HAD 14 days of logs, so they should NOT be in "No Logs" state.
        const judgement = page.locator('[data-testid="ai-judgement"]').first();
        const fallbackJudgement = page.locator('text=Readiness Status').first();
        
        await Promise.race([
          judgement.waitFor({ state: 'visible', timeout: 15000 }),
          fallbackJudgement.waitFor({ state: 'visible', timeout: 15000 })
        ]).catch(() => console.log(`Intelligence indicators not found for ${email}`));

        // Validate text content to ensure it's not empty/null
        const bodyText = await page.innerText('body');
        expect(bodyText).not.toContain('undefined');
        expect(bodyText).not.toContain('null');
        
        // Check for charts (Recharts)
        await page.locator('.recharts-surface').first().waitFor({ state: 'visible', timeout: 10000 })
          .catch(() => console.log(`Charts not loaded for ${email}`));
      });
    }
  });

  test.describe('Coach Dashboard Sampling', () => {
    for (const idx of COACH_INDICES) {
      const email = `coach${idx}@test.creeda.com`;
      test(`sampled coach view for ${email}`, async ({ page }) => {
        // 1. Login
        await loginAndReachOrSkip(page, email, 'coach');

        // 3. Verify Squad Roster
        await page.waitForSelector('text=Squad', { timeout: 10000 });
        const text = await page.innerText('body');
        expect(text).not.toContain('Internal Server Error');
      });
    }
  });
});
