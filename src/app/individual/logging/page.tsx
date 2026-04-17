'use client'

import { AdaptiveFormWizard } from '@/components/form/AdaptiveFormWizard'
import { submitAdaptiveIndividualDaily } from '@/forms/actions'
import { individualDailyFlow } from '@/forms/flows/individualFlow'

export default function IndividualLoggingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(0,212,255,0.14),transparent_30%),linear-gradient(180deg,#020617,#0f172a)] px-4 py-8 sm:px-6">
      <div className="mx-auto mb-6 max-w-xl">
        <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#00d4ff]">
          Daily Pulse
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Log in 10 seconds.
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-white/68">
          Energy, stress, and body feel cover most daily decisions. Training details stay optional
          unless you want the system to learn from the session.
        </p>
      </div>

      <AdaptiveFormWizard
        flow={individualDailyFlow}
        submitAction={submitAdaptiveIndividualDaily}
        successFallbackPath="/individual/dashboard"
      />
    </main>
  )
}
