'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  Brain,
  CalendarHeart,
  Dumbbell,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { getRoleHomeRoute, isAppRole } from '@/lib/role_routes'

const ATHLETE_SPORTS = ['Cricket', 'Badminton', 'Football', 'Athletics', 'Kabaddi', 'Hockey']
const INDIVIDUAL_GOALS = ['Sleep', 'Stress', 'Strength', 'Fat loss', 'Mobility', 'Weekend sport']

const INDIA_CONTEXT = [
  {
    title: 'Built for Indian routines',
    body: 'Office commutes, college schedules, family time, heat, poor sleep, and long sitting hours all change how your body should train and recover.',
  },
  {
    title: 'Made for Indian food reality',
    body: 'CREEDA should guide real eating patterns, not imported fitness templates. Daily advice has to fit how people actually live and eat in India.',
  },
  {
    title: 'Useful for both sport and health',
    body: 'An athlete needs sharper load decisions. An individual needs better sleep, movement, strength, and confidence. The journeys must feel different from day one.',
  },
]

const INDIVIDUAL_FLOW = [
  {
    title: 'Understand your body first',
    body: 'FitStart builds a real baseline from recovery, stress, movement capacity, lifestyle load, and healthy-living goals.',
  },
  {
    title: 'Recommend the right next path',
    body: 'CREEDA can steer someone toward strength work, better movement habits, or the right sport entry point for their physiology.',
  },
  {
    title: 'Guide daily healthy living',
    body: 'Every day should answer one question clearly: what should this person do next to become healthier and more capable?',
  },
]

const ATHLETE_FLOW = [
  {
    title: 'Profile performance deeply',
    body: 'Athletes move into deeper sport-specific diagnostics, readiness, movement, rehab, and competition-aware decision support.',
  },
  {
    title: 'Read training stress correctly',
    body: 'The athlete path should focus on workload, performance outputs, recovery, injury risk, and sharper session decisions.',
  },
  {
    title: 'Operate like an elite support team',
    body: 'CREEDA should feel like an always-on sports scientist, not a generic wellness tracker, when the user is an athlete.',
  },
]

export default function LandingPage() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
      if (session) {
        supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setUserRole(data?.role || null))
      }
    })
  }, [supabase])

  const dashboardLink = isLoggedIn && isAppRole(userRole) ? getRoleHomeRoute(userRole) : '/signup'
  const athleteLink = isLoggedIn ? dashboardLink : '/signup?role=athlete'
  const individualLink = isLoggedIn ? dashboardLink : '/signup?role=individual'
  const coachLink = isLoggedIn ? dashboardLink : '/signup?role=coach'

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--background)] text-white relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,153,51,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(29,185,84,0.12),transparent_34%),radial-gradient(circle_at_bottom_center,rgba(10,132,255,0.12),transparent_40%)]" />
        <div className="absolute top-[12%] left-[6%] w-[34rem] h-[34rem] bg-[var(--saffron)]/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-[5%] right-[8%] w-[28rem] h-[28rem] bg-[var(--indian-green-light)]/10 blur-[140px] rounded-full" />
      </div>

      <main className="flex-1 relative z-10">
        <section className="relative min-h-[calc(100svh-4rem)] flex items-center border-b border-white/[0.05]">
          <div className="w-full px-5 sm:px-6 lg:px-8 pt-24 pb-14 sm:pb-20">
            <div className="max-w-7xl mx-auto grid xl:grid-cols-[1.05fr_0.95fr] gap-12 xl:gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55 }}
                className="max-w-2xl"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm mb-7">
                  <span className="flex h-2 w-2 rounded-full bg-[var(--saffron)] animate-pulse" />
                  <span className="text-[10px] font-semibold text-white/60 tracking-[0.28em] uppercase">
                    India&apos;s Digital Sports Scientist
                  </span>
                </div>

                <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-primary mb-4">
                  Know your body. Build your peak.
                </p>

                <h1 className="text-5xl sm:text-7xl lg:text-[5.4rem] font-black tracking-tight leading-[0.92]">
                  One brand for
                  <span className="block text-primary text-glow mt-2">athlete performance</span>
                  <span className="block text-white/90 mt-2">and healthier Indian lives.</span>
                </h1>

                <p className="text-base sm:text-lg text-white/55 leading-relaxed max-w-xl mt-7">
                  CREEDA should not feel like another tracker. It should feel like a personal sports scientist that helps athletes perform better and helps normal people move, recover, eat, and live healthier with clear daily guidance.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 mt-8">
                  <Button
                    asChild
                    size="lg"
                    className="h-14 px-8 rounded-2xl bg-[var(--saffron)] text-black font-bold text-sm hover:brightness-110 transition-all shadow-[0_0_34px_var(--saffron-glow)]"
                  >
                    <Link href={individualLink}>
                      Start as Individual
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-14 px-8 rounded-2xl border-white/10 bg-white/[0.03] text-white font-semibold text-sm hover:bg-white/[0.06] transition-all"
                  >
                    <Link href={athleteLink}>
                      Start as Athlete
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <div className="flex flex-wrap gap-3 mt-8 text-[11px] text-white/45 font-medium">
                  <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-white/[0.08] bg-white/[0.03]">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    भारत के लिए built, not imported
                  </span>
                  <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-white/[0.08] bg-white/[0.03]">
                    <Activity className="h-3.5 w-3.5 text-emerald-400" />
                    Daily decision engine, not passive tracking
                  </span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.65, delay: 0.12 }}
                className="grid md:grid-cols-2 gap-4 sm:gap-5"
              >
                <JourneyPanel
                  eyebrow="Athlete"
                  title="Performance system"
                  subtitle="For readiness, load, rehab, and sharper training decisions."
                  accent="athlete"
                  ctaLabel="Athlete journey"
                  ctaHref={athleteLink}
                  bullets={[
                    'Deep sport-specific onboarding',
                    'Session decisions for train, modify, recover',
                    'Competition, fatigue, movement and health context',
                  ]}
                />
                <JourneyPanel
                  eyebrow="Individual"
                  title="Healthy-living guide"
                  subtitle="For sleep, stress, strength, mobility, fat loss, and sport entry."
                  accent="individual"
                  ctaLabel="Individual journey"
                  ctaHref={individualLink}
                  bullets={[
                    'FitStart baseline for real Indian routines',
                    'Daily guidance for movement, recovery, and habits',
                    'Sport or lifestyle path matched to physiology',
                  ]}
                />
              </motion.div>
            </div>
          </div>
        </section>

        <section id="individuals" className="scroll-mt-24 py-20 sm:py-24 border-b border-white/[0.05]">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 grid xl:grid-cols-[0.9fr_1.1fr] gap-10 xl:gap-16 items-start">
            <div className="max-w-xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary mb-4">For individuals</p>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                A healthier life should feel guided, not confusing.
              </h2>
              <p className="text-base text-white/55 mt-5 leading-relaxed">
                CREEDA should help everyday Indians understand their body, choose the right next path, and stay consistent without needing to think like an athlete.
              </p>
              <div className="flex flex-wrap gap-2 mt-7">
                {INDIVIDUAL_GOALS.map((item) => (
                  <span
                    key={item}
                    className="px-3 py-2 rounded-full border border-white/[0.08] bg-white/[0.03] text-[11px] font-semibold text-white/65"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <Button
                asChild
                size="lg"
                className="mt-8 h-14 px-7 rounded-2xl bg-[var(--saffron)] text-black font-bold text-sm hover:brightness-110 transition-all"
              >
                <Link href={individualLink}>
                  Begin FitStart
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="space-y-5">
              {INDIVIDUAL_FLOW.map((item, index) => (
                <FlowRow
                  key={item.title}
                  index={index + 1}
                  title={item.title}
                  body={item.body}
                  icon={index === 0 ? Brain : index === 1 ? Target : CalendarHeart}
                />
              ))}
            </div>
          </div>
        </section>

        <section id="athletes" className="scroll-mt-24 py-20 sm:py-24 border-b border-white/[0.05]">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 grid xl:grid-cols-[1.05fr_0.95fr] gap-10 xl:gap-16 items-start">
            <div className="space-y-5 order-2 xl:order-1">
              {ATHLETE_FLOW.map((item, index) => (
                <FlowRow
                  key={item.title}
                  index={index + 1}
                  title={item.title}
                  body={item.body}
                  icon={index === 0 ? ShieldCheck : index === 1 ? TrendingUp : Dumbbell}
                  tone="athlete"
                />
              ))}
            </div>

            <div className="max-w-xl xl:ml-auto order-1 xl:order-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-400 mb-4">For athletes</p>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                Athletes need a sharper operating system, not generic wellness copy.
              </h2>
              <p className="text-base text-white/55 mt-5 leading-relaxed">
                The athlete pathway should feel elite, structured, and performance-first. It must read training load, recovery, injury context, and readiness with much more precision than the normal-individual journey.
              </p>
              <div className="flex flex-wrap gap-2 mt-7">
                {ATHLETE_SPORTS.map((item) => (
                  <span
                    key={item}
                    className="px-3 py-2 rounded-full border border-white/[0.08] bg-white/[0.03] text-[11px] font-semibold text-white/65"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="mt-8 h-14 px-7 rounded-2xl border-white/10 bg-white/[0.03] text-white font-semibold text-sm hover:bg-white/[0.06] transition-all"
              >
                <Link href={athleteLink}>
                  Enter athlete system
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 py-20 sm:py-24 border-b border-white/[0.05]">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary mb-4">Made for India</p>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                The product should understand Indian sport and Indian life.
              </h2>
              <p className="text-base text-white/55 mt-5 leading-relaxed">
                The landing page has to say this clearly: CREEDA is for the person chasing a podium and the person trying to sleep better, move more, lose fat, or get strong after years of sitting.
              </p>
            </div>

            <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 mt-12">
              <div className="space-y-4">
                {INDIA_CONTEXT.map((item) => (
                  <div key={item.title} className="py-5 border-b border-white/[0.06] last:border-b-0">
                    <h3 className="text-xl font-bold text-white">{item.title}</h3>
                    <p className="text-sm text-white/50 leading-relaxed mt-3 max-w-2xl">{item.body}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[2.25rem] border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500 mb-5">
                  What CREEDA should decide
                </p>

                <div className="space-y-5">
                  <DecisionLine
                    icon={HeartPulse}
                    title="For individuals"
                    text="Should I walk, lift, recover, work on mobility, improve sleep, or keep the plan light today?"
                  />
                  <DecisionLine
                    icon={Zap}
                    title="For athletes"
                    text="Should I train hard, modify the session, protect output, or bias recovery before performance drops?"
                  />
                  <DecisionLine
                    icon={Brain}
                    title="For everyone"
                    text="What is the next best action for this body right now, given trend, lifestyle, and real capacity?"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-24">
          <div className="max-w-6xl mx-auto px-5 sm:px-6">
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/[0.06] bg-[linear-gradient(135deg,rgba(255,153,51,0.12),rgba(10,132,255,0.06),rgba(29,185,84,0.08))] px-6 sm:px-10 py-10 sm:py-14">
              <div className="absolute top-0 right-0 w-[18rem] h-[18rem] bg-[var(--saffron)]/10 blur-[110px] rounded-full" />

              <div className="relative max-w-3xl">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary mb-4">Start the right journey</p>
                <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                  One app. Two different promises. Both need to feel fully real.
                </h2>
                <p className="text-base text-white/55 mt-5 leading-relaxed max-w-2xl">
                  Athletes should enter a deeper performance system. Individuals should enter a simpler, clearer health-performance coach. CREEDA wins only if both journeys feel intentional from the first click.
                </p>
              </div>

              <div className="relative flex flex-col sm:flex-row gap-3 sm:gap-4 mt-9">
                <Button
                  asChild
                  size="lg"
                  className="h-14 px-8 rounded-2xl bg-[var(--saffron)] text-black font-bold text-sm hover:brightness-110 transition-all shadow-[0_0_34px_var(--saffron-glow)]"
                >
                  <Link href={individualLink}>
                    Start as Individual
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 rounded-2xl border-white/10 bg-white/[0.03] text-white font-semibold text-sm hover:bg-white/[0.06] transition-all"
                >
                  <Link href={athleteLink}>
                    Start as Athlete
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="h-14 px-6 rounded-2xl text-white/70 hover:bg-white/[0.04] hover:text-white text-sm"
                >
                  <Link href={coachLink}>I&apos;m a Coach / Practitioner</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.04] py-10 sm:py-14">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <Link href="/" className="inline-flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-lg bg-[var(--saffron)] flex items-center justify-center">
                  <Activity className="text-black h-4 w-4" strokeWidth={3} />
                </div>
                <span className="text-base font-extrabold text-white tracking-tight">Creeda</span>
              </Link>
              <p className="text-[11px] text-white/25 font-medium">
                Sports science and healthier living, made for India.
              </p>
            </div>

            <div className="flex items-center gap-6 text-xs font-medium text-white/30">
              <Link href="/terms" className="hover:text-white/60 transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-white/60 transition-colors">
                Privacy
              </Link>
              <Link href="/refund-policy" className="hover:text-white/60 transition-colors">
                Refunds
              </Link>
            </div>

            <p className="text-[10px] text-white/15 font-medium">
              © 2026 Creeda. Made in India.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function JourneyPanel({
  eyebrow,
  title,
  subtitle,
  bullets,
  ctaLabel,
  ctaHref,
  accent,
}: {
  eyebrow: string
  title: string
  subtitle: string
  bullets: string[]
  ctaLabel: string
  ctaHref: string
  accent: 'athlete' | 'individual'
}) {
  const tone =
    accent === 'athlete'
      ? 'border-emerald-500/20 bg-[linear-gradient(180deg,rgba(29,185,84,0.14),rgba(10,132,255,0.06))]'
      : 'border-primary/20 bg-[linear-gradient(180deg,rgba(255,153,51,0.16),rgba(255,255,255,0.02))]'
  const dotTone = accent === 'athlete' ? 'bg-emerald-400' : 'bg-primary'
  const textTone = accent === 'athlete' ? 'text-emerald-300' : 'text-primary'

  return (
    <div className={`relative min-h-[25rem] rounded-[2.2rem] border p-6 sm:p-7 overflow-hidden ${tone}`}>
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_46%)]" />
      <div className="relative h-full flex flex-col">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dotTone}`} />
          <span className={`text-[10px] font-bold uppercase tracking-[0.25em] ${textTone}`}>{eyebrow}</span>
        </div>

        <div className="mt-6">
          <h3 className="text-3xl sm:text-4xl font-black tracking-tight leading-[0.96] text-white">{title}</h3>
          <p className="text-base text-white/60 leading-relaxed mt-4">{subtitle}</p>
        </div>

        <div className="space-y-3 mt-7">
          {bullets.map((item) => (
            <div key={item} className="flex items-start gap-3">
              <span className={`mt-2 h-1.5 w-1.5 rounded-full ${dotTone}`} />
              <p className="text-sm text-white/72 leading-relaxed">{item}</p>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-8">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 text-sm font-bold text-white hover:text-white/80 transition-colors"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function FlowRow({
  index,
  title,
  body,
  icon: Icon,
  tone = 'individual',
}: {
  index: number
  title: string
  body: string
  icon: typeof Brain
  tone?: 'individual' | 'athlete'
}) {
  const color = tone === 'athlete' ? 'text-emerald-300 border-emerald-500/15 bg-emerald-500/10' : 'text-primary border-primary/15 bg-primary/10'

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="grid grid-cols-[auto_1fr] gap-4 items-start"
    >
      <div className={`h-12 w-12 rounded-2xl border flex items-center justify-center ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="pt-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/30 mb-2">
          Step {String(index).padStart(2, '0')}
        </p>
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <p className="text-sm text-white/52 leading-relaxed mt-3">{body}</p>
      </div>
    </motion.div>
  )
}

function DecisionLine({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Brain
  title: string
  text: string
}) {
  return (
    <div className="flex items-start gap-4 rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="h-11 w-11 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-2">{title}</p>
        <p className="text-sm text-white/70 leading-relaxed">{text}</p>
      </div>
    </div>
  )
}
