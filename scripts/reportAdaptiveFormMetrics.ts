import { createAdminClient } from '@/lib/supabase/admin'
import { getAdaptiveFormMetricsSnapshot } from '@/forms/reporting'
import type { AdaptiveEntryMode } from '@/forms/analytics'
import type { UserType } from '@/forms/types'

function argValue(flag: string) {
  const index = process.argv.indexOf(flag)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function hasFlag(flag: string) {
  return process.argv.includes(flag)
}

function toIsoDateRange(days: number) {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days)

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  }
}

function printBreakdown(title: string, rows: Array<{ key: string; opens: number; completionRatePct: number }>) {
  if (!rows.length) return

  console.log(`${title}:`)
  rows.forEach((row) => {
    console.log(`  - ${row.key}: ${row.opens} opens, ${row.completionRatePct}% completion`)
  })
}

async function main() {
  const role = argValue('--role') as UserType | undefined
  const flowId = argValue('--flow')
  const entryMode = argValue('--entry-mode') as AdaptiveEntryMode | undefined
  const from = argValue('--from')
  const to = argValue('--to')
  const days = Number(argValue('--days') ?? '14')
  const format = hasFlag('--json') ? 'json' : 'text'
  const dateRange = from || to ? { from, to } : toIsoDateRange(Number.isFinite(days) ? days : 14)

  const snapshot = await getAdaptiveFormMetricsSnapshot({
    supabase: createAdminClient(),
    filters: {
      from: dateRange.from,
      to: dateRange.to,
      role,
      flowId,
      entryMode,
    },
  })

  if (format === 'json') {
    console.log(JSON.stringify(snapshot, null, 2))
    return
  }

  console.log('Adaptive Form Metrics')
  console.log(`Window: ${snapshot.filters.from ?? 'all time'} -> ${snapshot.filters.to ?? 'now'}`)
  if (role) console.log(`Role: ${role}`)
  if (flowId) console.log(`Flow: ${flowId}`)
  if (entryMode) console.log(`Entry mode: ${entryMode}`)
  console.log(`Events: ${snapshot.totalEvents}`)
  console.log(`Sessions: ${snapshot.totalSessions}`)
  console.log('')
  console.log('Overall')
  console.log(`  Completion: ${snapshot.overall.completions}/${snapshot.overall.opens} (${snapshot.overall.completionRatePct}%)`)
  console.log(
    `  Completion speed: median ${snapshot.overall.medianCompletionSeconds ?? 'n/a'}s, p75 ${snapshot.overall.p75CompletionSeconds ?? 'n/a'}s`
  )
  console.log(
    `  Enrichment: ${snapshot.overall.enrichmentOpens} opens, ${snapshot.overall.enrichmentCompletionRatePct}% completion`
  )
  console.log(
    `  Next-question resolution: ${snapshot.overall.resolvedQuestionSessions}/${snapshot.overall.trackedQuestionSessions} sessions (${snapshot.overall.trackedQuestionResolutionRatePct}%)`
  )
  console.log(
    `  Resolution yield: ${snapshot.overall.totalResolvedQuestions}/${snapshot.overall.totalTrackedQuestions} questions (${snapshot.overall.questionResolutionYieldPct}%)`
  )
  console.log(
    `  Friction depth: avg ${snapshot.overall.averageStepViews ?? 'n/a'} step views, ${snapshot.overall.averageStepCompletions ?? 'n/a'} step completions`
  )
  printBreakdown('  Entry sources', snapshot.overall.entrySourceBreakdown)
  printBreakdown('  Entry modes', snapshot.overall.entryModeBreakdown)

  if (snapshot.flows.length) {
    console.log('')
    console.log('By Flow')
    snapshot.flows.forEach((flowMetrics) => {
      console.log(
        `  - ${flowMetrics.role}/${flowMetrics.flowId}: ${flowMetrics.completions}/${flowMetrics.opens} complete (${flowMetrics.completionRatePct}%), median ${flowMetrics.medianCompletionSeconds ?? 'n/a'}s, next-question yield ${flowMetrics.questionResolutionYieldPct}%`
      )
    })
  }
}

void main()
