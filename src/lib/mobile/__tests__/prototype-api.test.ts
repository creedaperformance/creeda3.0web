import {
  isMissingPrototypeDataError,
  normalizeSportId,
  resolveBodyOverallStatus,
  resolveCoachAthleteStatus,
} from '@/lib/mobile/prototype-api'

describe('mobile prototype API contracts', () => {
  it('normalizes sport ids for path-safe mobile dashboard routes', () => {
    expect(normalizeSportId('Cricket Fast Bowling')).toBe('cricket-fast-bowling')
    expect(normalizeSportId('Football/Soccer')).toBe('football-soccer')
    expect(normalizeSportId('Strength & Conditioning')).toBe('strength-and-conditioning')
  })

  it('keeps body-map status unknown until real evidence exists', () => {
    expect(
      resolveBodyOverallStatus({
        evidenceCount: 0,
        latestReadiness: 92,
        regionStatuses: ['unknown', 'unknown'],
      })
    ).toBe('unknown')
  })

  it('escalates body-map status from real region evidence without diagnosis wording', () => {
    expect(
      resolveBodyOverallStatus({
        evidenceCount: 1,
        latestReadiness: 82,
        regionStatuses: ['unknown', 'caution'],
      })
    ).toBe('caution')

    expect(
      resolveBodyOverallStatus({
        evidenceCount: 2,
        latestReadiness: 82,
        regionStatuses: ['attention', 'caution'],
      })
    ).toBe('attention')
  })

  it('marks coach athlete status as unknown when readiness evidence is missing', () => {
    expect(
      resolveCoachAthleteStatus({
        readinessScore: null,
        riskScore: null,
      })
    ).toBe('unknown')
  })

  it('uses conservative coach status thresholds for real readiness and risk data', () => {
    expect(resolveCoachAthleteStatus({ readinessScore: 74, riskScore: 12 })).toBe('ready')
    expect(resolveCoachAthleteStatus({ readinessScore: 58, riskScore: 12 })).toBe('caution')
    expect(resolveCoachAthleteStatus({ readinessScore: 40, riskScore: 12 })).toBe('attention')
    expect(resolveCoachAthleteStatus({ readinessScore: 74, riskScore: 60 })).toBe('attention')
  })

  it('treats missing Supabase tables as empty-state compatible errors', () => {
    expect(isMissingPrototypeDataError({ code: 'PGRST205', message: 'table missing' })).toBe(true)
    expect(
      isMissingPrototypeDataError({
        message: 'Could not find the table public.health_daily_metrics in the schema cache',
      })
    ).toBe(true)
  })
})
