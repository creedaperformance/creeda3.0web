import { expect, test } from '@playwright/test'

test.describe('Individual Pathway', () => {
  test('signup, complete FitStart, and log a daily signal', async ({ page }) => {
    test.slow()
    test.setTimeout(120000)

    const email = `testindividual_${Date.now()}@example.com`

    await page.goto('/signup')
    await page.getByRole('button', { name: /Individual Healthy living guidance/i }).click()
    await page.getByLabel(/Full Name/i).fill('Test Individual E2E')
    await page.getByLabel(/Email/i).fill(email)
    await page.getByLabel(/Security Access/i).fill('TestPass123!')
    await page.locator('#consent').check()
    await page.getByRole('button', { name: /Continue to FitStart/i }).click()

    await page.waitForURL(/\/(fitstart|individual\/dashboard|verify-email)/, { timeout: 60000 })

    if (page.url().includes('/verify-email')) {
      await page.goto('/login')
      await page.getByLabel(/Email/i).fill(email)
      await page.getByLabel(/Password/i).fill('TestPass123!')
      await page.getByRole('button', { name: /Log in/i }).click()
      await page.waitForURL(/\/(fitstart|individual\/dashboard)/, { timeout: 45000 })
    }

    if (!page.url().includes('/fitstart')) {
      await page.goto('/fitstart')
    }

    await page.getByLabel(/Occupation/i).fill('Product Manager')

    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: /Next step/i }).click()
    }

    await page.getByRole('button', { name: /See my best paths/i }).click()
    await expect(page.getByText(/recommended starting plans/i)).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: /Start my journey/i }).click()

    await expect(page).toHaveURL(/\/individual\/dashboard/, { timeout: 20000 })
    await expect(page.getByText(/Your body,/i)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Daily Direction', { exact: true })).toBeVisible({ timeout: 15000 })

    await page.goto('/individual/logging')
    await expect(page.getByText(/Daily Wellness Check-In/i)).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: /Good/i }).click()
    await page.getByRole('button', { name: /Good/i }).click()
    await page.getByRole('button', { name: /😌 Calm/i }).click()
    await page.getByRole('button', { name: /Fresh/i }).click()
    await page.getByRole('button', { name: /Barely/i }).click()
    await page.getByRole('button', { name: /Got some movement/i }).click()

    const numberInput = page.locator('input[type="number"]').last()
    await numberInput.fill('30')
    await page.getByRole('button', { name: /^Continue$/i }).click()
    await page.getByRole('button', { name: /5/ }).click()

    await page.locator('input[type="number"]').last().fill('2.5')
    await page.getByRole('button', { name: /^Continue$/i }).click()
    await page.locator('input[type="number"]').last().fill('7000')
    await page.getByRole('button', { name: /^Continue$/i }).click()
    await page.getByRole('button', { name: /Update My Daily Guidance/i }).click()

    await expect(page.getByText(/Daily direction updated/i)).toBeVisible({ timeout: 45000 })
    await page.getByRole('button', { name: /Back to Dashboard/i }).click()
    await expect(page).toHaveURL(/\/individual\/dashboard/, { timeout: 15000 })
  })
})
