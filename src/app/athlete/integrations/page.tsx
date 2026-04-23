import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  DatabaseZap,
  FileUp,
  Info,
  Link2,
  ShieldCheck,
  Watch,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import {
  getRoleHomeRoute,
  getRoleOnboardingRoute,
  isAppRole,
} from '@/lib/auth_utils'
import { getAthleteDashboardSnapshot } from '@/lib/dashboard_decisions'
import { getIntegrationSnapshot } from '@/lib/product/operating-system/server'
import { simulateIntegrationSync } from '@/app/athlete/integrations/actions'

export const dynamic = 'force-dynamic'

export default async function AthleteIntegrationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.onboarding_completed === false) {
    redirect(getRoleOnboardingRoute('athlete'))
  }

  if (isAppRole(profile.role) && profile.role !== 'athlete') {
    redirect(getRoleHomeRoute(profile.role))
  }

  const dashboard = await getAthleteDashboardSnapshot(supabase, user.id)
  const integrationSnapshot = await getIntegrationSnapshot(supabase, user.id, dashboard.healthSummary)
  const connectedCount = integrationSnapshot.sources.filter((source) => source.status === 'connected' || source.status === 'mock_connected').length

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 pb-24 pt-16 text-white md:pl-72 md:pr-6 md:pt-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[30px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <Link
            href="/athlete/dashboard"
            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--chakra-neon)]">
                Device + Data Integrations
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight">
                Bring measured data into Creeda, without hiding uncertainty
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
                Apple Health and Health Connect are mobile-permission ready. Garmin, Fitbit, and Google Fit are structured for OAuth credentials. Manual import covers athletes who train without a wearable.
              </p>
            </div>

            <div className="rounded-[26px] border border-[var(--saffron)]/20 bg-[var(--saffron)]/10 p-5">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--saffron-light)]">
                <DatabaseZap className="h-4 w-4" />
                Signal state
              </div>
              <p className="mt-3 text-4xl font-black text-white">{connectedCount}</p>
              <p className="mt-1 text-sm text-slate-300">
                Connected or simulated sources
              </p>
              <p className="mt-4 text-xs leading-relaxed text-slate-400">
                {integrationSnapshot.samples.length} normalized sample rows are available for readiness, recovery, and plan adaptation.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {integrationSnapshot.sources.map((source) => (
            <div
              key={source.provider}
              className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    {source.provider === 'manual_import' ? <FileUp className="h-4 w-4" /> : <Watch className="h-4 w-4" />}
                    {source.sourceCategory}
                  </div>
                  <h2 className="mt-3 text-xl font-black text-white">
                    {source.displayName}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {source.setupHint}
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                  source.status === 'connected' || source.status === 'mock_connected'
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                    : source.status === 'sync_failed'
                      ? 'border-red-500/20 bg-red-500/10 text-red-200'
                      : 'border-white/10 bg-white/[0.03] text-slate-400'
                }`}>
                  {source.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {source.supportedSignals.map((signal) => (
                  <span
                    key={signal}
                    className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-semibold text-slate-300"
                  >
                    {signal.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-[var(--chakra-neon)]" />
                  Provenance
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Creeda labels this as <span className="font-bold text-slate-200">{source.provenanceType.replace(/_/g, ' ')}</span>. Recommendations will show whether the signal was measured, estimated, or manually entered.
                </p>
              </div>

              <form action={simulateIntegrationSync} className="mt-5">
                <input type="hidden" name="provider" value={source.provider} />
                <button
                  type="submit"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--saffron)] px-4 text-sm font-black text-black transition hover:brightness-110"
                >
                  {source.status === 'connected' || source.status === 'mock_connected' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                  Simulate secure sync
                </button>
              </form>
            </div>
          ))}
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-[var(--chakra-neon)]/20 bg-[var(--chakra-neon)]/10 p-2 text-[var(--chakra-neon)]">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Production integration requirements
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Live Apple Health and Health Connect reads should come from the mobile apps with user-granted permissions. Garmin, Fitbit, and Google Fit need provider app credentials, OAuth callback handling, refresh-token storage, and partner approval where required. The normalized data model and UI are already ready for those connectors.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
