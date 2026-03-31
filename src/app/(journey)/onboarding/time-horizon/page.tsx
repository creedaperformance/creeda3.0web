'use client'

import { StepLayout } from '@/components/journey/StepLayout'
import { JourneyCard } from '@/components/journey/JourneyCard'
import { useJourneyStore } from '@/lib/individual-journey-store'
import { cn } from '@/lib/utils'

const options: Array<{ weeks: 4 | 8 | 12; subtitle: string }> = [
  { weeks: 4, subtitle: 'Sprint reset' },
  { weeks: 8, subtitle: 'Performance build' },
  { weeks: 12, subtitle: 'Peak transformation' },
]

export default function TimeHorizonStep() {
  const { state, setTimeHorizon } = useJourneyStore()
  const selected = state.onboarding.timeHorizonWeeks

  return (
    <StepLayout
      title="Time Horizon"
      subtitle="How long should this first performance cycle run?"
      step={7}
      totalSteps={8}
      backHref="/onboarding/sport"
      nextHref="/onboarding/intensity"
    >
      <div className="space-y-3">
        {options.map((option) => (
          <button key={option.weeks} type="button" onClick={() => setTimeHorizon(option.weeks)} className="w-full text-left">
            <JourneyCard
              className={cn(
                'flex items-center justify-between',
                selected === option.weeks && 'border-[#22C55E]/80 bg-[#22C55E]/15'
              )}
            >
              <div>
                <p className="text-2xl font-black">{option.weeks} Weeks</p>
                <p className="text-sm text-white/60">{option.subtitle}</p>
              </div>
              <div
                className={cn(
                  'h-4 w-4 rounded-full border',
                  selected === option.weeks
                    ? 'border-[#22C55E] bg-[#22C55E]'
                    : 'border-white/30 bg-transparent'
                )}
              />
            </JourneyCard>
          </button>
        ))}
      </div>
    </StepLayout>
  )
}
