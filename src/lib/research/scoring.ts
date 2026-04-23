import {
  RESEARCH_RETRACTION_PENALTIES,
  RESEARCH_SCORE_WEIGHTS,
  RESEARCH_STUDY_TYPE_WEIGHTS,
} from '@/lib/research/config'
import type { PaperScoreBreakdown } from '@/lib/research/types'
import type {
  ResearchBundleStrength,
  ResearchEvidenceLevel,
  ResearchPopulation,
  ResearchRetractionStatus,
  ResearchSport,
  ResearchStudyType,
} from '@/lib/research/taxonomy'

type ScoringArgs = {
  studyType?: ResearchStudyType | null
  sampleSize?: number | null
  publicationYear?: number | null
  sport?: ResearchSport | null
  population?: ResearchPopulation | null
  retractionStatus?: ResearchRetractionStatus | null
  replicationCount?: number
  targetSport?: ResearchSport | null
  targetPopulation?: ResearchPopulation | null
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function computeSampleSizeScore(sampleSize?: number | null) {
  if (!sampleSize || sampleSize <= 0) return 3
  return clamp(Math.round(Math.log10(sampleSize + 1) * 6), 3, RESEARCH_SCORE_WEIGHTS.sampleSize)
}

function computeRecencyScore(publicationYear?: number | null) {
  if (!publicationYear) return 4
  const currentYear = new Date().getUTCFullYear()
  const age = currentYear - publicationYear
  if (age <= 2) return 15
  if (age <= 5) return 12
  if (age <= 10) return 9
  if (age <= 15) return 6
  return 3
}

function computeMatchScore<T extends string>(actual?: T | null, expected?: T | null) {
  if (!expected) return 5
  if (!actual) return 3
  if (actual === expected) return 10
  if (actual === 'general' || actual === 'mixed' || actual === 'other') return 7
  return 3
}

function computeReplicationScore(replicationCount?: number) {
  if (!replicationCount || replicationCount <= 0) return 2
  if (replicationCount >= 6) return 10
  if (replicationCount >= 4) return 8
  if (replicationCount >= 2) return 6
  return 4
}

export function computeEvidenceScore(args: ScoringArgs): PaperScoreBreakdown {
  const penalty = RESEARCH_RETRACTION_PENALTIES[args.retractionStatus || 'none']
  const studyType = args.retractionStatus === 'retracted'
    ? 0
    : RESEARCH_STUDY_TYPE_WEIGHTS[args.studyType || 'other']
  const sampleSize = args.retractionStatus === 'retracted' ? 0 : computeSampleSizeScore(args.sampleSize)
  const recency = args.retractionStatus === 'retracted' ? 0 : computeRecencyScore(args.publicationYear)
  const sportMatch = args.retractionStatus === 'retracted' ? 0 : computeMatchScore(args.sport, args.targetSport)
  const populationMatch = args.retractionStatus === 'retracted' ? 0 : computeMatchScore(args.population, args.targetPopulation)
  const replication = args.retractionStatus === 'retracted' ? 0 : computeReplicationScore(args.replicationCount)
  const total = clamp(studyType + sampleSize + recency + sportMatch + populationMatch + replication - penalty, 0, 100)

  return {
    studyType,
    sampleSize,
    recency,
    sportMatch,
    populationMatch,
    replication,
    penalty,
    total,
  }
}

export function assignEvidenceLevel(score: number): ResearchEvidenceLevel {
  if (score <= 0) return 'excluded'
  if (score < 25) return 'very_low'
  if (score < 45) return 'low'
  if (score < 65) return 'moderate'
  if (score < 80) return 'high'
  return 'very_high'
}

export function computeBundleStrength(args: {
  paperScores: number[]
  consistencyScore: number
  contradictionCount: number
}): {
  numericStrength: number
  evidenceStrength: ResearchBundleStrength
} {
  if (args.paperScores.length === 0) {
    return { numericStrength: 0, evidenceStrength: 'insufficient' }
  }

  const mean = args.paperScores.reduce((total, value) => total + value, 0) / args.paperScores.length
  const countFactor = clamp(0.7 + args.paperScores.length * 0.12, 0.75, 1.35)
  const contradictionPenalty = clamp(args.contradictionCount * 0.08, 0, 0.3)
  const numericStrength = clamp(mean * countFactor * Math.max(0.2, args.consistencyScore - contradictionPenalty), 0, 100)

  if (numericStrength < 25) return { numericStrength, evidenceStrength: 'insufficient' }
  if (numericStrength < 45) return { numericStrength, evidenceStrength: 'limited' }
  if (numericStrength < 65) return { numericStrength, evidenceStrength: 'moderate' }
  if (numericStrength < 82) return { numericStrength, evidenceStrength: 'strong' }
  return { numericStrength, evidenceStrength: 'very_strong' }
}
