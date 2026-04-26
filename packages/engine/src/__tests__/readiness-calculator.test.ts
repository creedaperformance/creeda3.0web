import { computeReadiness } from '../readiness-calculator'

describe('computeReadiness', () => {
  it('discounts a score when confidence is still low', () => {
    const result = computeReadiness({
      subjective: { energy: 4, body_feel: 4, mental_load: 2 },
      sleep: { hours: 8, quality: 8 },
      acwr: { ratio: 1, zone: 'sweet_spot' },
      movementQualityLatest: 80,
      envModifier: 1,
      confidence: { tier: 'low', pct: 25 },
    })

    expect(result.score).toBeLessThan(70)
    expect(result.missing).toContain('HRV (sync wearable or weekly camera-PPG)')
    expect(result.confidence).toEqual({ tier: 'low', pct: 25 })
  })
})
