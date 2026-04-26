import { computeConfidence } from '../confidence-tier'

describe('computeConfidence', () => {
  it('starts low for a sparse day-zero profile', () => {
    expect(
      computeConfidence({
        daysSinceOnboarding: 0,
        dataPointsCollected: 8,
        hasWearable: false,
        movementScansCount: 0,
        capacityTestsCompleted: 0,
        daysOfChronicLoad: 0,
        daysOfCheckIns: 0,
      })
    ).toEqual({ tier: 'low', pct: 14 })
  })

  it('locks after sustained data coverage', () => {
    expect(
      computeConfidence({
        daysSinceOnboarding: 30,
        dataPointsCollected: 70,
        hasWearable: true,
        movementScansCount: 2,
        capacityTestsCompleted: 5,
        daysOfChronicLoad: 28,
        daysOfCheckIns: 28,
      })
    ).toEqual({ tier: 'locked', pct: 90 })
  })
})
