import { AdaptiveFormWizard } from '@/components/form/AdaptiveFormWizard'
import { submitAdaptiveCoachOnboarding } from '@/forms/actions'
import { parseAdaptiveEntryContext } from '@/forms/analytics'
import { coachOnboardingFlow } from '@/forms/flows/coachFlow'
import { getAdaptiveProfilePrefill } from '@/forms/storage'
import { verifyRole } from '@/lib/auth_utils'
import { createClient } from '@/lib/supabase/server'

export default async function CoachOnboardingPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const entryContext = parseAdaptiveEntryContext(await props.searchParams)
  const { user } = await verifyRole('coach')
  const supabase = await createClient()
  const prefill = await getAdaptiveProfilePrefill({
    supabase,
    userId: user.id,
    role: 'coach',
    flowId: coachOnboardingFlow.id,
  })

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.16),transparent_30%),linear-gradient(180deg,#020617,#0f172a)] px-4 py-8 sm:px-6">
      <div className="mx-auto mb-6 max-w-xl">
        <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#f472b6]">
          Coach Fast Start
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Build the dashboard first, enrich the structure later.
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-white/68">
          We only ask for the setup details that change the first coach dashboard: identity, sport,
          squad structure, and coaching focus.
        </p>
      </div>

      <AdaptiveFormWizard
        flow={coachOnboardingFlow}
        submitAction={submitAdaptiveCoachOnboarding}
        initialValues={prefill.answers}
        initialQuestionId={prefill.summary?.nextQuestionIds?.[0] ?? null}
        trackedQuestionIds={prefill.summary?.nextQuestionIds ?? []}
        entrySource={entryContext.entrySource}
        entryMode={entryContext.entryMode}
        userId={user.id}
        successFallbackPath="/coach/dashboard"
      />
    </main>
  )
}
