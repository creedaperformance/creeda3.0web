export interface LoadEntry {
  date: string
  load_au: number
}

export type AcwrZone = 'undertraining' | 'sweet_spot' | 'caution' | 'danger'

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function daysAgo(today: Date, days: number) {
  const next = startOfDay(today)
  next.setDate(next.getDate() - days)
  return next
}

export function computeACWR(entries: LoadEntry[], today: Date = new Date()): {
  acuteAU: number
  chronicAU: number
  ratio: number
  zone: AcwrZone
} {
  const sevenDaysAgo = daysAgo(today, 7)
  const twentyEightDaysAgo = daysAgo(today, 28)

  const acuteAU = entries
    .filter((entry) => startOfDay(new Date(entry.date)) >= sevenDaysAgo)
    .reduce((sum, entry) => sum + entry.load_au, 0)

  const chronicTotal = entries
    .filter((entry) => startOfDay(new Date(entry.date)) >= twentyEightDaysAgo)
    .reduce((sum, entry) => sum + entry.load_au, 0)

  const chronicAU = chronicTotal / 4
  const ratio = chronicAU > 0 ? acuteAU / chronicAU : 0
  const roundedRatio = Number(ratio.toFixed(2))
  const zone: AcwrZone =
    roundedRatio < 0.8
      ? 'undertraining'
      : roundedRatio <= 1.3
        ? 'sweet_spot'
        : roundedRatio <= 1.5
          ? 'caution'
          : 'danger'

  return { acuteAU, chronicAU, ratio: roundedRatio, zone }
}
