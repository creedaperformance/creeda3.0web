import type { DailySignalResult } from '@/forms/types'

export const MINIMUM_VIABLE_DAILY_SIGNALS = {
  athlete: [
    {
      key: 'energy',
      reason: 'Best fast proxy for central readiness and overall trainability.',
    },
    {
      key: 'soreness',
      reason: 'Captures residual neuromuscular cost and possible pain protection needs.',
    },
    {
      key: 'stress',
      reason: 'Captures non-training load that often explains readiness drops.',
    },
    {
      key: 'sleepQuality',
      reason: 'Used only on low-confidence days to explain energy and stress changes.',
    },
  ],
  individual: [
    {
      key: 'energy',
      reason: 'Fastest signal for whether training should push, maintain, or recover.',
    },
    {
      key: 'stress',
      reason: 'Life load strongly affects adherence and recovery in general users.',
    },
    {
      key: 'soreness',
      reason: 'Shows how hard the body should be pushed today.',
    },
    {
      key: 'sessionCompletion',
      reason: 'Useful only when the user wants the model to learn from the training day.',
    },
  ],
} as const

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function normalizeFivePointScore(value: number) {
  return clamp(((value - 1) / 4) * 100, 0, 100)
}

function getSharedDailyResult(args: {
  energy: number
  soreness: number
  stress: number
  sleepQuality?: number
  extraFollowUps?: string[]
}): DailySignalResult {
  const energyScore = normalizeFivePointScore(args.energy)
  const sorenessPenalty = normalizeFivePointScore(args.soreness)
  const stressPenalty = normalizeFivePointScore(args.stress)
  const sleepBonus = args.sleepQuality ? normalizeFivePointScore(args.sleepQuality) * 0.18 : 0

  const readinessScore = Math.round(
    clamp(energyScore * 0.5 + (100 - sorenessPenalty) * 0.28 + (100 - stressPenalty) * 0.22 + sleepBonus)
  )

  const anomalyFlags: string[] = []
  const followUpFieldIds = [...(args.extraFollowUps ?? [])]

  if (args.energy <= 2) {
    anomalyFlags.push('low_energy')
    followUpFieldIds.push('sleepQuality', 'sleepDuration')
  }

  if (args.soreness >= 4) {
    anomalyFlags.push('high_soreness')
    followUpFieldIds.push('painLocation')
  }

  if (args.stress >= 4) {
    anomalyFlags.push('high_stress')
    followUpFieldIds.push('sleepQuality')
  }

  const confidenceScore = clamp(
    78 + (args.sleepQuality ? 10 : 0) - anomalyFlags.length * 9,
    35,
    96
  )

  const readinessBand =
    readinessScore < 40
      ? 'low'
      : readinessScore < 60
        ? 'guarded'
        : readinessScore < 80
          ? 'stable'
          : 'high'

  return {
    readinessScore,
    readinessBand,
    confidenceScore,
    shouldExpand: anomalyFlags.length > 0 || confidenceScore < 60,
    anomalyFlags,
    followUpFieldIds: [...new Set(followUpFieldIds)],
  }
}

export function processAthleteDailySignals(args: {
  energy: number
  soreness: number
  stress: number
  sleepQuality?: number
  hasOutstandingTrainingCapture?: boolean
}) {
  return getSharedDailyResult({
    ...args,
    extraFollowUps: args.hasOutstandingTrainingCapture ? ['sessionCompletion'] : [],
  })
}

export function processIndividualDailySignals(args: {
  energy: number
  soreness: number
  stress: number
  sleepQuality?: number
  trackTrainingToday?: boolean
}) {
  return getSharedDailyResult({
    ...args,
    extraFollowUps: args.trackTrainingToday ? ['sessionCompletion'] : [],
  })
}

