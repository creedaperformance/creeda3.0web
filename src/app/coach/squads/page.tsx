import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Plus, Users } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { listCoachSquads } from '@/lib/squads/queries'

export const dynamic = 'force-dynamic'

export default async function CoachSquadsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const squads = await listCoachSquads(supabase, user.id)

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.10),transparent_30%),linear-gradient(180deg,#020617,#08111f)] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/coach/dashboard"
          className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/45 hover:text-white"
        >
          ← Coach dashboard
        </Link>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6ee7b7]">
              Squads
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Your athlete groups</h1>
            <p className="mt-1 max-w-xl text-sm text-white/55">
              Create as many squads as you need. Each squad has its own invite link — share it on
              WhatsApp or by QR code and athletes join straight from their phones.
            </p>
          </div>
          <Link
            href="/coach/squads/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#6ee7b7] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-950 transition hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" /> New squad
          </Link>
        </div>

        <div className="mt-8 grid gap-3">
          {squads.length === 0 ? (
            <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6">
              <Users className="h-6 w-6 text-white/35" />
              <h2 className="mt-3 text-lg font-black tracking-tight">No squads yet.</h2>
              <p className="mt-1 max-w-xl text-sm text-white/55">
                Create your first squad — give it a name (e.g. &ldquo;U19 Cricket — Mumbai Academy&rdquo;),
                pick a sport and focus, and we will generate an invite link your athletes can use
                instantly.
              </p>
              <Link
                href="/coach/squads/new"
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#6ee7b7] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-950"
              >
                Create your first squad
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            squads.map((squad) => (
              <Link
                key={squad.id}
                href={`/coach/squads/${squad.id}`}
                className="flex items-start justify-between gap-4 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 transition hover:bg-white/[0.04]"
              >
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-black tracking-tight">{squad.name}</h3>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
                    {squad.sport} · {squad.level}
                    {squad.primary_focus ? ` · ${squad.primary_focus.replace(/_/g, ' ')}` : ''}
                  </p>
                  <p className="mt-3 text-sm text-white/65">
                    <span className="font-black text-white">{squad.member_count}</span>{' '}
                    {squad.member_count === 1 ? 'athlete' : 'athletes'} active
                    {squad.size_estimate
                      ? ` · target ${squad.size_estimate}`
                      : ''}
                  </p>
                </div>
                <ArrowRight className="mt-2 h-4 w-4 flex-shrink-0 text-white/35" />
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
