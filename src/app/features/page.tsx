'use client'

import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  Camera,
  ClipboardList,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'

import { Button } from '@/components/ui/button'

const ROLE_SYSTEM = [
  {
    eyebrow: 'Athlete',
    title: 'Performance system',
    body: 'Daily readiness, training load, recovery, supported video review, rehab context, and sharper session calls.',
    accent: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10',
  },
  {
    eyebrow: 'Coach',
    title: 'Command center',
    body: 'Intervention queue, low-data queue, weekly squad review, group suggestions, and rehab-return operating visibility.',
    accent: 'text-blue-300 border-blue-500/20 bg-blue-500/10',
  },
  {
    eyebrow: 'Individual',
    title: 'Healthy-living guide',
    body: 'Sleep, stress, strength, mobility, fat loss, and sport-entry guidance through one calmer daily decision loop.',
    accent: 'text-primary border-primary/20 bg-primary/10',
  },
]

const FIVE_LAYERS = [
  {
    title: 'Today',
    body: 'One clear call: what to do now, how hard to push, what to avoid, and how confident CREEDA is.',
    icon: Sparkles,
  },
  {
    title: 'Plan',
    body: 'The weekly structure that connects today’s decision to progression, deloads, and the next checkpoint.',
    icon: Target,
  },
  {
    title: 'Trends',
    body: '7-day and 28-day stories that show improvement, overload, inconsistency, or recovery drift.',
    icon: BarChart3,
  },
  {
    title: 'Technique',
    body: 'Supported video and phone-based testing that turn movement quality into usable coaching action.',
    icon: Camera,
  },
  {
    title: 'Science',
    body: 'Confidence, data quality, measured versus estimated signals, and what would improve the recommendation.',
    icon: Brain,
  },
]

const TRUST_SYSTEM = [
  'Every important recommendation shows confidence and data quality.',
  'Signals are labeled as measured, estimated, or self-reported.',
  'CREEDA explains what changed today and what input would improve certainty next.',
]

const INDIA_CONTEXT = [
  'Built for Indian heat, commute burden, sleep debt, exam stress, and shift-work reality.',
  'Nutrition logic is designed around real Indian eating patterns, vegetarian and Jain context, and home-food practicality.',
  'The product is optimized for India-first sports and smartphone-first access instead of expensive hardware assumptions.',
]

const COMMAND_CENTER = [
  'Intervention queue for who needs action now',
  'Low-data queue for weak-confidence and missing-signal athletes',
  'Rehab and return lane for staged progression visibility',
  'Weekly coach review with team summaries and group suggestions',
]

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#080C14] text-white selection:bg-primary/30 selection:text-white">
      <main className="pb-24">
        <section className="border-b border-white/[0.05]">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pt-28 pb-20">
            <div className="max-w-4xl">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary uppercase tracking-[0.28em]">
                Blueprint-aligned platform
              </div>
              <h1 className="mt-8 text-5xl md:text-7xl font-black tracking-tight leading-[0.92]">
                Know your body.
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-blue-300">
                  Make the right call today.
                </span>
              </h1>
              <p className="mt-6 max-w-3xl text-lg text-white/60 leading-relaxed">
                CREEDA is a confidence-aware sports science decision system for athletes, coaches, and healthier everyday living in India.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="h-14 px-8 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-primary/90">
                  <Link href="/signup">Start with CREEDA</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-14 px-8 rounded-2xl border-white/10 bg-white/[0.03] text-white font-semibold text-sm hover:bg-white/[0.06]">
                  <Link href="/">See landing story <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-20">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">Three clear journeys</p>
            <h2 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              One intelligence backbone. Three very different user feelings.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {ROLE_SYSTEM.map((item) => (
              <div key={item.title} className="rounded-[2.25rem] border border-white/[0.06] bg-white/[0.02] p-7">
                <div className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] ${item.accent}`}>
                  {item.eyebrow}
                </div>
                <h3 className="mt-6 text-3xl font-black tracking-tight">{item.title}</h3>
                <p className="mt-4 text-sm text-white/58 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-white/[0.05] bg-white/[0.01]">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-20">
            <div className="max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">Five-layer model</p>
              <h2 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                The product is organized around one operating system, not scattered dashboards.
              </h2>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {FIVE_LAYERS.map((item) => (
                <div key={item.title} className="rounded-[1.9rem] border border-white/[0.06] bg-[#111722]/80 p-5">
                  <div className="h-11 w-11 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm text-white/55 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-20">
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-[2.25rem] border border-white/[0.06] bg-white/[0.02] p-7">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary">Trust first</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">Believable before beautiful</h2>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {TRUST_SYSTEM.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-white/65 leading-relaxed">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2.25rem] border border-white/[0.06] bg-white/[0.02] p-7">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-blue-300">
                  <HeartPulse className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-blue-300">India native</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">Not a global template with Indian copy</h2>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {INDIA_CONTEXT.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-white/65 leading-relaxed">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/[0.05] bg-white/[0.01]">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-20 grid gap-8 xl:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">Coach workflow</p>
              <h2 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                The coach side is an operating system, not a read-only dashboard.
              </h2>
              <p className="mt-5 text-base text-white/55 leading-relaxed">
                CREEDA is strongest when the daily loop, the weekly review, and the command center all point in the same direction.
              </p>
            </div>

            <div className="space-y-3">
              {COMMAND_CENTER.map((item, index) => (
                <div key={item} className="rounded-[1.6rem] border border-white/[0.06] bg-white/[0.02] p-4 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-blue-300 shrink-0">
                    {index === 0 ? <ClipboardList className="h-4 w-4" /> : index === 1 ? <Activity className="h-4 w-4" /> : index === 2 ? <ShieldCheck className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                  </div>
                  <p className="text-sm text-white/65 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-5 sm:px-6 py-20">
          <div className="rounded-[2.5rem] border border-white/[0.06] bg-[linear-gradient(135deg,rgba(255,153,51,0.12),rgba(10,132,255,0.08),rgba(29,185,84,0.08))] p-8 sm:p-12">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">What makes CREEDA different</p>
            <h2 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Actionability, trust, and local reality matter more than raw data volume.
            </h2>
            <p className="mt-5 max-w-3xl text-base text-white/60 leading-relaxed">
              Optional device sync helps. Optional objective testing helps. Supported video helps. But the product still has to work when all a user gives you is honest daily context and a real-life routine.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="h-14 px-8 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-primary/90">
                <Link href="/signup">Get started</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 px-8 rounded-2xl border-white/10 bg-white/[0.03] text-white font-semibold text-sm hover:bg-white/[0.06]">
                <Link href="/mission">Read the mission</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
