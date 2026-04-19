import LegalLayout from '@/components/LegalLayout'
import {
  CORE_DECISION_SUPPORT_NOTICE,
  CORE_MEDICAL_DISCLAIMER,
  CREEDA_GRIEVANCE_OFFICER_DESIGNATION,
  CREEDA_GRIEVANCE_OFFICER_NAME,
  CREEDA_GRIEVANCE_RESPONSE_TIME,
  CREEDA_PRIVACY_EMAIL,
  CREEDA_SUPPORT_PHONE,
  LEGAL_LAST_UPDATED_LABEL,
  LEGAL_POLICY_VERSIONS,
} from '@/lib/legal/constants'
import { createPageMetadata } from '@/lib/seo/metadata'

const consentPageSeo = {
  title: 'Consent Acknowledgement | CREEDA',
  description:
    'Understand the explicit consent bundle behind CREEDA account creation, AI acknowledgement, data processing, and minors safeguards.',
  path: '/consent',
  keywords: [
    'consent acknowledgement sports app',
    'data processing consent India',
    'guardian consent athlete platform',
  ],
} as const

export const metadata = createPageMetadata(consentPageSeo)

export default function ConsentPage() {
  return (
    <LegalLayout
      title="Consent Acknowledgement"
      description={consentPageSeo.description}
      lastUpdated={LEGAL_LAST_UPDATED_LABEL}
      path={consentPageSeo.path}
    >
      <p>
        This page explains the explicit consents that power CREEDA account creation and ongoing use. Consent tracking
        version: <strong>{LEGAL_POLICY_VERSIONS.consent}</strong>.
      </p>

      <h3>1. Explicit Consent Bundle</h3>
      <p>By continuing with CREEDA, users explicitly acknowledge and consent to:</p>
      <ul>
        <li>Terms of Service and Privacy Policy acceptance.</li>
        <li>Medical and performance disclaimer acknowledgement.</li>
        <li>Data processing for decision-support features.</li>
        <li>AI and algorithmic advisory output acknowledgement.</li>
      </ul>

      <h3>2. Sensitive Data Handling Approach</h3>
      <p>
        CREEDA handles athlete performance, wellness, recovery, and health-like context. We treat this category with a
        heightened trust standard even where law does not classify it as medical data in all cases.
      </p>

      <h3>3. Minors and Guardian Authorization</h3>
      <p>
        Users under 18 must have guardian or authorized organizational consent. Coaches and institutions onboarding
        junior athletes must confirm lawful authority and maintain valid records.
      </p>

      <h3>4. Optional Communications Consent</h3>
      <p>
        Marketing and product-update communication consent is optional and can be changed anytime from legal settings.
        It is not required to use core product features.
      </p>

      <h3>5. Consent Withdrawal and Rights</h3>
      <p>
        You may request consent withdrawal, access, correction, export, or deletion by using in-app legal controls or
        contacting {CREEDA_PRIVACY_EMAIL}. Requests are processed according to applicable law and operational
        safeguards.
      </p>

      <h3>6. Platform Positioning</h3>
      <p>
        <strong>{CORE_MEDICAL_DISCLAIMER}</strong>
      </p>
      <p>{CORE_DECISION_SUPPORT_NOTICE}</p>
      <p>
        CREEDA processes athlete performance, training load, and wellness data for analytical and decision-support
        purposes only.
      </p>
      <p>
        The platform does not provide medical diagnosis, treatment, or clinical advice and should not be used as a
        substitute for professional healthcare services.
      </p>

      <h3>7. Grievance Contact</h3>
      <p>
        Grievance Officer: {CREEDA_GRIEVANCE_OFFICER_NAME} ({CREEDA_GRIEVANCE_OFFICER_DESIGNATION}) |{' '}
        {CREEDA_PRIVACY_EMAIL} | {CREEDA_SUPPORT_PHONE}. Response target: {CREEDA_GRIEVANCE_RESPONSE_TIME}.
      </p>
    </LegalLayout>
  )
}
