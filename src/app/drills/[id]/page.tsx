import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, Brain, Clock, Repeat, Target } from 'lucide-react'

import { drillForId } from '@/lib/drills/catalog'

type Params = { params: Promise<{ id: string }> }

export default async function DrillDetailPage({ params }: Params) {
  const { id } = await params
  const drill = drillForId(id)
  if (!drill) notFound()

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.10),transparent_30%),linear-gradient(180deg,#020617,#08111f)] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/45 hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" /> Home
        </Link>

        <div className="mt-5 flex flex-col gap-2">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6ee7b7]">
            Drill · {drill.region.replace(/_/g, ' ')}
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{drill.label}</h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/65">{drill.summary}</p>
        </div>

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/[0.08] bg-black/30">
          {drill.video_url ? (
            <video controls className="aspect-video w-full bg-black" src={drill.video_url} />
          ) : (
            <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-8 text-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                  Video coming soon
                </p>
                <p className="mt-2 max-w-md text-sm text-white/55">
                  Our movement coaches are recording the full drill library. The cues and setup
                  below are everything you need to do this drill correctly today.
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="Duration" icon={<Clock className="h-4 w-4" />} value={`${drill.duration_seconds}s / set`} />
          <Stat label="Sets" icon={<Repeat className="h-4 w-4" />} value={String(drill.sets)} />
          <Stat label="Reps / hold" icon={<Target className="h-4 w-4" />} value={drill.reps_or_hold} />
        </section>

        <section className="mt-6 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.22em] text-[#6ee7b7]">Setup</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/72">{drill.setup}</p>
        </section>

        <section className="mt-6 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.22em] text-[#6ee7b7]">Cues</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/72">
            {drill.cues.map((cue) => (
              <li key={cue} className="flex items-start gap-2">
                <span aria-hidden className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#6ee7b7]" />
                <span>{cue}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-[#6ee7b7]" />
            <h2 className="text-sm font-black uppercase tracking-[0.22em] text-[#6ee7b7]">
              Why it works
            </h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-white/72">{drill.why_it_works}</p>
        </section>

        {drill.contraindications.length > 0 ? (
          <section className="mt-6 rounded-3xl border border-amber-300/30 bg-amber-300/[0.06] p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              <h2 className="text-sm font-black uppercase tracking-[0.22em] text-amber-300">
                Skip this drill if
              </h2>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-amber-100/80">
              {drill.contraindications.map((c) => (
                <li key={c} className="flex items-start gap-2">
                  <span aria-hidden className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-amber-300" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] leading-relaxed text-amber-100/55">
              When in doubt, send the drill name to your physio or sports doctor and ask if it is
              safe given your history.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  )
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.04] text-[#6ee7b7]">
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-3 text-lg font-black tracking-tight">{value}</p>
    </div>
  )
}
