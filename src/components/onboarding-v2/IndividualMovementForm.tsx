'use client'

import type { ActivityLevel, MovementPreference } from '@creeda/schemas'

const PREFERENCES: Array<{ id: MovementPreference; label: string; emoji: string }> = [
  { id: 'walking', label: 'Walking', emoji: '🚶' },
  { id: 'running', label: 'Running', emoji: '🏃' },
  { id: 'yoga', label: 'Yoga / Mobility', emoji: '🧘' },
  { id: 'strength', label: 'Strength / Gym', emoji: '🏋️' },
  { id: 'cycling', label: 'Cycling', emoji: '🚴' },
  { id: 'swimming', label: 'Swimming', emoji: '🏊' },
  { id: 'dance', label: 'Dance', emoji: '💃' },
  { id: 'sports', label: 'Recreational sports', emoji: '⚽' },
  { id: 'hiking', label: 'Hiking / Outdoors', emoji: '🥾' },
  { id: 'new_to_movement', label: "I'm new to all of this", emoji: '🌱' },
]

const ACTIVITY_LEVELS: Array<{ id: ActivityLevel; label: string; detail: string }> = [
  { id: 'sedentary', label: 'Sedentary', detail: 'Less than one session a week.' },
  { id: 'light', label: 'Light', detail: '1–2 sessions per week.' },
  { id: 'moderate', label: 'Moderate', detail: '3–4 sessions per week.' },
  { id: 'active', label: 'Active', detail: '5+ sessions per week.' },
]

export type IndividualMovementState = {
  movement_preferences: MovementPreference[]
  activity_level: ActivityLevel
  years_active: number
}

export function IndividualMovementForm({
  value,
  onChange,
}: {
  value: IndividualMovementState
  onChange: (next: IndividualMovementState) => void
}) {
  function togglePreference(id: MovementPreference) {
    const exists = value.movement_preferences.includes(id)
    onChange({
      ...value,
      movement_preferences: exists
        ? value.movement_preferences.filter((pref) => pref !== id)
        : [...value.movement_preferences, id].slice(0, 10),
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
          What kind of movement do you enjoy? (pick any)
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {PREFERENCES.map((option) => {
            const active = value.movement_preferences.includes(option.id)
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => togglePreference(option.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition ${
                  active
                    ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/15 text-[#d1fae5]'
                    : 'border-white/10 bg-white/[0.03] text-white/72 hover:bg-white/[0.06]'
                }`}
              >
                <span aria-hidden>{option.emoji}</span>
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
          Current activity level
        </span>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ACTIVITY_LEVELS.map((option) => {
            const active = value.activity_level === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onChange({ ...value, activity_level: option.id })}
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

      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
            Years of regular movement
          </span>
          <span className="text-sm font-black text-white">
            {value.years_active === 0 ? '< 1 year' : `${value.years_active} year${value.years_active === 1 ? '' : 's'}`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={30}
          step={1}
          value={value.years_active}
          onChange={(event) => onChange({ ...value, years_active: Number(event.target.value) })}
          className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#6ee7b7]"
        />
      </div>
    </div>
  )
}
