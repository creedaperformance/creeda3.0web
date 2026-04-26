'use client'

import { Minus, Plus } from 'lucide-react'

/**
 * Indian-foods protein portion picker. Each chip shows a familiar portion the
 * user can count, with grams of protein attached. The component returns the
 * total estimated protein grams and a per-chip breakdown so the engine can
 * later compute protein adequacy ratio against sport-specific targets.
 */

export type ProteinChip = {
  id: string
  label: string
  emoji: string
  proteinGrams: number
  hint?: string
  /** True if a vegetarian-leaning user might pick it. Used only for ordering. */
  vegFriendly?: boolean
}

export const PROTEIN_CHIPS: ProteinChip[] = [
  { id: 'dal_katori', label: '1 katori dal', emoji: '🥣', proteinGrams: 8, vegFriendly: true },
  { id: 'paneer_katori', label: '1 katori paneer', emoji: '🧀', proteinGrams: 15, vegFriendly: true },
  { id: 'curd_katori', label: '1 katori curd', emoji: '🥛', proteinGrams: 4, vegFriendly: true },
  { id: 'roti', label: '1 roti', emoji: '🫓', proteinGrams: 3, vegFriendly: true },
  { id: 'rice_cup', label: '1 cup rice', emoji: '🍚', proteinGrams: 4, vegFriendly: true },
  { id: 'egg', label: '1 egg', emoji: '🥚', proteinGrams: 6 },
  { id: 'chicken_breast', label: '1 chicken breast', emoji: '🍗', proteinGrams: 30 },
  { id: 'fish_fillet', label: '1 fish fillet', emoji: '🐟', proteinGrams: 22 },
  { id: 'mutton_serving', label: '1 mutton serving', emoji: '🥩', proteinGrams: 26 },
  { id: 'whey_scoop', label: '1 scoop whey', emoji: '🥤', proteinGrams: 24 },
  { id: 'soya_chunks', label: '1 katori soya chunks', emoji: '🫘', proteinGrams: 14, vegFriendly: true },
  { id: 'tofu', label: '1 katori tofu', emoji: '⬜', proteinGrams: 12, vegFriendly: true },
  { id: 'chana', label: '1 katori chana', emoji: '🟤', proteinGrams: 9, vegFriendly: true },
  { id: 'peanut_butter', label: '1 tbsp peanut butter', emoji: '🥜', proteinGrams: 4, vegFriendly: true },
  { id: 'sprouts', label: '1 katori sprouts', emoji: '🌱', proteinGrams: 7, vegFriendly: true },
  { id: 'nuts_handful', label: '1 handful nuts', emoji: '🌰', proteinGrams: 5, vegFriendly: true },
]

export type ProteinSelections = Record<string, number>

export function totalProteinGrams(selections: ProteinSelections) {
  return PROTEIN_CHIPS.reduce(
    (sum, chip) => sum + (selections[chip.id] ?? 0) * chip.proteinGrams,
    0
  )
}

export function totalProteinPortions(selections: ProteinSelections) {
  return PROTEIN_CHIPS.reduce((sum, chip) => sum + (selections[chip.id] ?? 0), 0)
}

export function ProteinPortionPicker({
  value,
  onChange,
  bodyMassKg,
  targetGPerKg,
}: {
  value: ProteinSelections
  onChange: (next: ProteinSelections) => void
  bodyMassKg?: number
  targetGPerKg?: number
}) {
  const totalGrams = totalProteinGrams(value)
  const targetGrams =
    bodyMassKg && targetGPerKg ? Math.round(bodyMassKg * targetGPerKg) : null
  const adequacyPct = targetGrams ? Math.round((totalGrams / targetGrams) * 100) : null

  function setQty(id: string, next: number) {
    const clamped = Math.max(0, Math.min(15, Math.round(next)))
    const updated = { ...value }
    if (clamped === 0) {
      delete updated[id]
    } else {
      updated[id] = clamped
    }
    onChange(updated)
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
          What you typically eat in a day
        </span>
        <span className="text-sm font-black text-white">
          {totalGrams} g
          {targetGrams ? <span className="text-white/40"> / {targetGrams} g target</span> : null}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-white/40">
        Tap + and − for each portion you eat. We add up grams so the engine can flag if your sport
        needs more.
      </p>

      {adequacyPct !== null ? (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${
                adequacyPct < 70
                  ? 'bg-rose-400'
                  : adequacyPct < 90
                    ? 'bg-amber-300'
                    : 'bg-[#6ee7b7]'
              }`}
              style={{ width: `${Math.min(100, adequacyPct)}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">
            {adequacyPct}% of sport-specific protein target
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {PROTEIN_CHIPS.map((chip) => {
          const qty = value[chip.id] ?? 0
          const active = qty > 0
          return (
            <div
              key={chip.id}
              className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                active ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/12' : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <span className="text-2xl" aria-hidden>
                {chip.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${active ? 'text-[#d1fae5]' : 'text-white/82'}`}>
                  {chip.label}
                </p>
                <p className="text-[10px] leading-tight text-white/45">
                  {chip.proteinGrams} g protein each
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setQty(chip.id, qty - 1)}
                  disabled={qty === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/65 transition hover:bg-white/[0.08] disabled:opacity-30"
                  aria-label={`Reduce ${chip.label}`}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center text-sm font-black text-white">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty(chip.id, qty + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/65 transition hover:bg-white/[0.08]"
                  aria-label={`Add ${chip.label}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
