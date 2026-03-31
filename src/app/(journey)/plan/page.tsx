'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { JourneyShell } from '@/components/journey/JourneyShell'
import { JourneyCard } from '@/components/journey/JourneyCard'
import { JourneyButton } from '@/components/journey/JourneyButton'
import { useJourneyStore } from '@/lib/individual-journey-store'
import { cn } from '@/lib/utils'

export function PlanScreen() {
  const router = useRouter()
  const { state } = useJourneyStore()
  const plan = state.analysis?.plan

  const [selectedDay, setSelectedDay] = useState(plan?.todayKey ?? 'mon')

  const activeDay = useMemo(
    () => plan?.weekly.find((day) => day.key === selectedDay) ?? null,
    [plan, selectedDay]
  )

  useEffect(() => {
    if (!plan || !activeDay) router.replace('/results')
  }, [activeDay, plan, router])

  if (!plan || !activeDay) {
    return (
      <JourneyShell>
        <div className="pt-24 text-center text-white/70">Loading plan…</div>
      </JourneyShell>
    )
  }

  return (
    <JourneyShell>
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[#2DD4BF]">Your Plan</p>
          <h1 className="text-3xl font-black">Week Blueprint</h1>
          <p className="text-sm text-white/65">Today&apos;s answer is always clear: what to do next.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {plan.weekly.map((day) => (
            <button
              key={day.key}
              type="button"
              onClick={() => setSelectedDay(day.key)}
              className={cn(
                'min-w-[72px] rounded-2xl border px-3 py-3 text-sm font-semibold transition',
                selectedDay === day.key
                  ? 'border-[#22C55E]/80 bg-[#22C55E]/20'
                  : 'border-white/15 bg-white/5 text-white/70'
              )}
            >
              {day.label}
            </button>
          ))}
        </div>

        <JourneyCard className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Focus</p>
          <p className="text-xl font-black">{activeDay.focus}</p>
        </JourneyCard>

        <div className="space-y-3">
          {activeDay.sessions.map((session) => (
            <JourneyCard key={session.id} className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">{session.type}</p>
              <p className="text-base font-bold">{session.title}</p>
              <p className="text-sm text-white/60">
                {session.durationMin} min • {session.intensity}
              </p>
            </JourneyCard>
          ))}
        </div>

        <JourneyButton onClick={() => router.push('/home')}>Start Today</JourneyButton>
      </div>
    </JourneyShell>
  )
}

export default PlanScreen
