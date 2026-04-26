'use client'

import type {
  EventPriority,
  OnboardingV2PrimaryGoal,
  Persona,
  TimeHorizon,
} from '@creeda/schemas'

export type GoalFormState = {
  primary_goal: OnboardingV2PrimaryGoal
  goal_detail?: string
  time_horizon?: TimeHorizon
  has_target_event: boolean
  target_event_name?: string
  target_event_date?: string
  target_event_sport?: string
  target_event_priority?: EventPriority
}

const GOALS_BY_PERSONA: Record<
  Persona,
  Array<{ id: OnboardingV2PrimaryGoal; label: string; detail: string }>
> = {
  athlete: [
    { id: 'sport_performance', label: 'Sport performance', detail: 'Outperform last season.' },
    { id: 'event_prep', label: 'Event prep', detail: 'Build toward a specific competition.' },
    { id: 'strength_gain', label: 'Strength & power', detail: 'Add explosive output.' },
    { id: 'movement_quality', label: 'Movement quality', detail: 'Fix asymmetries before they bite.' },
    { id: 'return_to_play', label: 'Return to play', detail: 'Come back from an injury.' },
    { id: 'fat_loss', label: 'Body composition', detail: 'Lean up without losing performance.' },
    { id: 'general_fitness', label: 'General fitness', detail: 'Stay sharp in the off-season.' },
  ],
  individual: [
    { id: 'lose_fat', label: 'Lose fat', detail: 'Drop body fat sustainably.' },
    { id: 'build_strength', label: 'Build strength', detail: 'Get stronger across the basics.' },
    { id: 'move_pain_free', label: 'Move pain-free', detail: 'Daily aches → fluid movement.' },
    { id: 'improve_sleep', label: 'Improve sleep', detail: 'Wake more rested.' },
    { id: 'reduce_stress', label: 'Reduce stress', detail: 'Calm the nervous system.' },
    { id: 'run_faster', label: 'Run faster', detail: 'Hit a new pace or distance.' },
    { id: 'look_better', label: 'Look better', detail: 'Body confidence + composition.' },
    { id: 'feel_better', label: 'Just feel better', detail: 'More energy day to day.' },
  ],
  coach: [
    { id: 'coach_rehab', label: 'Rehab returns', detail: 'Get athletes back to full play.' },
    { id: 'coach_peak', label: 'Peak velocity', detail: 'Drive top-end performance.' },
    { id: 'coach_burnout', label: 'Avoid burnout', detail: 'Manage cumulative load.' },
    { id: 'coach_in_season', label: 'In-season maintenance', detail: 'Hold form across fixtures.' },
    { id: 'coach_preseason', label: 'Pre-season build', detail: 'Build the base for the season.' },
  ],
}

const TIME_HORIZONS: Array<{ id: TimeHorizon; label: string; detail: string }> = [
  { id: 'four_weeks', label: '4 weeks', detail: 'Sharp short cycle.' },
  { id: 'twelve_weeks', label: '12 weeks', detail: 'Standard mesocycle.' },
  { id: 'six_months', label: '6 months', detail: 'Long-arc preparation.' },
  { id: 'one_year', label: '1 year', detail: 'Full season / annual plan.' },
  { id: 'ongoing', label: 'Ongoing', detail: 'Consistency over a finish line.' },
]

const PRIORITY_OPTIONS: Array<{ id: EventPriority; label: string; detail: string }> = [
  { id: 'A', label: 'A — Peak event', detail: 'Top of the season — taper & peak.' },
  { id: 'B', label: 'B — Important', detail: 'Targeted but not the apex.' },
  { id: 'C', label: 'C — Tune-up', detail: 'Train through, no taper.' },
]

export function GoalForm({
  persona,
  value,
  onChange,
}: {
  persona: Persona
  value: GoalFormState
  onChange: (next: GoalFormState) => void
}) {
  const goals = GOALS_BY_PERSONA[persona]
  const showHorizonAndEvent = persona !== 'coach'

  return (
    <div className="space-y-5">
      {/* ── Primary goal ─────────────────────────────────────── */}
      <div>
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
          {persona === 'coach' ? 'Coaching priority' : 'Primary goal'}
        </span>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {goals.map((goal) => {
            const active = value.primary_goal === goal.id
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => onChange({ ...value, primary_goal: goal.id })}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  active
                    ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/15'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <p className={`text-sm font-bold ${active ? 'text-[#d1fae5]' : 'text-white/82'}`}>
                  {goal.label}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/50">{goal.detail}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Time horizon ─────────────────────────────────────── */}
      {showHorizonAndEvent ? (
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
            Time horizon
          </span>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {TIME_HORIZONS.map((option) => {
              const active = value.time_horizon === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChange({ ...value, time_horizon: option.id })}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${
                    active
                      ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/15'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                >
                  <p className={`text-sm font-bold ${active ? 'text-[#d1fae5]' : 'text-white/82'}`}>
                    {option.label}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-tight text-white/45">{option.detail}</p>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* ── Detail ───────────────────────────────────────────── */}
      <label className="block">
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
          One sentence on what success looks like (optional)
        </span>
        <input
          type="text"
          maxLength={180}
          value={value.goal_detail ?? ''}
          onChange={(event) =>
            onChange({ ...value, goal_detail: event.target.value.slice(0, 180) || undefined })
          }
          placeholder="e.g. Run a sub-50 10K by November"
          className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#6ee7b7]/70"
        />
      </label>

      {/* ── Target competition event ─────────────────────────── */}
      {showHorizonAndEvent ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
                Target competition event
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/40">
                If you have one in the next 12 months, we’ll auto-build a periodised peak-and-taper
                around it.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  has_target_event: !value.has_target_event,
                  target_event_priority: value.has_target_event ? undefined : 'B',
                })
              }
              className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] transition ${
                value.has_target_event
                  ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/15 text-[#d1fae5]'
                  : 'border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]'
              }`}
            >
              {value.has_target_event ? 'Yes' : 'No'}
            </button>
          </div>

          {value.has_target_event ? (
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                  Event name
                </span>
                <input
                  type="text"
                  maxLength={80}
                  value={value.target_event_name ?? ''}
                  onChange={(event) =>
                    onChange({ ...value, target_event_name: event.target.value.slice(0, 80) })
                  }
                  placeholder="Mumbai Marathon 2027"
                  className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#6ee7b7]/70"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                  Date
                </span>
                <input
                  type="date"
                  value={value.target_event_date ?? ''}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(event) =>
                    onChange({ ...value, target_event_date: event.target.value || undefined })
                  }
                  className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition focus:border-[#6ee7b7]/70"
                />
              </label>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                  Priority
                </span>
                <div className="mt-1 grid grid-cols-3 gap-1.5">
                  {PRIORITY_OPTIONS.map((option) => {
                    const active = value.target_event_priority === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => onChange({ ...value, target_event_priority: option.id })}
                        className={`rounded-xl border px-2 py-2 text-left transition ${
                          active
                            ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/15'
                            : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                        }`}
                      >
                        <p
                          className={`text-[11px] font-black uppercase tracking-[0.16em] ${
                            active ? 'text-[#d1fae5]' : 'text-white/72'
                          }`}
                        >
                          {option.label}
                        </p>
                        <p className="mt-0.5 text-[9px] leading-tight text-white/45">
                          {option.detail}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
