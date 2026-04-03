import { expect, test } from '@playwright/test'

import {
  completeAthleteOnboardingCurrent,
  completeCoachOnboardingCurrent,
  loginCurrent,
  signupCoachCurrent,
} from './utils/current-flows'

test.describe('Creeda Ecosystem Full Audit', () => {
  test.setTimeout(300000)
  test.describe.configure({ mode: 'serial' })

  test('Athlete End-to-End Pathway', async ({ page }) => {
    const timestamp = Date.now()
    const email = `audit_athlete_${timestamp}@example.com`
    const fullName = `Audit Athlete ${timestamp}`

    await page.goto('/signup?role=athlete')
    await page.getByLabel(/Full Name/i).fill(fullName)
    await page.getByLabel(/Email Connection/i).fill(email)
    await page.getByLabel(/Security Access/i).fill('AuditPass123!')
    await page.locator('#consent').check()
    await page.getByRole('button', { name: /Continue to Athlete Onboarding/i }).click()

    await page.waitForURL(/\/(athlete\/onboarding|verify-email|athlete\/dashboard)/, { timeout: 60000 })
    if (page.url().includes('/verify-email')) {
      await loginCurrent(page, email)
      await page.waitForURL(/\/(athlete\/onboarding|athlete\/dashboard)/, { timeout: 30000 })
    }

    await completeAthleteOnboardingCurrent(page, fullName, `${timestamp}`)
    await expect(page).toHaveURL(/\/athlete\/dashboard/, { timeout: 30000 })
    await expect(page.getByText(/Today|Science|Trust/i).first()).toBeVisible({ timeout: 15000 })

    await page.goto('/athlete/checkin')
    await expect(page.getByText(/Athlete Daily Check-In/i)).toBeVisible({ timeout: 15000 })
  })

  test('Coach End-to-End Pathway', async ({ page }) => {
    const timestamp = Date.now()
    const email = `audit_coach_${timestamp}@example.com`
    const fullName = `Audit Coach ${timestamp}`
    const suffix = String(timestamp)

    await signupCoachCurrent(page, email, fullName)
    await completeCoachOnboardingCurrent(page, fullName, suffix, `Audit Squad ${suffix}`)

    await page.goto('/coach/dashboard')
    await expect(page.getByText(/Command Center Active/i)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Operator Locker Code/i)).toBeVisible({ timeout: 15000 })
  })

  test('Individual End-to-End Pathway', async ({ page }) => {
    const timestamp = Date.now()
    const email = `audit_ind_${timestamp}@example.com`
    const fullName = `Audit Individual ${timestamp}`

    await page.goto('/signup?role=individual')
    await page.getByLabel(/Full Name/i).fill(fullName)
    await page.getByLabel(/Email Connection/i).fill(email)
    await page.getByLabel(/Security Access/i).fill('AuditPass123!')
    await page.locator('#consent').check()
    await page.getByRole('button', { name: /Continue to FitStart/i }).click()

    await page.waitForURL(/\/(fitstart|verify-email|individual\/dashboard)/, { timeout: 60000 })
    if (page.url().includes('/verify-email')) {
      await loginCurrent(page, email)
      await page.waitForURL(/\/(fitstart|individual\/dashboard)/, { timeout: 30000 })
    }

    if (page.url().includes('/fitstart')) {
      await expect(page.getByText(/FitStart|Start your/i).first()).toBeVisible({ timeout: 15000 })
    } else {
      await expect(page).toHaveURL(/\/individual\/dashboard/, { timeout: 30000 })
      await expect(page.getByText(/Today|Plan|Science/i).first()).toBeVisible({ timeout: 15000 })
    }
  })
})
