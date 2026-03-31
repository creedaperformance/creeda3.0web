'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { JourneyShell } from '@/components/journey/JourneyShell'
import { JourneyCard } from '@/components/journey/JourneyCard'
import { JourneyButton } from '@/components/journey/JourneyButton'
import { JourneyProgressBar } from '@/components/journey/JourneyProgressBar'
import { MobileJourneyNav } from '@/components/journey/MobileJourneyNav'
import { useJourneyStore } from '@/lib/individual-journey-store'

export function WeeklyReview() {
  const router = useRouter()
  const { state } = useJourneyStore()
  const analysis = state.analysis

  useEffect(() => {
    if (!analysis) router.replace('/results')
  }, [analysis, router])

  if (!analysis) {
    return (
      <JourneyShell>
        <div className="pt-24 text-center text-white/70">Loading weekly review…</div>
      </JourneyShell>
    )
  }

  return (
    <JourneyShell>
      <div className="space-y-5 pb-20">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[#2DD4BF]">Weekly Review</p>
          <h1 className="text-3xl font-black">Progress Summary</h1>
        </div>

        <JourneyCard className="space-y-3">
          <p className="text-sm text-white/70">Readiness to Peak Progress</p>
          <JourneyProgressBar value={analysis.peakProjection.progressPct} />
          <p className="text-sm text-white/65">
            {analysis.peakProjection.progressPct}% complete • {analysis.peakProjection.timelineWeeks} week cycle
          </p>
        </JourneyCard>

        <JourneyCard className="space-y-3">
          <p className="text-sm font-semibold text-[#22C55E]">Improvements</p>
          {analysis.weeklyReview.improvements.map((item) => (
            <p key={item} className="text-sm text-white/80">
              • {item}
            </p>
          ))}
        </JourneyCard>

        <JourneyCard className="space-y-3">
          <p className="text-sm font-semibold text-[#F59E0B]">Suggestions</p>
          {analysis.weeklyReview.suggestions.map((item) => (
            <p key={item} className="text-sm text-white/75">
              • {item}
            </p>
          ))}
        </JourneyCard>

        <div className="grid grid-cols-2 gap-3">
          <JourneyButton variant="secondary" onClick={() => router.push('/daily-checkin')}>
            Add recovery
          </JourneyButton>
          <JourneyButton variant="secondary" onClick={() => router.push('/plan')}>
            Increase intensity
          </JourneyButton>
        </div>
      </div>

      <MobileJourneyNav activeTab="progress" />
    </JourneyShell>
  )
}

export default WeeklyReview
