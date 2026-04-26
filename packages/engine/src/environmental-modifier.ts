export interface EnvironmentalModifierInputs {
  heatIndexC?: number
  aqi?: number
  altitudeMeters?: number
}

export function computeEnvironmentalModifier(input: EnvironmentalModifierInputs) {
  let modifier = 1

  if ((input.heatIndexC ?? 0) >= 38) modifier -= 0.15
  else if ((input.heatIndexC ?? 0) >= 32) modifier -= 0.08

  if ((input.aqi ?? 0) >= 200) modifier -= 0.15
  else if ((input.aqi ?? 0) >= 100) modifier -= 0.07

  if ((input.altitudeMeters ?? 0) >= 2000) modifier -= 0.08

  return Math.max(0.7, Math.min(1.1, Number(modifier.toFixed(2))))
}
