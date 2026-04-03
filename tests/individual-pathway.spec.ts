import { expect, test, type Page } from '@playwright/test'

async function clickScopedRating(page: Page, label: string, value: string) {
  await page.evaluate(
    ({ label, value }) => {
      const labelNode = document.evaluate(
        `//*[normalize-space(text())='${label}']`,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue as HTMLElement | null

      if (!labelNode) throw new Error(`Could not find label node for ${label}`)

      let container: HTMLElement | null = labelNode.parentElement
      while (container) {
        const buttonCount = container.querySelectorAll('button').length
        if (buttonCount >= 4 && buttonCount <= 5) break
        container = container.parentElement
      }

      if (!container) throw new Error(`Could not find rating card for ${label}`)

      const button = [...container.querySelectorAll('button')].find(
        (candidate) => candidate.textContent?.trim() === value
      ) as HTMLButtonElement | undefined

      if (!button) throw new Error(`Could not find rating ${value} for ${label}`)
      button.click()
    },
    { label, value }
  )
}

async function clickScopedOption(page: Page, label: string, value: string) {
  await page.evaluate(
    ({ label, value }) => {
      const labelNode = document.evaluate(
        `//*[normalize-space(text())='${label}']`,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue as HTMLElement | null

      if (!labelNode) throw new Error(`Could not find label node for ${label}`)

      let container: HTMLElement | null = labelNode.parentElement
      while (container) {
        const button = [...container.querySelectorAll('button')].find(
          (candidate) => candidate.textContent?.trim() === value
        ) as HTMLButtonElement | undefined

        if (button) {
          button.click()
          return
        }

        container = container.parentElement
      }

      throw new Error(`Could not find option ${value} for ${label}`)
    },
    { label, value }
  )
}

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

    await page.getByLabel(/Age/i).fill('29')
    await page.getByLabel(/Height/i).fill('171')
    await page.getByLabel(/Weight/i).fill('72')
    await page.getByRole('button', { name: /Desk \/ laptop work/i }).click()
    await page.getByRole('button', { name: /^Male$/i }).click()
    await page.getByRole('button', { name: /Next step/i }).click()
    await expect(page.getByRole('heading', { name: /Map your normal routine/i })).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: /Some movement/i }).click()
    await page.getByRole('button', { name: /After work/i }).click()
    await page.getByLabel(/Sitting hours per day/i).fill('8')
    await page.getByRole('button', { name: /^Okay$/i }).click()
    await page.getByRole('button', { name: /Next step/i }).click()
    await expect(page.getByText(/Sleep quality/i)).toBeVisible({ timeout: 10000 })

    await clickScopedRating(page, 'Sleep quality', '4')
    await clickScopedRating(page, 'Daily energy', '4')
    await clickScopedRating(page, 'Stress load', '4')
    await clickScopedRating(page, 'Bounce-back speed', '4')
    await page.getByRole('button', { name: /Next step/i }).click()
    await expect(page.getByText(/Injury history/i)).toBeVisible({ timeout: 10000 })

    await clickScopedOption(page, 'Injury history', 'None')
    await clickScopedOption(page, 'Mobility limitations', 'None')
    await clickScopedOption(page, 'How much training experience do you have?', 'A little experience')
    await page.getByRole('button', { name: /Next step/i }).click()
    await expect(page.getByRole('heading', { name: /Rate your current capacity/i })).toBeVisible({ timeout: 10000 })

    await clickScopedRating(page, 'Endurance', '3')
    await clickScopedRating(page, 'Strength', '3')
    await clickScopedRating(page, 'Power', '3')
    await clickScopedRating(page, 'Balance and control', '3')
    await clickScopedRating(page, 'Reaction speed', '3')
    await clickScopedRating(page, 'Recovery efficiency', '3')
    await clickScopedRating(page, 'Holding up when tired', '3')
    await clickScopedRating(page, 'Weekly load', '3')
    await clickScopedRating(page, 'Movement quality', '3')
    await clickScopedRating(page, 'Coordination', '3')
    await page.getByRole('button', { name: /Next step/i }).click()
    await expect(page.getByText(/Primary goal/i)).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: /General fitness/i }).click()
    await page.getByRole('button', { name: /12 weeks/i }).click()
    await page.getByRole('button', { name: /^Moderate$/i }).click()
    await page.getByRole('button', { name: /Bodyweight/i }).click()

    await page.getByRole('button', { name: /See my best paths/i }).click()
    await expect(page.getByText(/recommended starting plans/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/recommended starting plans/i)).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: /Start my journey/i }).click()

    await expect(page).toHaveURL(/\/individual\/dashboard/, { timeout: 20000 })
    await expect(page.getByText(/FitStart baseline, daily signals, and optional device data/i)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Start with the next step/i)).toBeVisible({ timeout: 15000 })

    await page.goto('/individual/logging')
    await expect(page.getByText(/Daily Check-In/i)).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: /Good/i }).click()
    await expect(page.getByText(/How is your energy right now/i)).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /Good/i }).click()
    await expect(page.getByText(/How heavy does the day feel/i)).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /😌 Calm/i }).click()
    await expect(page.getByText(/How fresh does your body feel/i)).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /Fresh/i }).click()
    await expect(page.getByText(/How sore or stiff do you feel/i)).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /Barely/i }).click()
    await expect(page.getByText(/How active were you today/i)).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: /Barely moved/i }).click()
    await expect(page.getByText(/How much water did you drink/i)).toBeVisible({ timeout: 10000 })

    await page.locator('input[type="number"]').fill('2.5')
    await page.getByRole('button', { name: /^Continue$/i }).click()
    await expect(page.getByText(/About how many steps did you get today/i)).toBeVisible({ timeout: 10000 })

    await page.locator('input[type="number"]').fill('6400')
    await page.getByRole('button', { name: /^Continue$/i }).click()
    await expect(page.getByText(/Anything else CREEDA should know/i)).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: /Update My Daily Guidance/i }).click()
    await expect(page.getByText(/Daily plan updated/i)).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: /Back to Dashboard/i })).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: /Back to Dashboard/i }).click()
    await expect(page).toHaveURL(/\/individual\/dashboard/, { timeout: 15000 })

    await page.goto('/individual/scan/analyze?sport=other')
    await expect(page.getByText(/Upload a short clip/i)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Upload a 5-20 second MP4, MOV, or WEBM clip/i)).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: /Select Video/i })).toBeVisible({ timeout: 15000 })
  })
})
