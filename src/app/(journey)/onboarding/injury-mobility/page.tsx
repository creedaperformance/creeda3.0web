'use client'

import { StepLayout } from '@/components/journey/StepLayout'
import { JourneyCard } from '@/components/journey/JourneyCard'
import { JourneyChip } from '@/components/journey/JourneyChip'
import { useJourneyStore } from '@/lib/individual-journey-store'

const options = [
  'None',
  'Neck',
  'Shoulders',
  'Lower Back',
  'Hips',
  'Knees',
  'Ankles',
  'Wrists',
]

export default function InjuryMobilityStep() {
  const { state, toggleInjuryMobility } = useJourneyStore()
  const selected = state.onboarding.injuryMobility

  return (
    <StepLayout
      title="Injury & Mobility"
      subtitle="Select any area needing extra care."
      step={4}
      totalSteps={8}
      backHref="/onboarding/physiology"
      nextHref="/onboarding/goals"
    >
      <JourneyCard className="space-y-4">
        <p className="text-sm text-white/65">
          This helps CREEDA reduce overload risk and choose safer progressions.
        </p>
        <div className="flex flex-wrap gap-2">
          {options.map((item) => (
            <JourneyChip
              key={item}
              label={item}
              active={item !== 'None' ? selected.includes(item) : selected.length === 0}
              onClick={() => toggleInjuryMobility(item)}
            />
          ))}
        </div>
      </JourneyCard>
    </StepLayout>
  )
}
