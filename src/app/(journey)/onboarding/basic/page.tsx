'use client'

import { StepLayout } from '@/components/journey/StepLayout'
import { JourneySlider } from '@/components/journey/JourneySlider'
import { JourneyCard } from '@/components/journey/JourneyCard'
import { useJourneyStore } from '@/lib/individual-journey-store'
import { cn } from '@/lib/utils'

const genders = [
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
  { key: 'non_binary', label: 'Non-binary' },
  { key: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const

const occupations = [
  { key: 'student', label: 'Student' },
  { key: 'desk', label: 'Desk Job' },
  { key: 'shift', label: 'Shift Work' },
  { key: 'manual', label: 'Manual Labor' },
  { key: 'caregiver', label: 'Caregiver' },
  { key: 'hybrid', label: 'Hybrid Work' },
] as const

export default function BasicInfoStep() {
  const { state, updateBasic } = useJourneyStore()
  const basic = state.onboarding.basic

  return (
    <StepLayout
      title="Basic Profile"
      subtitle="Set your baseline in under a minute."
      step={1}
      totalSteps={8}
      backHref="/role-selection"
      nextHref="/onboarding/lifestyle"
    >
      <JourneySlider
        label="Age"
        value={basic.age}
        min={14}
        max={75}
        onChange={(value) => updateBasic({ age: value })}
      />

      <div className="space-y-3">
        <p className="text-sm font-semibold text-white/85">Gender</p>
        <div className="grid grid-cols-2 gap-2">
          {genders.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => updateBasic({ gender: item.key })}
              className={cn(
                'rounded-2xl border px-3 py-3 text-sm font-semibold transition',
                basic.gender === item.key
                  ? 'border-[#22C55E]/70 bg-[#22C55E]/20 text-white'
                  : 'border-white/15 bg-white/5 text-white/70'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <JourneySlider
        label="Height"
        value={basic.heightCm}
        min={140}
        max={210}
        unit=" cm"
        onChange={(value) => updateBasic({ heightCm: value })}
      />

      <JourneySlider
        label="Weight"
        value={basic.weightKg}
        min={40}
        max={140}
        unit=" kg"
        onChange={(value) => updateBasic({ weightKg: value })}
      />

      <JourneyCard className="space-y-2">
        <p className="text-sm font-semibold">Occupation</p>
        <div className="grid grid-cols-2 gap-2">
          {occupations.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => updateBasic({ occupation: item.key })}
              className={cn(
                'rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition',
                basic.occupation === item.key
                  ? 'border-[#2DD4BF]/70 bg-[#2DD4BF]/20'
                  : 'border-white/15 bg-white/5 text-white/75'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </JourneyCard>
    </StepLayout>
  )
}
