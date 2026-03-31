'use client'

import {
  Bike,
  Dumbbell,
  Footprints,
  PersonStanding,
  Waves,
  Trophy,
  CircleDotDashed,
  Goal,
  CircleEllipsis,
} from 'lucide-react'
import { StepLayout } from '@/components/journey/StepLayout'
import { JourneyCard } from '@/components/journey/JourneyCard'
import { useJourneyStore, type SportOption } from '@/lib/individual-journey-store'
import { cn } from '@/lib/utils'

const sports: Array<{ key: SportOption; label: string; icon: typeof Bike }> = [
  { key: 'football', label: 'Football', icon: Goal },
  { key: 'running', label: 'Running', icon: Footprints },
  { key: 'gym', label: 'Gym', icon: Dumbbell },
  { key: 'swimming', label: 'Swimming', icon: Waves },
  { key: 'cycling', label: 'Cycling', icon: Bike },
  { key: 'basketball', label: 'Basketball', icon: Trophy },
  { key: 'tennis', label: 'Tennis', icon: CircleDotDashed },
  { key: 'yoga', label: 'Yoga', icon: PersonStanding },
  { key: 'general_fitness', label: 'General', icon: CircleEllipsis },
]

export default function SportStep() {
  const { state, setSport } = useJourneyStore()
  const selectedSport = state.onboarding.sport

  return (
    <StepLayout
      title="Sport Focus"
      subtitle="Select the main sport or fitness pathway you want to improve."
      step={6}
      totalSteps={8}
      backHref="/onboarding/goals"
      nextHref="/onboarding/time-horizon"
      canContinue={!!selectedSport}
    >
      <div className="grid grid-cols-3 gap-3">
        {sports.map((item) => {
          const Icon = item.icon
          const active = selectedSport === item.key
          return (
            <button key={item.key} type="button" onClick={() => setSport(item.key)}>
              <JourneyCard
                className={cn(
                  'flex h-28 flex-col items-center justify-center gap-2 p-3 text-center',
                  active && 'border-[#2DD4BF]/80 bg-[#2DD4BF]/20'
                )}
              >
                <Icon className={cn('h-6 w-6', active ? 'text-[#2DD4BF]' : 'text-white/80')} />
                <p className="text-xs font-semibold">{item.label}</p>
              </JourneyCard>
            </button>
          )
        })}
      </div>
    </StepLayout>
  )
}
