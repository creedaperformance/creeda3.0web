import { test, expect } from '@playwright/test';

test.describe('Authentication UI & Security', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') console.error(`Console Error: "${msg.text()}"`);
    });
    page.on('pageerror', error => {
      console.error(`Page Error: "${error.message}"`);
    });
  });

  test('unauthenticated route protection redirects', async ({ page }) => {
    await page.goto('/athlete');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login flow UI validation', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Log in/i })).toBeVisible();
  });

  test('signup flow UI accessibility', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByText(/Choose Your Journey/i)).toBeVisible();
  });
});
