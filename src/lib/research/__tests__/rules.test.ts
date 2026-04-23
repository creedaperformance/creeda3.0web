import { evaluateRules } from '@/lib/research/rules'
import { starterRuleSeeds } from '@/lib/research/seed'
import type { RuleRecord } from '@/lib/research/types'

const rules: RuleRecord[] = starterRuleSeeds.map((rule, index) => ({
  id: `rule-${index + 1}`,
  ruleKey: rule.ruleKey,
  bundleId: `bundle-${index + 1}`,
  bundleKey: rule.bundleKey,
  logic: rule.logic,
  output: rule.output,
  status: 'approved',
  domain: rule.domain,
}))

const bundleStrengthByBundleId = Object.fromEntries(
  rules.map((rule) => [rule.bundleId, 'strong' as const])
)

describe('research decision rule evaluation', () => {
  test('sleep 5.5h + acute load high + HRV drop -> fatigue high', () => {
    const recommendations = evaluateRules({
      input: {
        sleep_hours: 5.5,
        acute_load: 8.5,
        hrv_delta_pct: -9,
        sport: 'cricket',
        age_group: 'adult',
      },
      rules,
      bundleStrengthByBundleId,
    })

    expect(recommendations[0]?.ruleKey).toBe('fatigue_sleep_load_low_hrv_v1')
    expect(recommendations[0]?.severity).toBe('high')
  })

  test('HRV down + soreness high + mood low -> readiness low', () => {
    const recommendations = evaluateRules({
      input: {
        hrv_delta_pct: -6,
        soreness: 8,
        mood: 3,
        sport: 'football',
        age_group: 'adult',
      },
      rules,
      bundleStrengthByBundleId,
    })

    expect(recommendations.some((entry) => entry.ruleKey === 'readiness_hrv_soreness_mood_v1')).toBe(true)
  })

  test('hydration low -> hydration guidance shown', () => {
    const recommendations = evaluateRules({
      input: {
        hydration_status: 'low',
      },
      rules,
      bundleStrengthByBundleId,
    })

    expect(recommendations[0]?.ruleKey).toBe('hydration_status_guidance_v1')
  })

  test('illness flag true -> conservative guidance', () => {
    const recommendations = evaluateRules({
      input: {
        illness_flag: true,
      },
      rules,
      bundleStrengthByBundleId,
    })

    expect(recommendations[0]?.ruleKey).toBe('illness_conservative_guidance_v1')
  })

  test('acute load spike above threshold -> injury risk warning', () => {
    const recommendations = evaluateRules({
      input: {
        acute_load: 13,
        chronic_load: 9,
      },
      rules,
      bundleStrengthByBundleId,
    })

    expect(recommendations.some((entry) => entry.ruleKey === 'injury_load_spike_warning_v1')).toBe(true)
  })
})
