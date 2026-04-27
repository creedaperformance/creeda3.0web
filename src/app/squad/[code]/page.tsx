import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getSquadByInviteCode } from '@/lib/squads/queries'
import { JoinClient } from './JoinClient'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ code: string }> }

export default async function JoinSquadPage({ params }: Params) {
  const { code } = await params
  const cleanCode = code.trim().toUpperCase()

  const supabase = await createClient()
  const squad = await getSquadByInviteCode(supabase, cleanCode)

  if (!squad) {
    return <InvalidInvite code={cleanCode} />
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If not signed in, route through signup carrying the invite forward.
  if (!user) {
    redirect(`/signup?invite=${encodeURIComponent(cleanCode)}&intent=join_squad`)
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.10),transparent_30%),linear-gradient(180deg,#020617,#08111f)] px-4 py-12 text-white sm:px-6">
      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/45 hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" /> Home
        </Link>

        <div className="mt-6 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6ee7b7]/12 text-[#6ee7b7]">
            <Users className="h-6 w-6" />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-[#6ee7b7]">
            Squad invite
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">{squad.name}</h1>
          <p className="mt-1 text-sm text-white/55">
            {squad.sport}
            {squad.level ? ` · ${squad.level}` : ''}
            {squad.primary_focus ? ` · ${squad.primary_focus.replace(/_/g, ' ')}` : ''}
          </p>
          {squad.coach_name ? (
            <p className="mt-4 text-sm leading-relaxed text-white/72">
              <span className="font-bold text-white">{squad.coach_name}</span> invited you. They
              will see your daily readiness, scans, and load — and never any private medical
              information you have not explicitly chosen to share.
            </p>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-white/72">
              You have been invited to a coach-managed squad on Creeda. They will see your daily
              readiness, scans, and load — and never any private medical information you have not
              explicitly chosen to share.
            </p>
          )}
          <p className="mt-2 text-[11px] leading-relaxed text-white/40">
            {squad.member_count} {squad.member_count === 1 ? 'athlete is' : 'athletes are'} in this
            squad.
          </p>

          <div className="mt-5">
            <JoinClient inviteCode={cleanCode} squadName={squad.name} />
          </div>
        </div>
      </div>
    </main>
  )
}

function InvalidInvite({ code }: { code: string }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.10),transparent_30%),linear-gradient(180deg,#020617,#08111f)] px-4 py-12 text-white sm:px-6">
      <div className="mx-auto max-w-md">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-rose-300">
          Invite not found
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          We could not find a squad with that code.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/55">
          Double-check the invite link with your coach. The code we received was{' '}
          <code className="rounded bg-black/30 px-1 font-mono">{code}</code>.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.18em] text-white/72 transition hover:bg-white/[0.06]"
        >
          Back to home
        </Link>
      </div>
    </main>
  )
}
