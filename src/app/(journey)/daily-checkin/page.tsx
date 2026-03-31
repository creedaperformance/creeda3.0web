'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { JourneyShell } from '@/components/journey/JourneyShell'
import { JourneyCard } from '@/components/journey/JourneyCard'
import { JourneyButton } from '@/components/journey/JourneyButton'
import { MobileJourneyNav } from '@/components/journey/MobileJourneyNav'
import { useJourneyStore } from '@/lib/individual-journey-store'
import { cn } from '@/lib/utils'

const emojiScale = ['😴', '😟', '😐', '🙂', '⚡️']

function TapScale({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{label}</p>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={cn(
              'rounded-2xl border py-3 text-sm font-bold transition',
              value === item
                ? 'border-[#22C55E]/80 bg-[#22C55E]/20'
                : 'border-white/15 bg-white/5 text-white/70'
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  )
}

export function DailyCheckin() {
  const router = useRouter()
  const { submitDailyCheckin } = useJourneyStore()
  const [energy, setEnergy] = useState(3)
  const [sleep, setSleep] = useState(3)
  const [soreness, setSoreness] = useState(2)

  const complete = () => {
    submitDailyCheckin({ energy, sleep, soreness })
    router.push('/home')
  }

  return (
    <JourneyShell>
      <div className="space-y-5 pb-20">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[#2DD4BF]">5-second check-in</p>
          <h1 className="text-3xl font-black">Daily Pulse</h1>
        </div>

        <JourneyCard className="space-y-4">
          <p className="text-sm text-white/70">Energy (emoji tap)</p>
          <div className="grid grid-cols-5 gap-2">
            {emojiScale.map((emoji, index) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setEnergy(index + 1)}
                className={cn(
                  'rounded-2xl border py-3 text-xl transition',
                  energy === index + 1
                    ? 'border-[#22C55E]/80 bg-[#22C55E]/20'
                    : 'border-white/15 bg-white/5'
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        </JourneyCard>

        <JourneyCard className="space-y-5">
          <TapScale label="Sleep Quality" value={sleep} onChange={setSleep} />
          <TapScale label="Soreness" value={soreness} onChange={setSoreness} />
        </JourneyCard>

        <JourneyButton onClick={complete}>Submit in 5 Seconds</JourneyButton>
      </div>

      <MobileJourneyNav activeTab="home" />
    </JourneyShell>
  )
}

export default DailyCheckin
