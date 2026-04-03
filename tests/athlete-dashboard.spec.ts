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
    await expect(page.getByRole('heading', { name: /Athlete Setup/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Athlete Profile/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Ambidextrous/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Next Phase/i })).toBeVisible({ timeout: 15000 });

    await page.locator('input[name="fullName"]').fill('Test Athlete QA');
    await page.locator('input[name="username"]').fill(`athlete_${Date.now()}`);
    await page.locator('select[name="primarySport"]').selectOption({ index: 1 });

    const positionSelect = page.locator('select[name="position"]');
    if (await positionSelect.count()) {
      await positionSelect.selectOption({ index: 1 });
    } else {
      await page.locator('input[name="position"]').fill('Forward');
    }

    await page.getByRole('button', { name: /Ambidextrous/i }).click();
    await page.locator('input[name="age"]').fill('21');
    await page.getByRole('button', { name: /^Male$/i }).click();
    await page.locator('input[name="heightCm"]').fill('182');
    await page.locator('input[name="weightKg"]').fill('78');
    await page.getByRole('button', { name: /Next Phase/i }).click();

    await expect(page.getByRole('heading', { name: /Training Reality/i })).toBeVisible({ timeout: 15000 });
    await page.locator('select[name="playingLevel"]').selectOption({ index: 1 });
    await page.getByRole('button', { name: /^Daily$/i }).click();
    await page.getByRole('button', { name: /^Moderate$/i }).click();
    await page.getByRole('button', { name: /Next Phase/i }).click();

    await expect(page.getByText(/Your Main Goal/i)).toBeVisible({ timeout: 15000 });
  });

  test('submit an athlete daily check-in and open video analysis', async ({ page }) => {
    await page.goto('/athlete/checkin');

    await expect(page.getByText(/Athlete Daily Check-In/i)).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /^Continue$/i }).click();
    await expect(page.getByText(/Answer the questions on this screen before continuing/i)).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /^Good$/i }).first().click();
    await page.getByRole('button', { name: /7-8 hrs/i }).click();
    await page.getByRole('button', { name: /15-30 min/i }).click();
    await page.getByRole('button', { name: /^Continue$/i }).click();

    await page.getByRole('button', { name: /^Moderate$/i }).first().click();
    await page.getByRole('button', { name: /^Low$/i }).last().click();
    await page.getByRole('button', { name: /^Continue$/i }).click();

    await page.getByRole('button', { name: /^Moderate$/i }).first().click();
    await page.getByRole('button', { name: /^Moderate$/i }).last().click();
    await page.getByRole('button', { name: /^Continue$/i }).click();

    await page.getByRole('button', { name: /^Rest$/i }).click();
    await page.getByRole('button', { name: /^Continue$/i }).click();

    await page.getByRole('button', { name: /^None$/i }).click();
    await page.getByRole('button', { name: /^Continue$/i }).click();
    await expect(page.getByRole('heading', { name: /Context/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Review Check-In/i }).click();
    await expect(page.getByText(/CREEDA will use this check-in to set today's athlete decision/i)).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /Submit Check-In/i }).click();
    await expect(page.getByText(/Today's Plan/i)).toBeVisible({ timeout: 45000 });
    await expect(page.getByRole('button', { name: /Open Dashboard/i })).toBeVisible({ timeout: 15000 });

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
