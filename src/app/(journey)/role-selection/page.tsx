'use client'

import { useRouter } from 'next/navigation'
import { Trophy, UserRound, UsersRound } from 'lucide-react'
import { JourneyShell } from '@/components/journey/JourneyShell'
import { JourneyCard } from '@/components/journey/JourneyCard'
import { JourneyButton } from '@/components/journey/JourneyButton'
import { useJourneyStore, type JourneyRole } from '@/lib/individual-journey-store'
import { cn } from '@/lib/utils'

const roleCards: Array<{
  role: JourneyRole
  title: string
  subtitle: string
  icon: typeof Trophy
  primary?: boolean
}> = [
  {
    role: 'athlete',
    title: 'Athlete',
    subtitle: 'Elite sport performance pathway',
    icon: Trophy,
  },
  {
    role: 'individual',
    title: 'Individual',
    subtitle: 'Personalized peak journey for normal individuals',
    icon: UserRound,
    primary: true,
  },
  {
    role: 'coach',
    title: 'Coach',
    subtitle: 'Squad intelligence and decision support',
    icon: UsersRound,
  },
]

function RoleSelection() {
  const router = useRouter()
  const { setRole } = useJourneyStore()

  const handleSelect = (role: JourneyRole) => {
    setRole(role)
    if (role === 'individual') {
      router.push('/fitstart')
      return
    }
    if (role === 'athlete') {
      router.push('/athlete/onboarding')
      return
    }
    if (role === 'coach') {
      router.push('/coach/onboarding')
      return
    }
  }

  return (
    <JourneyShell>
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[#2DD4BF]">Choose your role</p>
          <h1 className="text-3xl font-black">Who is using CREEDA today?</h1>
          <p className="text-sm text-white/65">Select one role to continue.</p>
        </div>

        <div className="space-y-3">
          {roleCards.map((item) => {
            const Icon = item.icon
            return (
              <button key={item.role} onClick={() => handleSelect(item.role)} className="w-full text-left">
                <JourneyCard
                  className={cn(
                    'flex items-center gap-4 transition hover:border-white/35',
                    item.primary && 'border-[#22C55E]/50 bg-gradient-to-r from-[#22C55E]/20 to-[#14B8A6]/15'
                  )}
                >
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
                    <Icon className={cn('h-6 w-6', item.primary ? 'text-[#22C55E]' : 'text-white/80')} />
                  </div>
                  <div>
                    <p className="text-base font-bold">{item.title}</p>
                    <p className="text-sm text-white/60">{item.subtitle}</p>
                  </div>
                </JourneyCard>
              </button>
            )
          })}
        </div>

        <JourneyButton variant="ghost" onClick={() => router.push('/welcome')}>
          Back to Welcome
        </JourneyButton>
      </div>
    </JourneyShell>
  )
}

export default RoleSelection
