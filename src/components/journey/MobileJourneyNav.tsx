'use client'

import Link from 'next/link'
import { Home, CalendarDays, TrendingUp, User } from 'lucide-react'
import { cn } from '@/lib/utils'

type TabKey = 'home' | 'plan' | 'progress' | 'profile'

const tabs: Array<{
  key: TabKey
  label: string
  href: string
  icon: typeof Home
}> = [
  { key: 'home', label: 'Home', href: '/home', icon: Home },
  { key: 'plan', label: 'Plan', href: '/plan', icon: CalendarDays },
  { key: 'progress', label: 'Progress', href: '/weekly-review', icon: TrendingUp },
  { key: 'profile', label: 'Profile', href: '/results', icon: User },
]

export function MobileJourneyNav({ activeTab }: { activeTab: TabKey }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#07101B]/90 px-3 pb-5 pt-2 backdrop-blur-xl">
      <div className="mx-auto grid max-w-xl grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = tab.key === activeTab
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition',
                active ? 'text-white' : 'text-white/50'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'text-[#22C55E]')} />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
