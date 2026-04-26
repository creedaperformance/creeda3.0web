import { scoreApsq10 } from '../apsq-scorer'

describe('scoreApsq10', () => {
  it('uses the onboarding v2 APSQ 0-4 scale and cutoffs', () => {
    expect(scoreApsq10(Array(10).fill(0))).toEqual({
      totalScore: 0,
      flagLevel: 'green',
    })
    expect(scoreApsq10([2, 2, 2, 2, 2, 1, 1, 1, 1, 1])).toEqual({
      totalScore: 15,
      flagLevel: 'amber',
    })
    expect(scoreApsq10(Array(10).fill(2))).toEqual({
      totalScore: 20,
      flagLevel: 'red',
    })
  })

  it('rejects responses outside the 0-4 APSQ range', () => {
    expect(() => scoreApsq10([1, 1, 1, 1, 1, 1, 1, 1, 1, 5])).toThrow(
      'APSQ-10 responses must be integers from 0 to 4.'
    )
  })
})
