import {
  normalizeAgeGroup,
  normalizeMetric,
  normalizePopulation,
  normalizeSport,
  normalizeStudyType,
  parseHours,
  parsePercentage,
  parseSampleSize,
} from '@/lib/research/taxonomy'

describe('research taxonomy normalization', () => {
  test('normalizes internal metric vocabulary', () => {
    expect(normalizeMetric('heart rate variability')).toBe('hrv')
    expect(normalizeMetric('vagal indices')).toBe('hrv')
    expect(normalizeMetric('time in bed')).toBe('sleep_duration')
    expect(normalizeMetric('performance decrement', { preferOutcome: true })).toBe('performance_reduction')
  })

  test('normalizes sport, age group, population, and study type taxonomy', () => {
    expect(normalizeSport('IPL cricket fast bowler cohort')).toBe('cricket')
    expect(normalizeAgeGroup('adolescent team-sport athletes')).toBe('youth')
    expect(normalizePopulation('elite athletes in India')).toBe('elite_athletes')
    expect(normalizeStudyType('randomized controlled trial')).toBe('rct')
  })

  test('parses unit-safe numeric helpers', () => {
    expect(parseHours('sleep duration was 5.5 h')).toBe(5.5)
    expect(parsePercentage('HRV dropped by -8%')).toBe(-8)
    expect(parseSampleSize('sample size = 144')).toBe(144)
  })
})
