'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  GraduationCap,
  LayoutDashboard,
  ScanLine,
  Settings,
  ShieldCheck,
  Timer,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'

type Role = 'athlete' | 'coach' | 'individual'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  badge?: string
}

const ATHLETE_NAV: NavItem[] = [
  { href: '/athlete/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/athlete/sessions/today', label: "Today's Session", icon: Dumbbell, badge: 'Start' },
  { href: '/athlete/plans', label: 'Plan Calendar', icon: CalendarDays },
  { href: '/athlete/progress', label: 'Progress Proof', icon: BarChart3 },
  { href: '/athlete/exercises', label: 'Exercise Library', icon: BookOpenCheck, badge: 'New' },
  { href: '/athlete/scan', label: 'Video Analysis', icon: ScanLine },
  { href: '/athlete/checkin', label: 'Daily Check-In', icon: ClipboardList },
  { href: '/athlete/tests', label: 'Objective Tests', icon: Timer },
  { href: '/athlete/review', label: 'Weekly Review', icon: TrendingUp },
  { href: '/athlete/settings', label: 'Settings', icon: Settings },
]

const COACH_NAV: NavItem[] = [
  { href: '/coach/dashboard', label: 'Squad Roster', icon: LayoutDashboard },
  { href: '/coach/execution', label: 'Execution Board', icon: ClipboardList, badge: 'Assign' },
  { href: '/coach/review', label: 'Weekly Review', icon: TrendingUp },
  { href: '/coach/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/coach/academy', label: 'Academy Ops', icon: GraduationCap },
  { href: '/coach/reports', label: 'Reports', icon: ShieldCheck },
  { href: '/coach/settings', label: 'Settings', icon: Settings },
]

const INDIVIDUAL_NAV: NavItem[] = [
  { href: '/individual/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/individual/sessions/today', label: "Today's Session", icon: Dumbbell, badge: 'Start' },
  { href: '/individual/plans', label: 'Plan Calendar', icon: CalendarDays },
  { href: '/individual/exercises', label: 'Exercise Library', icon: BookOpenCheck, badge: 'New' },
  { href: '/individual/scan', label: 'Movement Analysis', icon: ScanLine },
  { href: '/individual/logging', label: 'Daily Check-In', icon: ClipboardList },
  { href: '/individual/tests', label: 'Objective Tests', icon: Timer },
  { href: '/individual/review', label: 'Weekly Review', icon: TrendingUp },
  { href: '/individual/legal', label: 'Legal & Privacy', icon: ShieldCheck },
]

function isActivePath(pathname: string | null, href: string, role: Role) {
  if (href === `/${role}/dashboard`) {
    return pathname === href || pathname === `/${role}`
  }
  return Boolean(pathname?.startsWith(href))
}

export function RoleDesktopNav({ role }: { role: Role }) {
  const pathname = usePathname()
  const navItems =
    role === 'athlete'
      ? ATHLETE_NAV
      : role === 'coach'
        ? COACH_NAV
        : INDIVIDUAL_NAV

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[0.06] bg-[#070A0F]/95 px-4 py-5 text-white backdrop-blur-xl md:flex">
      <Link href={`/${role}/dashboard`} className="mb-7 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--saffron)] text-black shadow-[0_0_24px_var(--saffron-glow)]">
          <Activity className="h-5 w-5" strokeWidth={3} />
        </div>
        <div>
          <p className="text-lg font-black tracking-tight">Creeda</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
            {role === 'athlete' ? 'Player OS' : role === 'coach' ? 'Coach OS' : 'Personal OS'}
          </p>
        </div>
      </Link>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href, role)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition ${
                active
                  ? 'border border-[var(--saffron)]/20 bg-[var(--saffron)]/10 text-white'
                  : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-200'
              }`}
            >
              <Icon
                className={`h-4 w-4 ${
                  active ? 'text-[var(--saffron)]' : 'text-slate-600 group-hover:text-slate-300'
                }`}
              />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] ${
                    active
                      ? 'bg-[var(--saffron)] text-black'
                      : 'border border-white/10 bg-white/[0.03] text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto rounded-3xl border border-white/[0.06] bg-white/[0.03] p-4">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--chakra-neon)]">
          <Users className="h-4 w-4" />
          {role === 'athlete' ? 'Training Loop' : role === 'coach' ? 'Squad Loop' : 'Health Loop'}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          {role === 'athlete'
            ? "Today's plan is ready to execute."
            : role === 'coach'
              ? 'Execution queue is ready for review.'
              : "Today's guided plan is ready to follow."}
        </p>
      </div>
    </aside>
  )
}
