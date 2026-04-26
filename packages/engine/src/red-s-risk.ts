export interface RedSRiskInputs {
  trainingHoursPerWeek: number
  proteinAdequacyRatio?: number
  recentWeightLossPct?: number
  missedPeriodsLast90Days?: number
  fatigueScore1To5?: number
  knownDeficienciesCount?: number
}

export function computeRedSRisk(input: RedSRiskInputs) {
  let score = 0
  if (input.trainingHoursPerWeek >= 10) score += 15
  if ((input.proteinAdequacyRatio ?? 1) < 0.75) score += 20
  if ((input.recentWeightLossPct ?? 0) >= 5) score += 20
  if ((input.missedPeriodsLast90Days ?? 0) >= 2) score += 25
  if ((input.fatigueScore1To5 ?? 1) >= 4) score += 10
  score += Math.min(10, (input.knownDeficienciesCount ?? 0) * 5)

  const riskScore = Math.min(100, score)
  const flag =
    riskScore >= 60 ? 'red' : riskScore >= 30 ? 'amber' : 'green'

  return { riskScore, flag }
}
