'use client'

import { StepLayout } from '@/components/journey/StepLayout'
import { JourneySlider } from '@/components/journey/JourneySlider'
import { JourneyCard } from '@/components/journey/JourneyCard'
import { useJourneyStore } from '@/lib/individual-journey-store'

export default function IntensityStep() {
  const { state, setIntensityPreference } = useJourneyStore()
  const value = state.onboarding.intensityPreference

  const label =
    value <= 3 ? 'Low and steady' : value <= 7 ? 'Moderate progression' : 'High performance'

  return (
    <StepLayout
      title="Intensity Preference"
      subtitle="Set how hard you want your first cycle to feel."
      step={8}
      totalSteps={8}
      backHref="/onboarding/time-horizon"
      nextHref="/analysis"
      nextLabel="Analyze My Profile"
    >
      <JourneySlider
        label="Intensity"
        value={value}
        min={1}
        max={10}
        minLabel="Low"
        maxLabel="High"
        onChange={setIntensityPreference}
      />
      <JourneyCard>
        <p className="text-sm text-white/70">Current preference</p>
        <p className="mt-2 text-2xl font-black">{label}</p>
        <p className="mt-2 text-sm text-white/55">
          CREEDA will adapt daily intensity anyway based on your readiness and recovery.
        </p>
      </JourneyCard>
    </StepLayout>
  )
}
