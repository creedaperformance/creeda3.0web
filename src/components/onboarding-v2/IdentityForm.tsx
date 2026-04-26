'use client'

import { useState } from 'react'
import type { Identity } from '@creeda/schemas'

const SEX_OPTIONS: Array<{ id: Identity['biological_sex']; label: string }> = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'intersex', label: 'Intersex' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say' },
]

const DOMINANCE_OPTIONS: Array<{ id: Identity['dominant_hand']; label: string }> = [
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
  { id: 'ambidextrous', label: 'Both' },
]

const KG_PER_LB = 0.45359237
const CM_PER_INCH = 2.54

function cmToImperial(cm: number) {
  const totalInches = cm / CM_PER_INCH
  const ft = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches - ft * 12)
  return { ft, inches: inches >= 12 ? 0 : inches, ftAdj: inches >= 12 ? ft + 1 : ft }
}
function imperialToCm(ft: number, inches: number) {
  return Math.round((ft * 12 + inches) * CM_PER_INCH)
}
function kgToLb(kg: number) {
  return Math.round(kg / KG_PER_LB)
}
function lbToKg(lb: number) {
  return Math.round(lb * KG_PER_LB)
}

export function IdentityForm({
  value,
  onChange,
}: {
  value: Identity
  onChange: (next: Identity) => void
}) {
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric')

  return (
    <div className="space-y-5">
      {/* ── Display name ─────────────────────────────────────── */}
      <label className="block">
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
          Name
        </span>
        <input
          type="text"
          maxLength={40}
          value={value.display_name}
          onChange={(event) => onChange({ ...value, display_name: event.target.value.slice(0, 40) })}
          placeholder="What should Creeda call you?"
          className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#6ee7b7]/70"
        />
      </label>

      {/* ── DOB ─────────────────────────────────────────────── */}
      <label className="block">
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
          Date of birth
        </span>
        <input
          type="date"
          value={value.date_of_birth}
          min="1925-01-01"
          max={new Date().toISOString().slice(0, 10)}
          onChange={(event) =>
            onChange({ ...value, date_of_birth: event.target.value || value.date_of_birth })
          }
          className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#6ee7b7]/70"
        />
        <p className="mt-1 text-[11px] leading-relaxed text-white/40">
          Used for age-appropriate baselines and safety guardrails. Never displayed publicly.
        </p>
      </label>

      {/* ── Biological sex ──────────────────────────────────── */}
      <div>
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
          Biological sex
        </span>
        <p className="mt-1 text-[11px] leading-relaxed text-white/40">
          Sports physiology questions (HRV norms, RED-S risk, iron baselines) are calibrated by
          biological sex. Gender identity is captured separately below.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SEX_OPTIONS.map((option) => {
            const active = value.biological_sex === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onChange({ ...value, biological_sex: option.id })}
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
      </div>

      {/* ── Gender identity ─────────────────────────────────── */}
      <label className="block">
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
          Gender identity (optional)
        </span>
        <input
          type="text"
          maxLength={40}
          value={value.gender_identity ?? ''}
          onChange={(event) =>
            onChange({ ...value, gender_identity: event.target.value.slice(0, 40) || undefined })
          }
          placeholder="How you describe yourself"
          className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#6ee7b7]/70"
        />
      </label>

      {/* ── Units toggle ────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Units</span>
        <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => setUnits('metric')}
            className={`rounded-full px-4 py-1 text-[11px] font-bold uppercase tracking-[0.18em] transition ${
              units === 'metric' ? 'bg-[#6ee7b7] text-slate-950' : 'text-white/55 hover:text-white'
            }`}
          >
            cm / kg
          </button>
          <button
            type="button"
            onClick={() => setUnits('imperial')}
            className={`rounded-full px-4 py-1 text-[11px] font-bold uppercase tracking-[0.18em] transition ${
              units === 'imperial' ? 'bg-[#6ee7b7] text-slate-950' : 'text-white/55 hover:text-white'
            }`}
          >
            ft / lb
          </button>
        </div>
      </div>

      {/* ── Height + weight ─────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {units === 'metric' ? (
          <>
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
                  Height
                </span>
                <span className="text-sm font-black text-white">{value.height_cm} cm</span>
              </div>
              <input
                type="range"
                min={100}
                max={230}
                step={1}
                value={value.height_cm}
                onChange={(event) => onChange({ ...value, height_cm: Number(event.target.value) })}
                className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#6ee7b7]"
              />
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
                  Weight
                </span>
                <span className="text-sm font-black text-white">{value.weight_kg} kg</span>
              </div>
              <input
                type="range"
                min={30}
                max={200}
                step={1}
                value={value.weight_kg}
                onChange={(event) => onChange({ ...value, weight_kg: Number(event.target.value) })}
                className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#6ee7b7]"
              />
            </div>
          </>
        ) : (
          <>
            <ImperialHeight
              cm={value.height_cm}
              onChange={(cm) => onChange({ ...value, height_cm: cm })}
            />
            <ImperialWeight
              kg={value.weight_kg}
              onChange={(kg) => onChange({ ...value, weight_kg: kg })}
            />
          </>
        )}
      </div>

      {/* ── Dominant hand + leg ─────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
            Dominant hand
          </span>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {DOMINANCE_OPTIONS.map((option) => {
              const active = value.dominant_hand === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChange({ ...value, dominant_hand: option.id })}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
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
        </div>
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
            Dominant leg
          </span>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {DOMINANCE_OPTIONS.map((option) => {
              const active = value.dominant_leg === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChange({ ...value, dominant_leg: option.id })}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
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
        </div>
      </div>
    </div>
  )
}

function ImperialHeight({ cm, onChange }: { cm: number; onChange: (cm: number) => void }) {
  const { ft, inches, ftAdj } = cmToImperial(cm)
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
          Height
        </span>
        <span className="text-sm font-black text-white">
          {ftAdj} ft {inches} in
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <select
          value={ft}
          onChange={(event) => onChange(imperialToCm(Number(event.target.value), inches))}
          className="h-11 rounded-xl border border-white/10 bg-[#07111f] px-3 text-sm font-bold text-white outline-none transition focus:border-[#6ee7b7]/70"
        >
          {Array.from({ length: 6 }, (_, i) => i + 3).map((f) => (
            <option key={f} value={f}>
              {f} ft
            </option>
          ))}
        </select>
        <select
          value={inches}
          onChange={(event) => onChange(imperialToCm(ft, Number(event.target.value)))}
          className="h-11 rounded-xl border border-white/10 bg-[#07111f] px-3 text-sm font-bold text-white outline-none transition focus:border-[#6ee7b7]/70"
        >
          {Array.from({ length: 12 }, (_, i) => i).map((inc) => (
            <option key={inc} value={inc}>
              {inc} in
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function ImperialWeight({ kg, onChange }: { kg: number; onChange: (kg: number) => void }) {
  const lb = kgToLb(kg)
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
          Weight
        </span>
        <span className="text-sm font-black text-white">{lb} lb</span>
      </div>
      <input
        type="range"
        min={66}
        max={440}
        step={1}
        value={lb}
        onChange={(event) => onChange(lbToKg(Number(event.target.value)))}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#6ee7b7]"
      />
    </div>
  )
}
