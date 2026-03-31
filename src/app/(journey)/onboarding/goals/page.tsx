'use client'

import { Flame, Dumbbell, HeartPulse, Trophy } from 'lucide-react'
import { StepLayout } from '@/components/journey/StepLayout'
import { JourneyCard } from '@/components/journey/JourneyCard'
import { useJourneyStore, type GoalOption } from '@/lib/individual-journey-store'
import { cn } from '@/lib/utils'

const options: Array<{
  key: GoalOption
  label: string
  subtitle: string
  icon: typeof Flame
}> = [
  { key: 'fat_loss', label: 'Fat Loss', subtitle: 'Improve composition with performance balance', icon: Flame },
  { key: 'muscle_gain', label: 'Muscle Gain', subtitle: 'Build strength and lean mass', icon: Dumbbell },
  { key: 'fitness', label: 'Fitness', subtitle: 'Boost all-round health and capacity', icon: HeartPulse },
  { key: 'sport_performance', label: 'Sport Performance', subtitle: 'Train for your chosen sport output', icon: Trophy },
]

export default function GoalsStep() {
  const { state, toggleGoal } = useJourneyStore()
  const selected = state.onboarding.goals

  return (
    <StepLayout
      title="Primary Goals"
      subtitle="Choose one or more outcomes to guide your plan."
      step={5}
      totalSteps={8}
      backHref="/onboarding/injury-mobility"
      nextHref="/onboarding/sport"
      canContinue={selected.length > 0}
    >
      <div className="space-y-3">
        {options.map((item) => {
          const Icon = item.icon
          const active = selected.includes(item.key)
          return (
            <button key={item.key} type="button" onClick={() => toggleGoal(item.key)} className="w-full text-left">
              <JourneyCard className={cn(active && 'border-[#22C55E]/80 bg-[#22C55E]/15')}>
                <div className="flex items-center gap-3">
                  <div className={cn('rounded-xl border border-white/15 p-2', active && 'border-[#22C55E]/80')}>
                    <Icon className={cn('h-5 w-5', active ? 'text-[#22C55E]' : 'text-white/75')} />
                  </div>
                  <div>
                    <p className="font-semibold">{item.label}</p>
                    <p className="text-sm text-white/60">{item.subtitle}</p>
                  </div>
                </div>
              </JourneyCard>
            </button>
          )
        })}
      </div>
    </StepLayout>
  )
}
