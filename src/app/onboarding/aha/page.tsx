import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { AhaMomentScreen } from '@/components/onboarding-v2/AhaMomentScreen'
import { PersonaSchema } from '@creeda/schemas'
import type { WeakLinkSummary } from '@/lib/onboarding-v2/types'

export const dynamic = 'force-dynamic'

const PHASE2_ROUTE = '/onboarding/phase-2'
const DASHBOARD: Record<string, string> = {
  athlete: '/athlete/dashboard',
  individual: '/individual/dashboard',
  coach: '/coach/dashboard',
}

export default async function PostScanAhaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('persona, role, primary_sport, primary_sport_id, full_name, username')
    .eq('id', user.id)
    .maybeSingle()

  const personaParse = PersonaSchema.safeParse(
    profileRow?.persona ?? profileRow?.role ?? 'individual'
  )
  const persona = personaParse.success ? personaParse.data : 'individual'
  if (persona === 'coach') redirect('/coach/dashboard')

  const { data: latestBaseline } = await supabase
    .from('movement_baselines')
    .select('movement_quality_score, weak_links, performed_at, passed_quality_gate, rejection_reason')
    .eq('user_id', user.id)
    .order('performed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestBaseline || latestBaseline.passed_quality_gate === false) {
    redirect(`/${persona}/scan/analyze?baseline=onboarding_v2&source=web`)
  }

  const baselineRow = latestBaseline as Record<string, unknown>
  const score = Number(baselineRow.movement_quality_score ?? 0)
  const weakLinks: WeakLinkSummary[] = Array.isArray(baselineRow.weak_links)
    ? (baselineRow.weak_links as unknown[]).flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return []
        const rec = entry as Record<string, unknown>
        const region = typeof rec.region === 'string' ? rec.region : null
        const finding = typeof rec.finding === 'string' ? rec.finding : null
        if (!region || !finding) return []
        const sev = rec.severity
        const severity: WeakLinkSummary['severity'] =
          sev === 'severe' || sev === 'moderate' ? sev : 'mild'
        const drillId = typeof rec.drill_id === 'string' ? rec.drill_id : undefined
        return [{ region, finding, severity, drillId }]
      })
    : []

  const sportLabel =
    typeof profileRow?.primary_sport === 'string' && profileRow.primary_sport.trim().length > 0
      ? profileRow.primary_sport.trim()
      : null
  const handle =
    typeof profileRow?.username === 'string' && profileRow.username.trim().length > 0
      ? profileRow.username.trim()
      : typeof profileRow?.full_name === 'string'
        ? (profileRow.full_name as string).split(' ')[0]
        : null

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.10),transparent_30%),linear-gradient(180deg,#020617,#08111f)] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href={DASHBOARD[persona] ?? '/'}
          className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/45 hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" /> Skip to dashboard
        </Link>

        <div className="mt-6">
          <AhaMomentScreen
            persona={persona}
            movementQualityScore={score}
            weakLinks={weakLinks}
            nextHref={PHASE2_ROUTE}
            exitHref={DASHBOARD[persona] ?? '/'}
            sportLabel={sportLabel}
            athleteHandle={handle}
          />
        </div>
      </div>
    </main>
  )
}
