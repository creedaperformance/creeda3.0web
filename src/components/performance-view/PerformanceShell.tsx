import type { ReactNode } from 'react'
import { RoleDesktopNav } from '@/components/RoleDesktopNav'

type Role = 'athlete' | 'coach' | 'individual'

interface PerformanceShellProps {
  role: Role
  sport?: string
  region?: string
  decision: ReactNode
  plan: ReactNode
  week: ReactNode
  next: ReactNode
  /**
   * Optional extra content rendered after the four standard zones, inside the
   * same column. Used by the Onboarding v2 calibration card.
   */
  extra?: ReactNode
}

export function PerformanceShell({ role, sport, region, decision, plan, week, next, extra }: PerformanceShellProps) {
  return (
    <div
      className="relative min-h-screen bg-[var(--background)] text-white pb-24 md:pb-10"
      data-persona={role}
      data-sport={sport ?? 'general'}
      data-region={region ?? 'in'}
    >
      {/* Persona/sport accent strip — proves the modulator system is wired and gives
          each persona/sport a one-glance visual signature. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1"
        style={{
          background: `linear-gradient(90deg, var(--persona-accent), var(--sport-accent))`,
        }}
      />
      <RoleDesktopNav role={role} />
      <div className="px-4 pt-6 md:pl-72 md:pr-8 md:pt-10">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          <Zone testid="zone-decision" tone="hero">
            {decision}
          </Zone>
          <Zone testid="zone-plan" tone="action">
            {plan}
          </Zone>
          <Zone testid="zone-week" tone="trend">
            {week}
          </Zone>
          <Zone testid="zone-next" tone="unlock">
            {next}
          </Zone>
          {extra ? <div data-testid="zone-extra">{extra}</div> : null}
        </div>
      </div>
    </div>
  )
}

function Zone({
  children,
  testid,
  tone,
}: {
  children: ReactNode
  testid: string
  tone: 'hero' | 'action' | 'trend' | 'unlock'
}) {
  return (
    <section
      data-testid={testid}
      data-zone={tone}
      className="rounded-[28px] border border-white/[0.06] bg-[#111118] p-5 sm:p-6"
    >
      {children}
    </section>
  )
}
