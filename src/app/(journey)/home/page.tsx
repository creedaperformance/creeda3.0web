'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { JourneyShell } from '@/components/journey/JourneyShell'
import { JourneyCard } from '@/components/journey/JourneyCard'
import { JourneyButton } from '@/components/journey/JourneyButton'
import { JourneyProgressBar } from '@/components/journey/JourneyProgressBar'
import { MobileJourneyNav } from '@/components/journey/MobileJourneyNav'
import { useJourneyStore } from '@/lib/individual-journey-store'

export function HomeScreen() {
  const router = useRouter()
  const { state } = useJourneyStore()
  const analysis = state.analysis

  const todayPlan = useMemo(() => {
    if (!analysis) return null
    return analysis.plan.weekly.find((item) => item.key === analysis.plan.todayKey) ?? analysis.plan.weekly[0]
  }, [analysis])

  useEffect(() => {
    if (!analysis || !todayPlan) router.replace('/results')
  }, [analysis, router, todayPlan])

  if (!analysis || !todayPlan) {
    return (
      <JourneyShell>
        <div className="pt-24 text-center text-white/70">Loading home…</div>
      </JourneyShell>
    )
  }

  return (
    <JourneyShell>
      <div className="space-y-5 pb-20">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[#2DD4BF]">Home</p>
          <h1 className="text-3xl font-black">What should I do next?</h1>
        </div>

        <JourneyCard className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Readiness Score</p>
          <p className="text-5xl font-black">{analysis.readinessScore}%</p>
          <p className="text-sm text-white/65">
            {analysis.readinessScore < 55
              ? 'Recovery-first day. Keep quality high and volume low.'
              : 'Good training day. Execute your planned intensity.'}
          </p>
        </JourneyCard>

        <JourneyCard className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Today&apos;s Plan</p>
          <p className="text-lg font-black">{todayPlan.focus}</p>
          <p className="text-sm text-white/65">
            {todayPlan.sessions[1]?.title} • {todayPlan.sessions[1]?.durationMin} min
          </p>
          <JourneyButton variant="secondary" onClick={() => router.push('/plan')}>
            Open Full Plan
          </JourneyButton>
        </JourneyCard>

        <JourneyCard className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Progress to Peak</p>
          <JourneyProgressBar value={analysis.peakProjection.progressPct} />
          <p className="text-sm text-white/65">
            {analysis.peakProjection.progressPct}% unlocked • Target {analysis.peakProjection.targetScore}
          </p>
        </JourneyCard>

        <div className="grid grid-cols-2 gap-3">
          {analysis.insights.slice(0, 2).map((insight) => (
            <JourneyCard key={insight} className="text-sm text-white/80">
              {insight}
            </JourneyCard>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <JourneyButton variant="secondary" onClick={() => router.push('/daily-checkin')}>
            Daily Check-In
          </JourneyButton>
          <JourneyButton variant="secondary" onClick={() => router.push('/weekly-review')}>
            Weekly Review
          </JourneyButton>
        </div>
      </div>

      <MobileJourneyNav activeTab="home" />
    </JourneyShell>
  )
}

export default HomeScreen
