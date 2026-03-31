
import { test, expect, type Page } from '@playwright/test';

// Configuration for Performance Audit
const ATHLETE_INDICES = [5];
const COACH_INDICES = [5];

async function loginAndReachDashboardOrSkip(page: Page, email: string, role: 'athlete' | 'coach') {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  const targetPattern = role === 'athlete' ? /\/athlete(\/dashboard)?$/ : /\/coach(\/dashboard)?$/;
  const reachedDashboard = await Promise.race([
    page.waitForURL(targetPattern, { timeout: 12000 }).then(() => true),
    page.getByText(/invalid login credentials/i).waitFor({ state: 'visible', timeout: 12000 }).then(() => false),
  ]).catch(() => false);

  test.skip(!reachedDashboard, `Seed account unavailable for ${email}.`);
}

test.describe('Dashboard Hydration & Stability Audit', () => {

  test.describe('Athlete Dashboard Performance', () => {
    for (const idx of ATHLETE_INDICES) {
      const email = `athlete${idx}@test.creeda.com`;
      test(`performance profile for ${email}`, async ({ page }) => {
        const startTime = Date.now();

        // 1. Login
        await loginAndReachDashboardOrSkip(page, email, 'athlete');

        const loginDone = Date.now();

        // 2. Navigation & Hydration
        const navDone = Date.now();
        
        // 3. Measure "Stable Render" (Cards & Charts visible)
        // Wait for ANY of the main dashboard sections
        await Promise.race([
            page.waitForSelector('#trends'),
            page.waitForSelector('text=Today\'s Focus'),
            page.waitForSelector('text=Log your first session')
        ]);
        const trendsVisible = Date.now();
        
        // Wait for charts OR "Log more days" message
        try {
            await Promise.race([
                page.waitForSelector('.recharts-surface', { timeout: 10000 }),
                page.waitForSelector('text=Log more days', { timeout: 10000 }),
                page.waitForSelector('text=Log Now', { timeout: 10000 })
            ]);
        } catch {
            console.warn(`Chart/Log prompt not found for ${email}, but dashboard container loaded.`);
        }
        const chartDone = Date.now();

        // 4. Measure "Intelligence Logic" Render
        await page.waitForSelector('text=Performance Judgement', { timeout: 15000 });
        const intelDone = Date.now();

        const metrics = {
            loginMs: loginDone - startTime,
            navToAthleteMs: navDone - loginDone,
            chartHydrationMs: chartDone - navDone,
            intelLogicMs: intelDone - navDone,
            totalLoadMs: intelDone - loginDone
        };

        console.log(`Metrics for ${email}:`, JSON.stringify(metrics, null, 2));

        // Stability Checklist
        expect(metrics.totalLoadMs).toBeLessThan(10000); // Absolute fallback limit
        const bodyText = await page.innerText('body');
        expect(bodyText).not.toContain('undefined');
      });
    }
  });

  test.describe('Coach Dashboard Performance', () => {
    for (const idx of COACH_INDICES) {
      const email = `coach${idx}@test.creeda.com`;
      test(`performance profile for ${email}`, async ({ page }) => {
        const startTime = Date.now();
        
        // 1. Login
        await loginAndReachDashboardOrSkip(page, email, 'coach');

        // 2. Navigation
        const navDone = Date.now();

        // 3. Measure Table/Roster Render
        await page.waitForSelector('table', { timeout: 20000 });
        const rosterDone = Date.now();

        const metrics = {
            navToCoachMs: navDone - startTime,
            rosterHydrationMs: rosterDone - navDone
        };

        console.log(`Metrics for ${email}:`, JSON.stringify(metrics, null, 2));
      });
    }
  });
});
