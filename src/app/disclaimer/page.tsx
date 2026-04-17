import LegalLayout from '@/components/LegalLayout'
import {
  CORE_DECISION_SUPPORT_NOTICE,
  CORE_MEDICAL_DISCLAIMER,
  LEGAL_LAST_UPDATED_LABEL,
} from '@/lib/legal/constants'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Medical & Performance Disclaimer | CREEDA',
  description:
    'Read CREEDA’s medical and performance disclaimer covering decision-support use, data-quality limits, and the need for human clinical judgment.',
  path: '/disclaimer',
  keywords: [
    'medical disclaimer sports app',
    'performance disclaimer athlete app',
    'decision support not diagnosis',
  ],
})

export default function DisclaimerPage() {
  return (
    <LegalLayout title="Medical & Performance Disclaimer" lastUpdated={LEGAL_LAST_UPDATED_LABEL}>
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 my-8">
        <p className="text-amber-800 font-bold mb-0 text-xs uppercase tracking-widest">Critical Notice</p>
        <p className="text-amber-900 font-black mb-1">{CORE_MEDICAL_DISCLAIMER}</p>
        <p className="text-amber-800 text-[10px] leading-tight font-medium">
          In emergencies, severe pain, acute symptoms, or concerning health markers, seek immediate in-person medical
          care. Do not use app scores for emergency triage.
        </p>
      </div>

      <h3>1. Decision-Support, Not Diagnosis</h3>
      <p>
        CREEDA provides readiness, load, recovery, and movement insights for coaching and self-management decisions. It
        does not diagnose injuries or diseases, prescribe treatment, or replace physician care.
      </p>
      <p>
        CREEDA processes athlete performance, training load, and wellness data for analytical and decision-support
        purposes only.
      </p>
      <p>
        The platform does not provide medical diagnosis, treatment, or clinical advice and should not be used as a
        substitute for professional healthcare services.
      </p>

      <h3>2. Advisory Reliability Depends On Data Quality</h3>
      <p>
        Output quality depends on signal quality, user honesty, capture conditions, and data completeness. Low or
        missing data can reduce reliability.
      </p>

      <h3>3. Human Oversight Is Mandatory</h3>
      <p>{CORE_DECISION_SUPPORT_NOTICE}</p>

      <h3>4. Assumption of Risk</h3>
      <p>
        Sport and training carry inherent risk. CREEDA aims to improve decision quality and reduce avoidable mistakes
        but cannot eliminate all risk.
      </p>

      <h3>5. No Guarantee</h3>
      <p>
        CREEDA does not guarantee injury prevention, competitive success, or specific performance outcomes from any
        recommendation.
      </p>
    </LegalLayout>
  )
}
