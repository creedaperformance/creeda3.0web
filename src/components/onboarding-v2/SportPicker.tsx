'use client'

import { useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'

import {
  SPORT_CATALOG,
  SPORT_BY_ID,
  COMPETITIVE_LEVELS,
  getPositionsForSport,
  searchSports,
  type CompetitiveLevelId,
  type SportEntry,
  type SportPosition,
} from '@/lib/onboarding-v2/sports'

export type SportSelection = {
  sportId: string
  sportLabel: string
  positionId?: string
  positionLabel?: string
  customPosition?: string
  competitiveLevel: CompetitiveLevelId
  yearsInSport: number
  secondarySportId?: string
}

const POPULAR_IDS = [
  'cricket',
  'football',
  'badminton',
  'athletics',
  'kabaddi',
  'hockey',
  'tennis',
  'volleyball',
  'basketball',
  'general_fitness',
]

export function SportPicker({
  value,
  onChange,
}: {
  value: SportSelection
  onChange: (next: SportSelection) => void
}) {
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)

  const popular = useMemo(
    () => SPORT_CATALOG.filter((sport) => POPULAR_IDS.includes(sport.id)),
    []
  )
  const filtered = useMemo(() => {
    if (query.trim().length === 0) {
      return showAll ? SPORT_CATALOG : popular
    }
    return searchSports(query)
  }, [query, showAll, popular])

  const selectedSport = SPORT_BY_ID[value.sportId]
  const positions = getPositionsForSport(value.sportId)

  function handleSelectSport(sport: SportEntry) {
    onChange({
      ...value,
      sportId: sport.id,
      sportLabel: sport.label,
      positionId: undefined,
      positionLabel: undefined,
      customPosition: undefined,
    })
  }

  function handleSelectPosition(position: SportPosition) {
    onChange({
      ...value,
      positionId: position.id,
      positionLabel: position.label,
      customPosition: undefined,
    })
  }

  return (
    <div className="space-y-5">
      {/* ── Sport ─────────────────────────────────────────────── */}
      <div>
        <label className="block">
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
            Your sport
          </span>
          <div className="mt-2 relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search — e.g. cricket, football, running"
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#6ee7b7]/70"
            />
          </div>
        </label>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {filtered.map((sport) => {
            const active = sport.id === value.sportId
            return (
              <button
                key={sport.id}
                type="button"
                onClick={() => handleSelectSport(sport)}
                className={`flex items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                  active
                    ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/15 text-[#d1fae5]'
                    : 'border-white/10 bg-white/[0.03] text-white/72 hover:bg-white/[0.06]'
                }`}
              >
                <span className="truncate">{sport.label}</span>
                {active ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            )
          })}
        </div>

        {query.trim().length === 0 && !showAll ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-[#6ee7b7] hover:text-[#a7f3d0]"
          >
            Show all sports →
          </button>
        ) : null}
      </div>

      {/* ── Position / discipline ─────────────────────────────── */}
      {positions.length > 0 ? (
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
            Position / discipline
          </span>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {positions.map((position) => {
              const active = value.positionId === position.id
              return (
                <button
                  key={position.id}
                  type="button"
                  onClick={() => handleSelectPosition(position)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    active
                      ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/15'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                >
                  <p className={`text-sm font-bold ${active ? 'text-[#d1fae5]' : 'text-white/82'}`}>
                    {position.label}
                  </p>
                  {position.hint ? (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-white/50">{position.hint}</p>
                  ) : null}
                </button>
              )
            })}
          </div>
          <label className="mt-3 block">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
              Or add a custom role
            </span>
            <input
              type="text"
              value={value.customPosition ?? ''}
              onChange={(event) =>
                onChange({
                  ...value,
                  customPosition: event.target.value.slice(0, 60),
                  positionId: undefined,
                  positionLabel: undefined,
                })
              }
              placeholder="e.g. Pace bowler / left-arm seam"
              className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#6ee7b7]/70"
            />
          </label>
        </div>
      ) : selectedSport ? (
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
            Specialty (optional)
          </span>
          <input
            type="text"
            value={value.customPosition ?? ''}
            onChange={(event) =>
              onChange({ ...value, customPosition: event.target.value.slice(0, 60) })
            }
            placeholder="Free-text — e.g. heavyweight, sprint, all-day endurance"
            className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#6ee7b7]/70"
          />
        </div>
      ) : null}

      {/* ── Competitive level ─────────────────────────────────── */}
      <div>
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
          Competitive level
        </span>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COMPETITIVE_LEVELS.map((level) => {
            const active = value.competitiveLevel === level.id
            return (
              <button
                key={level.id}
                type="button"
                onClick={() => onChange({ ...value, competitiveLevel: level.id })}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${
                  active
                    ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/15'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <p className={`text-sm font-bold ${active ? 'text-[#d1fae5]' : 'text-white/82'}`}>
                  {level.label}
                </p>
                <p className="mt-0.5 text-[10px] leading-tight text-white/45">{level.detail}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Years in sport ────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
            Years training in this sport
          </span>
          <span className="text-sm font-black text-white">
            {value.yearsInSport === 0 ? '< 1 year' : `${value.yearsInSport} year${value.yearsInSport === 1 ? '' : 's'}`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={30}
          step={1}
          value={value.yearsInSport}
          onChange={(event) => onChange({ ...value, yearsInSport: Number(event.target.value) })}
          className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#6ee7b7]"
        />
      </div>

      {/* ── Secondary sport ───────────────────────────────────── */}
      <div>
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
          Secondary sport (optional)
        </span>
        <select
          value={value.secondarySportId ?? ''}
          onChange={(event) =>
            onChange({
              ...value,
              secondarySportId: event.target.value || undefined,
            })
          }
          className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 text-sm font-bold text-white outline-none transition focus:border-[#6ee7b7]/70"
        >
          <option value="">None</option>
          {SPORT_CATALOG.filter((sport) => sport.id !== value.sportId).map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
