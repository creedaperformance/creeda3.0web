import { assignEvidenceLevel, computeBundleStrength, computeEvidenceScore } from '@/lib/research/scoring'

describe('research evidence scoring', () => {
  test('scores higher-quality and better-matched studies more strongly', () => {
    const high = computeEvidenceScore({
      studyType: 'meta_analysis',
      sampleSize: 480,
      publicationYear: new Date().getUTCFullYear(),
      sport: 'cricket',
      population: 'elite_athletes',
      targetSport: 'cricket',
      targetPopulation: 'elite_athletes',
      replicationCount: 5,
      retractionStatus: 'none',
    })

    const low = computeEvidenceScore({
      studyType: 'narrative_review',
      sampleSize: 18,
      publicationYear: 2010,
      sport: 'other',
      population: 'other',
      targetSport: 'cricket',
      targetPopulation: 'elite_athletes',
      replicationCount: 0,
      retractionStatus: 'none',
    })

    expect(high.total).toBeGreaterThan(low.total)
    expect(assignEvidenceLevel(high.total)).toMatch(/high|very_high/)
  })

  test('retracted papers collapse to excluded evidence', () => {
    const score = computeEvidenceScore({
      studyType: 'rct',
      sampleSize: 120,
      publicationYear: 2025,
      retractionStatus: 'retracted',
    })

    expect(score.total).toBe(0)
    expect(assignEvidenceLevel(score.total)).toBe('excluded')
  })

  test('computes bundle strength from paper scores and consistency', () => {
    const strength = computeBundleStrength({
      paperScores: [82, 74, 78],
      consistencyScore: 0.9,
      contradictionCount: 0,
    })

    expect(strength.numericStrength).toBeGreaterThan(60)
    expect(['strong', 'very_strong']).toContain(strength.evidenceStrength)
  })
})
