'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ArrowRight,
  Brain,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  HeartPulse,
  History,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Target,
  Timer,
  Upload,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'

import { DashboardLayout } from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import {
  analyzeBreathingRecoveryInput,
  analyzeObjectiveVideoProtocol,
  type ObjectiveProtocolAnalysisResult,
} from '@/lib/objective-tests/analysis'
import { computeObjectiveBaselines } from '@/lib/objective-tests/baselines'
import { getObjectiveCadenceDecision } from '@/lib/objective-tests/cadence'
import { getProtocolsForRole } from '@/lib/objective-tests/protocols'
import {
  buildObjectiveMeasurementRows,
  formatObjectiveMetricValue,
  groupSessionsByProtocol,
  summarizeObjectiveSignals,
  normalizeObjectiveTestSession,
  type ObjectiveTestSessionInsert,
} from '@/lib/objective-tests/store'
import {
  calculateReactionTapSummary,
  REACTION_TAP_ACCEPTED_TRIALS,
  REACTION_TAP_PROTOCOL_VERSION,
} from '@/lib/objective-tests/reaction'
import type {
  ObjectiveSignalSummary,
  ObjectiveTestMeasurement,
  ObjectiveTestProtocolDefinition,
  ObjectiveTestRole,
  ObjectiveTestSession,
  ObjectiveTestType,
  ObjectiveValidityStatus,
} from '@/lib/objective-tests/types'

type TestPhase = 'idle' | 'waiting' | 'active' | 'feedback' | 'false_start' | 'complete'

interface ObjectiveTestingLabProps {
  role: ObjectiveTestRole
  profile: { email?: string | null } | null
  initialSessions: ObjectiveTestSession[]
}

type FileMap = Partial<Record<string, File | null>>
type AnalysisMap = Partial<Record<string, ObjectiveProtocolAnalysisResult>>

export function ObjectiveTestingLab({
  role,
  profile,
  initialSessions,
}: ObjectiveTestingLabProps) {
  const protocols = useMemo(() => getProtocolsForRole(role), [role])
  const [sessions, setSessions] = useState<ObjectiveTestSession[]>(initialSessions)
  const [selectedProtocolId, setSelectedProtocolId] = useState<ObjectiveTestType>('reaction_tap')

  const dashboardHref = role === 'athlete' ? '/athlete/dashboard' : '/individual/dashboard'
  const loggingHref = role === 'athlete' ? '/athlete/checkin' : '/individual/logging'
  const reviewHref = role === 'athlete' ? '/athlete/review' : '/individual/review'

  const baselines = useMemo(() => computeObjectiveBaselines(sessions), [sessions])
  const groupedSessions = useMemo(() => groupSessionsByProtocol(sessions), [sessions])
  const signalSummaries = useMemo(() => summarizeObjectiveSignals(sessions, baselines), [sessions, baselines])
  const selectedProtocol = protocols.find((protocol) => protocol.id === selectedProtocolId) || protocols[0] || null
  const selectedSignal = signalSummaries.find((signal) => signal.protocolId === selectedProtocolId) || null
  const selectedHistory = groupedSessions[selectedProtocolId] || []

  const persistSession = async (
    insert: ObjectiveTestSessionInsert,
    measurements: ObjectiveTestMeasurement[]
  ) => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Please sign in again to save the test.')
      return null
    }

    const { data, error } = await supabase
      .from('objective_test_sessions')
      .insert({
        ...insert,
        user_id: user.id,
      })
      .select('*')
      .single()

    if (error) {
      toast.error('Could not save the objective test', { description: error.message })
      return null
    }

    const normalized = normalizeObjectiveTestSession(data)
    if (!normalized) {
      toast.error('The saved objective test could not be normalized.')
      return null
    }

    if (measurements.length) {
      const measurementRows = buildObjectiveMeasurementRows(normalized.id, user.id, role, normalized.testType, measurements)
      const { error: measurementError } = await supabase
        .from('objective_test_measurements')
        .insert(measurementRows)

      if (measurementError) {
        toast.error('The session was saved, but metric details could not be attached.', {
          description: measurementError.message,
        })
      }
    }

    setSessions((current) => [normalized, ...current.filter((item) => item.id !== normalized.id)].slice(0, 64))
    return normalized
  }

  return (
    <DashboardLayout type={role} user={profile}>
      <div className="space-y-8 pb-20">
        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <SurfacePanel className="p-8 sm:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,124,0,0.18),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_36%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                <Brain className="h-3.5 w-3.5" />
                AI-Powered objective testing
              </div>

              <h1 className="mt-6 text-4xl font-black tracking-tight text-white leading-[0.95] sm:text-5xl">
                Measured signals,
                <span className="block text-primary">without expensive hardware.</span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-300/80 sm:text-base">
                CREEDA now runs AI-assisted testing across sharpness, balance, recovery, landing control, mobility,
                and pilot speed workflows. Every protocol stays optional. Only clean, recent, high-confidence signals
                earn influence inside the decision layer.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <CompactStat
                  label="Protocols"
                  value={`${protocols.length} active`}
                  detail="Built as one shared platform, not a pile of one-off tests."
                />
                <CompactStat
                  label="Measured Signals"
                  value={signalSummaries.length ? `${signalSummaries.length}` : 'None yet'}
                  detail="Fresh, valid signals show up here and later feed dashboards and reviews."
                />
                <CompactStat
                  label="Current Focus"
                  value={selectedSignal?.displayName || selectedProtocol?.displayName || 'Choose a protocol'}
                  detail={selectedSignal?.summary || 'Select a protocol to see setup, AI capture rules, and history.'}
                />
              </div>
            </div>
          </SurfacePanel>

          <SurfacePanel className="p-8 sm:p-9">
            <div className="relative flex h-full flex-col justify-between gap-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Recommended Today</p>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
                  Pick one signal that adds clarity, not noise
                </h2>
                <div className="mt-6 space-y-3">
                  {protocols.slice(0, 3).map((protocol) => {
                    const cadence = getObjectiveCadenceDecision({
                      protocolId: protocol.id,
                      recentSessions: groupedSessions[protocol.id] || [],
                    })
                    return (
                      <div
                        key={protocol.id}
                        className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-white">{protocol.displayName}</p>
                            <p className="mt-2 text-xs leading-relaxed text-slate-400">{cadence.reason}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${getCadenceClasses(cadence.state)}`}>
                            {cadence.state.replaceAll('_', ' ')}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SnapshotTile icon={Camera} label="AI pose tests" value={String(protocols.filter((item) => item.analysisMode === 'ai_pose').length)} />
                <SnapshotTile icon={HeartPulse} label="Recovery fusion" value="1" />
                <SnapshotTile icon={ShieldCheck} label="Optional" value="Always" />
                <SnapshotTile icon={Timer} label="Fastest test" value="2 min" />
              </div>
            </div>
          </SurfacePanel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SurfacePanel className="p-6 sm:p-8">
            <div className="relative">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Protocol Hub</p>
              </div>
              <div className="mt-6 space-y-3">
                {protocols.map((protocol) => {
                  const cadence = getObjectiveCadenceDecision({
                    protocolId: protocol.id,
                    recentSessions: groupedSessions[protocol.id] || [],
                  })
                  const signal = signalSummaries.find((item) => item.protocolId === protocol.id) || null

                  return (
                    <button
                      key={protocol.id}
                      type="button"
                      onClick={() => setSelectedProtocolId(protocol.id)}
                      className={`w-full rounded-3xl border p-4 text-left transition-all ${
                        selectedProtocolId === protocol.id
                          ? 'border-primary/50 bg-primary/10 shadow-[0_0_30px_rgba(245,124,0,0.12)]'
                          : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-white">{protocol.displayName}</p>
                            <span className="rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-300">
                              {protocol.analysisMode.replaceAll('_', ' ')}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-slate-400">{protocol.shortDescription}</p>
                        </div>
                        <ChevronRight className="mt-0.5 h-4 w-4 text-slate-500" />
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <MiniStat label="Duration" value={`${protocol.estimatedDurationMinutes} min`} />
                        <MiniStat label="Load" value={protocol.estimatedLoad.replace('_', ' ')} />
                        <MiniStat label="Last signal" value={signal?.formattedHeadline || 'None'} />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${getCadenceClasses(cadence.state)}`}>
                          {cadence.state.replaceAll('_', ' ')}
                        </span>
                        {signal && (
                          <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${getFreshnessClasses(signal.freshness)}`}>
                            {signal.freshness}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </SurfacePanel>

          <div className="space-y-6">
            {selectedProtocol && (
              <ProtocolWorkspace
                key={selectedProtocol.id}
                role={role}
                protocol={selectedProtocol}
                signal={selectedSignal}
                history={selectedHistory}
                onSave={persistSession}
              />
            )}

            <SurfacePanel className="p-8 sm:p-9">
              <div className="relative">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Recent Sessions</p>
                </div>

                <div className="mt-6 space-y-3">
                  {selectedHistory.length === 0 ? (
                    <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5">
                      <p className="text-sm leading-relaxed text-slate-400">
                        No saved {selectedProtocol?.displayName.toLowerCase()} sessions yet. The first session will appear
                        here with headline metric, confidence, and quality notes.
                      </p>
                    </div>
                  ) : (
                    selectedHistory.slice(0, 6).map((session) => (
                      <div key={session.id} className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-white">
                              {formatObjectiveMetricValue(
                                session.headlineMetricValue ?? session.validatedScoreMs,
                                session.headlineMetricUnit || (session.validatedScoreMs ? 'ms' : ''),
                                session.headlineMetricUnit === 'bw/s' ? 2 : 0
                              )}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {formatSessionDate(session.completedAt)} • {session.classification || 'Unclassified'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Confidence</p>
                            <p className="mt-1 text-sm font-bold text-white">
                              {session.confidenceScore ? `${Math.round(session.confidenceScore * 100)}%` : '--'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <HistoryStat
                            label="Quality"
                            value={session.captureQualityScore ? `${Math.round(session.captureQualityScore * 100)}%` : '--'}
                          />
                          <HistoryStat label="Validity" value={session.validityStatus.replaceAll('_', ' ')} />
                          <HistoryStat label="Samples" value={String(session.sampleCount || session.trialResults.length || '--')} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </SurfacePanel>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <QuickLinkCard href={loggingHref} title="Daily check-in" body="Compare how you feel against measured signals without making testing compulsory." />
          <QuickLinkCard href={reviewHref} title="Weekly review" body="Use fresh signals only when they add confidence to the weekly story." />
          <QuickLinkCard href={dashboardHref} title="Today dashboard" body="Bring these objective anchors back into the main decision layer." />
        </section>
      </div>
    </DashboardLayout>
  )
}

function ProtocolWorkspace({
  role,
  protocol,
  signal,
  history,
  onSave,
}: {
  role: ObjectiveTestRole
  protocol: ObjectiveTestProtocolDefinition
  signal: ObjectiveSignalSummary | null
  history: ObjectiveTestSession[]
  onSave: (insert: ObjectiveTestSessionInsert, measurements: ObjectiveTestMeasurement[]) => Promise<ObjectiveTestSession | null>
}) {
  return (
    <SurfacePanel className="p-8 sm:p-9">
      <div className="relative space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
              {protocol.heroLabel}
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">{protocol.displayName}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">{protocol.shortDescription}</p>
          </div>
          <div className="min-w-[220px] rounded-3xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Latest signal</p>
            <p className="mt-3 text-2xl font-black tracking-tight text-white">{signal?.formattedHeadline || 'Optional'}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{signal?.summary || 'No saved session yet for this protocol.'}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <InfoList title="When useful" items={protocol.whenUseful} />
          <InfoList title="When to skip" items={protocol.whenToSkip} warning />
          <InfoList title="AI setup rules" items={protocol.setupChecklist} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MiniInfo title="Capture mode" value={protocol.captureMode.replaceAll('_', ' ')} />
          <MiniInfo title="Estimated load" value={protocol.estimatedLoad.replaceAll('_', ' ')} />
          <MiniInfo title="History" value={history.length ? `${history.length} saved` : 'No saved sessions'} />
        </div>

        {protocol.id === 'reaction_tap' ? (
          <ReactionProtocolRunner role={role} protocol={protocol} history={history} onSave={onSave} />
        ) : protocol.id === 'breathing_recovery' ? (
          <BreathingProtocolRunner role={role} protocol={protocol} onSave={onSave} />
        ) : protocol.id === 'balance_single_leg' ? (
          <BalanceProtocolRunner role={role} protocol={protocol} onSave={onSave} />
        ) : protocol.id === 'mobility_battery' ? (
          <MobilityBatteryRunner role={role} protocol={protocol} onSave={onSave} />
        ) : (
          <VideoProtocolRunner role={role} protocol={protocol} onSave={onSave} />
        )}
      </div>
    </SurfacePanel>
  )
}

function ReactionProtocolRunner({
  role,
  protocol,
  history,
  onSave,
}: {
  role: ObjectiveTestRole
  protocol: ObjectiveTestProtocolDefinition
  history: ObjectiveTestSession[]
  onSave: (insert: ObjectiveTestSessionInsert, measurements: ObjectiveTestMeasurement[]) => Promise<ObjectiveTestSession | null>
}) {
  const [phase, setPhase] = useState<TestPhase>('idle')
  const [acceptedTrials, setAcceptedTrials] = useState<number[]>([])
  const [falseStarts, setFalseStarts] = useState(0)
  const [currentTrialMs, setCurrentTrialMs] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const reactionStartRef = useRef(0)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  const summary = useMemo(() => {
    if (acceptedTrials.length < REACTION_TAP_ACCEPTED_TRIALS) return null
    return calculateReactionTapSummary(acceptedTrials)
  }, [acceptedTrials])

  const previousSession = history[0] || null
  const sessionDelta =
    summary && previousSession?.validatedScoreMs
      ? summary.validatedScoreMs - previousSession.validatedScoreMs
      : null

  const resetProtocol = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    setPhase('idle')
    setAcceptedTrials([])
    setFalseStarts(0)
    setCurrentTrialMs(null)
    setSavedSessionId(null)
  }

  const startTrial = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    setCurrentTrialMs(null)
    setPhase('waiting')
    timeoutRef.current = window.setTimeout(() => {
      reactionStartRef.current = performance.now()
      setPhase('active')
    }, Math.random() * 2400 + 1800)
  }

  const handlePadTap = () => {
    if (phase === 'idle' || phase === 'feedback' || phase === 'false_start') {
      startTrial()
      return
    }

    if (phase === 'complete') {
      resetProtocol()
      return
    }

    if (phase === 'waiting') {
      setFalseStarts((current) => current + 1)
      setPhase('false_start')
      toast.error('False start', { description: 'Wait for the green signal before tapping.' })
      return
    }

    if (phase !== 'active') return

    const reactionMs = Math.max(0, Math.round(performance.now() - reactionStartRef.current - 15))
    const nextTrials = [...acceptedTrials, reactionMs]
    setAcceptedTrials(nextTrials)
    setCurrentTrialMs(reactionMs)

    if (nextTrials.length >= REACTION_TAP_ACCEPTED_TRIALS) {
      setPhase('complete')
      return
    }

    setPhase('feedback')
  }

  const handleSave = async () => {
    if (!summary || isSaving || savedSessionId) return
    setIsSaving(true)
    try {
      const metadata = getBrowserMetadata()
      const confidenceScore = clampNumber(
        0.88 - falseStarts * 0.05 - Math.max(summary.consistencyMs - 30, 0) / 120,
        0.35,
        0.95
      )
      const captureQualityScore = clampNumber(0.9 - falseStarts * 0.05, 0.45, 0.95)
      const validityStatus =
        summary.consistencyMs > 60 || falseStarts > 3 ? 'low_confidence' : 'accepted'

      const measurements: ObjectiveTestMeasurement[] = [
        {
          key: protocol.headlineMetric.key,
          label: protocol.headlineMetric.label,
          value: summary.validatedScoreMs,
          unit: 'ms',
          direction: 'lower_better',
          isHeadline: true,
        },
        { key: 'average_reaction_ms', label: 'Average reaction', value: summary.averageScoreMs, unit: 'ms', direction: 'lower_better' },
        { key: 'best_reaction_ms', label: 'Best tap', value: summary.bestScoreMs, unit: 'ms', direction: 'lower_better' },
        { key: 'consistency_ms', label: 'Consistency', value: summary.consistencyMs, unit: 'ms', direction: 'lower_better' },
      ]

      const saved = await onSave(
        {
          user_id: '',
          role,
          test_type: 'reaction_tap',
          family: protocol.family,
          protocol_version: REACTION_TAP_PROTOCOL_VERSION,
          source: 'phone_browser',
          capture_mode: protocol.captureMode,
          sample_count: acceptedTrials.length,
          false_start_count: falseStarts,
          average_score_ms: summary.averageScoreMs,
          validated_score_ms: summary.validatedScoreMs,
          best_score_ms: summary.bestScoreMs,
          consistency_ms: summary.consistencyMs,
          classification: summary.classification.label,
          headline_metric_key: protocol.headlineMetric.key,
          headline_metric_value: summary.validatedScoreMs,
          headline_metric_unit: 'ms',
          headline_metric_direction: 'lower_better',
          confidence_score: confidenceScore,
          capture_quality_score: captureQualityScore,
          validity_status: validityStatus,
          baseline_status: 'building',
          quality_flags:
            validityStatus === 'low_confidence'
              ? ['Consistency or false starts were higher than ideal.']
              : [],
          safety_flags: [],
          trial_results: acceptedTrials,
          results_json: {
            accepted_trials: acceptedTrials,
            false_starts: falseStarts,
          },
          metadata,
        },
        measurements
      )

      if (saved) {
        setSavedSessionId(saved.id)
        toast.success('Reaction session saved', {
          description: 'This sharpness anchor is now part of your objective history.',
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
      <div className="space-y-5">
        <button
          type="button"
          onClick={handlePadTap}
          className={`relative flex min-h-[340px] w-full flex-col items-center justify-center overflow-hidden rounded-[2.2rem] border-4 text-center transition-all duration-300 ${
            phase === 'idle'
              ? 'border-white/[0.08] bg-slate-950/70'
              : phase === 'waiting'
                ? 'border-rose-500 bg-rose-500/10 animate-pulse'
                : phase === 'active'
                  ? 'border-emerald-400 bg-emerald-500/25 shadow-[0_0_70px_rgba(16,185,129,0.22)] scale-[1.01]'
                  : phase === 'false_start'
                    ? 'border-red-400 bg-red-500/20'
                    : phase === 'complete'
                      ? 'border-primary/50 bg-primary/15'
                      : 'border-blue-400/40 bg-blue-500/10'
          }`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.14),transparent_58%)]" />
          <div className="relative z-10 px-6">
            {phase === 'idle' && (
              <>
                <Timer className="mx-auto h-16 w-16 text-slate-500" />
                <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  Tap to begin the protocol
                </p>
                <p className="mt-3 text-sm text-slate-500">
                  Five accepted trials are needed for one saved session.
                </p>
              </>
            )}

            {phase === 'waiting' && (
              <>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-rose-200">Wait for green</p>
                <p className="mt-4 text-4xl font-black tracking-tight text-white">Hold...</p>
              </>
            )}

            {phase === 'active' && (
              <>
                <Zap className="mx-auto h-20 w-20 animate-bounce text-white" />
                <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-50">Tap now</p>
                <p className="mt-4 text-4xl font-black tracking-tight text-white">GO</p>
              </>
            )}

            {phase === 'feedback' && (
              <>
                <CheckCircle2 className="mx-auto h-16 w-16 text-blue-300" />
                <p className="mt-6 text-5xl font-black tracking-tight text-white">{currentTrialMs}ms</p>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.24em] text-blue-200">
                  Trial {acceptedTrials.length} accepted
                </p>
                <p className="mt-4 text-sm text-slate-300">Tap again for the next trial.</p>
              </>
            )}

            {phase === 'false_start' && (
              <>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-red-100">False start</p>
                <p className="mt-4 text-4xl font-black tracking-tight text-white">Too early</p>
                <p className="mt-4 text-sm text-slate-200">Tap again when you are ready to restart the trial.</p>
              </>
            )}

            {phase === 'complete' && summary && (
              <>
                <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
                <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.24em] text-primary">Validated result</p>
                <p className="mt-4 text-5xl font-black tracking-tight text-white">{summary.validatedScoreMs}ms</p>
                <p className="mt-3 text-sm text-slate-200">{summary.classification.description}</p>
                <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  Tap the pad to retest from the beginning
                </p>
              </>
            )}
          </div>
        </button>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={resetProtocol}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-200 transition-all hover:bg-white/[0.06]"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset protocol
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!summary || isSaving || Boolean(savedSessionId)}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-black shadow-[0_0_28px_rgba(245,124,0,0.22)] disabled:opacity-50"
          >
            {isSaving ? <Activity className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {savedSessionId ? 'Saved to history' : 'Save sharpness session'}
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <SummaryMetric label="Accepted" value={`${acceptedTrials.length}/${REACTION_TAP_ACCEPTED_TRIALS}`} />
          <SummaryMetric label="False starts" value={String(falseStarts)} />
          <SummaryMetric label="Best tap" value={summary ? `${summary.bestScoreMs}ms` : currentTrialMs ? `${currentTrialMs}ms` : '--'} />
          <SummaryMetric label="Consistency" value={summary ? `${summary.consistencyMs}ms` : '--'} />
        </div>

        <ResultPanel
          title="Reaction result"
          description={
            summary
              ? summary.classification.description
              : 'Finish the five-tap protocol to generate a validated result and AI-assisted trend interpretation.'
          }
          classification={summary?.classification.label || null}
          metrics={
            summary
              ? [
                  { label: 'Validated', value: `${summary.validatedScoreMs}ms` },
                  { label: 'Average', value: `${summary.averageScoreMs}ms` },
                  { label: 'Vs latest saved', value: sessionDelta === null ? 'First live comparison' : `${sessionDelta > 0 ? '+' : ''}${sessionDelta}ms` },
                ]
              : []
          }
        />
      </div>
    </div>
  )
}

function BreathingProtocolRunner({
  role,
  protocol,
  onSave,
}: {
  role: ObjectiveTestRole
  protocol: ObjectiveTestProtocolDefinition
  onSave: (insert: ObjectiveTestSessionInsert, measurements: ObjectiveTestMeasurement[]) => Promise<ObjectiveTestSession | null>
}) {
  const [peakHr, setPeakHr] = useState('')
  const [hr60, setHr60] = useState('')
  const [breathlessness, setBreathlessness] = useState('0')
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [result, setResult] = useState<ObjectiveProtocolAnalysisResult | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const toggleSymptom = (label: string) => {
    setSymptoms((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label]
    )
  }

  const analyze = () => {
    const nextResult = analyzeBreathingRecoveryInput({
      peakHrBpm: peakHr ? Number(peakHr) : null,
      hr60Bpm: hr60 ? Number(hr60) : null,
      perceivedBreathlessnessDelta: breathlessness ? Number(breathlessness) : null,
      symptomFlags: symptoms,
    })
    setResult(nextResult)
  }

  const handleSave = async () => {
    if (!result || isSaving) return
    setIsSaving(true)
    try {
      const saved = await onSave(
        {
          user_id: '',
          role,
          test_type: 'breathing_recovery',
          family: protocol.family,
          protocol_version: result.protocolVersion,
          source: result.validityStatus === 'accepted' ? 'hybrid' : 'phone_browser',
          capture_mode: protocol.captureMode,
          headline_metric_key: result.headlineMetric.key,
          headline_metric_value: result.headlineMetric.value,
          headline_metric_unit: result.headlineMetric.unit,
          headline_metric_direction: result.headlineMetric.direction,
          confidence_score: result.confidenceScore,
          capture_quality_score: result.captureQualityScore,
          validity_status: result.validityStatus,
          baseline_status: result.validityStatus === 'accepted' ? 'building' : 'building',
          classification: result.classification,
          quality_flags: result.qualityFlags,
          safety_flags: result.safetyFlags,
          results_json: result.resultsJson,
          metadata: {
            ...getBrowserMetadata(),
            ...result.metadata,
          },
        },
        result.measurements
      )

      if (saved) {
        toast.success('Breathing recovery session saved', {
          description:
            result.validityStatus === 'accepted'
              ? 'This HR-backed recovery signal can now feed Creeda over time.'
              : 'This session was saved as supplemental because no HR source was attached.',
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
      <div className="space-y-4">
        <FormCard title="Guided recovery inputs" description="Attach heart-rate values if you want this protocol to influence decisions.">
          <Field label="Peak HR after effort">
            <input
              value={peakHr}
              onChange={(event) => setPeakHr(event.target.value)}
              inputMode="numeric"
              placeholder="e.g. 152"
              className={inputClasses}
            />
          </Field>
          <Field label="HR at 60 seconds">
            <input
              value={hr60}
              onChange={(event) => setHr60(event.target.value)}
              inputMode="numeric"
              placeholder="e.g. 126"
              className={inputClasses}
            />
          </Field>
          <Field label="Breathlessness change (0-10)">
            <input
              value={breathlessness}
              onChange={(event) => setBreathlessness(event.target.value)}
              inputMode="numeric"
              placeholder="e.g. 3"
              className={inputClasses}
            />
          </Field>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Symptoms or red flags</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['wheeze', 'dizziness', 'chest_pain', 'illness'].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleSymptom(label)}
                  className={`rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] ${
                    symptoms.includes(label)
                      ? 'bg-rose-500/20 text-rose-100 border border-rose-400/40'
                      : 'bg-white/[0.04] text-slate-300 border border-white/[0.08]'
                  }`}
                >
                  {label.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <button type="button" onClick={analyze} className={primaryButtonClasses}>
            <HeartPulse className="h-4 w-4" />
            Analyze recovery
          </button>
        </FormCard>
      </div>

      <div className="space-y-4">
        <ResultPanel
          title="Breathing recovery result"
          description={result?.summary || 'Run the guided recovery input flow to produce an AI-assisted recovery interpretation.'}
          classification={result?.classification || null}
          metrics={
            result
              ? result.measurements.slice(0, 3).map((measurement) => ({
                  label: measurement.label,
                  value: formatObjectiveMetricValue(measurement.value, measurement.unit, measurement.unit === 'pts' ? 0 : 0),
                }))
              : []
          }
          qualityFlags={result?.qualityFlags || []}
        />

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!result || isSaving}
          className={`${primaryButtonClasses} w-full justify-center disabled:opacity-50`}
        >
          {isSaving ? <Activity className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Save recovery session
        </button>
      </div>
    </div>
  )
}

function VideoProtocolRunner({
  role,
  protocol,
  onSave,
}: {
  role: ObjectiveTestRole
  protocol: ObjectiveTestProtocolDefinition
  onSave: (insert: ObjectiveTestSessionInsert, measurements: ObjectiveTestMeasurement[]) => Promise<ObjectiveTestSession | null>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<ObjectiveProtocolAnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleAnalyze = async () => {
    if (!file) return
    setIsAnalyzing(true)
    try {
      const result = await analyzeObjectiveVideoProtocol({
        protocolId: protocol.id as Exclude<ObjectiveTestType, 'reaction_tap' | 'breathing_recovery'>,
        file,
      })
      setAnalysis(result)
      toast.success(`${protocol.displayName} analyzed`, {
        description: result.summary,
      })
    } catch (error) {
      console.error(error)
      toast.error(`Could not analyze ${protocol.displayName.toLowerCase()}.`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSave = async () => {
    if (!analysis || isSaving) return
    setIsSaving(true)
    try {
      const saved = await onSave(
        {
          user_id: '',
          role,
          test_type: protocol.id,
          family: protocol.family,
          protocol_version: analysis.protocolVersion,
          source: 'camera_upload',
          capture_mode: protocol.captureMode,
          headline_metric_key: analysis.headlineMetric.key,
          headline_metric_value: analysis.headlineMetric.value,
          headline_metric_unit: analysis.headlineMetric.unit,
          headline_metric_direction: analysis.headlineMetric.direction,
          confidence_score: analysis.confidenceScore,
          capture_quality_score: analysis.captureQualityScore,
          validity_status: analysis.validityStatus,
          baseline_status: 'building',
          classification: analysis.classification,
          sample_count: analysis.sampleCount,
          quality_flags: analysis.qualityFlags,
          safety_flags: analysis.safetyFlags,
          results_json: analysis.resultsJson,
          metadata: {
            ...getBrowserMetadata(),
            ...analysis.metadata,
            file_name: file?.name || null,
          },
        },
        analysis.measurements
      )

      if (saved) {
        toast.success(`${protocol.displayName} session saved`, {
          description: 'This AI-powered clip is now part of your measured history.',
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
      <FormCard
        title="Upload or capture a clip"
        description="Use your phone camera if possible. On mobile, tapping upload should let you record directly."
      >
        <label className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/[0.12] bg-white/[0.03] px-6 py-10 text-center transition-all hover:bg-white/[0.05]">
          <Upload className="h-12 w-12 text-primary" />
          <p className="mt-5 text-sm font-bold text-white">
            {file ? file.name : `Choose a clip for ${protocol.displayName.toLowerCase()}`}
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
            Keep the full body visible, follow the setup rules above, and let CREEDA&apos;s pose AI score the movement.
          </p>
          <input
            type="file"
            accept="video/*"
            capture="environment"
            className="hidden"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </label>

        <button
          type="button"
          onClick={() => void handleAnalyze()}
          disabled={!file || isAnalyzing}
          className={`${primaryButtonClasses} disabled:opacity-50`}
        >
          {isAnalyzing ? <Activity className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {isAnalyzing ? 'Running AI analysis' : `Analyze ${protocol.displayName}`}
        </button>
      </FormCard>

      <div className="space-y-4">
        <ResultPanel
          title={`${protocol.displayName} result`}
          description={analysis?.summary || `Run ${protocol.displayName.toLowerCase()} through CREEDA's AI pose analysis to see the measured signal.`}
          classification={analysis?.classification || null}
          metrics={
            analysis
              ? analysis.measurements.slice(0, 4).map((measurement) => ({
                  label: measurement.label,
                  value: formatObjectiveMetricValue(measurement.value, measurement.unit, measurement.unit === 'bw/s' ? 2 : 0),
                }))
              : []
          }
          qualityFlags={analysis?.qualityFlags || []}
        />

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!analysis || isSaving}
          className={`${primaryButtonClasses} w-full justify-center disabled:opacity-50`}
        >
          {isSaving ? <Activity className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Save AI session
        </button>
      </div>
    </div>
  )
}

function BalanceProtocolRunner({
  role,
  protocol,
  onSave,
}: {
  role: ObjectiveTestRole
  protocol: ObjectiveTestProtocolDefinition
  onSave: (insert: ObjectiveTestSessionInsert, measurements: ObjectiveTestMeasurement[]) => Promise<ObjectiveTestSession | null>
}) {
  const [files, setFiles] = useState<{ left: File | null; right: File | null }>({ left: null, right: null })
  const [analyses, setAnalyses] = useState<{ left: ObjectiveProtocolAnalysisResult | null; right: ObjectiveProtocolAnalysisResult | null }>({
    left: null,
    right: null,
  })
  const [activeSide, setActiveSide] = useState<'left' | 'right' | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleAnalyzeSide = async (side: 'left' | 'right') => {
    const file = files[side]
    if (!file) return
    setActiveSide(side)
    setIsAnalyzing(true)
    try {
      const result = await analyzeObjectiveVideoProtocol({
        protocolId: 'balance_single_leg',
        file,
        side,
      })
      setAnalyses((current) => ({ ...current, [side]: result }))
      toast.success(`${side === 'left' ? 'Left' : 'Right'} balance analyzed`, {
        description: result.summary,
      })
    } catch (error) {
      console.error(error)
      toast.error(`Could not analyze the ${side} balance clip.`)
    } finally {
      setIsAnalyzing(false)
      setActiveSide(null)
    }
  }

  const combined = useMemo(() => {
    if (!analyses.left || !analyses.right) return null
    const leftSway = analyses.left.headlineMetric.value
    const rightSway = analyses.right.headlineMetric.value
    const asymmetry = Math.abs(leftSway - rightSway) / Math.max(Math.abs(leftSway), Math.abs(rightSway), 0.001) * 100
    const headlineValue = roundNumber((leftSway + rightSway) / 2, 3)
    const confidenceScore = roundNumber((analyses.left.confidenceScore + analyses.right.confidenceScore) / 2, 2)
    const captureQualityScore = roundNumber((analyses.left.captureQualityScore + analyses.right.captureQualityScore) / 2, 2)
    const classification =
      asymmetry >= 15 || headlineValue > 0.28
        ? 'Critical'
        : asymmetry >= 8 || headlineValue > 0.18
          ? 'Risk'
          : 'Good'

    const measurements: ObjectiveTestMeasurement[] = [
      {
        key: protocol.headlineMetric.key,
        label: protocol.headlineMetric.label,
        value: headlineValue,
        unit: 'bw/s',
        direction: 'lower_better',
        isHeadline: true,
      },
      ...analyses.left.measurements.map((measurement) => ({ ...measurement, side: 'left' as const })),
      ...analyses.right.measurements.map((measurement) => ({ ...measurement, side: 'right' as const })),
      {
        key: 'balance_asymmetry_percent',
        label: 'Balance asymmetry',
        value: roundNumber(asymmetry, 1),
        unit: '%',
        direction: 'lower_better',
      },
    ]

    const validityStatus: ObjectiveValidityStatus =
      analyses.left.validityStatus === 'invalid_saved' || analyses.right.validityStatus === 'invalid_saved'
        ? 'low_confidence'
        : confidenceScore < 0.68
          ? 'low_confidence'
          : 'accepted'

    return {
      classification,
      confidenceScore,
      captureQualityScore,
      measurements,
      summary:
        classification === 'Good'
          ? 'AI balance scan found strong left-right control with low sway.'
          : classification === 'Critical'
            ? 'AI balance scan found clear sway or asymmetry. Keep lower-limb loading more conservative.'
            : 'AI balance scan found some left-right imbalance or sway worth monitoring.',
      validityStatus,
      qualityFlags: [...analyses.left.qualityFlags, ...analyses.right.qualityFlags],
      resultsJson: {
        left: analyses.left.resultsJson,
        right: analyses.right.resultsJson,
        asymmetry_percent: roundNumber(asymmetry, 1),
      },
    }
  }, [analyses.left, analyses.right, protocol.headlineMetric.key, protocol.headlineMetric.label])

  const handleSave = async () => {
    if (!combined || isSaving) return
    setIsSaving(true)
    try {
      const saved = await onSave(
        {
          user_id: '',
          role,
          test_type: 'balance_single_leg',
          family: protocol.family,
          protocol_version: 'balance_single_leg_v1_ai',
          source: 'camera_upload',
          capture_mode: protocol.captureMode,
          side_scope: 'bilateral',
          headline_metric_key: protocol.headlineMetric.key,
          headline_metric_value: combined.measurements[0].value,
          headline_metric_unit: 'bw/s',
          headline_metric_direction: 'lower_better',
          confidence_score: combined.confidenceScore,
          capture_quality_score: combined.captureQualityScore,
          validity_status: combined.validityStatus,
          baseline_status: 'building',
          classification: combined.classification,
          sample_count: combined.measurements.length,
          quality_flags: combined.qualityFlags,
          safety_flags: [],
          results_json: combined.resultsJson,
          metadata: {
            ...getBrowserMetadata(),
            ai_mode: 'pose_landmarker_v1',
            left_file_name: files.left?.name || null,
            right_file_name: files.right?.name || null,
          },
        },
        combined.measurements
      )

      if (saved) {
        toast.success('Bilateral balance session saved', {
          description: 'CREEDA can now compare left-right control over time.',
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
      <div className="space-y-4">
        {(['left', 'right'] as const).map((side) => (
          <FormCard
            key={side}
            title={`${side === 'left' ? 'Left' : 'Right'} hold clip`}
            description={`Upload or capture the ${side} single-leg hold. Keep the full body visible in a front view.`}
          >
            <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-[1.6rem] border border-dashed border-white/[0.12] bg-white/[0.03] px-4 py-6 text-center transition-all hover:bg-white/[0.05]">
              <Upload className="h-10 w-10 text-primary" />
              <p className="mt-4 text-sm font-bold text-white">{files[side]?.name || `Choose ${side} clip`}</p>
              <input
                type="file"
                accept="video/*"
                capture="environment"
                className="hidden"
                onChange={(event) => setFiles((current) => ({ ...current, [side]: event.target.files?.[0] || null }))}
              />
            </label>
            <button
              type="button"
              onClick={() => void handleAnalyzeSide(side)}
              disabled={!files[side] || isAnalyzing}
              className={`${primaryButtonClasses} disabled:opacity-50`}
            >
              {isAnalyzing && activeSide === side ? <Activity className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              Analyze {side} side
            </button>
          </FormCard>
        ))}
      </div>

      <div className="space-y-4">
        <ResultPanel
          title="Balance result"
          description={combined?.summary || 'Analyze both left and right clips to produce one bilateral AI balance session.'}
          classification={combined?.classification || null}
          metrics={
            combined
              ? [
                  { label: 'Mean sway', value: formatObjectiveMetricValue(combined.measurements[0].value, 'bw/s', 2) },
                  { label: 'Asymmetry', value: formatObjectiveMetricValue(findMeasurement(combined.measurements, 'balance_asymmetry_percent')?.value || null, '%', 1) },
                  { label: 'Confidence', value: `${Math.round(combined.confidenceScore * 100)}%` },
                ]
              : []
          }
          qualityFlags={combined?.qualityFlags || []}
        />

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!combined || isSaving}
          className={`${primaryButtonClasses} w-full justify-center disabled:opacity-50`}
        >
          {isSaving ? <Activity className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Save bilateral balance session
        </button>
      </div>
    </div>
  )
}

function MobilityBatteryRunner({
  role,
  protocol,
  onSave,
}: {
  role: ObjectiveTestRole
  protocol: ObjectiveTestProtocolDefinition
  onSave: (insert: ObjectiveTestSessionInsert, measurements: ObjectiveTestMeasurement[]) => Promise<ObjectiveTestSession | null>
}) {
  const subtests = useMemo(() => protocol.subtests || [], [protocol.subtests])
  const [files, setFiles] = useState<FileMap>({})
  const [analyses, setAnalyses] = useState<AnalysisMap>({})
  const [activeSubtest, setActiveSubtest] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleAnalyzeSubtest = async (subtestKey: string) => {
    const file = files[subtestKey]
    if (!file) return
    setActiveSubtest(subtestKey)
    setIsAnalyzing(true)
    try {
      const result = await analyzeObjectiveVideoProtocol({
        protocolId: 'mobility_battery',
        file,
        subtestKey,
      })
      setAnalyses((current) => ({ ...current, [subtestKey]: result }))
      toast.success(`${subtests.find((item) => item.key === subtestKey)?.label || 'Subtest'} analyzed`)
    } catch (error) {
      console.error(error)
      toast.error('Could not analyze that mobility clip.')
    } finally {
      setIsAnalyzing(false)
      setActiveSubtest(null)
    }
  }

  const combined = useMemo(() => {
    if (!subtests.length) return null
    if (!subtests.every((subtest) => analyses[subtest.key])) return null

    const ankle = analyses.ankle_dorsiflexion
    const squat = analyses.overhead_squat
    const shoulder = analyses.shoulder_flexion
    const hinge = analyses.toe_touch_hinge
    if (!ankle || !squat || !shoulder || !hinge) return null

    const ankleMetric = findMeasurement(ankle.measurements, 'ankle_dorsiflexion_deg')?.value || 0
    const squatMetric = findMeasurement(squat.measurements, 'squat_depth_ratio')?.value || 0
    const shoulderMetric = findMeasurement(shoulder.measurements, 'shoulder_flexion_deg')?.value || 0
    const hingeMetric = findMeasurement(hinge.measurements, 'hip_hinge_score')?.value || 0

    const score = roundNumber(
      average([
        clampNumber((ankleMetric / 40) * 100, 0, 100),
        clampNumber(100 - Math.max(squatMetric - 0.8, 0) * 120, 0, 100),
        clampNumber((shoulderMetric / 170) * 100, 0, 100),
        clampNumber(hingeMetric, 0, 100),
      ])
    )
    const classification = score < 60 ? 'Critical' : score < 80 ? 'Risk' : 'Good'
    const confidenceScore = roundNumber(
      average([ankle.confidenceScore, squat.confidenceScore, shoulder.confidenceScore, hinge.confidenceScore]),
      2
    )
    const captureQualityScore = roundNumber(
      average([ankle.captureQualityScore, squat.captureQualityScore, shoulder.captureQualityScore, hinge.captureQualityScore]),
      2
    )

    const measurements: ObjectiveTestMeasurement[] = [
      {
        key: protocol.headlineMetric.key,
        label: protocol.headlineMetric.label,
        value: score,
        unit: 'pts',
        direction: 'higher_better',
        isHeadline: true,
      },
      ...ankle.measurements.filter((measurement) => measurement.key === 'ankle_dorsiflexion_deg').map((measurement) => ({ ...measurement, subtestKey: 'ankle_dorsiflexion' })),
      ...squat.measurements.filter((measurement) => measurement.key === 'squat_depth_ratio').map((measurement) => ({ ...measurement, subtestKey: 'overhead_squat' })),
      ...shoulder.measurements.filter((measurement) => measurement.key === 'shoulder_flexion_deg').map((measurement) => ({ ...measurement, subtestKey: 'shoulder_flexion' })),
      ...hinge.measurements
        .filter((measurement) => measurement.key === 'fingertip_to_ankle_ratio' || measurement.key === 'hip_hinge_score')
        .map((measurement) => ({ ...measurement, subtestKey: 'toe_touch_hinge' })),
    ]

    const validityStatus: ObjectiveValidityStatus = confidenceScore < 0.65 ? 'low_confidence' : 'accepted'

    return {
      classification,
      confidenceScore,
      captureQualityScore,
      measurements,
      summary:
        classification === 'Good'
          ? 'AI mobility battery found enough movement freedom to keep the plan progressing normally.'
          : classification === 'Critical'
            ? 'AI mobility battery found clear movement restrictions. Bias the plan toward movement quality first.'
            : 'AI mobility battery found a few movement limits worth cleaning up this week.',
      validityStatus,
      qualityFlags: Object.values(analyses).flatMap((item) => item?.qualityFlags || []),
      resultsJson: Object.fromEntries(
        Object.entries(analyses).map(([key, value]) => [key, value?.resultsJson || {}])
      ),
    }
  }, [analyses, protocol.headlineMetric.key, protocol.headlineMetric.label, subtests])

  const handleSave = async () => {
    if (!combined || isSaving) return
    setIsSaving(true)
    try {
      const saved = await onSave(
        {
          user_id: '',
          role,
          test_type: 'mobility_battery',
          family: protocol.family,
          protocol_version: 'mobility_battery_v1_ai',
          source: 'camera_upload',
          capture_mode: protocol.captureMode,
          side_scope: 'battery',
          headline_metric_key: protocol.headlineMetric.key,
          headline_metric_value: combined.measurements[0].value,
          headline_metric_unit: 'pts',
          headline_metric_direction: 'higher_better',
          confidence_score: combined.confidenceScore,
          capture_quality_score: combined.captureQualityScore,
          validity_status: combined.validityStatus,
          baseline_status: 'building',
          classification: combined.classification,
          sample_count: combined.measurements.length,
          quality_flags: combined.qualityFlags,
          safety_flags: [],
          results_json: combined.resultsJson,
          metadata: {
            ...getBrowserMetadata(),
            ai_mode: 'pose_landmarker_v1',
            file_names: Object.fromEntries(Object.entries(files).map(([key, value]) => [key, value?.name || null])),
          },
        },
        combined.measurements
      )

      if (saved) {
        toast.success('Mobility battery saved', {
          description: 'The full AI battery is now part of your measured history.',
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
      <div className="space-y-4">
        {subtests.map((subtest) => (
          <FormCard
            key={subtest.key}
            title={subtest.label}
            description={`Upload the guided ${subtest.label.toLowerCase()} clip for AI scoring.`}
          >
            <label className="flex min-h-[130px] cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-white/[0.12] bg-white/[0.03] px-4 py-5 text-center transition-all hover:bg-white/[0.05]">
              <Upload className="h-9 w-9 text-primary" />
              <p className="mt-3 text-sm font-bold text-white">{files[subtest.key]?.name || `Choose ${subtest.label} clip`}</p>
              <input
                type="file"
                accept="video/*"
                capture="environment"
                className="hidden"
                onChange={(event) => setFiles((current) => ({ ...current, [subtest.key]: event.target.files?.[0] || null }))}
              />
            </label>
            <button
              type="button"
              onClick={() => void handleAnalyzeSubtest(subtest.key)}
              disabled={!files[subtest.key] || isAnalyzing}
              className={`${primaryButtonClasses} disabled:opacity-50`}
            >
              {isAnalyzing && activeSubtest === subtest.key ? <Activity className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              Analyze {subtest.label}
            </button>
          </FormCard>
        ))}
      </div>

      <div className="space-y-4">
        <ResultPanel
          title="Mobility battery result"
          description={combined?.summary || 'Complete all four subtests to produce one battery score and save the full AI movement scan.'}
          classification={combined?.classification || null}
          metrics={
            combined
              ? combined.measurements.slice(0, 5).map((measurement) => ({
                  label: measurement.label,
                  value: formatObjectiveMetricValue(
                    measurement.value,
                    measurement.unit,
                    measurement.unit === 'ratio' ? 2 : 0
                  ),
                }))
              : []
          }
          qualityFlags={combined?.qualityFlags || []}
        />

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!combined || isSaving}
          className={`${primaryButtonClasses} w-full justify-center disabled:opacity-50`}
        >
          {isSaving ? <Activity className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Save battery session
        </button>
      </div>
    </div>
  )
}

function FormCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-5">
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  )
}

function ResultPanel({
  title,
  description,
  classification,
  metrics,
  qualityFlags = [],
}: {
  title: string
  description: string
  classification: string | null
  metrics: Array<{ label: string; value: string }>
  qualityFlags?: string[]
}) {
  return (
    <div className="rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-5">
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">{description}</p>

      {classification && (
        <div className={`mt-5 rounded-3xl border px-4 py-4 ${getClassificationTone(classification)}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em]">Classification</p>
          <p className="mt-2 text-xl font-black tracking-tight">{classification}</p>
        </div>
      )}

      {metrics.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {metrics.map((metric) => (
            <SummaryMetric key={metric.label} label={metric.label} value={metric.value} />
          ))}
        </div>
      )}

      {qualityFlags.length > 0 && (
        <div className="mt-5 space-y-2">
          {qualityFlags.map((flag) => (
            <div key={flag} className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-200" />
              <p className="text-sm leading-relaxed text-amber-50">{flag}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="mt-3">{children}</div>
    </label>
  )
}

function InfoList({
  title,
  items,
  warning,
}: {
  title: string
  items: string[]
  warning?: boolean
}) {
  return (
    <div className="rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-black/20 px-4 py-3">
            <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${warning ? 'bg-rose-400' : 'bg-primary'}`} />
            <p className="text-sm leading-relaxed text-slate-300">{item}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniInfo({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-3 text-sm font-bold text-white">{value}</p>
    </div>
  )
}

function SurfacePanel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`relative overflow-hidden rounded-[2rem] border border-white/[0.06] bg-[linear-gradient(160deg,rgba(15,23,42,0.96),rgba(2,6,23,0.92))] ${className || ''}`}>
      {children}
    </section>
  )
}

function CompactStat({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-3 text-lg font-bold text-white">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{detail}</p>
    </div>
  )
}

function SnapshotTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3
  label: string
  value: string
}) {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-2 text-lg font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  )
}

function SummaryMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-3 text-lg font-bold text-white">{value}</p>
    </div>
  )
}

function HistoryStat({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/20 px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-bold text-white">{value}</p>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/20 px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-bold text-white">{value}</p>
    </div>
  )
}

function QuickLinkCard({
  href,
  title,
  body,
}: {
  href: string
  title: string
  body: string
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:bg-white/[0.05]"
    >
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">{body}</p>
      <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
        Open
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  )
}

function getBrowserMetadata() {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    viewport:
      typeof window !== 'undefined'
        ? {
            width: window.innerWidth,
            height: window.innerHeight,
          }
        : null,
  }
}

function findMeasurement(measurements: ObjectiveTestMeasurement[], key: string) {
  return measurements.find((measurement) => measurement.key === key) || null
}

function roundNumber(value: number, decimals = 0) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function average(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function clampNumber(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value))
}

function getClassificationTone(classification: string) {
  if (classification === 'Good') {
    return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100'
  }

  if (classification === 'Risk') {
    return 'border-amber-500/25 bg-amber-500/10 text-amber-100'
  }

  return 'border-rose-500/25 bg-rose-500/10 text-rose-100'
}

function getCadenceClasses(state: string) {
  if (state === 'recommended') return 'border border-emerald-400/30 bg-emerald-500/15 text-emerald-100'
  if (state === 'cooldown') return 'border border-blue-400/30 bg-blue-500/15 text-blue-100'
  if (state === 'replace_with_lower_load') return 'border border-amber-400/30 bg-amber-500/15 text-amber-100'
  if (state === 'unsafe_now') return 'border border-rose-400/30 bg-rose-500/15 text-rose-100'
  return 'border border-white/[0.08] bg-white/[0.06] text-slate-200'
}

function getFreshnessClasses(freshness: 'fresh' | 'stale' | 'missing') {
  if (freshness === 'fresh') return 'border border-emerald-400/30 bg-emerald-500/15 text-emerald-100'
  if (freshness === 'stale') return 'border border-amber-400/30 bg-amber-500/15 text-amber-100'
  return 'border border-white/[0.08] bg-white/[0.06] text-slate-200'
}

function formatSessionDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'

  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

const inputClasses =
  'w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/30'

const primaryButtonClasses =
  'inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-black shadow-[0_0_28px_rgba(245,124,0,0.22)]'
