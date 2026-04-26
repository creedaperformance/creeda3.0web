import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { NewSquadForm } from './NewSquadForm'

export const dynamic = 'force-dynamic'

export default async function NewSquadPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.10),transparent_30%),linear-gradient(180deg,#020617,#08111f)] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/coach/squads"
          className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/45 hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" /> All squads
        </Link>
        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.28em] text-[#6ee7b7]">
          Create squad
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Set up a new athlete group.</h1>
        <p className="mt-1 max-w-xl text-sm text-white/55">
          One name, one sport, one focus. We will create the invite link the moment you save.
        </p>
        <div className="mt-8">
          <NewSquadForm />
        </div>
      </div>
    </main>
  )
}
