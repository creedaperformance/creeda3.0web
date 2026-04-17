import { getCompletionPercentage, getMissingCriticalFields } from '@/forms/engine/progressiveProfiler'
import type { ConfidenceResult, ProgressiveProfileState } from '@/forms/types'

export interface ConfidenceInput extends ProgressiveProfileState {
  consistencyScore?: number
  inferredFieldCount?: number
  totalFieldCount?: number
  consecutiveLowSignalDays?: number
}

export function calculateConfidence(input: ConfidenceInput): ConfidenceResult {
  const completionScore = getCompletionPercentage(input)
  const criticalMissing = getMissingCriticalFields(input)
  const consistencyScore = input.consistencyScore ?? 80
  const inferredRatio =
    input.totalFieldCount && input.totalFieldCount > 0
      ? (input.inferredFieldCount ?? 0) / input.totalFieldCount
      : 0

  let score = completionScore * 0.55 + consistencyScore * 0.35 + (1 - inferredRatio) * 100 * 0.1
  score -= criticalMissing.length * 10
  score -= Math.min(12, (input.consecutiveLowSignalDays ?? 0) * 3)
  score = Math.max(0, Math.min(100, Math.round(score)))

  const recommendations: string[] = []

  if (criticalMissing.length > 0) {
    recommendations.push(
      `Complete ${criticalMissing.map((field) => field.label).slice(0, 2).join(' and ')} to improve accuracy.`
    )
  }

  if (completionScore < 70) {
    recommendations.push('Finish one more profile screen to reduce default assumptions.')
  }

  if (consistencyScore < 70) {
    recommendations.push('Log for 3 straight days to stabilize readiness confidence.')
  }

  if (inferredRatio > 0.35) {
    recommendations.push('Replace inferred values with direct inputs when prompted.')
  }

  const level = score >= 80 ? 'high' : score >= 55 ? 'medium' : 'low'

  return {
    score,
    level,
    recommendations,
  }
}

