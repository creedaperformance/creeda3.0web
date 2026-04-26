import Link from 'next/link'
import Image from 'next/image'
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

import { JsonLd } from '@/components/seo/JsonLd'
import { Button } from '@/components/ui/button'
import {
  CREEDA_LEGAL_ENTITY,
  LEGAL_DOC_PATHS,
  LEGAL_POLICY_VERSION,
} from '@/lib/legal/constants'
import { createPageMetadata } from '@/lib/seo/metadata'
import { createWebApplicationSchema, createWebPageSchema } from '@/lib/seo/schema'
import { SITE_TITLE } from '@/lib/seo/site'

const homePageSeo = {
  title: SITE_TITLE,
  description:
    'AI-powered sports science, recovery, performance, and healthy-living guidance built for Indian athletes, coaches, and everyday routines.',
  path: '/',
  keywords: [
    'digital sports scientist India',
    'athlete performance app India',
    'healthy living app India',
    'sports science for athletes and coaches',
  ],
} as const

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = createPageMetadata(homePageSeo)

const ATHLETE_SPORTS = ['Cricket', 'Badminton', 'Football', 'Athletics', 'Kabaddi', 'Hockey']
const INDIVIDUAL_GOALS = ['Sleep', 'Stress', 'Strength', 'Fat loss', 'Mobility', 'Weekend sport']

const INDIA_CONTEXT = [
  {
    title: 'Built for Indian routines',
    body: 'Office commutes, college schedules, family time, heat, poor sleep, and long sitting hours all change how your body trains and recovers.',
  },
  {
    title: 'Made for Indian food reality',
    body: 'CREEDA guides real eating patterns, not imported fitness templates. Daily advice has to fit how people actually live and eat in India.',
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
    body: 'Every day answers one question clearly: what should this person do next to become healthier and more capable?',
  },
]

const ATHLETE_FLOW = [
  {
    title: 'Profile performance deeply',
    body: 'Athletes move into sport-specific diagnostics, readiness, movement, rehab, and competition-aware decision support.',
  },
  {
    title: 'Read training stress correctly',
    body: 'The athlete path focuses on workload, performance outputs, recovery, injury risk, and sharper session decisions.',
  },
  {
    title: 'Operate like an elite support team',
    body: 'CREEDA acts like an always-on sports scientist, not a generic wellness tracker, when the user is an athlete.',
  },
]

const COACH_FLOW = [
  {
    title: 'See who needs action now',
    body: 'Coaches need a fast queue, not another passive dashboard. CREEDA surfaces intervention pressure, low-data blockers, and who needs a decision today.',
  },
  {
    title: 'Run the week, not just the day',
    body: 'Weekly reviews, team trends, and group suggestions help the coach shape the next microcycle instead of reacting athlete by athlete.',
  },
  {
    title: 'Track rehab and return clearly',
    body: 'Return-to-play should feel operational. Coaches need staged rehab visibility, restrictions, and progression readiness in one place.',
  },
]

const PRODUCT_LOOP = [
  {
    title: 'Today',
    body: 'Give one clear call for the day: train, modify, recover, walk more, sleep earlier, or keep the load light.',
  },
  {
    title: 'Plan',
    body: 'Show the weekly structure clearly so the user knows what the next block is building toward.',
  },
  {
    title: 'Trends',
    body: 'Explain whether the user is moving forward, plateauing, or drifting off course and what needs to change.',
  },
  {
    title: 'Technique',
    body: 'Use supported video and phone-based testing to make movement quality practical, not abstract.',
  },
  {
    title: 'Science',
    body: 'Show confidence, data quality, measured versus estimated signals, and what would improve the call.',
  },
]

const LEGAL_COMMITMENTS = [
  {
    title: 'Explicit consent and transparency',
    body: 'Signup and onboarding require clear opt-in for terms, privacy, medical disclaimer, data processing, and AI advisories.',
  },
  {
    title: 'DPDP + GDPR rights support',
    body: 'Users can request access, correction, export, deletion, and consent withdrawal through in-app legal controls.',
  },
  {
    title: 'Minor athlete safeguards',
    body: 'Junior-athlete workflows require guardian or authorized organizational consent before full participation.',
  },
  {
    title: 'Decision-support positioning',
    body: 'CREEDA is built as a sports-science decision-support system, not a diagnostic medical device.',
  },
]

export default function LandingPage() {
  const athleteLink = '/signup?role=athlete'
  const individualLink = '/signup?role=individual'
  const coachLink = '/signup?role=coach'

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--background)] text-white relative overflow-x-hidden">
      <JsonLd
        data={createWebPageSchema({
          path: homePageSeo.path,
          title: homePageSeo.title,
          description: homePageSeo.description,
        })}
      />
      <JsonLd data={createWebApplicationSchema()} />
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,153,51,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(29,185,84,0.12),transparent_34%),radial-gradient(circle_at_bottom_center,rgba(10,132,255,0.12),transparent_40%)]" />
        <div className="absolute top-[12%] left-[6%] w-[34rem] h-[34rem] bg-[var(--saffron)]/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-[5%] right-[8%] w-[28rem] h-[28rem] bg-[var(--indian-green-light)]/10 blur-[140px] rounded-full" />
      </div>

      <main className="flex-1 relative z-10">
        <section className="relative flex items-center border-b border-white/[0.05] py-20 sm:py-28">
          <div className="w-full px-5 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm mb-8">
                <span className="flex h-2 w-2 rounded-full bg-[#6ee7b7] animate-pulse" />
                <span className="text-[10px] font-semibold text-white/60 tracking-[0.28em] uppercase">
                  AI Sports Scientist · Built in India
                </span>
              </div>

              <h1 className="text-5xl sm:text-7xl lg:text-[6rem] font-black tracking-tight leading-[0.95]">
                The world&apos;s first
                <span className="block bg-gradient-to-r from-[#6ee7b7] via-[#a7f3d0] to-[#fcd34d] bg-clip-text text-transparent mt-3">
                  digital sports scientist.
                </span>
              </h1>

              <p className="text-base sm:text-xl text-white/65 leading-relaxed max-w-3xl mx-auto mt-8">
                Movement scans that reveal what no coach has spotted yet. Daily readiness scores
                you can trust. An AI that answers anything about your sport, recovery, and any
                medical report you upload — grounded in research, never in marketing fluff.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mt-10 justify-center">
                <Button
                  asChild
                  size="lg"
                  className="h-14 px-8 rounded-2xl bg-[#6ee7b7] text-slate-950 font-black text-sm tracking-[0.18em] uppercase hover:brightness-110 transition-all shadow-[0_0_50px_rgba(110,231,183,0.35)]"
                >
                  <Link href="/onboarding" prefetch={false}>
                    Run your first scan
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 rounded-2xl border-white/10 bg-white/[0.03] text-white font-semibold text-sm tracking-[0.14em] uppercase hover:bg-white/[0.06] transition-all"
                >
                  <Link href="#how-it-works" prefetch={false}>
                    How it works
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="flex flex-wrap gap-3 mt-10 justify-center text-[11px] text-white/45 font-medium">
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-white/[0.08] bg-white/[0.03]">
                  <Sparkles className="h-3.5 w-3.5 text-[#6ee7b7]" />
                  Movement scan in 30 seconds
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-white/[0.08] bg-white/[0.03]">
                  <Brain className="h-3.5 w-3.5 text-[#a7f3d0]" />
                  AI sports scientist + medical-report explainer
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-white/[0.08] bg-white/[0.03]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#fcd34d]" />
                  Confidence-tiered scoring you can trust
                </span>
              </div>
            </div>

            {/* Cinematic feature trio */}
            <div className="mt-20 grid gap-5 sm:grid-cols-3 max-w-6xl mx-auto">
              <FeatureCard
                eyebrow="Aha moment"
                title="Find the asymmetry slowing you down"
                body="A 30-second overhead-squat scan reveals the knee, ankle, or hip pattern most likely to injure you. We show the finding, prescribe the fix, retest in 4 weeks."
                accent="#6ee7b7"
                icon={<Activity className="h-5 w-5" />}
              />
              <FeatureCard
                eyebrow="AI that knows you"
                title="A sports scientist on tap"
                body="Ask anything — sport-specific training, recovery, sleep, that blood-test result. The AI sees your sport, position, readiness, and weak links. Educational, never diagnostic."
                accent="#a7f3d0"
                icon={<Brain className="h-5 w-5" />}
              />
              <FeatureCard
                eyebrow="Coach + athlete"
                title="One screen for the whole squad"
                body="Coaches manage 30 athletes in 5 minutes a morning — red-flag push alerts when anything's off, live readiness, invite-by-QR onboarding."
                accent="#fcd34d"
                icon={<HeartPulse className="h-5 w-5" />}
              />
            </div>

            {/* Persona row — kept for the original three CTAs */}
            <div className="mt-16 grid lg:grid-cols-3 gap-4 sm:gap-5 max-w-6xl mx-auto">
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
              <JourneyPanel
                eyebrow="Coach"
                title="Command center"
                subtitle="For intervention queues, weekly reviews, rehab tracking, and squad-level decisions."
                accent="coach"
                ctaLabel="Coach journey"
                ctaHref={coachLink}
                bullets={[
                  'Intervention queue and low-data queue',
                  'Weekly squad review and group suggestions',
                  'Rehab and return-to-play operating lane',
                ]}
              />
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
                CREEDA helps everyday Indians understand their body, choose the right next path, and stay consistent without needing to think like an athlete.
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
                <Link href={individualLink} prefetch={false}>
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
                The athlete pathway is elite, structured, and performance-first. It reads training load, recovery, injury context, and readiness with much more precision than the normal-individual journey.
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
                <Link href={athleteLink} prefetch={false}>
                  Enter athlete system
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="coaches" className="scroll-mt-24 py-20 sm:py-24 border-b border-white/[0.05]">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 grid xl:grid-cols-[1.05fr_0.95fr] gap-10 xl:gap-16 items-start">
            <div className="max-w-xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-blue-300 mb-4">For coaches</p>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                Coaches need control, foresight, and believable next actions.
              </h2>
              <p className="text-base text-white/55 mt-5 leading-relaxed">
                The coach experience is now a command center: who needs action, who is low-confidence, who is in rehab, and what the squad needs next week.
              </p>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="mt-8 h-14 px-7 rounded-2xl border-white/10 bg-white/[0.03] text-white font-semibold text-sm hover:bg-white/[0.06] transition-all"
              >
                <Link href={coachLink} prefetch={false}>
                  Enter coach command center
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="space-y-5">
              {COACH_FLOW.map((item, index) => (
                <FlowRow
                  key={item.title}
                  index={index + 1}
                  title={item.title}
                  body={item.body}
                  icon={index === 0 ? ShieldCheck : index === 1 ? TrendingUp : CalendarHeart}
                  tone="coach"
                />
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 py-20 sm:py-24 border-b border-white/[0.05]">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary mb-4">Made for India</p>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                The product understands Indian sport and Indian life.
              </h2>
              <p className="text-base text-white/55 mt-5 leading-relaxed">
                CREEDA is for the person chasing a podium and the person trying to sleep better, move more, lose fat, or get strong after years of sitting.
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
                  What CREEDA decides
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
                    icon={Target}
                    title="For coaches"
                    text="Who needs intervention, who needs better data, who is in staged rehab, and what should the squad change next?"
                  />
                  <DecisionLine
                    icon={Brain}
                    title="For everyone"
                    text="What is the next best action for this body right now, given trend, lifestyle, and real capacity?"
                  />
                </div>
              </div>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {PRODUCT_LOOP.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.8rem] border border-white/[0.06] bg-white/[0.02] p-5"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary">
                    {item.title}
                  </p>
                  <h3 className="mt-3 text-xl font-bold text-white">{item.title} comes first</h3>
                  <p className="mt-3 text-sm text-white/55 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/[0.05] py-20 sm:py-24">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary mb-4">Legal & trust layer</p>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                Compliance is product infrastructure, not a legal afterthought.
              </h2>
              <p className="text-base text-white/55 mt-5 leading-relaxed">
                CREEDA is designed around explicit consent, transparent AI behavior, minors protection, and formal data-rights controls.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {LEGAL_COMMITMENTS.map((item) => (
                <div key={item.title} className="rounded-[1.8rem] border border-white/[0.06] bg-white/[0.02] p-5">
                  <h3 className="text-xl font-bold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm text-white/60 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/60">
              <Link href={LEGAL_DOC_PATHS.terms} className="underline underline-offset-4 hover:text-white">Terms</Link>
              <Link href={LEGAL_DOC_PATHS.privacy} className="underline underline-offset-4 hover:text-white">Privacy</Link>
              <Link href={LEGAL_DOC_PATHS.disclaimer} className="underline underline-offset-4 hover:text-white">Medical Disclaimer</Link>
              <Link href={LEGAL_DOC_PATHS.consent} className="underline underline-offset-4 hover:text-white">Consent</Link>
              <Link href={LEGAL_DOC_PATHS.aiTransparency} className="underline underline-offset-4 hover:text-white">AI Transparency</Link>
              <Link href={LEGAL_DOC_PATHS.dataOwnership} className="underline underline-offset-4 hover:text-white">Data Ownership</Link>
              <Link href={LEGAL_DOC_PATHS.sla} className="underline underline-offset-4 hover:text-white">SLA</Link>
              <Link href={LEGAL_DOC_PATHS.security} className="underline underline-offset-4 hover:text-white">Security</Link>
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
                  Athletes enter a deeper performance system. Individuals enter a simpler, clearer health-performance coach. CREEDA wins only if both journeys feel intentional from the first click.
                </p>
              </div>

              <div className="relative flex flex-col sm:flex-row gap-3 sm:gap-4 mt-9">
                <Button
                  asChild
                  size="lg"
                  className="h-14 px-8 rounded-2xl bg-[var(--saffron)] text-black font-bold text-sm hover:brightness-110 transition-all shadow-[0_0_34px_var(--saffron-glow)]"
                >
                  <Link href={individualLink} prefetch={false}>
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
                  <Link href={athleteLink} prefetch={false}>
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
                  <Link href={coachLink} prefetch={false}>I&apos;m a Coach / Practitioner</Link>
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
              <Link href="/" className="inline-flex items-center gap-3 mb-2">
                <Image
                  src="/creeda-performance-bgr.png"
                  alt="Creeda Performance"
                  width={320}
                  height={160}
                  className="h-10 w-auto object-contain"
                />
              </Link>
              <p className="text-[11px] text-white/25 font-medium">
                Sports science and healthier living, made for India.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-white/30 justify-center sm:justify-end">
              <Link href={LEGAL_DOC_PATHS.terms} className="hover:text-white/60 transition-colors">
                Terms
              </Link>
              <Link href={LEGAL_DOC_PATHS.privacy} className="hover:text-white/60 transition-colors">
                Privacy
              </Link>
              <Link href={LEGAL_DOC_PATHS.disclaimer} className="hover:text-white/60 transition-colors">
                Disclaimer
              </Link>
              <Link href={LEGAL_DOC_PATHS.consent} className="hover:text-white/60 transition-colors">
                Consent
              </Link>
              <Link href={LEGAL_DOC_PATHS.aiTransparency} className="hover:text-white/60 transition-colors">
                AI
              </Link>
              <Link href={LEGAL_DOC_PATHS.security} className="hover:text-white/60 transition-colors">
                Security
              </Link>
              <Link href={LEGAL_DOC_PATHS.refund} className="hover:text-white/60 transition-colors">
                Refunds
              </Link>
              <Link href="/sitemap.xml" className="hover:text-white/60 transition-colors">
                Sitemap
              </Link>
              <Link href="/llms.txt" className="hover:text-white/60 transition-colors">
                LLM Scope
              </Link>
            </div>

            <p className="text-[10px] text-white/15 font-medium">
              © 2026 {CREEDA_LEGAL_ENTITY}. Policy version {LEGAL_POLICY_VERSION}. Made in India.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  eyebrow,
  title,
  body,
  accent,
  icon,
}: {
  eyebrow: string
  title: string
  body: string
  accent: string
  icon: React.ReactNode
}) {
  return (
    <div
      className="rounded-3xl border border-white/[0.06] bg-[linear-gradient(160deg,rgba(15,23,42,0.95),rgba(2,6,23,0.92))] p-6 transition hover:bg-white/[0.04]"
      style={{ boxShadow: `inset 0 1px 0 ${accent}10` }}
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-2xl"
        style={{ background: `${accent}1F`, color: accent }}
      >
        {icon}
      </div>
      <p
        className="mt-5 text-[10px] font-bold uppercase tracking-[0.28em]"
        style={{ color: accent }}
      >
        {eyebrow}
      </p>
      <h3 className="mt-2 text-lg font-black leading-tight tracking-tight text-white">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-white/55">{body}</p>
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
  accent: 'athlete' | 'individual' | 'coach'
}) {
  const tone =
    accent === 'athlete'
      ? 'border-emerald-500/20 bg-[linear-gradient(180deg,rgba(29,185,84,0.14),rgba(10,132,255,0.06))]'
      : accent === 'coach'
        ? 'border-blue-500/20 bg-[linear-gradient(180deg,rgba(10,132,255,0.14),rgba(255,255,255,0.03))]'
      : 'border-primary/20 bg-[linear-gradient(180deg,rgba(255,153,51,0.16),rgba(255,255,255,0.02))]'
  const dotTone = accent === 'athlete' ? 'bg-emerald-400' : accent === 'coach' ? 'bg-blue-400' : 'bg-primary'
  const textTone = accent === 'athlete' ? 'text-emerald-300' : accent === 'coach' ? 'text-blue-300' : 'text-primary'

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
  tone?: 'individual' | 'athlete' | 'coach'
}) {
  const color =
    tone === 'athlete'
      ? 'text-emerald-300 border-emerald-500/15 bg-emerald-500/10'
      : tone === 'coach'
        ? 'text-blue-300 border-blue-500/15 bg-blue-500/10'
        : 'text-primary border-primary/15 bg-primary/10'

  return (
    <div className="grid grid-cols-[auto_1fr] gap-4 items-start">
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
    </div>
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
