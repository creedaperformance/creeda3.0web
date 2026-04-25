'use client'

import { useState, useTransition } from 'react'
import { MessageSquareQuote, Send } from 'lucide-react'
import { toast } from 'sonner'

import { postCoachReportComment } from '@/app/coach/reports/[id]/actions'
import type { VideoAnalysisComment } from '@/lib/video-analysis/comments'

interface CoachAthleteCommentThreadProps {
  reportId: string
  comments: VideoAnalysisComment[]
  canPost: boolean
}

export function CoachAthleteCommentThread({
  reportId,
  comments,
  canPost,
}: CoachAthleteCommentThreadProps) {
  const [body, setBody] = useState('')
  const [pending, startTransition] = useTransition()

  const submit = () => {
    const trimmed = body.trim()
    if (trimmed.length < 1) return
    startTransition(async () => {
      const res = await postCoachReportComment({ reportId, body: trimmed })
      if ('error' in res) {
        toast.error(res.error)
        return
      }
      toast.success('Comment shared with the athlete.')
      setBody('')
    })
  }

  return (
    <section className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-center gap-2">
        <MessageSquareQuote className="h-4 w-4 text-[var(--persona-accent)]" />
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
          Coach feedback
        </p>
      </div>

      {comments.length === 0 ? (
        <p className="mt-3 text-sm text-white/45">
          {canPost
            ? 'No feedback posted yet. Drop a short note below — the athlete sees it on their report.'
            : 'No coach feedback on this scan yet. Your coach can add a note any time.'}
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl border border-white/[0.06] bg-black/30 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-white">
                  {c.coachName ?? 'Coach'}
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                  {new Date(c.createdAt).toLocaleString()}
                </p>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-white/75">
                {c.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      {canPost ? (
        <div className="mt-4">
          <label className="block text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            Add a note
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Tell the athlete what to focus on for the next session..."
            className="mt-2 w-full resize-none rounded-2xl border border-white/[0.08] bg-black/30 p-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--persona-accent)]/50"
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">
              {body.length}/2000
            </p>
            <button
              type="button"
              onClick={submit}
              disabled={pending || body.trim().length < 1}
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--persona-accent)] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-black disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              {pending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
