import { test, expect } from '@playwright/test'
import { completeCoachOnboardingCurrent, signupCoachCurrent } from '../utils/current-flows'

test.describe('Coach End-to-End Journey', () => {
  test('Coach Login, Roster Management and Data Center Verification', async ({ page }) => {
    test.slow()

    const coachEmail = `coach_journey_${Date.now()}@example.com`
    const suffix = String(Date.now())
    await signupCoachCurrent(page, coachEmail, 'Master Coach')
    await completeCoachOnboardingCurrent(page, 'Master Coach', suffix, 'Master Squad')

    await page.goto('/coach/dashboard')
    await expect(page.locator('[data-persona="coach"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="zone-decision"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="zone-plan"]')).toBeVisible()
    await expect(page.locator('[data-testid="zone-next"]')).toBeVisible()

    await page.goto('/coach/analytics')
    await expect(page.getByText(/Coach Analytics/i).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Squad trends, pressure, and planning signals/i)).toBeVisible({ timeout: 15000 })
  })
})
