'use client'

import type { TrainingLoadSnapshot } from '@creeda/schemas'

const RPE_ANCHORS: Record<3 | 6 | 9, string> = {
  3: 'Could do this all day',
  6: 'Uncomfortable but sustainable',
  9: 'Near max effort',
}

const SESSION_DURATIONS = [15, 30, 45, 60, 90, 120, 150] as const

const PATTERN_OPTIONS: Array<{
  id: TrainingLoadSnapshot['pattern_4_weeks']
  label: string
  detail: string
}> = [
  { id: 'same', label: 'Same as usual', detail: 'Steady, consistent.' },
  { id: 'more_now', label: 'Doing more', detail: 'Volume / intensity up vs. last month.' },
  { id: 'less_now', label: 'Doing less', detail: 'Tapered or interrupted.' },
  { id: 'returning_from_break', label: 'Coming back', detail: 'Returning after time off.' },
]

export function TrainingLoadForm({
  value,
  onChange,
}: {
  value: TrainingLoadSnapshot
  onChange: (next: TrainingLoadSnapshot) => void
}) {
  return (
    <div className="space-y-5">
      {/* ── Sessions per week ────────────────────────────────── */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
            Sessions in a typical week
          </span>
          <span className="text-2xl font-black text-white">{value.weekly_sessions}</span>
        </div>
        <input
          type="range"
          min={0}
          max={14}
          step={1}
          value={value.weekly_sessions}
          onChange={(event) => onChange({ ...value, weekly_sessions: Number(event.target.value) })}
          className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#6ee7b7]"
        />
        <div className="mt-1 flex justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
          <span>0</span>
          <span>14</span>
        </div>
      </div>

      {/* ── Session duration ─────────────────────────────────── */}
      <div>
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
          Average session length
        </span>
        <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
          {SESSION_DURATIONS.map((duration) => {
            const active = value.avg_session_minutes === duration
            return (
              <button
                key={duration}
                type="button"
                onClick={() => onChange({ ...value, avg_session_minutes: duration })}
                className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                  active
                    ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/15 text-[#d1fae5]'
                    : 'border-white/10 bg-white/[0.03] text-white/72 hover:bg-white/[0.06]'
                }`}
              >
                {duration}
                <span className="ml-1 text-[10px] text-white/40">min</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Anchored RPE ─────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
            Typical session intensity (RPE)
          </span>
          <span className="text-2xl font-black text-white">{value.typical_rpe.toFixed(0)}/10</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={value.typical_rpe}
          onChange={(event) => onChange({ ...value, typical_rpe: Number(event.target.value) })}
          className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#6ee7b7]"
        />
        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] leading-snug">
          {([3, 6, 9] as const).map((rpe) => (
            <div key={rpe} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
              <p className="font-black text-white/65">RPE {rpe}</p>
              <p className="text-white/45">&ldquo;{RPE_ANCHORS[rpe]}&rdquo;</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4-week pattern ───────────────────────────────────── */}
      <div>
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
          Has this been roughly your pattern for the last 4 weeks?
        </span>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {PATTERN_OPTIONS.map((option) => {
            const active = value.pattern_4_weeks === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onChange({ ...value, pattern_4_weeks: option.id })}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  active
                    ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/15'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <p className={`text-sm font-bold ${active ? 'text-[#d1fae5]' : 'text-white/82'}`}>
                  {option.label}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">{option.detail}</p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
