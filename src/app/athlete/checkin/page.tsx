'use client'

import { AdaptiveFormWizard } from '@/components/form/AdaptiveFormWizard'
import { submitAdaptiveAthleteDaily } from '@/forms/actions'
import { athleteDailyFlow } from '@/forms/flows/athleteFlow'

export default function AthleteCheckInPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.16),transparent_28%),linear-gradient(180deg,#020617,#0f172a)] px-4 py-8 sm:px-6">
      <div className="mx-auto mb-6 max-w-xl">
        <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#fbbf24]">
          Athlete Daily
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Three taps by default.
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-white/68">
          Energy, body feel, and stress are enough for a fast first-pass readiness call. We only ask
          for sleep, pain, or load when the signal looks risky or unclear.
        </p>
      </div>

      <AdaptiveFormWizard
        flow={athleteDailyFlow}
        submitAction={submitAdaptiveAthleteDaily}
        successFallbackPath="/athlete/dashboard"
      />
    </main>
  )
}
