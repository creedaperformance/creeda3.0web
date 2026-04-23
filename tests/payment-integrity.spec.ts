import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { acceptRequiredSignupConsents } from './utils/current-flows'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function waitForProfileByEmail(email: string, expectedRole: 'athlete' | 'coach', timeoutMs = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, role, onboarding_completed, subscription_tier, subscription_status')
      .eq('email', email)
      .maybeSingle()

    if (data?.id && data.role === expectedRole) {
      return data
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return null
}

test.describe('Access Integrity Audit (No Tier Gating)', () => {
  test('athlete and coach signup flows run without pricing/checkout gates', async ({ page }) => {
    test.slow()

    const auditId = Date.now()
    const athleteEmail = `athlete-audit-${auditId}@creeda.test`
    const coachEmail = `coach-audit-${auditId}@creeda.test`
    const password = 'Password123!'

    // Athlete signup should go directly to account creation, no plan picker.
    await page.goto('/signup?role=athlete')
    await expect(page.getByRole('button', { name: /Athlete Free/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Continue Subcription/i })).toHaveCount(0)

    await page.getByLabel(/Full Name/i).fill('Audit Athlete')
    await page.getByLabel(/Email Connection/i).fill(athleteEmail)
    await page.getByLabel(/Security Access/i).fill(password)
    await acceptRequiredSignupConsents(page)
    await page.getByRole('button', { name: /Continue to Athlete Onboarding/i }).click()

    await page.waitForURL(/\/(athlete\/onboarding|athlete\/dashboard|verify-email)/, { timeout: 30000 })
    await expect(page).not.toHaveURL(/\/checkout/)

    const athleteProfile = await waitForProfileByEmail(athleteEmail, 'athlete')
    expect(athleteProfile, 'athlete profile should exist after signup').toBeTruthy()

    if (athleteProfile && !page.url().includes('/verify-email')) {
      await supabaseAdmin
        .from('profiles')
        .update({
          onboarding_completed: true,
          subscription_status: 'active',
          subscription_tier: 'Athlete-Pro',
        })
        .eq('id', athleteProfile.id)

      await page.goto('/athlete/dashboard')
      await page.waitForURL(/\/athlete(\/dashboard)?$/, { timeout: 30000 })
      await expect(page.locator('.blur-md')).toHaveCount(0)
      await expect(page.getByRole('button', { name: /Activate Pro Access|Upgrade/i })).toHaveCount(0)
    }

    // Coach signup should also be direct, with no checkout redirection.
    await page.context().clearCookies()
    await page.goto('/signup?role=coach')
    await expect(page.getByRole('button', { name: /Coach Pro/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Continue Subcription/i })).toHaveCount(0)

    await page.getByLabel(/Full Name/i).fill('Audit Coach')
    await page.getByLabel(/Email Connection/i).fill(coachEmail)
    await page.getByLabel(/Security Access/i).fill(password)
    await acceptRequiredSignupConsents(page)
    await page.getByRole('button', { name: /Create Coach Account/i }).click()

    await page.waitForURL(/\/(coach\/dashboard|coach\/onboarding|verify-email)/, { timeout: 30000 })
    await expect(page).not.toHaveURL(/\/checkout/)

    const coachProfile = await waitForProfileByEmail(coachEmail, 'coach')
    expect(coachProfile, 'coach profile should exist after signup').toBeTruthy()
  })
})
