import { resolveAccessPolicy } from '@/lib/research/access-policy'
import { parseAbstract } from '@/lib/research/parsing'

describe('research finding extraction snapshots', () => {
  test('extracts normalized findings from abstract text', () => {
    const result = parseAbstract({
      paperId: 'paper-1',
      abstractText:
        'Sleep duration under 6 h increased fatigue risk in elite athletes. A downward trend in HRV reduced readiness the next morning. Dehydrated athletes showed decreased sprint performance.',
      accessDecision: resolveAccessPolicy({
        sourceKey: 'europe_pmc',
        isOpenAccess: true,
        license: 'CC-BY-4.0',
        fullTextUrl: 'https://example.org/full-text',
      }),
    })

    expect(result.findings).toMatchInlineSnapshot(`
      [
        {
          "comparator": "lt_6h",
          "confidenceText": null,
          "direction": "increases",
          "effectSize": null,
          "extractionMethod": "rules",
          "findingText": "sleep_duration lt_6h -> fatigue_risk increases",
          "findingType": "risk_factor",
          "isHumanVerified": false,
          "outcomeMetric": "fatigue_risk",
          "paperId": "paper-1",
          "subjectMetric": "sleep_duration",
        },
        {
          "comparator": "downward_trend",
          "confidenceText": null,
          "direction": "decreases",
          "effectSize": null,
          "extractionMethod": "rules",
          "findingText": "hrv downward_trend -> readiness decreases",
          "findingType": "association",
          "isHumanVerified": false,
          "outcomeMetric": "readiness",
          "paperId": "paper-1",
          "subjectMetric": "hrv",
        },
        {
          "comparator": "dehydrated",
          "confidenceText": null,
          "direction": "decreases",
          "effectSize": null,
          "extractionMethod": "rules",
          "findingText": "hydration_status dehydrated -> sprint_performance decreases",
          "findingType": "association",
          "isHumanVerified": false,
          "outcomeMetric": "sprint_performance",
          "paperId": "paper-1",
          "subjectMetric": "hydration_status",
        },
      ]
    `)
    expect(result.passages).toHaveLength(3)
  })
})
