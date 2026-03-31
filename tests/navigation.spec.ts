import { test, expect } from '@playwright/test';

test.describe('Public Site Navigation & Health', () => {
  test.beforeEach(async ({ page }) => {
    // Detect console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Console Error: "${msg.text()}" at ${page.url()}`);
      }
    });

    // Detect uncaught exceptions
    page.on('pageerror', error => {
      console.error(`Page Error: "${error.message}" at ${page.url()}`);
    });
  });

  test('landing page integrity', async ({ page }) => {
    await page.goto('/');
    
    const heroTitle = page.locator('h1').first();
    await expect(heroTitle).toContainText(/One brand for/i);
    await expect(heroTitle).toContainText(/athlete performance/i);
    
    await expect(page.getByRole('heading', { name: /healthy-living guide/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /performance system/i })).toBeVisible();
    await expect(page.locator('#individuals').getByText(/For individuals/i)).toBeVisible();
    await expect(page.locator('#athletes').getByText(/For athletes/i)).toBeVisible();
    
    await expect(page.getByRole('link', { name: /Start as Individual/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Start as Athlete/i }).first()).toBeVisible();
  });

  test('public sub-pages load success', async ({ page }) => {
    const pages = ['/terms', '/privacy', '/refund-policy'];
    
    for (const route of pages) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
    }
  });

  test('footer branding is visible', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.locator('footer')).toContainText(/CREEDA/i);
    await expect(page.locator('footer')).toContainText(/Sports science and healthier living, made for India/i);
  });

  test('navigation menu responsiveness (Desktop)', async ({ page }) => {
    await page.goto('/');
    // Check for logo link
    const logoLink = page.getByRole('link', { name: /CREEDA/i }).first();
    await expect(logoLink).toBeVisible();
  });
});
