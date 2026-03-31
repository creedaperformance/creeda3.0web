'use client'

import { StepLayout } from '@/components/journey/StepLayout'
import { JourneySlider } from '@/components/journey/JourneySlider'
import { JourneyCard } from '@/components/journey/JourneyCard'
import { useJourneyStore } from '@/lib/individual-journey-store'
import { cn } from '@/lib/utils'

const activityOptions = [
  { key: 'sedentary', title: 'Sedentary', subtitle: 'Mostly desk + low movement' },
  { key: 'moderate', title: 'Moderate', subtitle: 'Some movement, mixed routine' },
  { key: 'active', title: 'Active', subtitle: 'Frequent movement or training' },
] as const

export default function LifestyleStep() {
  const { state, updateLifestyle } = useJourneyStore()
  const lifestyle = state.onboarding.lifestyle

  return (
    <StepLayout
      title="Lifestyle Load"
      subtitle="This tells CREEDA how much stress your day already carries."
      step={2}
      totalSteps={8}
      backHref="/onboarding/basic"
      nextHref="/onboarding/physiology"
    >
      <div className="space-y-2">
        <p className="text-sm font-semibold text-white/85">Activity Level</p>
        <div className="space-y-2">
          {activityOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => updateLifestyle({ activityLevel: option.key })}
              className={cn(
                'w-full rounded-2xl border px-4 py-4 text-left transition',
                lifestyle.activityLevel === option.key
                  ? 'border-[#22C55E]/70 bg-[#22C55E]/20'
                  : 'border-white/15 bg-white/5'
              )}
            >
              <p className="font-semibold">{option.title}</p>
              <p className="mt-1 text-sm text-white/60">{option.subtitle}</p>
            </button>
          ))}
        </div>
      </div>

      <JourneySlider
        label="Sitting Hours / Day"
        value={lifestyle.sittingHours}
        min={2}
        max={14}
        unit=" h"
        minLabel="Low"
        maxLabel="High"
        onChange={(value) => updateLifestyle({ sittingHours: value })}
      />

      <JourneyCard className="space-y-3">
        <p className="text-sm font-semibold">Gym Access</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => updateLifestyle({ gymAccess: true })}
            className={cn(
              'rounded-2xl border px-4 py-3 text-sm font-semibold transition',
              lifestyle.gymAccess
                ? 'border-[#2DD4BF]/70 bg-[#2DD4BF]/20'
                : 'border-white/15 bg-white/5 text-white/70'
            )}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => updateLifestyle({ gymAccess: false })}
            className={cn(
              'rounded-2xl border px-4 py-3 text-sm font-semibold transition',
              !lifestyle.gymAccess
                ? 'border-[#2DD4BF]/70 bg-[#2DD4BF]/20'
                : 'border-white/15 bg-white/5 text-white/70'
            )}
          >
            No
          </button>
        </div>
      </JourneyCard>
    </StepLayout>
  )
}
