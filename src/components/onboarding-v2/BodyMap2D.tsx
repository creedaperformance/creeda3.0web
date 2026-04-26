'use client'

import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import type { OrthopedicHistoryEntry } from '@creeda/schemas'

import {
  BODY_REGIONS,
  BODY_REGION_BY_ID,
  CLINICIAN_OPTIONS,
  SEVERITY_OPTIONS,
  TIME_BUCKETS,
  dateFromBucket,
  regionsForView,
  type BodyRegionView,
  type TimeBucketId,
} from '@/lib/onboarding-v2/body-regions'

type ModalState = {
  regionId: string
  view: BodyRegionView
}

type DraftEntry = {
  severity: OrthopedicHistoryEntry['severity']
  bucket: TimeBucketId
  currently_symptomatic: boolean
  current_pain_score: number
  has_seen_clinician: boolean
  clinician_type: NonNullable<OrthopedicHistoryEntry['clinician_type']>
  notes: string
}

const DEFAULT_DRAFT: DraftEntry = {
  severity: 'annoying',
  bucket: 'last_month',
  currently_symptomatic: false,
  current_pain_score: 0,
  has_seen_clinician: false,
  clinician_type: 'none',
  notes: '',
}

export function BodyMap2D({
  entries,
  onChange,
}: {
  entries: OrthopedicHistoryEntry[]
  onChange: (next: OrthopedicHistoryEntry[]) => void
}) {
  const [view, setView] = useState<BodyRegionView>('front')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [draft, setDraft] = useState<DraftEntry>(DEFAULT_DRAFT)

  const visibleRegions = regionsForView(view)
  const flaggedRegionIds = new Set(entries.map((entry) => entry.body_region))

  function openRegion(regionId: string) {
    const region = BODY_REGION_BY_ID[regionId]
    if (!region) return
    setModal({ regionId, view: region.view })
    setDraft(DEFAULT_DRAFT)
  }

  function commitEntry() {
    if (!modal) return
    const newEntry: OrthopedicHistoryEntry = {
      body_region: modal.regionId,
      severity: draft.severity,
      occurred_at_estimate: dateFromBucket(draft.bucket),
      currently_symptomatic: draft.currently_symptomatic,
      current_pain_score: draft.currently_symptomatic ? draft.current_pain_score : undefined,
      has_seen_clinician: draft.has_seen_clinician,
      clinician_type: draft.has_seen_clinician ? draft.clinician_type : 'none',
      notes: draft.notes.trim() || undefined,
    }
    onChange([...entries, newEntry])
    setModal(null)
  }

  function removeEntry(index: number) {
    onChange(entries.filter((_, i) => i !== index))
  }

  function clearAll() {
    onChange([])
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => setView('front')}
            className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] transition ${
              view === 'front' ? 'bg-[#6ee7b7] text-slate-950' : 'text-white/55 hover:text-white'
            }`}
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => setView('back')}
            className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] transition ${
              view === 'back' ? 'bg-[#6ee7b7] text-slate-950' : 'text-white/55 hover:text-white'
            }`}
          >
            Back
          </button>
        </div>
        <button
          type="button"
          onClick={clearAll}
          className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white/70"
        >
          No injuries · skip
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        {/* ── 2D body silhouette with tappable regions ─────────── */}
        <div className="relative aspect-[1/2] w-full overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.01]">
          <BodySilhouette view={view} />
          {visibleRegions.map((region) => {
            const cxPct = `${region.cx * 100}%`
            const cyPct = `${region.cy * 100}%`
            const isFlagged = flaggedRegionIds.has(region.id)
            const isOpen = modal?.regionId === region.id
            return (
              <button
                key={region.id}
                type="button"
                title={region.label}
                aria-label={region.label}
                onClick={() => openRegion(region.id)}
                style={{ left: cxPct, top: cyPct }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition ${
                  isOpen
                    ? 'h-7 w-7 border-[#6ee7b7] bg-[#6ee7b7] shadow-[0_0_16px_rgba(110,231,183,0.6)]'
                    : isFlagged
                      ? 'h-6 w-6 border-rose-300/70 bg-rose-400/35 shadow-[0_0_10px_rgba(244,114,182,0.4)]'
                      : 'h-5 w-5 border-white/35 bg-white/[0.05] hover:border-[#6ee7b7] hover:bg-[#6ee7b7]/30'
                }`}
              />
            )
          })}
        </div>

        {/* ── Logged entries list ──────────────────────────────── */}
        <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black tracking-tight text-white">
              Logged history ({entries.length})
            </h4>
            <button
              type="button"
              onClick={() => openRegion(view === 'front' ? 'lower_back' : 'lower_back')}
              className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#6ee7b7] hover:text-[#a7f3d0]"
            >
              <Plus className="h-3.5 w-3.5" /> Add manually
            </button>
          </div>
          {entries.length === 0 ? (
            <p className="mt-3 text-xs leading-relaxed text-white/45">
              Tap any dot on the body to log an injury that lasted long enough to stop training.
              Every entry stays private and only sharpens your readiness model.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {entries.map((entry, idx) => {
                const region = BODY_REGION_BY_ID[entry.body_region]
                const severityLabel =
                  SEVERITY_OPTIONS.find((s) => s.id === entry.severity)?.label ?? entry.severity
                return (
                  <li
                    key={`${entry.body_region}-${idx}`}
                    className="flex items-start justify-between gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">
                        {region?.label ?? entry.body_region}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-white/55">
                        {severityLabel}
                        {entry.currently_symptomatic
                          ? ` · pain ${entry.current_pain_score ?? 0}/10 today`
                          : ' · resolved'}
                      </p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-white/35">
                        {entry.occurred_at_estimate}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEntry(idx)}
                      className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-rose-300"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Per-region modal ────────────────────────────────────── */}
      {modal ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 py-6 backdrop-blur sm:items-center"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/[0.06] bg-[#0F1015] p-5 shadow-2xl shadow-black/50"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#6ee7b7]">
                  {BODY_REGION_BY_ID[modal.regionId]?.view.toUpperCase()}
                </p>
                <h3 className="mt-1 text-lg font-black tracking-tight text-white">
                  {BODY_REGION_BY_ID[modal.regionId]?.label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                  Severity of the worst injury here
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {SEVERITY_OPTIONS.map((option) => {
                    const active = draft.severity === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setDraft({ ...draft, severity: option.id })}
                        className={`rounded-xl border px-3 py-2 text-left transition ${
                          active
                            ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/15'
                            : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                        }`}
                      >
                        <p className={`text-sm font-bold ${active ? 'text-[#d1fae5]' : 'text-white/82'}`}>
                          {option.label}
                        </p>
                        <p className="text-[10px] leading-snug text-white/45">{option.detail}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                  When did this happen?
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {TIME_BUCKETS.map((bucket) => {
                    const active = draft.bucket === bucket.id
                    return (
                      <button
                        key={bucket.id}
                        type="button"
                        onClick={() => setDraft({ ...draft, bucket: bucket.id })}
                        className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                          active
                            ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/15 text-[#d1fae5]'
                            : 'border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]'
                        }`}
                      >
                        {bucket.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                  Bothering you right now?
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({ ...draft, currently_symptomatic: false, current_pain_score: 0 })
                    }
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                      !draft.currently_symptomatic
                        ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/15 text-[#d1fae5]'
                        : 'border-white/10 bg-white/[0.03] text-white/65'
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, currently_symptomatic: true })}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                      draft.currently_symptomatic
                        ? 'border-amber-400/60 bg-amber-300/15 text-amber-100'
                        : 'border-white/10 bg-white/[0.03] text-white/65'
                    }`}
                  >
                    Yes
                  </button>
                </div>
                {draft.currently_symptomatic ? (
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                        Pain right now
                      </span>
                      <span className="text-sm font-black text-amber-200">
                        {draft.current_pain_score}/10
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={draft.current_pain_score}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          current_pain_score: Number(event.target.value),
                        })
                      }
                      className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-amber-300"
                    />
                  </div>
                ) : null}
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                  Have you seen a clinician for it?
                </p>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {CLINICIAN_OPTIONS.map((option) => {
                    const active =
                      (option.id === 'none' && !draft.has_seen_clinician) ||
                      (draft.has_seen_clinician && draft.clinician_type === option.id)
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            has_seen_clinician: option.id !== 'none',
                            clinician_type: option.id,
                          })
                        }
                        className={`rounded-xl border px-2 py-2 text-[11px] font-bold transition ${
                          active
                            ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/15 text-[#d1fae5]'
                            : 'border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]'
                        }`}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                  Notes (optional)
                </span>
                <textarea
                  value={draft.notes}
                  onChange={(event) => setDraft({ ...draft, notes: event.target.value.slice(0, 240) })}
                  placeholder="Anything Creeda should know — surgery, recurring pattern, medications."
                  className="mt-1 min-h-20 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#6ee7b7]/70"
                />
              </label>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white/72 transition hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={commitEntry}
                className="flex-1 rounded-2xl bg-[#6ee7b7] px-4 py-3 text-sm font-black text-slate-950 transition hover:brightness-110"
              >
                Save entry
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function BodySilhouette({ view }: { view: BodyRegionView }) {
  // Simple anatomical silhouette in pure SVG. Clean, fast, accessible —
  // intentionally minimal to keep the markers as the focus.
  return (
    <svg
      viewBox="0 0 100 200"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
      className="absolute inset-0 h-full w-full opacity-60"
    >
      <defs>
        <linearGradient id="bodyFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.10)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
        </linearGradient>
      </defs>
      {/* Head */}
      <ellipse cx="50" cy="10" rx="6.5" ry="8" fill="url(#bodyFill)" stroke="rgba(255,255,255,0.18)" strokeWidth="0.4" />
      {/* Neck */}
      <rect x="47" y="17" width="6" height="6" rx="2" fill="url(#bodyFill)" stroke="rgba(255,255,255,0.18)" strokeWidth="0.4" />
      {/* Torso */}
      <path
        d="M 30 24 Q 30 22 35 22 L 65 22 Q 70 22 70 24 L 72 50 Q 72 52 70 54 L 60 56 Q 58 58 58 60 L 56 92 Q 56 94 54 94 L 46 94 Q 44 94 44 92 L 42 60 Q 42 58 40 56 L 30 54 Q 28 52 28 50 Z"
        fill="url(#bodyFill)"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.4"
      />
      {/* Arms */}
      <path
        d="M 28 24 L 22 30 L 18 70 L 22 96 L 25 96 L 27 70 L 31 38 Z"
        fill="url(#bodyFill)"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.4"
      />
      <path
        d="M 72 24 L 78 30 L 82 70 L 78 96 L 75 96 L 73 70 L 69 38 Z"
        fill="url(#bodyFill)"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.4"
      />
      {/* Legs */}
      <path
        d="M 41 94 L 39 130 L 38 168 L 36 196 L 44 196 L 45 168 L 47 130 L 49 94 Z"
        fill="url(#bodyFill)"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.4"
      />
      <path
        d="M 51 94 L 53 130 L 55 168 L 56 196 L 64 196 L 62 168 L 61 130 L 59 94 Z"
        fill="url(#bodyFill)"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.4"
      />
      {view === 'back' ? (
        <text x="50" y="105" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.18)">
          back
        </text>
      ) : null}
    </svg>
  )
}
