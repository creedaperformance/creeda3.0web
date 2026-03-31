import { test, expect } from '@playwright/test';

test.describe('Mobile Responsiveness (375x667)', () => {
  test.beforeEach(async ({ page }) => {
    // Emulate iPhone SE dimensions
    await page.setViewportSize({ width: 375, height: 667 });
    
    page.on('console', msg => {
      if (msg.type() === 'error') console.error(`Console Error (Mobile): "${msg.text()}"`);
    });
    page.on('pageerror', error => {
      console.error(`Page Error (Mobile): "${error.message}"`);
    });
  });

  test('mobile landing page layout', async ({ page }) => {
    await page.goto('/');
    const heroTitle = page.locator('h1').first();
    await expect(heroTitle).toBeVisible();
  });

  test('mobile navigation accessibility', async ({ page }) => {
    await page.goto('/');
    // 'Pricing' is hidden on mobile in the current Navbar implementation
    // Using 'Log in' which is always visible
    await page.getByRole('link', { name: /Log in/i }).first().click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Tablet Responsiveness (768x1024)', () => {
  test.beforeEach(async ({ page }) => {
    // Emulate iPad dimensions
    await page.setViewportSize({ width: 768, height: 1024 });
  });

  test('tablet landing page layout', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();
  });
});
