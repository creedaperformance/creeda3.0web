import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { calculateLoadScore, getReadinessFromLog } from '@/lib/analytics'

type SupabaseLike = SupabaseClient

export interface AthleteMonthlyReportRow {
  id: string
  logDate: string
  readiness: number
  plannedTraining: string
  load: number
  painLevel: number
}

export interface AthleteMonthlyReportSnapshot {
  startDate: string
  endDate: string
  periodLabel: string
  reportedDays: number
  consistencyScore: number
  averageReadiness: number
  macroLoadAU: number
  warnings: string[]
  rows: AthleteMonthlyReportRow[]
}

export async function getAthleteMonthlyReportSnapshot(
  supabase: SupabaseLike,
  athleteId: string
): Promise<AthleteMonthlyReportSnapshot> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - 28)

  const [{ data: diagnostic }, { data: logs }] = await Promise.all([
    supabase.from('diagnostics').select('*').eq('athlete_id', athleteId).maybeSingle(),
    supabase
      .from('daily_load_logs')
      .select('*')
      .eq('athlete_id', athleteId)
      .gte('log_date', startDate.toISOString().split('T')[0])
      .lte('log_date', endDate.toISOString().split('T')[0])
      .order('log_date', { ascending: true }),
  ])

  const rows = (Array.isArray(logs) ? logs : []).map((log) => ({
    id: String(log.id || ''),
    logDate: String(log.log_date || ''),
    readiness: getReadinessFromLog(log, diagnostic),
    plannedTraining: String(log.planned_training || 'Rest'),
    load: calculateLoadScore(log.training_duration, log.session_rpe),
    painLevel: Number(log.current_pain_level || 0),
  }))

  const reportedDays = rows.length
  const consistencyScore = Math.round((reportedDays / 28) * 100)

  let aggregateLoad = 0
  let totalReadiness = 0
  let poorSleepConsecutive = 0
  let highestPain = 0
  const warnings: string[] = []
  const painLocations = new Set<string>()

  ;(Array.isArray(logs) ? logs : []).forEach((log) => {
    const load = calculateLoadScore(log.training_duration, log.session_rpe)
    const readiness = getReadinessFromLog(log, diagnostic)

    aggregateLoad += load
    totalReadiness += readiness

    if (log.sleep_hours === '<5' || Number(log.sleep_quality || 0) <= 2) {
      poorSleepConsecutive += 1
      if (poorSleepConsecutive === 3) {
        warnings.push(
          'Sustained Sleep Debt: Poor sleep or under 5 hours for 3+ consecutive days detected.'
        )
      }
    } else {
      poorSleepConsecutive = 0
    }

    const painLevel = Number(log.current_pain_level || 0)
    if (painLevel > highestPain) highestPain = painLevel
    if (painLevel > 6 && !warnings.some((warning) => warning.includes('High Pain Event'))) {
      warnings.push(`High Pain Event: Severity ${painLevel}/10 recorded.`)
    }

    if (Array.isArray(log.pain_location)) {
      log.pain_location.forEach((location: string) => painLocations.add(location))
    }
  })

  if (painLocations.size > 0) {
    warnings.push(`Chronic Loading Areas: ${Array.from(painLocations).join(', ')}`)
  }

  if (consistencyScore < 60) {
    warnings.push(
      `Low Compliance: Logged only ${consistencyScore}% of days. Consistency is key for accurate physiological modeling.`
    )
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    periodLabel: `${startDate.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    })} - ${endDate.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`,
    reportedDays,
    consistencyScore,
    averageReadiness: reportedDays > 0 ? Math.round(totalReadiness / reportedDays) : 0,
    macroLoadAU: Math.round(aggregateLoad || 0),
    warnings,
    rows,
  }
}
