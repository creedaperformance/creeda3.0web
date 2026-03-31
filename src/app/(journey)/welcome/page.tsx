'use client'

import { useRouter } from 'next/navigation'
import { JourneyShell } from '@/components/journey/JourneyShell'
import { JourneyButton } from '@/components/journey/JourneyButton'
import { JourneyCard } from '@/components/journey/JourneyCard'

export function WelcomeScreen() {
  const router = useRouter()

  return (
    <JourneyShell>
      <div className="space-y-8 pt-8">
        <div className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-[#2DD4BF]">CREEDA Decision Engine</p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            Know Your Body.
            <br />
            Reach Your Peak.
          </h1>
          <p className="mx-auto max-w-md text-sm text-white/65">
            Athlete-grade performance intelligence, adapted for normal individuals and real life.
          </p>
        </div>

        <JourneyCard className="space-y-3 bg-white/15">
          <p className="text-sm font-semibold text-white/90">
            CREEDA guides one clear action at a time:
          </p>
          <p className="text-sm text-white/70">
            Profile your physiology, map your sport demands, and execute a personalized day-to-peak plan.
          </p>
        </JourneyCard>

        <div className="space-y-3">
          <JourneyButton onClick={() => router.push('/role-selection')}>
            Start Your Journey
          </JourneyButton>
          <JourneyButton variant="secondary" onClick={() => router.push('/role-selection')}>
            I&apos;m a Coach
          </JourneyButton>
        </div>
      </div>
    </JourneyShell>
  )
}

export default WelcomeScreen
