'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, Mountain } from 'lucide-react'
import { JourneyShell } from '@/components/journey/JourneyShell'
import { JourneyCard } from '@/components/journey/JourneyCard'
import { JourneyButton } from '@/components/journey/JourneyButton'
import { JourneyProgressBar } from '@/components/journey/JourneyProgressBar'
import { useJourneyStore } from '@/lib/individual-journey-store'

export function PeakScreen() {
  const router = useRouter()
  const { state } = useJourneyStore()
  const projection = state.analysis?.peakProjection

  useEffect(() => {
    if (!projection) router.replace('/results')
  }, [projection, router])

  if (!projection) {
    return (
      <JourneyShell>
        <div className="pt-24 text-center text-white/70">Loading projection…</div>
      </JourneyShell>
    )
  }

  return (
    <JourneyShell>
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[#2DD4BF]">Peak Projection</p>
          <h1 className="text-3xl font-black">Now → Peak</h1>
          <p className="text-sm text-white/65">
            This is the version of you CREEDA is building toward in {projection.timelineWeeks} weeks.
          </p>
        </div>

        <JourneyCard className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <p className="text-white/60">Now {projection.currentScore}</p>
            <p className="text-white/80">Peak {projection.targetScore}</p>
          </div>
          <JourneyProgressBar value={projection.progressPct} />
          <p className="text-xs text-white/50">{projection.progressPct}% of peak profile unlocked</p>
        </JourneyCard>

        <JourneyCard className="space-y-3">
          <div className="flex items-center gap-2 text-[#22C55E]">
            <ArrowUpRight className="h-4 w-4" />
            <p className="text-sm font-semibold">Strength ↑ {projection.strengthGainPct}%</p>
          </div>
          <div className="flex items-center gap-2 text-[#14B8A6]">
            <ArrowUpRight className="h-4 w-4" />
            <p className="text-sm font-semibold">Endurance ↑ {projection.enduranceGainPct}%</p>
          </div>
          <div className="flex items-center gap-2 text-[#F59E0B]">
            <Mountain className="h-4 w-4" />
            <p className="text-sm font-semibold">Fatigue ↓ {projection.fatigueDropPct}%</p>
          </div>
        </JourneyCard>

        <JourneyCard>
          <p className="text-sm text-white/80">
            You are not starting from zero. You are starting from data and direction.
          </p>
        </JourneyCard>

        <JourneyButton onClick={() => router.push('/plan')}>Show Me My Plan</JourneyButton>
      </div>
    </JourneyShell>
  )
}

export default PeakScreen
