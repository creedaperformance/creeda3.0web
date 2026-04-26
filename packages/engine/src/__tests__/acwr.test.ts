import { computeACWR } from '../acwr-calculator'

describe('computeACWR', () => {
  it('classifies the sweet spot when acute and chronic load are balanced', () => {
    const today = new Date('2026-04-26T00:00:00Z')
    const entries = Array.from({ length: 28 }, (_, index) => ({
      date: new Date(Date.UTC(2026, 3, 26 - index)).toISOString(),
      load_au: 100,
    }))

    expect(computeACWR(entries, today)).toEqual({
      acuteAU: 800,
      chronicAU: 700,
      ratio: 1.14,
      zone: 'sweet_spot',
    })
  })
})
