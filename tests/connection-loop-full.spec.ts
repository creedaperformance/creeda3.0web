import { expect, test } from '@playwright/test'

import {
  acceptRequiredSignupConsents,
  completeAthleteOnboardingCurrent,
  completeCoachOnboardingCurrent,
  extractCoachLockerCode,
  signupCoachCurrent,
  loginCurrent,
} from './utils/current-flows'

test.describe('Full Connection Loop', () => {
  test('Complete Loop: coach signup -> invite validation -> athlete onboarding', async ({ browser }) => {
    test.slow()
    test.setTimeout(240000)

    const coachEmail = `coach_full_${Date.now()}@test.creeda.in`
    const athleteEmail = `athlete_full_${Date.now()}@test.creeda.in`
    const suffix = String(Date.now())

    const coachContext = await browser.newContext()
    const athleteContext = await browser.newContext()
    const coachPage = await coachContext.newPage()
    const athletePage = await athleteContext.newPage()

    await signupCoachCurrent(coachPage, coachEmail, 'Master Coach')
    await completeCoachOnboardingCurrent(coachPage, 'Master Coach', suffix, 'Master Squad')
    const lockerCode = await extractCoachLockerCode(coachPage)

    await athletePage.goto('/signup')
    await athletePage.getByRole('button', { name: /Athlete Performance system/i }).click()
    await athletePage.getByLabel(/Full Name/i).fill('Star Athlete')
    await athletePage.getByLabel(/Email Connection/i).fill(athleteEmail)
    await athletePage.getByLabel(/Security Access/i).fill('TestPass123!')

    await athletePage.getByLabel(/Coach Locker Code/i).fill('000000')
    const verifyButton = athletePage.getByRole('button', { name: /Verify/i })
    await verifyButton.click()
    await expect(
      athletePage.locator('main').getByText(/Invalid coach code/i).first()
    ).toBeVisible({ timeout: 10000 })

    await athletePage.getByLabel(/Coach Locker Code/i).fill(lockerCode)
    await verifyButton.click()
    await expect(athletePage.getByText(/Linked to Coach:/i)).toBeVisible({ timeout: 10000 })
    await acceptRequiredSignupConsents(athletePage)
    await athletePage.getByRole('button', { name: /Continue to Athlete Onboarding/i }).click()

    await athletePage.waitForURL(/\/(athlete\/onboarding|verify-email|athlete\/dashboard)/, { timeout: 45000 })
    if (athletePage.url().includes('/verify-email')) {
      await loginCurrent(athletePage, athleteEmail)
      await athletePage.waitForURL(/\/(athlete\/onboarding|athlete\/dashboard)/, { timeout: 30000 })
    }

    await completeAthleteOnboardingCurrent(athletePage, 'Star Athlete', `${suffix}_full`)
    await expect(athletePage).toHaveURL(/\/athlete\/dashboard/, { timeout: 30000 })

    await athleteContext.close()
    await coachContext.close()
  })
})
