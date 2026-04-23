import { expect, type Locator, type Page } from '@playwright/test'

const PASSWORD = 'TestPass123!'

export async function acceptRequiredSignupConsents(page: Page) {
  await page.locator('#terms_privacy_consent').check()
  await page.locator('#medical_disclaimer_consent').check()
  await page.locator('#data_processing_consent').check()
  await page.locator('#ai_acknowledgement_consent').check()
}

async function dismissCookieNotice(page: Page) {
  const essentialOnly = page.getByRole('button', { name: /Essential only/i })
  if (await essentialOnly.isVisible({ timeout: 1000 }).catch(() => false)) {
    await essentialOnly.click()
  }
}

async function clickNext(page: Page) {
  await page.getByRole('button', { name: /^Next$/i }).click()
}

async function ensureToggleOn(toggle: Locator) {
  if ((await toggle.getAttribute('aria-pressed')) !== 'true') {
    await toggle.click()
  }
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
}

export async function signupCoachCurrent(page: Page, email: string, coachName: string) {
  await page.goto('/signup')
  await page.getByRole('button', { name: /Coach Squad intelligence/i }).click()
  await page.getByLabel(/Full Name/i).fill(coachName)
  await page.getByLabel(/Email Connection/i).fill(email)
  await page.getByLabel(/Security Access/i).fill(PASSWORD)
  await acceptRequiredSignupConsents(page)
  await page.getByRole('button', { name: /Create Coach Account/i }).click()

  await page.waitForURL(/\/(coach\/dashboard|coach\/onboarding|verify-email)/, { timeout: 45000 })
  if (page.url().includes('/verify-email')) {
    await loginCurrent(page, email)
    await page.waitForURL(/\/(coach\/dashboard|coach\/onboarding)/, { timeout: 30000 })
  }
}

export async function completeCoachOnboardingCurrent(
  page: Page,
  coachName: string,
  usernameSuffix: string,
  teamName: string
) {
  if (!page.url().includes('/coach/onboarding')) {
    await page.goto('/coach/onboarding')
  }

  if (!page.url().includes('/coach/onboarding')) {
    await page.goto('/coach/dashboard')
    return
  }

  await dismissCookieNotice(page)
  await expect(page.getByText(/Coach Setup progress/i)).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('heading', { name: /Coach Identity/i })).toBeVisible({ timeout: 15000 })
  await page.getByPlaceholder(/Coach Anil Kumar/i).fill(coachName)
  await page.getByPlaceholder(/coach_anil/i).fill(`coach_${usernameSuffix}`)
  await page.getByPlaceholder(/\+91 98/i).fill('9876543210')
  await clickNext(page)

  await expect(page.getByRole('heading', { name: /Squad Setup/i })).toBeVisible({ timeout: 15000 })
  await page.getByPlaceholder(/Haryana U-19 Fast Bowling Unit/i).fill(teamName)
  await page.getByRole('button', { name: /^Cricket$/i }).click()
  await page.getByRole('button', { name: /Academy \/ Club Coach/i }).click()
  await clickNext(page)

  await expect(page.getByRole('heading', { name: /Team Structure/i })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: /Single team/i }).click()
  await page.getByRole('button', { name: /6-15/i }).click()
  await clickNext(page)

  await expect(page.getByRole('heading', { name: /Main Focus/i })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: /Peak Performance Optimization/i }).click()
  await page.getByRole('button', { name: /^Finish$/i }).click()

  await expect(page.getByRole('button', { name: /Open dashboard/i })).toBeVisible({ timeout: 30000 })
  await Promise.all([
    page.waitForURL(/\/coach\/dashboard$/, { timeout: 45000 }),
    page.getByRole('button', { name: /Open dashboard/i }).click(),
  ])
}

export async function extractCoachLockerCode(page: Page) {
  await page.goto('/coach/dashboard')
  const codeCard = page.getByTestId('coach-locker-code-card')
  await expect(codeCard).toBeVisible({ timeout: 15000 })
  const codeValue = codeCard.getByTestId('coach-locker-code-value')
  await expect(codeValue).toContainText(/\b\d{6}\b/, { timeout: 15000 })
  const lockerCode = ((await codeValue.textContent()) || '').trim()
  expect(lockerCode).toMatch(/^\d{6}$/)
  return lockerCode
}

export async function signupAthleteWithCoachCode(
  page: Page,
  email: string,
  athleteName: string,
  coachCode: string
) {
  const joinCta = page
    .locator(`a[href*="/signup?role=athlete&coach=${coachCode}"], button:has-text("Join Squad")`)
    .first()

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const joinResponse = await page.goto(`/join/${coachCode}`)
    expect(joinResponse?.status()).toBe(200)

    if (page.url().includes('/signup?role=athlete&coach=')) {
      break
    }

    const isJoinVisible = await joinCta.isVisible({ timeout: 3000 }).catch(() => false)
    if (isJoinVisible) {
      await joinCta.click()
      break
    }

    if (attempt === 4) {
      await page.goto(`/signup?role=athlete&coach=${coachCode}`)
    } else {
      await page.waitForTimeout(2000)
    }
  }

  await page.waitForURL(/\/signup\?role=athlete&coach=/, { timeout: 15000 })
  await expect(page.locator('#coach_locker_code')).toHaveValue(coachCode)

  const verifyButton = page.getByRole('button', { name: /Verify/i })
  if (await verifyButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await verifyButton.click()
    await expect(page.getByText(/Linked to Coach:/i)).toBeVisible({ timeout: 10000 })
  }

  await page.getByLabel(/Full Name/i).fill(athleteName)
  await page.getByLabel(/Email Connection/i).fill(email)
  await page.getByLabel(/Security Access/i).fill(PASSWORD)
  await acceptRequiredSignupConsents(page)
  await page.getByRole('button', { name: /Continue to Athlete Onboarding/i }).click()

  await page.waitForURL(/\/(athlete\/onboarding|verify-email|athlete\/dashboard)/, { timeout: 45000 })
  if (page.url().includes('/verify-email')) {
    await loginCurrent(page, email)
    await page.waitForURL(/\/(athlete\/onboarding|athlete\/dashboard)/, { timeout: 30000 })
  }
}

export async function completeAthleteOnboardingCurrent(page: Page, athleteName: string, usernameSuffix: string) {
  if (!page.url().includes('/athlete/onboarding')) {
    await page.goto('/athlete/onboarding')
  }

  const resumeSync = page.getByRole('button', { name: /Resume Sync/i })
  if (await resumeSync.isVisible({ timeout: 1500 }).catch(() => false)) {
    await page.getByRole('button', { name: /Start Fresh/i }).click()
  }

  await dismissCookieNotice(page)
  await expect(page.getByText(/Athlete Setup progress/i)).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('heading', { name: /Profile Name/i })).toBeVisible({ timeout: 15000 })
  await page.getByPlaceholder(/Aarav Sharma/i).fill(athleteName)
  await page.getByPlaceholder(/aarav_s/i).fill(`athlete_${usernameSuffix}`)
  await clickNext(page)

  await expect(page.getByRole('heading', { name: /Sport Context/i })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: /^Cricket$/i }).click()
  await page.getByPlaceholder(/Bowler, Midfielder, Setter/i).fill('Bowler')
  await clickNext(page)

  await expect(page.getByRole('heading', { name: /Athlete Snapshot/i })).toBeVisible({ timeout: 15000 })
  const snapshotNumbers = page.locator('input[type="number"]')
  await snapshotNumbers.nth(0).fill('21')
  await page.getByRole('button', { name: /^Male$/i }).click()
  await page.getByRole('button', { name: /^District$/i }).click()
  await snapshotNumbers.nth(1).fill('182')
  await snapshotNumbers.nth(2).fill('78')
  await clickNext(page)

  await expect(page.getByRole('heading', { name: /Primary Goal/i })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: /Performance Enhancement/i }).click()
  await clickNext(page)

  await expect(page.getByRole('heading', { name: /Pain Check/i })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: /No issues/i }).click()
  await clickNext(page)

  await expect(page.getByRole('heading', { name: /Finish Setup/i })).toBeVisible({ timeout: 15000 })
  const platformConsent = page.getByTestId('adaptive-toggle-platformConsent')
  const medicalConsent = page.getByTestId('adaptive-toggle-medicalDisclaimerConsent')
  await ensureToggleOn(platformConsent)
  await ensureToggleOn(medicalConsent)
  await page.getByRole('button', { name: /^Finish$/i }).click()

  await expect(page.getByRole('button', { name: /Open dashboard/i })).toBeVisible({ timeout: 30000 })
  await Promise.all([
    page.waitForURL(/\/athlete\/dashboard$/, { timeout: 45000 }),
    page.getByRole('button', { name: /Open dashboard/i }).click(),
  ])
}

export async function submitAthleteQuickCheckInCurrent(page: Page) {
  await page.goto('/athlete/checkin')
  await dismissCookieNotice(page)
  await expect(page.getByText(/Athlete Check-In progress/i)).toBeVisible({ timeout: 15000 })

  await expect(page.getByRole('heading', { name: /^Energy$/i })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: /Good/i }).click()
  await clickNext(page)

  await expect(page.getByRole('heading', { name: /Body Feel/i })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: /None/i }).click()
  await clickNext(page)

  await expect(page.getByRole('heading', { name: /^Stress$/i })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: /Normal/i }).click()
  await page.getByRole('button', { name: /^Finish$/i }).click()

  await expect(page.getByRole('button', { name: /Back to dashboard/i })).toBeVisible({ timeout: 30000 })
  await Promise.all([
    page.waitForURL(/\/athlete\/dashboard$/, { timeout: 30000, waitUntil: 'commit' }),
    page.getByRole('button', { name: /Back to dashboard/i }).click(),
  ])
  await expect(page.getByText(/Today's Session|Today/i).first()).toBeVisible({ timeout: 15000 })
}

export async function loginCurrent(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel(/Email Address|Email Connection|Email/i).fill(email)
  await page.getByLabel(/Password|Security Access/i).fill(PASSWORD)
  await page.getByRole('button', { name: /Log In|Log in/i }).click()
}
