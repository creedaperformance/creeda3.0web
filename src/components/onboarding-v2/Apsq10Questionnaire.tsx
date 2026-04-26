'use client'

import { CheckCircle2, ShieldAlert, TriangleAlert } from 'lucide-react'

/**
 * APSQ-10: Athlete Psychological Strain Questionnaire (Rice et al. 2020).
 * Each item is rated 0–4 ("Not at all" → "Most of the time").
 * Total score 0–40 with cutoffs:
 *   ≤14   → green
 *   15–19 → amber
 *   ≥20   → red (recommend qualified support; never auto-diagnose).
 */

export const APSQ10_QUESTIONS = [
  'I felt I was easily irritated.',
  'I felt my training was too much for me.',
  "I felt I wasn't enjoying my usual activities.",
  'I felt I was withdrawing from people around me.',
  "I felt I couldn't get my training right.",
  'I felt I was less confident.',
  'I felt I was overwhelmed by demands.',
  'I felt I had a lot of pressure on me.',
  'I felt I was unmotivated.',
  'I felt my performance was suffering.',
] as const

const RESPONSE_LABELS = ['Not at all', 'Rarely', 'Sometimes', 'Often', 'Most of the time'] as const

export type Apsq10Flag = 'green' | 'amber' | 'red' | null

export function apsq10Flag(responses: number[]): Apsq10Flag {
  if (responses.length !== 10 || responses.some((value) => !Number.isFinite(value))) {
    return null
  }
  const total = responses.reduce((sum, value) => sum + value, 0)
  if (total <= 14) return 'green'
  if (total <= 19) return 'amber'
  return 'red'
}

export function Apsq10Questionnaire({
  responses,
  onChange,
}: {
  responses: (number | undefined)[]
  onChange: (next: (number | undefined)[]) => void
}) {
  const numeric = responses.map((r) => (typeof r === 'number' ? r : undefined))
  const allAnswered = numeric.every((r) => typeof r === 'number')
  const total = allAnswered ? numeric.reduce((sum, r) => sum + (r ?? 0), 0) : null
  const flag = allAnswered ? apsq10Flag(numeric as number[]) : null

  function setResponse(index: number, value: number) {
    const next = [...numeric]
    next[index] = value
    onChange(next)
  }

  return (
    <div>
      <div>
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
          Over the last 7 days, how often did you feel…
        </span>
        <p className="mt-1 text-[11px] leading-relaxed text-white/40">
          APSQ-10 is a validated screen for athlete psychological strain. We use it to gate
          intensity guidance — never to diagnose anything. Scoring stays private to you.
        </p>
      </div>

      <ol className="mt-4 space-y-3">
        {APSQ10_QUESTIONS.map((question, index) => {
          const value = numeric[index]
          return (
            <li
              key={index}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3"
            >
              <p className="text-sm font-semibold leading-snug text-white/85">
                <span className="mr-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                  Q{index + 1}
                </span>
                {question}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[0, 1, 2, 3, 4].map((option) => {
                  const active = value === option
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setResponse(index, option)}
                      className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border px-3 py-2 transition ${
                        active
                          ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/15 text-[#d1fae5]'
                          : 'border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className="text-base font-black leading-none">{option}</span>
                      <span className="text-[9px] font-bold uppercase tracking-[0.16em] leading-none">
                        {RESPONSE_LABELS[option]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ol>

      {allAnswered && total !== null && flag ? (
        <Apsq10Result total={total} flag={flag} />
      ) : (
        <p className="mt-4 text-[11px] leading-relaxed text-white/45">
          Answer all 10 to see your strain band.
        </p>
      )}
    </div>
  )
}

function Apsq10Result({ total, flag }: { total: number; flag: 'green' | 'amber' | 'red' }) {
  if (flag === 'green') {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-300/30 bg-emerald-300/[0.06] p-3">
        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-emerald-100">
            Score {total}/40 — within typical range.
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-emerald-100/65">
            Strain markers look manageable. We will keep training prescriptions on plan.
          </p>
        </div>
      </div>
    )
  }
  if (flag === 'amber') {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/[0.06] p-3">
        <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-amber-100">
            Score {total}/40 — elevated strain.
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-100/70">
            We will soften load suggestions for a few days and watch your check-ins. Talking to a
            coach or counsellor often helps.
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-400/40 bg-rose-400/[0.06] p-3">
      <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-300" />
      <div className="min-w-0">
        <p className="text-sm font-bold text-rose-200">
          Score {total}/40 — high strain.
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-rose-100/75">
          We will cap intensity to recovery work for the next few days. Please consider speaking
          with someone you trust — a coach, a counsellor, or a sports psychologist. Creeda does not
          replace professional support.
        </p>
      </div>
    </div>
  )
}
