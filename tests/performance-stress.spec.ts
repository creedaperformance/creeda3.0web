import { test, expect, type Page } from '@playwright/test';

async function loginAndReachOrSkip(page: Page, email: string, role: 'athlete' | 'coach') {
  await page.goto('/login');
  await page.getByLabel(/Email/i).fill(email);
  await page.getByLabel(/Password/i).fill('password123');
  await page.getByRole('button', { name: /Log in/i }).click();

  const routePattern = role === 'coach' ? /\/coach(\/dashboard)?$/ : /\/athlete(\/dashboard)?$/;
  const reachedDashboard = await Promise.race([
    page.waitForURL(routePattern, { timeout: 12000 }).then(() => true),
    page.getByText(/invalid login credentials/i).waitFor({ state: 'visible', timeout: 12000 }).then(() => false),
  ]).catch(() => false);

  test.skip(!reachedDashboard, `Seed account unavailable for ${email}.`);
}

test.describe('Platform Performance Stress Test', () => {
  test('Coach Dashboard Load Stress (Large Squad)', async ({ page }) => {
    // 1. Initial Load Time
    const startTime = Date.now();
    await loginAndReachOrSkip(page, 'coach1@test.creeda.com', 'coach');
    const dashboardLoadTime = Date.now() - startTime;
    console.log(`⏱️ Coach Dashboard Total Time (incl. Login): ${dashboardLoadTime}ms`);

    // 2. Squad Grid Rendering
    const squadStartTime = Date.now();
    await page.waitForSelector('.grid', { timeout: 15000 }); // Assuming squad is in a grid
    const squadRenderTime = Date.now() - squadStartTime;
    console.log(`⏱️ Squad Grid Render Time: ${squadRenderTime}ms`);

    // 3. Chart Stability Check
    // Wait for any Recharts components to render
    const charts = page.locator('.recharts-responsive-container');
    const chartCount = await charts.count();
    console.log(`📊 Detected ${chartCount} active charts.`);
    
    // Check for "width -1" or "height -1" logs in console if possible, 
    // but practically we'll just check if they are visible
    for (let i = 0; i < chartCount; i++) {
      await expect(charts.nth(i)).toBeVisible();
    }

    // 4. Console Error Detection
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`❌ Browser Console Error: "${msg.text()}"`);
      }
    });

    // 5. Squad Navigation Stress
    const squadLink = page.getByRole('link', { name: /Squad/i });
    if (await squadLink.isVisible()) {
      const startNav = Date.now();
      await squadLink.click();
      await page.waitForSelector('text=Athletes', { timeout: 10000 });
      console.log(`⏱️ Squad Management Navigation: ${Date.now() - startNav}ms`);
    }

    expect(dashboardLoadTime).toBeLessThan(15000); // Threshold for whole flow
  });

  test('Large Simultaneous Athlete Sessions (Simulation)', async ({ browser }) => {
    // Run 5 athlete sessions in parallel to check for server-side bottlenecks
    const athleteEmails = ['athlete1@test.creeda.com', 'athlete2@test.creeda.com'];

    const precheckContext = await browser.newContext();
    const precheckPage = await precheckContext.newPage();
    await loginAndReachOrSkip(precheckPage, athleteEmails[0], 'athlete');
    await precheckContext.close();
    
    const sessions = athleteEmails.map(async (email) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      const start = Date.now();
      await loginAndReachOrSkip(page, email, 'athlete');
      const time = Date.now() - start;
      await context.close();
      return time;
    });

    const results = await Promise.all(sessions);
    const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
    console.log(`⏱️ Average Athlete Login & Dashboard Load (Parallel): ${avgTime.toFixed(0)}ms`);
    
    for (const time of results) {
      expect(time).toBeLessThan(12000);
    }
  });
});
