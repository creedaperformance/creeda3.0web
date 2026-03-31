'use client'

import { useRouter } from 'next/navigation'
import { JourneyShell } from '@/components/journey/JourneyShell'
import { JourneyCard } from '@/components/journey/JourneyCard'
import { JourneyButton } from '@/components/journey/JourneyButton'
import { MetricIndicator } from '@/components/journey/MetricIndicator'
import { useJourneyStore } from '@/lib/individual-journey-store'

export function ResultsScreen() {
  const router = useRouter()
  const { state } = useJourneyStore()
  const analysis = state.analysis

  if (!analysis) {
    return (
      <JourneyShell>
        <div className="space-y-5 pt-20">
          <JourneyCard className="space-y-3 text-center">
            <h1 className="text-2xl font-black">No Analysis Yet</h1>
            <p className="text-sm text-white/65">Complete onboarding so CREEDA can compute your current state.</p>
          </JourneyCard>
          <JourneyButton onClick={() => router.push('/welcome')}>Back to Start</JourneyButton>
        </div>
      </JourneyShell>
    )
  }

  return (
    <JourneyShell>
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[#2DD4BF]">Current State</p>
          <h1 className="text-3xl font-black">Your Body Right Now</h1>
          <p className="text-sm text-white/65">This is your current readiness baseline.</p>
        </div>

        <JourneyCard className="space-y-4">
          <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full bg-white/5">
            <div
              className="flex h-40 w-40 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#22C55E ${analysis.readinessScore * 3.6}deg, rgba(255,255,255,0.14) 0deg)`,
              }}
            >
              <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-[#07101B]">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Readiness</p>
                <p className="text-4xl font-black">{analysis.readinessScore}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MetricIndicator label="Energy" value={analysis.metrics.energy} />
            <MetricIndicator label="Recovery" value={analysis.metrics.recovery} />
            <MetricIndicator label="Mobility" value={analysis.metrics.mobility} />
          </div>
        </JourneyCard>

        <JourneyCard className="space-y-3">
          <p className="text-sm font-semibold text-[#22C55E]">Strengths</p>
          {analysis.strengths.map((item) => (
            <p key={item} className="text-sm text-white/80">
              • {item}
            </p>
          ))}
        </JourneyCard>

        <JourneyCard className="space-y-3">
          <p className="text-sm font-semibold text-[#F59E0B]">Limitations</p>
          {analysis.limitations.map((item) => (
            <p key={item} className="text-sm text-white/75">
              • {item}
            </p>
          ))}
        </JourneyCard>

        <JourneyButton onClick={() => router.push('/peak')}>See Your Peak</JourneyButton>
      </div>
    </JourneyShell>
  )
}

export default ResultsScreen
