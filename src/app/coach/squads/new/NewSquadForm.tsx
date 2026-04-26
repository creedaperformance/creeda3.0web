'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

const FOCUS_OPTIONS = [
  { id: 'preseason_build', label: 'Preseason build' },
  { id: 'in_season_maintenance', label: 'In-season maintenance' },
  { id: 'peak_velocity', label: 'Peak velocity' },
  { id: 'avoid_burnout', label: 'Avoid burnout' },
  { id: 'rehab', label: 'Rehab returns' },
] as const

const SPORT_OPTIONS = [
  'Cricket',
  'Football',
  'Badminton',
  'Athletics',
  'Kabaddi',
  'Hockey',
  'Tennis',
  'Volleyball',
  'Basketball',
  'Wrestling',
  'Boxing',
  'Strength sports',
  'CrossFit',
  'Cycling',
  'Running',
  'Swimming',
  'General fitness',
  'Other',
]

export function NewSquadForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [sport, setSport] = useState('Cricket')
  const [level, setLevel] = useState('Academy')
  const [sizeEstimate, setSizeEstimate] = useState<number>(12)
  const [focus, setFocus] = useState<(typeof FOCUS_OPTIONS)[number]['id']>('in_season_maintenance')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Give the squad a name.')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          sport,
          level: level.trim() || 'Academy',
          size_estimate: sizeEstimate,
          primary_focus: focus,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Could not save squad.')
      router.replace(`/coach/squads/${data.squad.id}`)
    } catch (err) {
      setError((err as Error).message)
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Squad name">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value.slice(0, 80))}
          placeholder='e.g. "U19 Cricket — Mumbai Academy"'
          maxLength={80}
          required
          className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#6ee7b7]/70"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sport">
          <select
            value={sport}
            onChange={(event) => setSport(event.target.value)}
            className="h-12 w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 text-sm font-bold text-white outline-none transition focus:border-[#6ee7b7]/70"
          >
            {SPORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Level / Age group">
          <input
            type="text"
            value={level}
            onChange={(event) => setLevel(event.target.value.slice(0, 60))}
            placeholder="Academy / U19 / 1st team"
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#6ee7b7]/70"
          />
        </Field>
      </div>

      <Field label="Approximate squad size">
        <input
          type="number"
          min={0}
          max={500}
          value={sizeEstimate}
          onChange={(event) =>
            setSizeEstimate(Math.max(0, Math.min(500, Number(event.target.value) || 0)))
          }
          className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#6ee7b7]/70"
        />
      </Field>

      <Field label="Primary focus">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {FOCUS_OPTIONS.map((option) => {
            const active = focus === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setFocus(option.id)}
                className={`rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition ${
                  active
                    ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/15 text-[#d1fae5]'
                    : 'border-white/10 bg-white/[0.03] text-white/72 hover:bg-white/[0.06]'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </Field>

      {error ? <p className="text-sm font-bold text-rose-300">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#6ee7b7] px-5 text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition hover:brightness-110 disabled:opacity-50"
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isSubmitting ? 'Saving…' : 'Create squad + invite'}
      </button>
    </form>
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
      <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  )
}
