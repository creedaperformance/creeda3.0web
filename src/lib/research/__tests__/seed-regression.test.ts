import { starterRuleSeeds } from '@/lib/research/seed'
import { evaluateRules } from '@/lib/research/rules'
import type { RuleRecord } from '@/lib/research/types'

function buildRules(): RuleRecord[] {
  return starterRuleSeeds.map((rule, index) => ({
    id: `seed-rule-${index + 1}`,
    ruleKey: rule.ruleKey,
    bundleId: `seed-bundle-${index + 1}`,
    bundleKey: rule.bundleKey,
    logic: rule.logic,
    output: rule.output,
    status: rule.status,
    domain: rule.domain,
  }))
}

describe('seeded decision rule regressions', () => {
  const rules = buildRules()
  const bundleStrengthByBundleId = Object.fromEntries(
    rules.map((rule) => [rule.bundleId, 'strong' as const])
  )

  test.each([
    [
      'fatigue bundle',
      { sleep_hours: 5.5, acute_load: 8.2, hrv_delta_pct: -8.5 },
      'fatigue_sleep_load_low_hrv_v1',
    ],
    [
      'readiness bundle',
      { hrv_delta_pct: -7, soreness: 8, mood: 3 },
      'readiness_hrv_soreness_mood_v1',
    ],
    [
      'hydration bundle',
      { hydration_status: 'dehydrated' as const },
      'hydration_status_guidance_v1',
    ],
    [
      'illness bundle',
      { illness_flag: true },
      'illness_conservative_guidance_v1',
    ],
    [
      'injury bundle',
      { acute_load: 15, chronic_load: 10 },
      'injury_load_spike_warning_v1',
    ],
  ])('keeps %s active', (_label, input, expectedRuleKey) => {
    const recommendations = evaluateRules({
      input,
      rules,
      bundleStrengthByBundleId,
    })

    expect(recommendations.some((entry) => entry.ruleKey === expectedRuleKey)).toBe(true)
  })
})
