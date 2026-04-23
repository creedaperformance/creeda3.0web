import { expect, test } from '@playwright/test'
import { acceptRequiredSignupConsents } from './utils/current-flows'

test.describe('Individual Pathway', () => {
  test('signup, complete FitStart, and log a daily signal', async ({ page }) => {
    test.slow()
    test.setTimeout(120000)

    const email = `testindividual_${Date.now()}@example.com`

    await page.goto('/signup')
    await page.getByRole('button', { name: /Individual Healthy living guidance/i }).click()
    await page.getByLabel(/Full Name/i).fill('Test Individual E2E')
    await page.getByLabel(/Email Connection/i).fill(email)
    await page.getByLabel(/Security Access/i).fill('TestPass123!')
    await acceptRequiredSignupConsents(page)
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

    const essentialOnly = page.getByRole('button', { name: /Essential only/i })
    if (await essentialOnly.isVisible({ timeout: 1000 }).catch(() => false)) {
      await essentialOnly.click()
    }

    await expect(page.getByText(/FitStart progress/i)).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: /Quick Snapshot/i })).toBeVisible({ timeout: 15000 })
    const profileNumbers = page.locator('input[type="number"]')
    await profileNumbers.nth(0).fill('29')
    await page.getByRole('button', { name: /^Male$/i }).click()
    await profileNumbers.nth(1).fill('171')
    await profileNumbers.nth(2).fill('72')
    await page.getByRole('button', { name: /^Next$/i }).click()

    await expect(page.getByRole('heading', { name: /Day Shape/i })).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /Desk \/ study heavy/i }).click()
    await page.getByRole('button', { name: /Some movement/i }).click()
    await page.getByRole('button', { name: /^Next$/i }).click()

    await expect(page.getByRole('heading', { name: /Main Goal/i })).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /General fitness/i }).click()
    await page.getByRole('button', { name: /12 weeks/i }).click()
    await page.getByRole('button', { name: /^Moderate$/i }).click()
    await page.getByRole('button', { name: /^Next$/i }).click()

    await expect(page.getByRole('heading', { name: /What You Have/i })).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /Bodyweight/i }).click()
    await page.getByRole('button', { name: /^Next$/i }).click()

    await expect(page.getByRole('heading', { name: /Any Limitation/i })).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /^No$/i }).click()
    await page.getByRole('button', { name: /^Finish$/i }).click()
    await expect(page.getByRole('button', { name: /Open dashboard/i })).toBeVisible({ timeout: 30000 })
    await page.getByRole('button', { name: /Open dashboard/i }).click()

    await expect(page).toHaveURL(/\/individual\/dashboard/, { timeout: 20000 })
    await expect(page.getByText(/FitStart baseline, daily signals, and optional device data/i)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Start with the next step/i)).toBeVisible({ timeout: 15000 })

    await page.goto('/individual/logging')
    await expect(page.getByText('Daily Pulse', { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Daily Pulse progress/i)).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: /Good/i }).click()
    await page.getByRole('button', { name: /^Next$/i }).click()
    await expect(page.getByRole('heading', { name: /^Stress$/i })).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /Normal/i }).click()
    await page.getByRole('button', { name: /^Next$/i }).click()
    await expect(page.getByRole('heading', { name: /Body Feel/i })).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /Fresh/i }).click()
    await page.getByRole('button', { name: /^Finish$/i }).click()
    await expect(page.getByText(/Check-in complete/i)).toBeVisible({ timeout: 30000 })
    await expect(page.getByRole('button', { name: /Back to dashboard/i })).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: /Back to dashboard/i }).click()
    await expect(page).toHaveURL(/\/individual\/dashboard/, { timeout: 15000 })

    await page.goto('/individual/scan/analyze?sport=other')
    await expect(page.getByText(/Upload a short clip/i)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Upload a 5-20 second MP4, MOV, or WEBM clip/i)).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: /Select Video/i })).toBeVisible({ timeout: 15000 })
  })
})
