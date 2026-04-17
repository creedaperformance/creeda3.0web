import { AdaptiveFormWizard } from '@/components/form/AdaptiveFormWizard'
import { submitAdaptiveIndividualOnboarding } from '@/forms/actions'
import { parseAdaptiveEntryContext } from '@/forms/analytics'
import { individualOnboardingFlow } from '@/forms/flows/individualFlow'
import { getAdaptiveProfilePrefill } from '@/forms/storage'
import { verifyRole } from '@/lib/auth_utils'
import { createClient } from '@/lib/supabase/server'

export default async function FitStartPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const entryContext = parseAdaptiveEntryContext(await props.searchParams)
  const { user } = await verifyRole('individual')
  const supabase = await createClient()
  const prefill = await getAdaptiveProfilePrefill({
    supabase,
    userId: user.id,
    role: 'individual',
    flowId: individualOnboardingFlow.id,
  })

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(110,231,183,0.16),transparent_28%),linear-gradient(180deg,#020617,#0f172a)] px-4 py-8 sm:px-6">
      <div className="mx-auto mb-6 max-w-xl">
        <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#6ee7b7]">
          FitStart
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Start simple. Improve accuracy later.
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-white/68">
          We ask only what changes your first plan: goal, body snapshot, schedule reality, available
          setup, and any current limitation.
        </p>
      </div>

      <AdaptiveFormWizard
        flow={individualOnboardingFlow}
        submitAction={submitAdaptiveIndividualOnboarding}
        initialValues={prefill.answers}
        initialQuestionId={prefill.summary?.nextQuestionIds?.[0] ?? null}
        trackedQuestionIds={prefill.summary?.nextQuestionIds ?? []}
        entrySource={entryContext.entrySource}
        entryMode={entryContext.entryMode}
        userId={user.id}
        successFallbackPath="/individual/dashboard"
      />
    </main>
  )
}
