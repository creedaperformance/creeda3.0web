import type { AdaptiveEntryMode, AdaptiveFormEventName } from '@/forms/analytics'
import type { FlowKind, UserType } from '@/forms/types'

const ADAPTIVE_FORM_EVENTS_TABLE = 'adaptive_form_events'

type SupabaseLike = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any
}

type RawAdaptiveFormEvent = {
  role: UserType
  flow_id: string
  flow_kind: FlowKind | null
  session_id: string
  event_name: AdaptiveFormEventName
  entry_mode: AdaptiveEntryMode | null
  entry_source: string | null
  question_id: string | null
  created_at: string
  event_properties: Record<string, unknown> | null
}

interface SessionAggregate {
  role: UserType
  flowId: string
  flowKind: FlowKind | null
  sessionId: string
  opened: boolean
  completed: boolean
  enrichmentOpened: boolean
  entryMode: AdaptiveEntryMode | 'unknown'
  entrySource: string
  durationSeconds: number | null
  stepViews: number | null
  stepCompletions: number | null
  trackedQuestionCount: number
  resolvedQuestionIds: Set<string>
}

export interface AdaptiveMetricsFilters {
  from?: string
  to?: string
  role?: UserType
  flowId?: string
  entryMode?: AdaptiveEntryMode
}

export interface AdaptiveMetricsBreakdownRow {
  key: string
  opens: number
  completions: number
  completionRatePct: number
}

export interface AdaptiveFlowMetrics {
  role: UserType | 'all'
  flowId: string | 'all'
  flowKind: FlowKind | 'mixed'
  opens: number
  completions: number
  completionRatePct: number
  medianCompletionSeconds: number | null
  p75CompletionSeconds: number | null
  averageStepViews: number | null
  averageStepCompletions: number | null
  enrichmentOpens: number
  enrichmentCompletionRatePct: number
  trackedQuestionSessions: number
  resolvedQuestionSessions: number
  trackedQuestionResolutionRatePct: number
  totalTrackedQuestions: number
  totalResolvedQuestions: number
  questionResolutionYieldPct: number
  entrySourceBreakdown: AdaptiveMetricsBreakdownRow[]
  entryModeBreakdown: AdaptiveMetricsBreakdownRow[]
}

export interface AdaptiveMetricsSnapshot {
  generatedAt: string
  filters: AdaptiveMetricsFilters
  totalEvents: number
  totalSessions: number
  overall: AdaptiveFlowMetrics
  flows: AdaptiveFlowMetrics[]
}

function asObject(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function round(value: number) {
  return Number(value.toFixed(1))
}

function toPercent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0
  return round((numerator / denominator) * 100)
}

function percentile(values: number[], percentileRank: number) {
  if (!values.length) return null
  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentileRank / 100) * sorted.length) - 1))
  return round(sorted[index])
}

function average(values: number[]) {
  if (!values.length) return null
  return round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function buildMetricsRow(args: {
  role: UserType | 'all'
  flowId: string | 'all'
  flowKind: FlowKind | 'mixed'
  sessions: SessionAggregate[]
}): AdaptiveFlowMetrics {
  const { role, flowId, flowKind, sessions } = args
  const openedSessions = sessions.filter((session) => session.opened)
  const completedSessions = openedSessions.filter((session) => session.completed)
  const enrichmentSessions = openedSessions.filter((session) => session.enrichmentOpened)
  const trackedSessions = openedSessions.filter((session) => session.trackedQuestionCount > 0)
  const resolvedSessions = trackedSessions.filter((session) => session.resolvedQuestionIds.size > 0)
  const completionDurations = completedSessions
    .map((session) => session.durationSeconds)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  const stepViews = completedSessions
    .map((session) => session.stepViews)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  const stepCompletions = completedSessions
    .map((session) => session.stepCompletions)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

  const sourceMap = new Map<string, { opens: number; completions: number }>()
  const modeMap = new Map<string, { opens: number; completions: number }>()

  openedSessions.forEach((session) => {
    const sourceBucket = sourceMap.get(session.entrySource) ?? { opens: 0, completions: 0 }
    sourceBucket.opens += 1
    if (session.completed) sourceBucket.completions += 1
    sourceMap.set(session.entrySource, sourceBucket)

    const modeBucket = modeMap.get(session.entryMode) ?? { opens: 0, completions: 0 }
    modeBucket.opens += 1
    if (session.completed) modeBucket.completions += 1
    modeMap.set(session.entryMode, modeBucket)
  })

  const totalTrackedQuestions = trackedSessions.reduce((sum, session) => sum + session.trackedQuestionCount, 0)
  const totalResolvedQuestions = trackedSessions.reduce((sum, session) => sum + session.resolvedQuestionIds.size, 0)

  return {
    role,
    flowId,
    flowKind,
    opens: openedSessions.length,
    completions: completedSessions.length,
    completionRatePct: toPercent(completedSessions.length, openedSessions.length),
    medianCompletionSeconds: percentile(completionDurations, 50),
    p75CompletionSeconds: percentile(completionDurations, 75),
    averageStepViews: average(stepViews),
    averageStepCompletions: average(stepCompletions),
    enrichmentOpens: enrichmentSessions.length,
    enrichmentCompletionRatePct: toPercent(
      enrichmentSessions.filter((session) => session.completed).length,
      enrichmentSessions.length
    ),
    trackedQuestionSessions: trackedSessions.length,
    resolvedQuestionSessions: resolvedSessions.length,
    trackedQuestionResolutionRatePct: toPercent(resolvedSessions.length, trackedSessions.length),
    totalTrackedQuestions,
    totalResolvedQuestions,
    questionResolutionYieldPct: toPercent(totalResolvedQuestions, totalTrackedQuestions),
    entrySourceBreakdown: [...sourceMap.entries()]
      .map(([key, value]) => ({
        key,
        opens: value.opens,
        completions: value.completions,
        completionRatePct: toPercent(value.completions, value.opens),
      }))
      .sort((left, right) => right.opens - left.opens),
    entryModeBreakdown: [...modeMap.entries()]
      .map(([key, value]) => ({
        key,
        opens: value.opens,
        completions: value.completions,
        completionRatePct: toPercent(value.completions, value.opens),
      }))
      .sort((left, right) => right.opens - left.opens),
  }
}

function aggregateAdaptiveEvents(events: RawAdaptiveFormEvent[]) {
  const sessionMap = new Map<string, SessionAggregate>()

  events.forEach((event) => {
    const sessionKey = `${event.role}:${event.flow_id}:${event.session_id}`
    const properties = asObject(event.event_properties)
    const trackedQuestionCount =
      asNumber(properties.trackedQuestionCount) ??
      (Array.isArray(properties.trackedQuestionIds) ? properties.trackedQuestionIds.length : 0)
    const entrySource = event.entry_source ?? 'direct'
    const entryMode = event.entry_mode ?? 'unknown'
    const aggregate =
      sessionMap.get(sessionKey) ??
      {
        role: event.role,
        flowId: event.flow_id,
        flowKind: event.flow_kind,
        sessionId: event.session_id,
        opened: false,
        completed: false,
        enrichmentOpened: false,
        entryMode,
        entrySource,
        durationSeconds: null,
        stepViews: null,
        stepCompletions: null,
        trackedQuestionCount: 0,
        resolvedQuestionIds: new Set<string>(),
      }

    aggregate.entrySource = entrySource
    aggregate.entryMode = entryMode
    aggregate.flowKind = event.flow_kind ?? aggregate.flowKind
    aggregate.trackedQuestionCount = Math.max(aggregate.trackedQuestionCount, trackedQuestionCount)

    if (event.event_name === 'adaptive_form_opened') {
      aggregate.opened = true
    }

    if (event.event_name === 'adaptive_enrichment_opened') {
      aggregate.enrichmentOpened = true
    }

    if (event.event_name === 'adaptive_next_question_resolved' && event.question_id) {
      aggregate.resolvedQuestionIds.add(event.question_id)
    }

    if (event.event_name === 'adaptive_form_completed') {
      aggregate.completed = true
      const durationMs = asNumber(properties.durationMs)
      aggregate.durationSeconds = durationMs !== null ? round(durationMs / 1000) : aggregate.durationSeconds
      aggregate.stepViews = asNumber(properties.stepViews) ?? aggregate.stepViews
      aggregate.stepCompletions = asNumber(properties.stepCompletions) ?? aggregate.stepCompletions
    }

    sessionMap.set(sessionKey, aggregate)
  })

  const sessions = [...sessionMap.values()]
  const flowMap = new Map<string, SessionAggregate[]>()

  sessions.forEach((session) => {
    const groupKey = `${session.role}:${session.flowId}`
    const group = flowMap.get(groupKey) ?? []
    group.push(session)
    flowMap.set(groupKey, group)
  })

  const flows = [...flowMap.entries()]
    .map(([groupKey, groupSessions]) => {
      const [role, flowId] = groupKey.split(':')
      const kinds = new Set(groupSessions.map((session) => session.flowKind).filter(Boolean))

      return buildMetricsRow({
        role: role as UserType,
        flowId,
        flowKind: kinds.size === 1 ? (groupSessions[0]?.flowKind ?? 'mixed') : 'mixed',
        sessions: groupSessions,
      })
    })
    .sort((left, right) => right.opens - left.opens)

  const overallKinds = new Set(sessions.map((session) => session.flowKind).filter(Boolean))

  return {
    totalSessions: sessions.length,
    overall: buildMetricsRow({
      role: 'all',
      flowId: 'all',
      flowKind: overallKinds.size === 1 ? (sessions[0]?.flowKind ?? 'mixed') : 'mixed',
      sessions,
    }),
    flows,
  }
}

export async function getAdaptiveFormMetricsSnapshot(args: {
  supabase: SupabaseLike
  filters?: AdaptiveMetricsFilters
}): Promise<AdaptiveMetricsSnapshot> {
  const { supabase, filters = {} } = args
  let query = supabase
    .from(ADAPTIVE_FORM_EVENTS_TABLE)
    .select(
      'role, flow_id, flow_kind, session_id, event_name, entry_mode, entry_source, question_id, created_at, event_properties'
    )
    .order('created_at', { ascending: true })

  if (filters.from) {
    query = query.gte('created_at', filters.from)
  }

  if (filters.to) {
    query = query.lte('created_at', filters.to)
  }

  if (filters.role) {
    query = query.eq('role', filters.role)
  }

  if (filters.flowId) {
    query = query.eq('flow_id', filters.flowId)
  }

  if (filters.entryMode) {
    query = query.eq('entry_mode', filters.entryMode)
  }

  const { data, error } = await query

  if (error) {
    console.warn('[adaptive-forms] failed to query adaptive form metrics', error)
    return {
      generatedAt: new Date().toISOString(),
      filters,
      totalEvents: 0,
      totalSessions: 0,
      overall: buildMetricsRow({
        role: 'all',
        flowId: 'all',
        flowKind: 'mixed',
        sessions: [],
      }),
      flows: [],
    }
  }

  const rows = Array.isArray(data) ? (data as RawAdaptiveFormEvent[]) : []
  const aggregated = aggregateAdaptiveEvents(rows)

  return {
    generatedAt: new Date().toISOString(),
    filters,
    totalEvents: rows.length,
    totalSessions: aggregated.totalSessions,
    overall: aggregated.overall,
    flows: aggregated.flows,
  }
}
