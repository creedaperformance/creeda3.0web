'use client'

import { useState } from 'react'
import { StepLayout } from '@/components/journey/StepLayout'
import { JourneyCard } from '@/components/journey/JourneyCard'
import { JourneyProgressBar } from '@/components/journey/JourneyProgressBar'
import { useJourneyStore } from '@/lib/individual-journey-store'
import { cn } from '@/lib/utils'

const metrics = [
  { key: 'sleep', title: 'Sleep Quality', subtitle: 'How restorative has sleep felt recently?' },
  { key: 'energy', title: 'Energy', subtitle: 'How steady is your energy through the day?' },
  { key: 'stress', title: 'Stress', subtitle: 'How much stress load are you carrying?' },
  { key: 'soreness', title: 'Soreness', subtitle: 'How much physical heaviness are you feeling?' },
  { key: 'recovery', title: 'Recovery', subtitle: 'How quickly do you bounce back after activity?' },
] as const

const scoreLabels = ['Very Low', 'Low', 'Moderate', 'High', 'Very High']

export default function PhysiologyStep() {
  const [index, setIndex] = useState(0)
  const { state, updatePhysiologyMetric } = useJourneyStore()
  const physiology = state.onboarding.physiology

  const activeMetric = metrics[index]
  const currentValue = physiology[activeMetric.key]

  const handleNext = () => {
    if (index < metrics.length - 1) {
      setIndex((prev) => prev + 1)
      return false
    }
    return true
  }

  const handleBack = () => {
    if (index > 0) {
      setIndex((prev) => prev - 1)
      return false
    }
    return true
  }

  return (
    <StepLayout
      title="Physiology Swipe"
      subtitle="One signal at a time. Tap your current state."
      step={3}
      totalSteps={8}
      backHref="/onboarding/lifestyle"
      nextHref="/onboarding/injury-mobility"
      nextLabel={index < metrics.length - 1 ? 'Next Signal' : 'Continue'}
      onNext={handleNext}
      onBack={handleBack}
    >
      <JourneyCard className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">
            Signal {index + 1} of {metrics.length}
          </p>
          <JourneyProgressBar value={((index + 1) / metrics.length) * 100} />
        </div>
        <div>
          <h2 className="text-2xl font-black">{activeMetric.title}</h2>
          <p className="mt-2 text-sm text-white/65">{activeMetric.subtitle}</p>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => updatePhysiologyMetric(activeMetric.key, value)}
              className={cn(
                'rounded-2xl border py-4 text-sm font-bold transition',
                value === currentValue
                  ? 'border-[#2DD4BF]/80 bg-[#2DD4BF]/20'
                  : 'border-white/15 bg-white/5 text-white/70'
              )}
            >
              {value}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-white/45">{scoreLabels[currentValue - 1]}</p>
      </JourneyCard>
    </StepLayout>
  )
}
