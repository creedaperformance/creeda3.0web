'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Dumbbell,
  Gauge,
  PlayCircle,
  SkipForward,
  Sparkles,
  TimerReset,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { RoleDesktopNav } from '@/components/RoleDesktopNav'
import type { ExecutionSession, SessionExercise } from '@/lib/product/types'
import { completeExecutionSession } from '@/app/athlete/sessions/actions'
import { completeIndividualExecutionSession } from '@/app/individual/sessions/actions'

type SessionStatus = 'planned' | 'in_progress' | 'completed' | 'skipped'

interface PersistedExecutionSessionLite {
  id: string | null
  sessionDate: string
  status: SessionStatus
  source: string
  session: ExecutionSession
  expectedDurationMinutes: number
  compliancePct: number | null
  athleteNotes: string | null
}

interface SessionHistoryLite {
  id: string
  sessionDate: string
  title: string
  focus?: string
  mode: ExecutionSession['mode']
  status: SessionStatus
  expectedDurationMinutes: number
  actualDurationMinutes?: number | null
  compliancePct: number | null
  painFlags?: string[]
  athleteNotes?: string | null
  topExercises?: string[]
}

interface CoachFeedbackLite {
  id: string
  feedbackType: string
  message: string
  createdAt: string
}

interface ExerciseLogState {
  actualReps: string
  loadKg: string
  actualDurationSeconds: string
  note: string
  completedSets: number
  completionStatus: 'completed' | 'partial' | 'skipped' | 'substituted'
  substitutionExerciseSlug: string | null
}

interface FlattenedExercise {
  blockId: string
  blockType: string
  blockTitle: string
  blockIntensity: string
  index: number
  exercise: SessionExercise
}

interface Props {
  initialSession: PersistedExecutionSessionLite
  recentHistory: SessionHistoryLite[]
  coachFeedback: CoachFeedbackLite[]
  role?: 'athlete' | 'individual'
  preferredSport?: string | null
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60)
  const seconds = value % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const GENERIC_SESSION_TITLES = new Set([
  'Train Hard',
  'Train Light',
  'Recovery Session',
  'Rehab Session',
])

const VIDEO_MEDIA_RE = /\.(mp4|webm|mov|m4v)(\?|$)/i

function formatModeLabel(value: string) {
  return value.replace(/_/g, ' ')
}

function isFallbackExerciseMediaUrl(value: string) {
  return value.includes('/media/exercises/fallback/')
}

function isExerciseSpecificMediaUrl(value: string) {
  return Boolean(value) && !isFallbackExerciseMediaUrl(value)
}

function hasActualVideo(value: string) {
  return isExerciseSpecificMediaUrl(value) && VIDEO_MEDIA_RE.test(value)
}

function getGeneratedExerciseMediaUrl(exerciseSlug: string, frame: 'demo' | 'setup') {
  return `/api/exercises/media/${encodeURIComponent(exerciseSlug)}/${frame}.svg`
}

function getPersonalizedSessionTitle(session: ExecutionSession) {
  if (!GENERIC_SESSION_TITLES.has(session.title)) return session.title
  return session.summary.focus
}

function getHistoryTitle(entry: SessionHistoryLite) {
  if (entry.focus && GENERIC_SESSION_TITLES.has(entry.title)) return entry.focus
  return entry.focus || entry.title
}

function buildCameraCoachHref(
  routeBase: string,
  exercise: SessionExercise,
  preferredSport?: string | null
) {
  const params = new URLSearchParams({
    coach: '1',
    sport: preferredSport || 'other',
    exercise: exercise.exerciseSlug,
    exerciseName: exercise.name,
    returnTo: `${routeBase}/sessions/today`,
  })
  const primaryCue = exercise.coachingCues[0] || exercise.instructions[0]
  const demoUrl = isExerciseSpecificMediaUrl(exercise.media.videoUrl)
    ? exercise.media.videoUrl
    : exercise.media.imageUrls.find(isExerciseSpecificMediaUrl)

  if (primaryCue) params.set('cue', primaryCue)
  params.set('demo', demoUrl || getGeneratedExerciseMediaUrl(exercise.exerciseSlug, 'demo'))
  if (exercise.media.demoMode) params.set('demoMode', exercise.media.demoMode)

  const demoImages = exercise.media.imageUrls
    .filter(isExerciseSpecificMediaUrl)
    .slice(0, 3)
  const resolvedDemoImages = demoImages.length
    ? demoImages
    : [
        getGeneratedExerciseMediaUrl(exercise.exerciseSlug, 'demo'),
        getGeneratedExerciseMediaUrl(exercise.exerciseSlug, 'setup'),
      ]

  resolvedDemoImages.forEach((imageUrl) => params.append('demoImage', imageUrl))

  return `${routeBase}/scan/analyze?${params.toString()}`
}

export function SessionExecutionClient({
  initialSession,
  recentHistory,
  coachFeedback,
  role = 'athlete',
  preferredSport,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [view, setView] = useState<'overview' | 'active' | 'summary' | 'completed'>(
    initialSession.status === 'completed' ? 'completed' : 'overview'
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [restRemaining, setRestRemaining] = useState(0)
  const [workRemaining, setWorkRemaining] = useState<number | null>(null)
  const [sessionNotes, setSessionNotes] = useState(initialSession.athleteNotes || '')
  const [painFlags, setPainFlags] = useState<string[]>([])
  const [startedAt, setStartedAt] = useState<number | null>(null)

  const flattenedExercises: FlattenedExercise[] = initialSession.session.blocks.flatMap((block) =>
    block.exercises.map((exercise, index) => ({
      blockId: block.id,
      blockType: block.type,
      blockTitle: block.title,
      blockIntensity: block.intensity,
      index,
      exercise,
    }))
  )

  const [exerciseLogs, setExerciseLogs] = useState<Record<string, ExerciseLogState>>(() =>
    Object.fromEntries(
      flattenedExercises.map((item) => [
        item.exercise.exerciseId,
        {
          actualReps: item.exercise.prescribed.reps || '',
          loadKg: '',
          actualDurationSeconds: item.exercise.prescribed.durationSeconds
            ? String(item.exercise.prescribed.durationSeconds)
            : '',
          note: '',
          completedSets: 0,
          completionStatus: 'partial',
          substitutionExerciseSlug: null,
        },
      ])
    )
  )

  const currentItem = flattenedExercises[currentIndex] || null
  const nextItem = flattenedExercises[currentIndex + 1] || null
  const completedExercises = flattenedExercises.filter((item) => {
    const log = exerciseLogs[item.exercise.exerciseId]
    return log?.completionStatus === 'completed' || log?.completionStatus === 'substituted'
  }).length
  const totalPrescribedSets = flattenedExercises.reduce(
    (sum, item) => sum + item.exercise.prescribed.sets,
    0
  )
  const totalCompletedSets = Object.values(exerciseLogs).reduce(
    (sum, log) => sum + log.completedSets,
    0
  )
  const compliancePct = totalPrescribedSets
    ? Math.round((totalCompletedSets / totalPrescribedSets) * 100)
    : 0

  const suggestedPainFlags = Array.from(
    new Set(
      [
        ...initialSession.session.explainability.warnings,
        ...flattenedExercises.flatMap((item) => item.exercise.painCaution),
      ]
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ).slice(0, 6)

  const routeBase = role === 'individual' ? '/individual' : '/athlete'
  const personalizedSessionTitle = getPersonalizedSessionTitle(initialSession.session)
  const sessionSavedMessage =
    role === 'individual'
      ? 'Session saved. Your plan and history are up to date.'
      : 'Session saved. Your history and coach view are up to date.'

  useEffect(() => {
    if (restRemaining <= 0) return
    const interval = window.setInterval(() => {
      setRestRemaining((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [restRemaining])

  useEffect(() => {
    if (workRemaining === null || workRemaining <= 0) return
    const interval = window.setInterval(() => {
      setWorkRemaining((value) => (value === null ? null : Math.max(0, value - 1)))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [workRemaining])

  const currentLog = currentItem ? exerciseLogs[currentItem.exercise.exerciseId] : null
  const currentSetNumber = currentLog ? Math.min(currentLog.completedSets + 1, currentItem?.exercise.prescribed.sets || 1) : 1

  function updateCurrentLog(patch: Partial<ExerciseLogState>) {
    if (!currentItem) return
    setExerciseLogs((prev) => ({
      ...prev,
      [currentItem.exercise.exerciseId]: {
        ...prev[currentItem.exercise.exerciseId],
        ...patch,
      },
    }))
  }

  function moveToNextExercise() {
    if (currentIndex >= flattenedExercises.length - 1) {
      setView('summary')
      setWorkRemaining(null)
      return
    }
    setCurrentIndex((value) => value + 1)
    setWorkRemaining(null)
  }

  function handleStartSession() {
    setStartedAt(Date.now())
    setView('active')
    if (currentItem?.exercise.prescribed.durationSeconds) {
      setWorkRemaining(currentItem.exercise.prescribed.durationSeconds)
    }
  }

  function handleCompleteSet() {
    if (!currentItem || !currentLog) return

    const nextCompletedSets = Math.min(
      currentLog.completedSets + 1,
      currentItem.exercise.prescribed.sets
    )
    const completionStatus =
      nextCompletedSets >= currentItem.exercise.prescribed.sets
        ? currentLog.substitutionExerciseSlug
          ? 'substituted'
          : 'completed'
        : 'partial'

    setExerciseLogs((prev) => ({
      ...prev,
      [currentItem.exercise.exerciseId]: {
        ...prev[currentItem.exercise.exerciseId],
        completedSets: nextCompletedSets,
        completionStatus,
      },
    }))

    if (currentItem.exercise.prescribed.restSeconds > 0) {
      setRestRemaining(currentItem.exercise.prescribed.restSeconds)
    }

    if (nextCompletedSets >= currentItem.exercise.prescribed.sets) {
      moveToNextExercise()
    }
  }

  function handleSkipExercise() {
    if (!currentItem) return
    setExerciseLogs((prev) => ({
      ...prev,
      [currentItem.exercise.exerciseId]: {
        ...prev[currentItem.exercise.exerciseId],
        completionStatus: 'skipped',
      },
    }))
    moveToNextExercise()
  }

  function handleTogglePainFlag(flag: string) {
    setPainFlags((current) =>
      current.includes(flag)
        ? current.filter((item) => item !== flag)
        : [...current, flag]
    )
  }

  function handleSaveSession() {
    const actualDurationMinutes = startedAt
      ? Math.max(1, Math.round((Date.now() - startedAt) / 60000))
      : initialSession.expectedDurationMinutes

    startTransition(async () => {
      const result =
        role === 'individual'
          ? await completeIndividualExecutionSession({
              sessionId: initialSession.id,
              session: initialSession.session,
              actualDurationMinutes,
              compliancePct,
              athleteNotes: sessionNotes,
              painFlags,
              exerciseLogs: flattenedExercises.map((item) => {
                const log = exerciseLogs[item.exercise.exerciseId]
                return {
                  exerciseId: item.exercise.exerciseId,
                  exerciseSlug: item.exercise.exerciseSlug,
                  blockType: item.blockType,
                  prescribed: item.exercise.prescribed as unknown as Record<string, unknown>,
                  actual: {
                    reps: log.actualReps || null,
                    loadKg: log.loadKg ? Number(log.loadKg) : null,
                    durationSeconds: log.actualDurationSeconds
                      ? Number(log.actualDurationSeconds)
                      : null,
                    completedSets: log.completedSets,
                  },
                  completionStatus: log.completionStatus,
                  note: log.note || undefined,
                  substitutionExerciseSlug: log.substitutionExerciseSlug,
                }
              }),
            })
          : await completeExecutionSession({
              sessionId: initialSession.id,
              session: initialSession.session,
              actualDurationMinutes,
              compliancePct,
              athleteNotes: sessionNotes,
              painFlags,
              exerciseLogs: flattenedExercises.map((item) => {
                const log = exerciseLogs[item.exercise.exerciseId]
                return {
                  exerciseId: item.exercise.exerciseId,
                  exerciseSlug: item.exercise.exerciseSlug,
                  blockType: item.blockType,
                  prescribed: item.exercise.prescribed as unknown as Record<string, unknown>,
                  actual: {
                    reps: log.actualReps || null,
                    loadKg: log.loadKg ? Number(log.loadKg) : null,
                    durationSeconds: log.actualDurationSeconds
                      ? Number(log.actualDurationSeconds)
                      : null,
                    completedSets: log.completedSets,
                  },
                  completionStatus: log.completionStatus,
                  note: log.note || undefined,
                  substitutionExerciseSlug: log.substitutionExerciseSlug,
                }
              }),
            })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(sessionSavedMessage)
      setView('completed')
      router.refresh()
    })
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 pb-24 pt-16 text-white md:pl-72 md:pr-6 md:pt-6">
      <RoleDesktopNav role={role} />
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 rounded-[28px] border border-white/8 bg-white/[0.03] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)] md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Link
              href={`${routeBase}/dashboard`}
              className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--chakra-neon)]">
                Guided Session • {formatModeLabel(initialSession.session.mode)}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">
                {personalizedSessionTitle}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                {initialSession.session.explainability.headline}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricChip
              icon={Gauge}
              label="Readiness"
              value={`${initialSession.session.readiness.score}`}
              helper={initialSession.session.readiness.band}
            />
            <MetricChip
              icon={Clock3}
              label="Expected"
              value={`${initialSession.expectedDurationMinutes}m`}
              helper={initialSession.session.summary.difficulty}
            />
            <MetricChip
              icon={Sparkles}
              label="Focus"
              value={initialSession.session.summary.focus}
              helper={initialSession.session.mode.replace(/_/g, ' ')}
            />
            <MetricChip
              icon={CheckCircle2}
              label="Compliance"
              value={`${compliancePct}%`}
              helper={view === 'completed' ? 'saved' : 'live'}
            />
          </div>
        </div>

        {role === 'athlete' && coachFeedback.length > 0 && (
          <div className="rounded-[26px] border border-[var(--saffron)]/20 bg-[var(--saffron)]/8 p-5">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--saffron-light)]">
              <Activity className="h-4 w-4" />
              Coach context
            </div>
            <div className="mt-3 space-y-3">
              {coachFeedback.slice(0, 2).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-white/10 bg-black/15 p-4"
                >
                  <p className="text-sm leading-relaxed text-white">{entry.message}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    {entry.feedbackType.replace(/_/g, ' ')} •{' '}
                    {new Intl.DateTimeFormat('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    }).format(new Date(entry.createdAt))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            {view === 'overview' && (
              <div className="rounded-[30px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(10,132,255,0.18),transparent_45%),rgba(255,255,255,0.02)] p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                      Today&apos;s executable plan
                    </p>
                    <h2 className="mt-3 text-2xl font-black tracking-tight">
                      {initialSession.session.summary.focus}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                      {initialSession.session.explainability.reasons.join(' ')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      onClick={handleStartSession}
                      className="h-12 rounded-2xl bg-[var(--saffron)] px-6 text-sm font-black text-black hover:brightness-110"
                    >
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Start session
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-12 rounded-2xl border-white/12 bg-transparent px-6 text-sm font-bold text-white hover:bg-white/5"
                    >
                      <Link href={`${routeBase}/plans`}>Open calendar</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-12 rounded-2xl border-white/12 bg-transparent px-6 text-sm font-bold text-white hover:bg-white/5"
                    >
                      <Link href={`${routeBase}/exercises`}>
                        <BookOpenCheck className="mr-2 h-4 w-4" />
                        Library
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {initialSession.session.blocks.map((block) => (
                    <div
                      key={block.id}
                      className="rounded-[24px] border border-white/8 bg-black/15 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                            {block.type}
                          </p>
                          <h3 className="mt-2 text-lg font-bold text-white">
                            {block.title}
                          </h3>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-300">
                          {block.exercises.length} drills
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-slate-300">
                        {block.notes}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {block.exercises.slice(0, 4).map((exercise) => (
                          <span
                            key={exercise.exerciseId}
                            className="rounded-full border border-[var(--chakra-neon)]/20 bg-[var(--chakra-neon)]/10 px-3 py-1 text-[11px] font-medium text-[var(--chakra-neon)]"
                          >
                            {exercise.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {initialSession.session.summary.skillFocus?.length ? (
                  <div className="mt-5 rounded-[24px] border border-[var(--chakra-neon)]/20 bg-[var(--chakra-neon)]/10 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--chakra-neon)]">
                      Skill intelligence focus
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {initialSession.session.summary.skillFocus.map((focus) => (
                        <span
                          key={focus}
                          className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold text-blue-100"
                        >
                          {focus}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {view === 'active' && currentItem && currentLog && (
              <div className="space-y-5 rounded-[30px] border border-white/8 bg-white/[0.03] p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[var(--chakra-neon)]/20 bg-[var(--chakra-neon)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--chakra-neon)]">
                        {currentItem.blockType}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
                        Set {currentSetNumber} of {currentItem.exercise.prescribed.sets}
                      </span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight">
                      {currentItem.exercise.name}
                    </h2>
                    <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
                      {currentItem.exercise.explanation.join(' ')}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Session progress
                    </p>
                    <p className="mt-2 text-lg font-bold text-white">
                      {completedExercises} / {flattenedExercises.length} exercises completed
                    </p>
                    <Progress
                      className="mt-3 h-2 bg-white/10"
                      value={(completedExercises / Math.max(flattenedExercises.length, 1)) * 100}
                    />
                  </div>
                </div>

                <ExerciseMediaPanel
                  key={currentItem.exercise.exerciseId}
                  exercise={currentItem.exercise}
                />

                <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                  <div className="space-y-5">
                    <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
                      <div className="grid gap-4 md:grid-cols-3">
                        <SpecChip label="Prescription" value={`${currentItem.exercise.prescribed.sets} sets`} />
                        <SpecChip label="Reps / Time" value={currentItem.exercise.prescribed.reps || `${currentItem.exercise.prescribed.durationSeconds || 0}s`} />
                        <SpecChip label="Rest" value={`${currentItem.exercise.prescribed.restSeconds}s`} />
                      </div>

                      <div className="mt-5 grid gap-5 md:grid-cols-2">
                        <InfoList
                          title="Instructions"
                          items={currentItem.exercise.instructions}
                        />
                        <InfoList
                          title="Coaching cues"
                          items={currentItem.exercise.coachingCues}
                        />
                      </div>

                      {currentItem.exercise.commonMistakes.length > 0 && (
                        <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/8 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">
                            Avoid these mistakes
                          </p>
                          <div className="mt-3 grid gap-2">
                            {currentItem.exercise.commonMistakes.map((mistake) => (
                              <p key={mistake} className="text-sm text-amber-50/90">
                                {mistake}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                        Log this exercise
                      </p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <Field
                          label="Actual reps"
                          value={currentLog.actualReps}
                          onChange={(value) => updateCurrentLog({ actualReps: value })}
                          placeholder={currentItem.exercise.prescribed.reps || '8'}
                        />
                        <Field
                          label="Load (kg)"
                          value={currentLog.loadKg}
                          onChange={(value) => updateCurrentLog({ loadKg: value })}
                          placeholder="Optional"
                        />
                        <Field
                          label="Actual duration (sec)"
                          value={currentLog.actualDurationSeconds}
                          onChange={(value) => updateCurrentLog({ actualDurationSeconds: value })}
                          placeholder={currentItem.exercise.prescribed.durationSeconds ? String(currentItem.exercise.prescribed.durationSeconds) : 'Optional'}
                        />
                        <label className="space-y-2">
                          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                            Substitute
                          </span>
                          <select
                            value={currentLog.substitutionExerciseSlug || ''}
                            onChange={(event) =>
                              updateCurrentLog({
                                substitutionExerciseSlug: event.target.value || null,
                              })
                            }
                            className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-[var(--chakra-neon)]/40"
                          >
                            <option value="">Stay with prescribed exercise</option>
                            {currentItem.exercise.substitutions.map((option) => (
                              <option key={option} value={slugify(option)}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <label className="mt-4 block space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                          Notes
                        </span>
                        <textarea
                          value={currentLog.note}
                          onChange={(event) => updateCurrentLog({ note: event.target.value })}
                          placeholder={
                            role === 'athlete'
                              ? 'Technique cue, pain note, equipment change, or anything your coach should know.'
                              : 'Technique cue, pain note, equipment change, or anything tomorrow should reflect.'
                          }
                          className="min-h-[110px] w-full rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[var(--chakra-neon)]/40"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-white/8 bg-black/25 p-5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                        Timers
                      </p>
                      <div className="mt-4 space-y-4">
                        <TimerCard
                          label="Work timer"
                          value={workRemaining}
                          helper={
                            currentItem.exercise.prescribed.durationSeconds
                              ? 'Use for duration-based drills'
                              : 'No duration prescribed'
                          }
                          buttonLabel="Start work timer"
                          onClick={() =>
                            currentItem.exercise.prescribed.durationSeconds
                              ? setWorkRemaining(currentItem.exercise.prescribed.durationSeconds)
                              : undefined
                          }
                        />
                        <TimerCard
                          label="Rest timer"
                          value={restRemaining}
                          helper="Auto-starts when you complete a set"
                          buttonLabel="Reset rest timer"
                          onClick={() => setRestRemaining(currentItem.exercise.prescribed.restSeconds)}
                        />
                      </div>
                    </div>

                    <Link
                      href={buildCameraCoachHref(routeBase, currentItem.exercise, preferredSport)}
                      className="flex items-start gap-3 rounded-[24px] border border-[var(--chakra-neon)]/20 bg-[var(--chakra-neon)]/10 p-5 transition hover:bg-[var(--chakra-neon)]/15"
                    >
                      <div className="rounded-2xl border border-[var(--chakra-neon)]/20 bg-black/20 p-2 text-[var(--chakra-neon)]">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">Camera Coach</p>
                        <p className="mt-1 text-xs leading-relaxed text-blue-100/75">
                          Open live recording for {currentItem.exercise.name} with the exercise demo under the camera.
                        </p>
                      </div>
                    </Link>

                    {currentItem.exercise.painCaution.length > 0 && (
                      <div className="rounded-[24px] border border-red-500/20 bg-red-500/8 p-5">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-red-200">
                          <AlertTriangle className="h-4 w-4" />
                          Caution
                        </div>
                        <div className="mt-3 space-y-2">
                          {currentItem.exercise.painCaution.map((warning) => (
                            <p key={warning} className="text-sm leading-relaxed text-red-50/90">
                              {warning}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {nextItem && (
                      <div className="rounded-[24px] border border-white/8 bg-white/[0.02] p-5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                          Next exercise
                        </p>
                        <h3 className="mt-3 text-lg font-bold text-white">
                          {nextItem.exercise.name}
                        </h3>
                        <p className="mt-2 text-sm text-slate-300">
                          {nextItem.blockTitle} • {nextItem.exercise.prescribed.sets} sets
                        </p>
                      </div>
                    )}

                    <div className="space-y-3 rounded-[24px] border border-[var(--saffron)]/20 bg-[var(--saffron)]/8 p-5">
                      <Button
                        onClick={handleCompleteSet}
                        className="h-12 w-full rounded-2xl bg-[var(--saffron)] text-sm font-black text-black hover:brightness-110"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Mark set complete
                      </Button>
                      <Button
                        onClick={handleSkipExercise}
                        variant="outline"
                        className="h-12 w-full rounded-2xl border-white/12 bg-transparent text-sm font-bold text-white hover:bg-white/5"
                      >
                        <SkipForward className="mr-2 h-4 w-4" />
                        Skip exercise
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(view === 'summary' || view === 'completed') && (
              <div className="rounded-[30px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(255,153,51,0.18),transparent_42%),rgba(255,255,255,0.03)] p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                      {view === 'completed' ? 'Saved summary' : 'Completion summary'}
                    </p>
                    <h2 className="mt-2 text-3xl font-black tracking-tight">
                      {view === 'completed' ? 'Session logged' : 'Finish strong'}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                      You completed {totalCompletedSets} of {totalPrescribedSets} prescribed sets across{' '}
                      {flattenedExercises.length} exercises.
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Live compliance
                    </p>
                    <p className="mt-2 text-3xl font-black text-white">{compliancePct}%</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
                  <div className="space-y-4 rounded-[24px] border border-white/8 bg-black/20 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      Pain / discomfort flags
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedPainFlags.length > 0 ? (
                        suggestedPainFlags.map((flag) => (
                          <button
                            key={flag}
                            type="button"
                            onClick={() => handleTogglePainFlag(flag)}
                            className={`rounded-full border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition ${
                              painFlags.includes(flag)
                                ? 'border-red-400/60 bg-red-500/15 text-red-100'
                                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            {flag}
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-slate-400">
                          No predefined flags for today&apos;s plan. Add notes below if anything felt off.
                        </p>
                      )}
                    </div>

                    <label className="block space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Session notes
                      </span>
                      <textarea
                        value={sessionNotes}
                        onChange={(event) => setSessionNotes(event.target.value)}
                        placeholder={
                          role === 'athlete'
                            ? 'How did the session feel? What should we or your coach adjust next?'
                            : 'How did the session feel? What should tomorrow adjust next?'
                        }
                        className="min-h-[120px] w-full rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[var(--chakra-neon)]/40"
                      />
                    </label>
                  </div>

                  <div className="space-y-4">
                    {flattenedExercises.map((item) => {
                      const log = exerciseLogs[item.exercise.exerciseId]
                      return (
                        <div
                          key={item.exercise.exerciseId}
                          className="rounded-[22px] border border-white/8 bg-white/[0.02] p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-white">{item.exercise.name}</p>
                              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                                {item.blockType} • {log.completedSets}/{item.exercise.prescribed.sets} sets
                              </p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300">
                              {log.completionStatus}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  {view !== 'completed' && (
                    <Button
                      onClick={handleSaveSession}
                      disabled={isPending}
                      className="h-12 rounded-2xl bg-[var(--saffron)] px-6 text-sm font-black text-black hover:brightness-110"
                    >
                      <Dumbbell className="mr-2 h-4 w-4" />
                      {isPending ? 'Saving session...' : 'Save session'}
                    </Button>
                  )}
                  <Button
                    asChild
                    variant="outline"
                    className="h-12 rounded-2xl border-white/12 bg-transparent px-6 text-sm font-bold text-white hover:bg-white/5"
                  >
                    <Link href={`${routeBase}/plans`}>
                      Open calendar and history
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <SidebarCard
              title="Today's reasons"
              eyebrow="Explainability"
              items={initialSession.session.explainability.reasons}
            />

            <SidebarCard
              title="Warnings"
              eyebrow="Safety"
              items={
                initialSession.session.explainability.warnings.length > 0
                  ? initialSession.session.explainability.warnings
                  : ['No special warnings were triggered beyond standard exercise-specific cautions.']
              }
            />

            <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Recent history
              </p>
              <div className="mt-4 space-y-3">
                {recentHistory.length > 0 ? (
                  recentHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-[22px] border border-white/8 bg-black/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="line-clamp-2 text-sm font-bold leading-snug text-white">
                            {getHistoryTitle(entry)}
                          </p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                            {formatDate(entry.sessionDate)} • {formatModeLabel(entry.mode)} • {entry.expectedDurationMinutes}m
                          </p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300">
                          {entry.compliancePct !== null ? `${Math.round(entry.compliancePct)}%` : entry.status}
                        </span>
                      </div>
                      {entry.topExercises?.length ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {entry.topExercises.slice(0, 3).map((exercise) => (
                            <span
                              key={exercise}
                              className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold text-slate-300"
                            >
                              {exercise}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {entry.athleteNotes ? (
                        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-400">
                          Last note: {entry.athleteNotes}
                        </p>
                      ) : entry.painFlags?.length ? (
                        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-amber-100/80">
                          Watch: {entry.painFlags.slice(0, 2).join(' + ')}
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">
                    Once you log sessions, your recent execution history will show up here.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricChip({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof Gauge
  label: string
  value: string
  helper: string
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        <Icon className="h-4 w-4 text-[var(--chakra-neon)]" />
        {label}
      </div>
      <p className="mt-3 line-clamp-2 text-sm font-bold text-white">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
        {helper}
      </p>
    </div>
  )
}

function SpecChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-white">{value}</p>
    </div>
  )
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--saffron)]" />
            <p className="text-sm leading-relaxed text-slate-300">{item}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[var(--chakra-neon)]/40"
      />
    </label>
  )
}

function SidebarCard({
  eyebrow,
  title,
  items,
}: {
  eyebrow: string
  title: string
  items: string[]
}) {
  return (
    <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-lg font-bold text-white">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--chakra-neon)]" />
            <p className="text-sm leading-relaxed text-slate-300">{item}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function TimerCard({
  label,
  value,
  helper,
  buttonLabel,
  onClick,
}: {
  label: string
  value: number | null
  helper: string
  buttonLabel: string
  onClick: () => void
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-black text-white">
            {value !== null ? formatSeconds(value) : '--:--'}
          </p>
          <p className="mt-1 text-xs text-slate-400">{helper}</p>
        </div>
        <button
          type="button"
          onClick={onClick}
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-white/10"
        >
          <TimerReset className="mr-2 h-4 w-4" />
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}

function ExerciseMediaPanel({ exercise }: { exercise: SessionExercise }) {
  const [videoBroken, setVideoBroken] = useState(false)
  const [brokenImages, setBrokenImages] = useState<string[]>([])
  const [sequenceIndex, setSequenceIndex] = useState(0)
  const exerciseSpecificImageUrls = exercise.media.imageUrls.filter(isExerciseSpecificMediaUrl)
  const displayImageUrls = exerciseSpecificImageUrls.length
    ? exerciseSpecificImageUrls
    : [
        getGeneratedExerciseMediaUrl(exercise.exerciseSlug, 'demo'),
        getGeneratedExerciseMediaUrl(exercise.exerciseSlug, 'setup'),
      ]
  const hasRealVideo = exercise.media.demoMode === 'video' && hasActualVideo(exercise.media.videoUrl)

  useEffect(() => {
    if (
      exercise.media.demoMode !== 'image_sequence' ||
      displayImageUrls.length < 2
    ) {
      return
    }

    const interval = window.setInterval(() => {
      setSequenceIndex((value) => (value + 1) % displayImageUrls.length)
    }, 1400)

    return () => window.clearInterval(interval)
  }, [displayImageUrls.length, exercise.exerciseId, exercise.media.demoMode])

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
      <div className="overflow-hidden rounded-[28px] border border-white/8 bg-black/30">
        {hasRealVideo && !videoBroken ? (
          <video
            key={exercise.media.videoUrl}
            controls
            playsInline
            onError={() => setVideoBroken(true)}
            className="aspect-video w-full bg-black/40"
          >
            <source src={exercise.media.videoUrl} />
          </video>
        ) : displayImageUrls.length > 0 ? (
          <div className="relative aspect-video overflow-hidden bg-black/35">
            <img
              src={displayImageUrls[sequenceIndex % displayImageUrls.length]}
              alt={exercise.name}
              onError={() =>
                setBrokenImages((current) => [
                  ...current,
                  displayImageUrls[sequenceIndex % displayImageUrls.length],
                ])
              }
              className="h-full w-full object-contain transition-opacity duration-500"
            />
            <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-200">
              {exercise.media.demoMode === 'animated_image'
                ? 'Animated exercise demo'
                : exercise.media.demoMode === 'image_sequence'
                  ? 'Exercise motion sequence'
                  : 'Technique still'}
            </div>
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center bg-black/30 p-8">
            <div className="max-w-sm text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Exercise demo unavailable
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                This drill has written cues, but no exercise-specific media has been attached yet.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {displayImageUrls.slice(0, 2).map((imageUrl) => (
          <div
            key={imageUrl}
            className="overflow-hidden rounded-[24px] border border-white/8 bg-black/25"
          >
            {!brokenImages.includes(imageUrl) ? (
              <img
                src={imageUrl}
                alt={exercise.name}
                onError={() =>
                  setBrokenImages((current) => [...current, imageUrl])
                }
                className="aspect-[4/3] h-full w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-white/[0.03] p-4 text-center text-sm text-slate-400">
                Angle unavailable
              </div>
            )}
          </div>
        ))}
      </div>

      {(exercise.media.techniqueNote || exercise.media.attributionLabel || exercise.media.license) && (
        <div className="lg:col-span-2">
          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3 text-[11px] text-slate-400">
            {exercise.media.techniqueNote ? (
              <div className="mb-2 rounded-2xl border border-white/8 bg-black/20 px-3 py-2 text-slate-300">
                <span className="font-bold uppercase tracking-[0.16em] text-slate-500">
                  Technique note
                </span>
                <span className="ml-2">{exercise.media.techniqueNote}</span>
              </div>
            ) : null}
            {(exercise.media.attributionLabel || exercise.media.license) ? (
              <>
                <span className="font-bold uppercase tracking-[0.16em] text-slate-500">
                  Media source
                </span>
                <span className="ml-2">
                  {exercise.media.attributionUrl ? (
                    <a
                      href={exercise.media.attributionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--chakra-neon)] hover:underline"
                    >
                      {exercise.media.attributionLabel || 'Open source media'}
                    </a>
                  ) : (
                    exercise.media.attributionLabel || 'Open source media'
                  )}
                  {exercise.media.license ? ` • ${exercise.media.license}` : ''}
                </span>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
