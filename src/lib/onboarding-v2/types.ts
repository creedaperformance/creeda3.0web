import type { Persona } from '@creeda/schemas'
import type { ConfidenceTier } from '@creeda/engine'

export const PHASE2_DAY_KEYS = [
  'day1_aerobic',
  'day2_strength_power',
  'day3_movement_quality',
  'day4_anaerobic_recovery',
  'day5_nutrition',
  'day6_psych_sleep',
  'day7_environment',
] as const
export type Phase2DayKey = (typeof PHASE2_DAY_KEYS)[number]

export const PHASE2_TOTAL_DAYS = PHASE2_DAY_KEYS.length

export const ONBOARDING_V2_DAY_LABELS: Record<Phase2DayKey, string> = {
  day1_aerobic: 'Day 1 · Aerobic',
  day2_strength_power: 'Day 2 · Strength & power',
  day3_movement_quality: 'Day 3 · Movement quality',
  day4_anaerobic_recovery: 'Day 4 · Anaerobic & recovery',
  day5_nutrition: 'Day 5 · Nutrition',
  day6_psych_sleep: 'Day 6 · APSQ & sleep',
  day7_environment: 'Day 7 · Environment',
}

export type ReadinessDriver = {
  name: string
  contribution: number
  explanation?: string
}

export type WeakLinkSummary = {
  region: string
  finding: string
  severity: 'mild' | 'moderate' | 'severe'
  drillId?: string
}

export type OnboardingV2Snapshot = {
  hasV2Data: boolean
  persona: Persona | null
  onboardingPhase: number
  calibrationPct: number
  modifiedMode: boolean
  parqAnyYes: boolean
  latestReadiness: {
    score: number
    tier: ConfidenceTier
    confidencePct: number
    drivers: ReadinessDriver[]
    missing: string[]
    directive: string
    date: string
    computedAt: string | null
  } | null
  latestMovementBaseline: {
    score: number | null
    weakLinks: WeakLinkSummary[]
    performedAt: string | null
    passedQualityGate: boolean
    rejectionReason: string | null
  } | null
  dailyCheckIn: {
    streakDays: number
    lastDate: string | null
    hasToday: boolean
    last14Days: string[]
    today: string
  }
  phase2: {
    daysCompleted: number
    totalDays: number
    completed: boolean
    nextDay: Phase2DayKey | null
  }
  reminderSubscription: {
    /** True iff at least one push_subscription row is active for this user. */
    hasActive: boolean
    /** Public VAPID key for the browser to use, if configured. Null otherwise. */
    vapidPublicKey: string | null
  }
}

export function emptyOnboardingV2Snapshot(today: string): OnboardingV2Snapshot {
  return {
    hasV2Data: false,
    persona: null,
    onboardingPhase: 0,
    calibrationPct: 0,
    modifiedMode: false,
    parqAnyYes: false,
    latestReadiness: null,
    latestMovementBaseline: null,
    dailyCheckIn: {
      streakDays: 0,
      lastDate: null,
      hasToday: false,
      last14Days: [],
      today,
    },
    phase2: {
      daysCompleted: 0,
      totalDays: PHASE2_TOTAL_DAYS,
      completed: false,
      nextDay: PHASE2_DAY_KEYS[0],
    },
    reminderSubscription: {
      hasActive: false,
      vapidPublicKey: null,
    },
  }
}

export function nextPhase2Day(completed: readonly Phase2DayKey[]): Phase2DayKey | null {
  for (const day of PHASE2_DAY_KEYS) {
    if (!completed.includes(day)) return day
  }
  return null
}
