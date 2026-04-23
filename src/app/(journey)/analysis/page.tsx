'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { JourneyShell } from '@/components/journey/JourneyShell'
import { JourneyCard } from '@/components/journey/JourneyCard'
import { JourneyProgressBar } from '@/components/journey/JourneyProgressBar'
import { useJourneyStore } from '@/lib/individual-journey-store'

const messages = [
  'Analyzing your physiology…',
  'Mapping your sport…',
  'Building your plan…',
]

function AnalysisScreen() {
  const router = useRouter()
  const { runAnalysis } = useJourneyStore()
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    runAnalysis()
    const rotate = window.setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length)
    }, 900)
    const finish = window.setTimeout(() => {
      router.push('/results')
    }, 3200)

    return () => {
      window.clearInterval(rotate)
      window.clearTimeout(finish)
    }
  }, [router, runAnalysis])

  const progress = useMemo(() => ((messageIndex + 1) / messages.length) * 100, [messageIndex])

  return (
    <JourneyShell>
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6">
        <div className="relative h-24 w-24">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-white/20 border-t-[#2DD4BF]" />
          <div className="absolute inset-3 rounded-full border border-white/10 bg-white/5" />
        </div>
        <JourneyCard className="w-full space-y-4 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-white/50">CREEDA Engine Active</p>
          <h1 className="text-2xl font-black">{messages[messageIndex]}</h1>
          <JourneyProgressBar value={progress} />
        </JourneyCard>
      </div>
    </JourneyShell>
  )
}

export default AnalysisScreen
