export function cooperVO2max(distanceMeters12min: number) {
  return Math.round(((distanceMeters12min - 504.9) / 44.73) * 10) / 10
}

export function vdotEstimate(raceMeters: number, raceSeconds: number) {
  const velocityMetersPerSecond = raceMeters / raceSeconds
  const minutes = raceSeconds / 60
  const percentMax =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * minutes) +
    0.2989558 * Math.exp(-0.1932605 * minutes)
  const vo2 =
    -4.6 +
    0.182258 * velocityMetersPerSecond * 60 +
    0.000104 * Math.pow(velocityMetersPerSecond * 60, 2)

  return Math.round((vo2 / percentMax) * 10) / 10
}

export function restingHrVO2max(restingHeartRate: number, age: number) {
  const estimatedMaxHeartRate = 208 - 0.7 * age
  return Math.round((estimatedMaxHeartRate / restingHeartRate) * 15.3 * 10) / 10
}
