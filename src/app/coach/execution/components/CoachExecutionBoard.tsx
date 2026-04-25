'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardPenLine,
  Gauge,
  MessageSquareQuote,
  Send,
  Sparkles,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { Progress } from '@/components/ui/progress'
import { RoleDesktopNav } from '@/components/RoleDesktopNav'
import { assignCoachSession, addCoachFeedback } from '@/app/coach/execution/actions'

interface ExecutionBoardRow {
  athleteId: string
  athleteName: string
  sport: string
  position: string | null
  avatarUrl: string | null
  latestSessionTitle: string
  latestMode: string | null
  latestStatus: string
  compliancePct: number | null
  focus: string
  topExercises: string[]
  sessionId: string | null
}

export function CoachExecutionBoard({
  initialBoard,
}: {
  initialBoard: ExecutionBoardRow[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [assignmentMode, setAssignmentMode] = useState<Record<string, string>>({})
  const [assignmentNote, setAssignmentNote] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<Record<string, string>>({})

  function handleAssign(row: ExecutionBoardRow) {
    startTransition(async () => {
      const result = await assignCoachSession({
        athleteId: row.athleteId,
        mode: (assignmentMode[row.athleteId] || undefined) as
          | 'train_hard'
          | 'train_light'
          | 'recovery'
          | 'rehab'
          | undefined,
        message: assignmentNote[row.athleteId] || undefined,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(`Session assigned to ${row.athleteName}.`)
      router.refresh()
    })
  }

  function handleFeedback(row: ExecutionBoardRow) {
    const message = feedback[row.athleteId]?.trim()
    if (!message) {
      toast.error('Write a short coaching note first.')
      return
    }

    startTransition(async () => {
      const result = await addCoachFeedback({
        athleteId: row.athleteId,
        sessionId: row.sessionId,
        message,
        feedbackType: 'completion_review',
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(`Feedback sent to ${row.athleteName}.`)
      setFeedback((current) => ({ ...current, [row.athleteId]: '' }))
      router.refresh()
    })
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 pb-24 pt-16 text-white md:pl-72 md:pr-6 md:pt-6">
      <RoleDesktopNav role="coach" />
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[30px] border border-white/8 bg-white/[0.03] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <Link
            href="/coach/dashboard"
            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to coach dashboard
          </Link>

          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--chakra-neon)]">
                Coach execution layer
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">
                Assign sessions, review compliance, and close the feedback loop
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
                This view turns the squad dashboard into an operating surface for execution instead of static monitoring.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <Metric
                icon={Users}
                label="Athletes"
                value={`${initialBoard.length}`}
              />
              <Metric
                icon={CheckCircle2}
                label="With completion"
                value={`${initialBoard.filter((row) => row.compliancePct !== null).length}`}
              />
              <Metric
                icon={Sparkles}
                label="Needs assignment"
                value={`${initialBoard.filter((row) => row.latestStatus === 'unassigned').length}`}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          {initialBoard.length > 0 ? (
            initialBoard.map((row) => (
              <div
                key={row.athleteId}
                className="rounded-[30px] border border-white/8 bg-white/[0.03] p-5"
              >
                <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-2xl font-black tracking-tight text-white">
                          {row.athleteName}
                        </p>
                        <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          {row.sport.replace(/_/g, ' ')}
                          {row.position ? ` • ${row.position}` : ''}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-300">
                        {row.latestStatus}
                      </span>
                    </div>

                    <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Latest execution
                      </p>
                      <h3 className="mt-2 text-lg font-bold text-white">
                        {row.latestSessionTitle}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-300">
                        {row.focus}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {row.topExercises.map((exercise) => (
                          <span
                            key={exercise}
                            className="rounded-full border border-[var(--chakra-neon)]/20 bg-[var(--chakra-neon)]/10 px-3 py-1 text-[11px] font-medium text-[var(--chakra-neon)]"
                          >
                            {exercise}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                          Compliance
                        </p>
                        <p className="text-sm font-bold text-white">
                          {row.compliancePct !== null ? `${Math.round(row.compliancePct)}%` : 'No log yet'}
                        </p>
                      </div>
                      <Progress
                        className="mt-3 h-2 bg-white/10"
                        value={row.compliancePct || 0}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        <ClipboardPenLine className="h-4 w-4 text-[var(--chakra-neon)]" />
                        Assign or refresh session
                      </div>

                      <label className="mt-4 block space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                          Mode
                        </span>
                        <select
                          value={assignmentMode[row.athleteId] || ''}
                          onChange={(event) =>
                            setAssignmentMode((current) => ({
                              ...current,
                              [row.athleteId]: event.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-[var(--chakra-neon)]/40"
                        >
                          <option value="">Use system-recommended mode</option>
                          <option value="train_hard">Train hard</option>
                          <option value="train_light">Train light</option>
                          <option value="recovery">Recovery</option>
                          <option value="rehab">Rehab</option>
                        </select>
                      </label>

                      <label className="mt-4 block space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                          Assignment note
                        </span>
                        <textarea
                          value={assignmentNote[row.athleteId] || ''}
                          onChange={(event) =>
                            setAssignmentNote((current) => ({
                              ...current,
                              [row.athleteId]: event.target.value,
                            }))
                          }
                          placeholder="Add intent, emphasis, or a coaching lens for this athlete."
                          className="min-h-[130px] w-full rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[var(--chakra-neon)]/40"
                        />
                      </label>

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleAssign(row)}
                        className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[var(--saffron)] px-4 text-sm font-black text-black transition hover:brightness-110 disabled:opacity-60"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Assign today&apos;s session
                      </button>
                    </div>

                    <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        <MessageSquareQuote className="h-4 w-4 text-[var(--chakra-neon)]" />
                        Review and feedback
                      </div>

                      <label className="mt-4 block space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                          Feedback note
                        </span>
                        <textarea
                          value={feedback[row.athleteId] || ''}
                          onChange={(event) =>
                            setFeedback((current) => ({
                              ...current,
                              [row.athleteId]: event.target.value,
                            }))
                          }
                          placeholder="Reinforce what went well, flag a deviation, or guide the next session."
                          className="min-h-[182px] w-full rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[var(--chakra-neon)]/40"
                        />
                      </label>

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleFeedback(row)}
                        className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-white/12 bg-white/5 px-4 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-60"
                      >
                        <Gauge className="mr-2 h-4 w-4" />
                        Save coach feedback
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[30px] border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
              <p className="text-xl font-black text-white">No linked athletes yet</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Once athletes connect to your squad, this board becomes your execution control room.
              </p>
              <div className="mt-6 flex justify-center">
                <Link
                  href="/coach/dashboard"
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--saffron)] px-6 text-sm font-black text-black transition hover:brightness-110"
                >
                  Open locker code
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: string
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        <Icon className="h-4 w-4 text-[var(--chakra-neon)]" />
        {label}
      </div>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
    </div>
  )
}
