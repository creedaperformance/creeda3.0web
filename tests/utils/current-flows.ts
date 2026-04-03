import { expect, type Page } from '@playwright/test'

const PASSWORD = 'TestPass123!'

export async function signupCoachCurrent(page: Page, email: string, coachName: string) {
  await page.goto('/signup')
  await page.getByRole('button', { name: /Coach Squad intelligence/i }).click()
  await page.getByLabel(/Full Name/i).fill(coachName)
  await page.getByLabel(/Email Connection/i).fill(email)
  await page.getByLabel(/Security Access/i).fill(PASSWORD)
  await page.locator('#consent').check()
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

  await expect(page.getByRole('heading', { name: /Professional Identity/i })).toBeVisible({ timeout: 15000 })
  await page.getByPlaceholder(/Head Coach Anil Kumar/i).fill(coachName)
  await page.getByPlaceholder(/coach_anil/i).fill(`coach_${usernameSuffix}`)
  await page.getByPlaceholder(/\+91 98/i).fill('9876543210')
  await page.getByRole('button', { name: /Next Step/i }).click()

  await expect(page.getByRole('heading', { name: /Squad Blueprint/i })).toBeVisible({ timeout: 15000 })
  await page.getByPlaceholder(/Haryana U-19 Elite Squad/i).fill(teamName)
  await page.getByRole('button', { name: /Next Step/i }).click()

  await expect(page.getByRole('heading', { name: /Operational Context/i })).toBeVisible({ timeout: 15000 })
  const finalNextStep = page.getByRole('button', { name: /Next Step/i })
  await finalNextStep.evaluate((node) => {
    (node as HTMLButtonElement).click()
  })
  await expect(page.getByRole('heading', { name: /Priority Matrix/i })).toBeVisible({ timeout: 15000 })

  const completeButton = page.locator('form button[type="submit"]')
  await expect(completeButton).toContainText(/Complete Setup/i, { timeout: 15000 })
  await expect(completeButton).toBeVisible({ timeout: 15000 })
  await Promise.all([
    page.waitForURL(/\/coach(\/dashboard)?$/, { timeout: 45000 }),
    completeButton.click(),
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
  await page.locator('#consent').check()
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

  await expect(page.getByRole('heading', { name: /Athlete Setup/i })).toBeVisible({ timeout: 15000 })
  await page.locator('input[name="fullName"]').fill(athleteName)
  await page.locator('input[name="username"]').fill(`athlete_${usernameSuffix}`)
  await page.locator('select[name="primarySport"]').selectOption({ index: 1 })

  const positionSelect = page.locator('select[name="position"]')
  if (await positionSelect.count()) {
    await positionSelect.selectOption({ index: 1 })
  } else {
    await page.locator('input[name="position"]').fill('Forward')
  }

  await page.getByRole('button', { name: /Ambidextrous/i }).click()
  await page.locator('input[name="age"]').fill('21')
  await page.getByRole('button', { name: /^Male$/i }).click()
  await page.locator('input[name="heightCm"]').fill('182')
  await page.locator('input[name="weightKg"]').fill('78')
  await page.getByRole('button', { name: /Next Phase/i }).click()

  await expect(page.getByRole('heading', { name: /Training Reality/i })).toBeVisible({ timeout: 15000 })
  await page.locator('select[name="playingLevel"]').selectOption({ index: 1 })
  await page.getByRole('button', { name: /^Daily$/i }).click()
  await page.getByRole('button', { name: /^Moderate$/i }).click()
  await page.getByRole('button', { name: /Next Phase/i }).click()

  await expect(page.getByText(/Your Main Goal/i)).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: /Performance Enhancement/i }).click()
  await page.getByRole('button', { name: /Next Phase/i }).click()

  await expect(page.getByText(/Current Issue/i)).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: /No Active Injury/i }).click()
  await page.getByRole('button', { name: /No Illnesses/i }).click()
  await page.getByRole('button', { name: /No Past Injuries/i }).click()
  await page.getByRole('button', { name: /Next Phase/i }).click()

  for (let stepIndex = 0; stepIndex < 9; stepIndex += 1) {
    await page.getByRole('button', { name: /^3\b/i }).click()
    await page.getByRole('button', { name: /Next Phase/i }).click()
  }

  const reactionHeading = page.getByText(/Average Reflex Speed:/i)
  const wellnessSleep = page.locator('select[name="typicalSleep"]')
  const stepVisible = await Promise.race([
    reactionHeading.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'reaction'),
    wellnessSleep.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'wellness'),
  ])

  if (stepVisible === 'reaction') {
    await page.getByRole('button', { name: /Next Phase/i }).click()
  }

  await page.locator('select[name="typicalSleep"]').selectOption('7-8 hours')
  await page.locator('input[name="usualWakeUpTime"]').fill('07:00')
  const sorenessChoices = page
    .locator('label', { hasText: /Typical Soreness/i })
    .locator('xpath=following-sibling::div[1]')
  await sorenessChoices.getByRole('button', { name: /^Low$/i }).click()
  const energyChoices = page
    .locator('label', { hasText: /Typical Energy Levels/i })
    .locator('xpath=following-sibling::div[1]')
  await energyChoices.getByRole('button', { name: /^High$/i }).click()
  await page.getByRole('button', { name: /Next Phase/i }).click()

  await page.locator('#legalConsent').check()
  await page.getByRole('button', { name: /Complete Profile/i }).click()
  await page.waitForURL(/\/athlete\/dashboard/, { timeout: 45000 })
}

export async function loginCurrent(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel(/Email Address|Email Connection|Email/i).fill(email)
  await page.getByLabel(/Password|Security Access/i).fill(PASSWORD)
  await page.getByRole('button', { name: /Log In|Log in/i }).click()
}
