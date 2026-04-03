import Link from 'next/link'

import LegalLayout from '@/components/LegalLayout'
import {
  CORE_DECISION_SUPPORT_NOTICE,
  CORE_MEDICAL_DISCLAIMER,
  CREEDA_LEGAL_ENTITY,
  CREEDA_LEGAL_ENTITY_CLAUSE,
  CREEDA_SHOPS_ESTABLISHMENT_APPLICATION_ID,
  CREEDA_SHOPS_ESTABLISHMENT_NATURE,
  CREEDA_SUPPORT_EMAIL,
  CREEDA_SUPPORT_PHONE,
  CREEDA_SUPPORT_RESPONSE_TIMES,
  CREEDA_UDYAM_REGISTRATION_DATE,
  CREEDA_UDYAM_REGISTRATION_NUMBER,
  CREEDA_PRIVACY_EMAIL,
  LEGAL_DOC_PATHS,
  LEGAL_LAST_UPDATED_LABEL,
  LEGAL_POLICY_VERSIONS,
} from '@/lib/legal/constants'

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated={LEGAL_LAST_UPDATED_LABEL}>
      <p>
        These Terms of Service govern your use of {CREEDA_LEGAL_ENTITY} (&quot;CREEDA&quot;). By creating an account
        or using CREEDA, you agree to these terms and all linked legal documents.
      </p>
      <p>{CREEDA_LEGAL_ENTITY_CLAUSE}</p>
      <p>
        Udyam Registration: <strong>{CREEDA_UDYAM_REGISTRATION_NUMBER}</strong> (Registered on{' '}
        <strong>{CREEDA_UDYAM_REGISTRATION_DATE}</strong>). Shops &amp; Establishment Application ID:{' '}
        <strong>{CREEDA_SHOPS_ESTABLISHMENT_APPLICATION_ID}</strong> ({CREEDA_SHOPS_ESTABLISHMENT_NATURE}).
      </p>

      <h3>1. Platform Nature</h3>
      <p>
        CREEDA is a sports-science and healthy-living decision-support platform. It provides advisory outputs such as
        readiness states, trend alerts, workload guidance, and performance suggestions.
      </p>
      <p>
        <strong>{CORE_MEDICAL_DISCLAIMER}</strong>
      </p>
      <p>{CORE_DECISION_SUPPORT_NOTICE}</p>

      <h3>2. Eligibility and Accounts</h3>
      <p>
        You must provide accurate account information and keep credentials secure. You are responsible for activity
        under your account.
      </p>
      <p>
        Users under 18 may only use CREEDA with valid guardian or authorized organizational consent. Coaches and
        organizations adding minors confirm they have lawful consent.
      </p>

      <h3>3. Consent and Policy Acceptance</h3>
      <p>
        Using CREEDA requires explicit acceptance of our Terms, Privacy Policy, and Consent Acknowledgement (current
        policy version: <strong>{LEGAL_POLICY_VERSIONS.terms}</strong>).
      </p>
      <p>
        You can review related documents here: <Link href={LEGAL_DOC_PATHS.privacy}>Privacy Policy</Link>,{' '}
        <Link href={LEGAL_DOC_PATHS.disclaimer}>Medical Disclaimer</Link>,{' '}
        <Link href={LEGAL_DOC_PATHS.consent}>Consent Acknowledgement</Link>, and{' '}
        <Link href={LEGAL_DOC_PATHS.aiTransparency}>AI Transparency</Link>,{' '}
        <Link href={LEGAL_DOC_PATHS.dataOwnership}>Data Ownership</Link>,{' '}
        <Link href={LEGAL_DOC_PATHS.sla}>SLA</Link>, and{' '}
        <Link href={LEGAL_DOC_PATHS.security}>Security Overview</Link>.
      </p>

      <h3>4. Coaching, Teams, and Data Visibility</h3>
      <p>
        If you connect to a coach, team, academy, or organization, relevant performance and wellness information may
        be visible to authorized coaching staff according to your role and permissions.
      </p>
      <p>
        Team administrators and coaches are responsible for ensuring they have authority to process athlete data and
        to onboard minors in line with applicable law.
      </p>

      <h3>5. Prohibited Use</h3>
      <p>You must not:</p>
      <ul>
        <li>Use CREEDA for emergency medical decisions.</li>
        <li>Upload false data intended to manipulate risk or readiness outputs.</li>
        <li>Attempt unauthorized access, data scraping, reverse engineering, or security bypass.</li>
        <li>Use athlete data for exploitation, discrimination, or non-consensual scouting.</li>
      </ul>

      <h3>6. AI and Decision Outputs</h3>
      <p>
        CREEDA may generate outputs from subjective and objective inputs (including optional device and camera-based
        signals). Outputs are probabilistic, context-dependent, and may be incomplete when data quality is low.
      </p>
      <p>
        CREEDA does not guarantee injury prevention, selection outcomes, performance gains, or medical safety from any
        specific recommendation.
      </p>

      <h3>7. Data Rights and Requests</h3>
      <p>
        Subject to applicable law (including India DPDP Act, 2023 and GDPR where applicable), users can request
        access, correction, portability, restriction, consent withdrawal, and deletion through in-app legal controls
        or by contacting {CREEDA_PRIVACY_EMAIL}.
      </p>

      <h3>8. Support and SLA</h3>
      <p>CREEDA provides support on a best-effort basis.</p>
      <p>
        While we aim to respond within defined timelines, resolution timelines are not guaranteed and depend on issue
        complexity.
      </p>
      <ul>
        <li>Free users: {CREEDA_SUPPORT_RESPONSE_TIMES.freeUsers}</li>
        <li>Premium/teams: {CREEDA_SUPPORT_RESPONSE_TIMES.premiumTeams}</li>
        <li>Critical issues: {CREEDA_SUPPORT_RESPONSE_TIMES.criticalIssues}</li>
      </ul>
      <p>
        Support contact: {CREEDA_SUPPORT_EMAIL} | {CREEDA_SUPPORT_PHONE}
      </p>

      <h3>9. Payments and Refunds</h3>
      <p>
        If paid services are offered, pricing and billing terms will be shown at purchase. Refund handling is governed
        by our <Link href={LEGAL_DOC_PATHS.refund}>Refund Policy</Link>.
      </p>

      <h3>10. Limitation of Liability</h3>
      <p>
        To the maximum extent permitted by law, CREEDA and its operators are not liable for indirect, incidental,
        consequential, special, exemplary, or punitive damages arising from use of the platform.
      </p>
      <p>
        You acknowledge sport and training carry inherent risk. CREEDA is provided on an &quot;as is&quot; and
        &quot;as available&quot; basis without warranty of uninterrupted operation or error-free outputs.
      </p>

      <h3>11. Indemnity</h3>
      <p>
        You agree to indemnify and hold harmless CREEDA from claims, damages, liabilities, and costs arising from your
        misuse of the platform, unlawful data use, or breach of these terms.
      </p>

      <h3>12. Suspension and Termination</h3>
      <p>
        We may suspend or terminate accounts for legal, security, abuse, or policy violations. You may also request
        account deletion at any time.
      </p>

      <h3>13. Governing Law</h3>
      <p>
        These terms are governed by the laws of India. Disputes are subject to courts in Mumbai, Maharashtra, unless
        mandatory law in your jurisdiction requires otherwise.
      </p>

      <h3>14. Contact</h3>
      <p>Legal, privacy, and compliance contact: {CREEDA_PRIVACY_EMAIL}</p>
    </LegalLayout>
  )
}
