'use client'

import { ShieldAlert } from 'lucide-react'

export type AgeGateState = {
  date_of_birth: string
  guardian_email?: string
}

function ageFromDob(dob: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null
  const birth = new Date(dob)
  if (Number.isNaN(birth.valueOf())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1
  return age
}

export function getAgeGateOutcome(state: AgeGateState) {
  const age = ageFromDob(state.date_of_birth)
  if (age === null) return { age: null, status: 'incomplete' as const }
  if (age < 13) return { age, status: 'blocked' as const }
  if (age < 18) return { age, status: 'guardian_required' as const }
  if (age >= 65) return { age, status: 'senior_modified' as const }
  return { age, status: 'ok' as const }
}

export function AgeGateForm({
  value,
  onChange,
}: {
  value: AgeGateState
  onChange: (next: AgeGateState) => void
}) {
  const outcome = getAgeGateOutcome(value)

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
          Date of birth
        </span>
        <input
          type="date"
          value={value.date_of_birth}
          min="1925-01-01"
          max={new Date().toISOString().slice(0, 10)}
          onChange={(event) => onChange({ ...value, date_of_birth: event.target.value })}
          className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#6ee7b7]/70"
        />
      </label>

      {outcome.status === 'blocked' ? (
        <div className="rounded-2xl border border-rose-400/40 bg-rose-400/10 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-rose-300" />
            <div className="text-sm leading-relaxed text-rose-100/85">
              <p className="font-bold text-rose-200">Creeda is not built for under-13s yet.</p>
              <p className="mt-1 text-rose-100/70">
                Your child can come back to us when they’re a bit older. In the meantime, please
                see a sports physio in person for any injury concerns.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {outcome.status === 'guardian_required' ? (
        <div className="rounded-2xl border border-amber-300/30 bg-amber-300/[0.06] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-300" />
            <div className="text-sm leading-relaxed text-amber-100/85">
              <p className="font-bold text-amber-200">A parent or guardian needs to consent.</p>
              <p className="mt-1 text-amber-100/70">
                Because you’re under 18, we’ll send a confirmation email to your guardian. Creeda
                stays paused for training prescriptions until they confirm.
              </p>
            </div>
          </div>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-100/55">
              Guardian email
            </span>
            <input
              type="email"
              value={value.guardian_email ?? ''}
              onChange={(event) => onChange({ ...value, guardian_email: event.target.value })}
              placeholder="parent@example.com"
              className="mt-1 h-11 w-full rounded-xl border border-amber-300/30 bg-black/20 px-3 text-sm text-amber-50 outline-none transition placeholder:text-amber-100/30 focus:border-amber-300/60"
            />
          </label>
        </div>
      ) : null}

      {outcome.status === 'senior_modified' ? (
        <div className="rounded-2xl border border-sky-300/30 bg-sky-300/[0.06] p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-sky-300" />
            <div className="text-sm leading-relaxed text-sky-100/85">
              <p className="font-bold text-sky-200">Senior-appropriate calibration enabled.</p>
              <p className="mt-1 text-sky-100/70">
                Creeda will start in a more conservative mode and ramp progressively. You can ask
                your doctor to clear you for full intensity from Settings → Health any time.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {outcome.status === 'ok' ? (
        <p className="text-[11px] leading-relaxed text-white/40">
          Used for age-appropriate baselines and safety guardrails. Never displayed publicly.
        </p>
      ) : null}
    </div>
  )
}
