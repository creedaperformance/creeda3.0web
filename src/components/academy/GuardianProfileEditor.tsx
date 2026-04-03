'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, HeartHandshake, ShieldCheck, Users } from 'lucide-react'

import {
  type GuardianConsentStatus,
  type GuardianProfileSummary,
  type ParentHandoffPreference,
} from '@/lib/academy/workflows'
import { saveAthleteGuardianProfile } from '@/app/actions/academy'

interface GuardianProfileEditorProps {
  isJuniorAthlete: boolean
  athleteAge: number | null
  initialSummary: GuardianProfileSummary
}

export function GuardianProfileEditor({
  isJuniorAthlete,
  athleteAge,
  initialSummary,
}: GuardianProfileEditorProps) {
  const router = useRouter()
  const [guardianName, setGuardianName] = React.useState(initialSummary.guardianName || '')
  const [guardianRelationship, setGuardianRelationship] = React.useState(initialSummary.guardianRelationship || '')
  const [guardianPhone, setGuardianPhone] = React.useState(initialSummary.guardianPhone || '')
  const [guardianEmail, setGuardianEmail] = React.useState(initialSummary.guardianEmail || '')
  const [emergencyContactName, setEmergencyContactName] = React.useState(initialSummary.emergencyContactName || '')
  const [emergencyContactPhone, setEmergencyContactPhone] = React.useState(initialSummary.emergencyContactPhone || '')
  const [consentStatus, setConsentStatus] = React.useState<Exclude<GuardianConsentStatus, 'coach_confirmed'>>(
    initialSummary.consentStatus === 'coach_confirmed' ? 'confirmed' : initialSummary.consentStatus
  )
  const [handoffPreference, setHandoffPreference] = React.useState<ParentHandoffPreference>(
    initialSummary.handoffPreference
  )
  const [notes, setNotes] = React.useState(initialSummary.notes || '')
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSaving(true)

    const result = await saveAthleteGuardianProfile({
      guardianName,
      guardianRelationship,
      guardianPhone,
      guardianEmail,
      emergencyContactName,
      emergencyContactPhone,
      consentStatus,
      handoffPreference,
      notes,
    })

    setIsSaving(false)

    if (result?.error) {
      setError(result.error)
      return
    }

    setSuccess('Guardian details updated. Returning you to the dashboard.')
    router.push(result?.redirectTo || '/athlete/dashboard')
    router.refresh()
  }

  return (
    <div className="space-y-8 pb-20">
      <section className="rounded-[2.2rem] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(245,124,0,0.14),transparent_44%),rgba(255,255,255,0.02)] p-8 sm:p-10">
        <div className="max-w-3xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary">Guardian And Family</p>
          <h1 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight text-white">
            Junior-athlete safety needs family clarity.
          </h1>
          <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-300">
            Creeda uses this page to support junior-athlete consent, parent handoff, and low-cost academy communication. Adults can still add an emergency contact, but junior athletes should keep this section complete.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <StatusChip label={isJuniorAthlete ? `Junior athlete${typeof athleteAge === 'number' ? ` (${athleteAge})` : ''}` : 'Adult athlete'} icon={Users} />
            <StatusChip label={initialSummary.statusLabel} icon={ShieldCheck} tone={initialSummary.handoffReady ? 'emerald' : 'amber'} />
            {initialSummary.lastHandoffSentAt ? (
              <StatusChip label="Parent handoff has history" icon={HeartHandshake} tone="blue" />
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
        <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.02] p-6 sm:p-7">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Current status</p>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">{initialSummary.statusLabel}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{initialSummary.nextAction}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MiniMetric label="Guardian contact" value={initialSummary.guardianName ? 'Present' : 'Missing'} />
            <MiniMetric label="Emergency contact" value={initialSummary.emergencyContactName ? 'Present' : 'Missing'} />
            <MiniMetric label="Consent" value={formatConsentStatus(initialSummary.consentStatus)} />
            <MiniMetric label="Parent handoff" value={initialSummary.handoffReady ? 'Ready' : 'Not ready'} />
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Why this matters</p>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-300">
              <p>Junior-athlete workflows work best when the coach, athlete, and guardian all have the same picture of readiness, restrictions, and unusual day context.</p>
              <p>Creeda uses this data for parent handoff and emergency clarity. It does not replace medical or safeguarding processes.</p>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/[0.08] bg-white/[0.02] p-6 sm:p-7 space-y-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Update family context</p>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
              Keep the parent handoff clean and usable
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Add the main guardian, a real contact route, and one emergency contact. That is enough for Creeda’s current academy workflow.
            </p>
          </div>

          <FieldGroup label="Guardian name">
            <input
              value={guardianName}
              onChange={(event) => setGuardianName(event.target.value)}
              placeholder="Example: Priya Sharma"
              className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-primary/40"
            />
          </FieldGroup>

          <FieldGroup label="Relationship to athlete">
            <input
              value={guardianRelationship}
              onChange={(event) => setGuardianRelationship(event.target.value)}
              placeholder="Example: Mother, Father, Guardian"
              className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-primary/40"
            />
          </FieldGroup>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldGroup label="Guardian phone">
              <input
                value={guardianPhone}
                onChange={(event) => setGuardianPhone(event.target.value)}
                placeholder="+91..."
                className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-primary/40"
              />
            </FieldGroup>
            <FieldGroup label="Guardian email">
              <input
                value={guardianEmail}
                onChange={(event) => setGuardianEmail(event.target.value)}
                placeholder="guardian@example.com"
                className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-primary/40"
              />
            </FieldGroup>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldGroup label="Emergency contact name">
              <input
                value={emergencyContactName}
                onChange={(event) => setEmergencyContactName(event.target.value)}
                placeholder="Example: Uncle Raj"
                className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-primary/40"
              />
            </FieldGroup>
            <FieldGroup label="Emergency contact phone">
              <input
                value={emergencyContactPhone}
                onChange={(event) => setEmergencyContactPhone(event.target.value)}
                placeholder="+91..."
                className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-primary/40"
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Guardian consent status">
            <select
              value={consentStatus}
              onChange={(event) => setConsentStatus(event.target.value as Exclude<GuardianConsentStatus, 'coach_confirmed'>)}
              className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-primary/40"
            >
              <option value="unknown">Not answered yet</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="declined">Declined / on hold</option>
            </select>
          </FieldGroup>

          <FieldGroup label="Preferred parent handoff route">
            <select
              value={handoffPreference}
              onChange={(event) => setHandoffPreference(event.target.value as ParentHandoffPreference)}
              className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-primary/40"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="coach_led">Coach-led only</option>
              <option value="none">Do not use parent handoff</option>
            </select>
          </FieldGroup>

          <FieldGroup label="Notes for coach or academy ops" hint="Optional. Use this for school constraints, pickup rules, or family communication context.">
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Example: Weekday school exams, no calls during class hours, travel every Friday evening."
              className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none resize-none focus:border-primary/40"
            />
          </FieldGroup>

          {isJuniorAthlete ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Junior-athlete mode is active, so guardian and emergency-contact details are expected before parent handoff can be considered ready.
            </div>
          ) : (
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
              Adult athletes can still use this section as an emergency-contact and communication backup.
            </div>
          )}

          {error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          ) : null}

          {success ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {success}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShieldCheck className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Guardian Details'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/athlete/dashboard')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition-all hover:bg-white/[0.05]"
            >
              Back to dashboard
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</label>
        {hint ? <span className="text-[10px] text-slate-500">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

function StatusChip({
  label,
  icon: Icon,
  tone = 'amber',
}: {
  label: string
  icon: typeof ShieldCheck
  tone?: 'amber' | 'emerald' | 'blue'
}) {
  const classes =
    tone === 'emerald'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
      : tone === 'blue'
        ? 'border-blue-500/20 bg-blue-500/10 text-blue-100'
        : 'border-amber-500/20 bg-amber-500/10 text-amber-100'

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${classes}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

function formatConsentStatus(status: GuardianConsentStatus) {
  switch (status) {
    case 'confirmed':
      return 'Confirmed'
    case 'coach_confirmed':
      return 'Coach confirmed'
    case 'pending':
      return 'Pending'
    case 'declined':
      return 'Declined'
    default:
      return 'Not answered'
  }
}
