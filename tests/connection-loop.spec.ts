import { expect, test } from '@playwright/test'

import {
  completeAthleteOnboardingCurrent,
  completeCoachOnboardingCurrent,
  extractCoachLockerCode,
  signupAthleteWithCoachCode,
  signupCoachCurrent,
} from './utils/current-flows'

test.describe('Coach-Athlete Connection Loop', () => {
  test('Connection Loop: coach code -> athlete invite journey -> onboarding', async ({ browser }) => {
    test.slow()
    test.setTimeout(240000)

    const coachEmail = `coach_connection_${Date.now()}@test.creeda.in`
    const athleteEmail = `athlete_connection_${Date.now()}@test.creeda.in`
    const suffix = String(Date.now())

    const coachContext = await browser.newContext()
    const athleteContext = await browser.newContext()
    const coachPage = await coachContext.newPage()
    const athletePage = await athleteContext.newPage()

    await signupCoachCurrent(coachPage, coachEmail, 'Testing Coach')
    await completeCoachOnboardingCurrent(coachPage, 'Testing Coach', suffix, 'Test Warriors')

    const lockerCode = await extractCoachLockerCode(coachPage)
    expect(lockerCode).toMatch(/^\d{6}$/)

    await signupAthleteWithCoachCode(athletePage, athleteEmail, 'Testing Athlete', lockerCode)
    await completeAthleteOnboardingCurrent(athletePage, 'Testing Athlete', suffix)

    await expect(athletePage).toHaveURL(/\/athlete\/dashboard/, { timeout: 30000 })
    await expect(athletePage.getByText(/today|trust|objective|science/i).first()).toBeVisible({ timeout: 15000 })

    await athleteContext.close()
    await coachContext.close()
  })
})
