'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Copy,
  Mail,
  Phone,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  buildParentHandoffMessage,
  type AcademyAgeBand,
  type AcademyTeamProfile,
  type AcademyType,
  type GuardianProfileSummary,
} from '@/lib/academy/workflows'
import { markGuardianHandoffSent, updateCoachAcademyTeamSettings } from '@/app/actions/academy'

interface CoachAcademyAthleteRow {
  athleteId: string
  athleteName: string
  avatarUrl: string | null
  teamId: string
  teamName: string
  academyProfile: AcademyTeamProfile
  sport: string | null
  ageYears: number | null
  isJunior: boolean
  guardianConsentConfirmed: boolean
  guardianProfile: GuardianProfileSummary
  readinessLabel: string | null
  nextAction: string | null
  restrictions: string[]
}

interface CoachAcademyTeamRow {
  id: string
  teamName: string
  memberCount: number
  juniorCount: number
  guardianReadyCount: number
  academyProfile: AcademyTeamProfile
}

interface CoachAcademyCenterProps {
  teams: CoachAcademyTeamRow[]
  juniorAthletes: CoachAcademyAthleteRow[]
}

type TeamDraftState = Record<
  string,
  {
    academyName: string
    academyType: AcademyType | ''
    academyCity: string
    ageBandFocus: AcademyAgeBand
    parentHandoffEnabled: boolean
    lowCostMode: boolean
  }
>

export function CoachAcademyCenter({ teams, juniorAthletes }: CoachAcademyCenterProps) {
  const router = useRouter()
  const [teamDrafts, setTeamDrafts] = React.useState<TeamDraftState>(() =>
    Object.fromEntries(
      teams.map((team) => [
        team.id,
        {
          academyName: team.academyProfile.academyName || '',
          academyType: team.academyProfile.academyType || '',
          academyCity: team.academyProfile.academyCity || '',
          ageBandFocus: team.academyProfile.ageBandFocus,
          parentHandoffEnabled: team.academyProfile.parentHandoffEnabled,
          lowCostMode: team.academyProfile.lowCostMode,
        },
      ])
    )
  )
  const [savingTeamId, setSavingTeamId] = React.useState<string | null>(null)
  const [sendingAthleteId, setSendingAthleteId] = React.useState<string | null>(null)

  const academyStats = React.useMemo(() => {
    const juniorCount = juniorAthletes.length
    const readyCount = juniorAthletes.filter((athlete) => athlete.guardianProfile.handoffReady).length
    const missingCount = juniorAthletes.filter((athlete) => !athlete.guardianProfile.isComplete).length
    const pendingConsent = juniorAthletes.filter(
      (athlete) => athlete.guardianProfile.consentStatus === 'pending' || athlete.guardianProfile.consentStatus === 'unknown'
    ).length
    return { juniorCount, readyCount, missingCount, pendingConsent }
  }, [juniorAthletes])

  async function handleTeamSave(teamId: string) {
    const draft = teamDrafts[teamId]
    if (!draft) return
    setSavingTeamId(teamId)
    const result = await updateCoachAcademyTeamSettings({
      teamId,
      academyName: draft.academyName,
      academyType: draft.academyType,
      academyCity: draft.academyCity,
      ageBandFocus: draft.ageBandFocus,
      parentHandoffEnabled: draft.parentHandoffEnabled,
      lowCostMode: draft.lowCostMode,
    })
    setSavingTeamId(null)

    if (result?.error) {
      toast.error(result.error)
      return
    }

    toast.success('Academy settings saved')
    router.refresh()
  }

  async function handleCopyMessage(athlete: CoachAcademyAthleteRow) {
    const message = buildParentHandoffMessage({
      athleteName: athlete.athleteName,
      teamName: athlete.teamName,
      academyName: athlete.academyProfile.academyName,
      sport: athlete.sport,
      readinessLabel: athlete.readinessLabel,
      nextAction: athlete.nextAction,
      restrictions: athlete.restrictions,
    })

    try {
      await navigator.clipboard.writeText(message)
      toast.success('Parent handoff summary copied')
    } catch (error) {
      console.error('[academy] copy failed', error)
      toast.error('Could not copy the parent handoff summary')
    }
  }

  async function handleMarkSent(athlete: CoachAcademyAthleteRow) {
    setSendingAthleteId(athlete.athleteId)
    const result = await markGuardianHandoffSent(athlete.athleteId)
    setSendingAthleteId(null)

    if (result?.error) {
      toast.error(result.error)
      return
    }

    toast.success('Guardian handoff marked as sent')
    router.refresh()
  }

  return (
    <div className="space-y-8 pb-20">
      <section className="rounded-[2.2rem] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.2),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(245,124,0,0.12),transparent_42%),rgba(255,255,255,0.02)] p-8 sm:p-10">
        <div className="max-w-4xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary">Academy Ops</p>
          <h1 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight text-white">
            Multi-team coaching, junior-athlete clarity, parent handoff.
          </h1>
          <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-300">
            This is the blueprint’s academy layer: one place to tag academy teams, protect junior workflows, and keep parent communication light enough for real Indian squads that do not have extra hardware or admin staff.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Teams" value={String(teams.length)} detail="Coach-owned squads in this academy view" icon={Building2} />
          <MetricCard label="Junior athletes" value={String(academyStats.juniorCount)} detail="Roster members under 18" icon={Users} />
          <MetricCard label="Handoff ready" value={String(academyStats.readyCount)} detail="Guardian context strong enough to hand off" icon={ShieldCheck} />
          <MetricCard label="Needs follow-up" value={String(academyStats.missingCount + academyStats.pendingConsent)} detail="Missing guardian detail or pending consent" icon={ClipboardList} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
        <section className="space-y-6">
          {teams.map((team) => {
            const draft = teamDrafts[team.id]
            if (!draft) return null

            return (
              <section key={team.id} className="rounded-[2rem] border border-white/[0.08] bg-white/[0.02] p-6 sm:p-7">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Team academy profile</p>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">{team.teamName}</h2>
                    <p className="mt-2 text-sm text-slate-400">
                      {team.memberCount} athletes, {team.juniorCount} junior athletes, {team.guardianReadyCount} handoff-ready.
                    </p>
                  </div>
                  {team.academyProfile.lowCostMode ? (
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100">
                      Low-cost mode on
                    </span>
                  ) : null}
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Field label="Academy name">
                    <input
                      value={draft.academyName}
                      onChange={(event) => setTeamDrafts((prev) => ({ ...prev, [team.id]: { ...prev[team.id], academyName: event.target.value } }))}
                      placeholder="Example: Sunrise Badminton Academy"
                      className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-primary/40"
                    />
                  </Field>
                  <Field label="Academy city">
                    <input
                      value={draft.academyCity}
                      onChange={(event) => setTeamDrafts((prev) => ({ ...prev, [team.id]: { ...prev[team.id], academyCity: event.target.value } }))}
                      placeholder="Example: Bengaluru"
                      className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-primary/40"
                    />
                  </Field>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Academy type">
                    <select
                      value={draft.academyType}
                      onChange={(event) => setTeamDrafts((prev) => ({ ...prev, [team.id]: { ...prev[team.id], academyType: event.target.value as AcademyType | '' } }))}
                      className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-primary/40"
                    >
                      <option value="">Not set</option>
                      <option value="academy">Academy</option>
                      <option value="club">Club</option>
                      <option value="school">School</option>
                      <option value="college">College</option>
                      <option value="independent">Independent coach</option>
                      <option value="federation">Federation</option>
                    </select>
                  </Field>
                  <Field label="Age-band focus">
                    <select
                      value={draft.ageBandFocus}
                      onChange={(event) => setTeamDrafts((prev) => ({ ...prev, [team.id]: { ...prev[team.id], ageBandFocus: event.target.value as AcademyAgeBand } }))}
                      className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-primary/40"
                    >
                      <option value="mixed">Mixed</option>
                      <option value="u12">U12</option>
                      <option value="u14">U14</option>
                      <option value="u16">U16</option>
                      <option value="u18">U18</option>
                      <option value="senior">Senior</option>
                    </select>
                  </Field>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <ToggleTile
                    active={draft.parentHandoffEnabled}
                    title="Parent handoff enabled"
                    body="Coaches can use guardian contact summaries for junior athletes."
                    onClick={() =>
                      setTeamDrafts((prev) => ({
                        ...prev,
                        [team.id]: { ...prev[team.id], parentHandoffEnabled: !prev[team.id].parentHandoffEnabled },
                      }))
                    }
                  />
                  <ToggleTile
                    active={draft.lowCostMode}
                    title="Low-cost workflow"
                    body="Keep communication and testing assumptions realistic for school and academy environments."
                    onClick={() =>
                      setTeamDrafts((prev) => ({
                        ...prev,
                        [team.id]: { ...prev[team.id], lowCostMode: !prev[team.id].lowCostMode },
                      }))
                    }
                  />
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleTeamSave(team.id)}
                    disabled={savingTeamId === team.id}
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-black transition-all hover:brightness-110 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {savingTeamId === team.id ? 'Saving...' : 'Save academy settings'}
                  </button>
                </div>
              </section>
            )
          })}
        </section>

        <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.02] p-6 sm:p-7">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Junior roster and parent handoff</p>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Coach the athlete, keep the family loop clean
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            This queue keeps junior-athlete family communication lightweight. Copy a parent handoff summary only when the team has enabled it and the guardian profile is ready.
          </p>

          <div className="mt-6 space-y-3 max-h-[760px] overflow-y-auto pr-1">
            {juniorAthletes.length > 0 ? (
              juniorAthletes.map((athlete) => (
                <div key={athlete.athleteId} className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-white">{athlete.athleteName}</p>
                        <span className="rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-300">
                          {athlete.teamName}
                        </span>
                        <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] ${athlete.guardianProfile.handoffReady ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100' : 'border-amber-500/20 bg-amber-500/10 text-amber-100'}`}>
                          {athlete.guardianProfile.statusLabel}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        Age {athlete.ageYears ?? 'N/A'} • Consent {formatConsent(athlete.guardianProfile.consentStatus)} • Preference {formatHandoffPreference(athlete.guardianProfile.handoffPreference)}
                      </p>
                    </div>
                    {athlete.guardianProfile.lastHandoffSentAt ? (
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                        Sent already
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MiniInfo label="Guardian" value={athlete.guardianProfile.guardianName || 'Missing'} icon={Users} />
                    <MiniInfo
                      label="Best contact"
                      value={athlete.guardianProfile.guardianPhone || athlete.guardianProfile.guardianEmail || 'Missing'}
                      icon={athlete.guardianProfile.handoffPreference === 'email' ? Mail : Phone}
                    />
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Next action</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{athlete.guardianProfile.nextAction}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopyMessage(athlete)}
                      disabled={!athlete.academyProfile.parentHandoffEnabled || !athlete.guardianProfile.handoffReady}
                      className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100 disabled:opacity-40"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy parent summary
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleMarkSent(athlete)}
                      disabled={!athlete.academyProfile.parentHandoffEnabled || !athlete.guardianProfile.handoffReady || sendingAthleteId === athlete.athleteId}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100 disabled:opacity-40"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {sendingAthleteId === athlete.athleteId ? 'Saving...' : 'Mark handoff sent'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-8 text-center">
                <Users className="mx-auto h-10 w-10 text-slate-600" />
                <h3 className="mt-4 text-lg font-bold text-white">No junior athletes detected</h3>
                <p className="mt-2 text-sm text-slate-400">
                  As soon as a roster athlete has a date of birth under 18, Creeda will surface parent handoff readiness here.
                </p>
              </div>
            )}
          </div>
        </section>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</label>
      {children}
    </div>
  )
}

function ToggleTile({
  active,
  title,
  body,
  onClick,
}: {
  active: boolean
  title: string
  body: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[1.4rem] border p-4 text-left transition-all ${active ? 'border-primary/30 bg-primary/10' : 'border-white/[0.08] bg-white/[0.03]'}`}
    >
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{body}</p>
    </button>
  )
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: string
  detail: string
  icon: typeof Users
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{detail}</p>
    </div>
  )
}

function MiniInfo({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof Users
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-white break-all">{value}</p>
    </div>
  )
}

function formatConsent(status: GuardianProfileSummary['consentStatus']) {
  switch (status) {
    case 'confirmed':
      return 'confirmed'
    case 'coach_confirmed':
      return 'coach confirmed'
    case 'pending':
      return 'pending'
    case 'declined':
      return 'declined'
    default:
      return 'unknown'
  }
}

function formatHandoffPreference(preference: GuardianProfileSummary['handoffPreference']) {
  switch (preference) {
    case 'coach_led':
      return 'coach-led'
    default:
      return preference
  }
}
