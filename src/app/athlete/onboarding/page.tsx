import { AdaptiveFormWizard } from '@/components/form/AdaptiveFormWizard'
import { submitAdaptiveAthleteOnboarding } from '@/forms/actions'
import { parseAdaptiveEntryContext } from '@/forms/analytics'
import { athleteOnboardingFlow } from '@/forms/flows/athleteFlow'
import { getAdaptiveProfilePrefill } from '@/forms/storage'
import { verifyRole } from '@/lib/auth_utils'
import { createClient } from '@/lib/supabase/server'

export default async function AthleteOnboardingPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const entryContext = parseAdaptiveEntryContext(await props.searchParams)
  const { user } = await verifyRole('athlete')
  const supabase = await createClient()
  const prefill = await getAdaptiveProfilePrefill({
    supabase,
    userId: user.id,
    role: 'athlete',
    flowId: athleteOnboardingFlow.id,
  })

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(0,212,255,0.18),transparent_32%),linear-gradient(180deg,#020617,#0f172a)] px-4 py-8 sm:px-6">
      <div className="mx-auto mb-6 max-w-xl">
        <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#6ee7b7]">
          Athlete Fast Start
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Set up in under 90 seconds.
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-white/68">
          We start with the smallest useful set of answers, get you to your dashboard fast, and ask
          deeper questions later only when they improve accuracy.
        </p>
      </div>

      <AdaptiveFormWizard
        flow={athleteOnboardingFlow}
        submitAction={submitAdaptiveAthleteOnboarding}
        initialValues={prefill.answers}
        initialQuestionId={prefill.summary?.nextQuestionIds?.[0] ?? null}
        trackedQuestionIds={prefill.summary?.nextQuestionIds ?? []}
        entrySource={entryContext.entrySource}
        entryMode={entryContext.entryMode}
        userId={user.id}
        successFallbackPath="/athlete/dashboard"
      />
    </main>
  )
}
