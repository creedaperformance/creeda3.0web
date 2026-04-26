import type { AcwrZone } from './acwr-calculator'
import type { computeConfidence } from './confidence-tier'

export interface ReadinessInputs {
  subjective: { energy: number; body_feel: number; mental_load: number }
  hrv?: { today: number; baseline_14d: number }
  sleep?: { hours: number; quality: number }
  acwr?: { ratio: number; zone: AcwrZone }
  daysSinceHardSession?: number
  movementQualityLatest?: number
  envModifier?: number
  confidence: ReturnType<typeof computeConfidence>
}

export interface ReadinessResult {
  score: number
  drivers: { name: string; contribution: number; explanation: string }[]
  missing: string[]
  directive: string
  confidence: { tier: string; pct: number }
}

export function computeReadiness(input: ReadinessInputs): ReadinessResult {
  const drivers: ReadinessResult['drivers'] = []
  const missing: string[] = []

  const subjectiveAverage =
    (input.subjective.energy +
      input.subjective.body_feel +
      (6 - input.subjective.mental_load)) /
    3
  const subjectivePoints = (subjectiveAverage / 5) * 25
  drivers.push({
    name: 'Subjective wellness',
    contribution: subjectivePoints,
    explanation: `${subjectiveAverage.toFixed(1)}/5 average`,
  })

  let hrvPoints = 0
  if (input.hrv) {
    const delta = (input.hrv.today - input.hrv.baseline_14d) / input.hrv.baseline_14d
    hrvPoints = Math.max(0, Math.min(20, 10 + delta * 100))
    drivers.push({
      name: 'HRV vs baseline',
      contribution: hrvPoints,
      explanation: `${(delta * 100).toFixed(1)}% vs 14d avg`,
    })
  } else {
    missing.push('HRV (sync wearable or weekly camera-PPG)')
  }

  let sleepPoints = 0
  if (input.sleep) {
    const sleepScore = (Math.min(input.sleep.hours, 9) / 8) * (input.sleep.quality / 10)
    sleepPoints = sleepScore * 15
    drivers.push({
      name: 'Sleep',
      contribution: sleepPoints,
      explanation: `${input.sleep.hours}h, quality ${input.sleep.quality}/10`,
    })
  } else {
    missing.push('Sleep duration and quality')
  }

  let acwrPoints = 0
  if (input.acwr) {
    acwrPoints =
      input.acwr.zone === 'sweet_spot'
        ? 15
        : input.acwr.zone === 'undertraining'
          ? 9
          : input.acwr.zone === 'caution'
            ? 6
            : 0
    drivers.push({
      name: 'ACWR',
      contribution: acwrPoints,
      explanation: `Ratio ${input.acwr.ratio} (${input.acwr.zone.replace('_', ' ')})`,
    })
  } else {
    missing.push('Training load history (need 7+ days)')
  }

  let recoveryPoints = 0
  if (input.daysSinceHardSession !== undefined) {
    recoveryPoints = Math.min(10, input.daysSinceHardSession * 4)
    drivers.push({
      name: 'Recovery time',
      contribution: recoveryPoints,
      explanation: `${input.daysSinceHardSession} days since hard session`,
    })
  }

  let movementPoints = 0
  if (input.movementQualityLatest !== undefined) {
    movementPoints = (input.movementQualityLatest / 100) * 10
    drivers.push({
      name: 'Movement quality',
      contribution: movementPoints,
      explanation: `Latest scan ${input.movementQualityLatest}/100`,
    })
  } else {
    missing.push('Movement scan (overhead squat)')
  }

  const environmentalPoints = (input.envModifier ?? 1) * 5
  drivers.push({
    name: 'Environmental conditions',
    contribution: environmentalPoints,
    explanation: 'Heat / AQI / altitude factor',
  })

  const raw =
    subjectivePoints +
    hrvPoints +
    sleepPoints +
    acwrPoints +
    recoveryPoints +
    movementPoints +
    environmentalPoints
  const score = Math.round(raw * (input.confidence.pct / 100 * 0.6 + 0.4))
  const directive =
    score >= 80
      ? 'Systems primed. Push phase appropriate.'
      : score >= 60
        ? 'Body says steady. Match typical session intensity.'
        : score >= 40
          ? 'Guarded. Reduce planned volume by 30%, stay aerobic.'
          : 'Recovery priority. Active recovery only today.'

  return {
    score,
    drivers,
    missing,
    directive,
    confidence: { tier: input.confidence.tier, pct: input.confidence.pct },
  }
}
