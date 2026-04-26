import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Pause,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react'
import QRCode from 'qrcode'

import { createClient } from '@/lib/supabase/server'
import { getSquadDetail, listSquadMembers } from '@/lib/squads/queries'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

const STATUS_TONE: Record<
  'active' | 'injured' | 'paused' | 'left',
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  active: { label: 'Active', className: 'border-emerald-300/40 bg-emerald-300/[0.06] text-emerald-200', icon: CheckCircle2 },
  injured: { label: 'Injured', className: 'border-rose-400/40 bg-rose-400/[0.06] text-rose-200', icon: ShieldAlert },
  paused: { label: 'Paused', className: 'border-amber-300/40 bg-amber-300/[0.06] text-amber-200', icon: Pause },
  left: { label: 'Left', className: 'border-white/10 bg-white/[0.02] text-white/45', icon: Pause },
}

function readinessTone(score: number | null) {
  if (score === null) return 'text-white/45'
  if (score >= 75) return 'text-emerald-300'
  if (score >= 55) return 'text-amber-300'
  return 'text-rose-300'
}

export default async function CoachSquadDetailPage({ params }: Params) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const squad = await getSquadDetail(supabase, id, user.id)
  if (!squad) redirect('/coach/squads')

  const members = await listSquadMembers(supabase, id)
  const qrDataUrl = await QRCode.toDataURL(squad.invite_url, {
    width: 320,
    margin: 1,
    color: { dark: '#0F172A', light: '#FFFFFF' },
  })

  const whatsappTemplate = encodeURIComponent(
    `Hi team — please install Creeda and join our squad: ${squad.invite_url}\n\nThis links your daily readiness, scans, and load straight to me. Takes about 5 minutes. — Coach`
  )

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.10),transparent_30%),linear-gradient(180deg,#020617,#08111f)] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/coach/squads"
          className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/45 hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" /> All squads
        </Link>

        <div className="mt-4 flex flex-col gap-2">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6ee7b7]">
            Squad detail
          </p>
          <h1 className="text-3xl font-black tracking-tight">{squad.name}</h1>
          <p className="text-sm text-white/55">
            {squad.sport} · {squad.level}
            {squad.primary_focus ? ` · ${squad.primary_focus.replace(/_/g, ' ')}` : ''}
          </p>
        </div>

        {/* ── Invite block ──────────────────────────────────── */}
        <section className="mt-8 grid gap-5 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 lg:grid-cols-[260px_1fr]">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-4">
            {/* QR is generated as a data: URL so next/image can't help — img tag is correct here. */}
            <img src={qrDataUrl} alt="Squad invite QR" className="h-44 w-44 sm:h-48 sm:w-48" />
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.22em] text-slate-950/55">
              Athletes scan to join
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
              Invite code
            </p>
            <p className="mt-1 font-mono text-2xl font-black tracking-widest text-white">
              {squad.invite_code}
            </p>

            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
              Shareable link
            </p>
            <p className="mt-1 break-all rounded-xl border border-white/[0.08] bg-black/30 p-3 font-mono text-[12px] text-white/72">
              {squad.invite_url}
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <a
                href={`https://wa.me/?text=${whatsappTemplate}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 text-[12px] font-black uppercase tracking-[0.18em] text-slate-950 transition hover:brightness-110"
              >
                Share via WhatsApp
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(`Join ${squad.name} on Creeda`)}&body=${whatsappTemplate}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 text-[12px] font-bold uppercase tracking-[0.18em] text-white/72 transition hover:bg-white/[0.06]"
              >
                Email link
              </a>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-white/40">
              The invite link is permanent until you regenerate it. New athletes join with one tap;
              if they are new to Creeda, they sign up first and auto-link.
            </p>
          </div>
        </section>

        {/* ── Squad triage table ───────────────────────────── */}
        <section className="mt-6 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black tracking-tight">Roster · {squad.member_count}</h2>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
              live
            </span>
          </div>
          {members.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <p className="text-sm font-bold text-white">Waiting for athletes to join.</p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/55">
                Share the invite link or QR code above. Each athlete who joins shows up here
                immediately with their latest readiness and any modified-mode flag.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                    <th className="py-2 pr-3">Athlete</th>
                    <th className="py-2 pr-3">Position</th>
                    <th className="py-2 pr-3">Readiness</th>
                    <th className="py-2 pr-3">Last check-in</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const tone = STATUS_TONE[member.status] ?? STATUS_TONE.active
                    const Icon = tone.icon
                    return (
                      <tr key={member.athlete_id} className="border-t border-white/[0.04]">
                        <td className="py-2.5 pr-3">
                          <span className="block font-bold text-white">
                            {member.full_name ?? '—'}
                          </span>
                          <span className="block font-mono text-[10px] text-white/35">
                            {member.athlete_id.slice(0, 8)}…
                          </span>
                          {member.modified_mode_active ? (
                            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-300/[0.08] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-200">
                              <ShieldAlert className="h-2.5 w-2.5" /> Modified mode
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5 pr-3 text-white/65">
                          {member.position ?? '—'}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className={`font-black ${readinessTone(member.latest_readiness_score)}`}>
                            {member.latest_readiness_score === null
                              ? '—'
                              : member.latest_readiness_score}
                          </span>
                          {member.latest_readiness_tier ? (
                            <span className="ml-1 text-[10px] uppercase tracking-[0.18em] text-white/40">
                              {member.latest_readiness_tier}
                            </span>
                          ) : null}
                          {member.latest_readiness_date ? (
                            <span className="block text-[10px] text-white/35">
                              {member.latest_readiness_date}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5 pr-3 text-white/65">
                          {member.last_check_in_date ?? '—'}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${tone.className}`}
                          >
                            <Icon className="h-2.5 w-2.5" />
                            {tone.label}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-[11px] text-white/45">
                          {member.joined_at?.slice(0, 10) ?? '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <SquadStat
            icon={<TrendingUp className="h-4 w-4" />}
            label="Active members"
            value={String(members.filter((m) => m.status === 'active').length)}
          />
          <SquadStat
            icon={<ShieldAlert className="h-4 w-4" />}
            label="Modified mode"
            value={String(members.filter((m) => m.modified_mode_active).length)}
          />
          <SquadStat
            icon={<Brain className="h-4 w-4" />}
            label="Reported today"
            value={String(
              members.filter(
                (m) =>
                  m.last_check_in_date &&
                  m.last_check_in_date === new Date().toISOString().slice(0, 10)
              ).length
            )}
          />
        </section>
      </div>
    </main>
  )
}

function SquadStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.04] text-[#6ee7b7]">
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-3 text-2xl font-black tracking-tight">{value}</p>
    </div>
  )
}
