import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Newspaper } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { listNewspapers } from '@/lib/newspaper/queries'
import { NewspaperCard } from '@/components/newspaper/NewspaperCard'

export const dynamic = 'force-dynamic'

export default async function NewspapersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const papers = await listNewspapers(supabase, user.id, 24)

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.10),transparent_30%),linear-gradient(180deg,#020617,#08111f)] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/45 hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" /> Home
        </Link>
        <div className="mt-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-violet-300">
          <Newspaper className="h-3.5 w-3.5" /> Weekly newspapers
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Your weekly digests</h1>
        <p className="mt-1 max-w-xl text-sm text-white/55">
          A short, evidence-led summary of your week — what worked, what to focus on, and what to
          do next. Authored by Creeda&apos;s AI sports scientist, grounded in your own numbers.
        </p>

        <div className="mt-8 space-y-4">
          {papers.length === 0 ? (
            <NewspaperCard paper={null} />
          ) : (
            papers.map((paper) => <NewspaperCard key={paper.id} paper={paper} />)
          )}
        </div>
      </div>
    </main>
  )
}
