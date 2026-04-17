import LegalLayout from '@/components/LegalLayout'
import Link from 'next/link'
import {
  CREEDA_DATA_HOSTING_REGIONS,
  CREEDA_GRIEVANCE_OFFICER_DESIGNATION,
  CREEDA_GRIEVANCE_OFFICER_NAME,
  CREEDA_GRIEVANCE_RESPONSE_TIME,
  CREEDA_LEGAL_ENTITY,
  CREEDA_PRIVACY_EMAIL,
  CREEDA_SUBPROCESSORS,
  CREEDA_SUPPORT_PHONE,
  DPDP_RIGHTS,
  GDPR_RIGHTS,
  LEGAL_LAST_UPDATED_LABEL,
  LEGAL_POLICY_VERSIONS,
} from '@/lib/legal/constants'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Privacy Policy | CREEDA',
  description:
    'Read how CREEDA collects, processes, stores, and protects athlete, wellness, and account data across its sports science platform.',
  path: '/privacy',
  keywords: [
    'privacy policy sports app',
    'athlete data privacy India',
    'DPDP GDPR sports tech',
  ],
})

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated={LEGAL_LAST_UPDATED_LABEL}>
      <p>
        This Privacy Policy explains how {CREEDA_LEGAL_ENTITY} collects, uses, stores, and safeguards personal data on
        CREEDA. We treat sports performance and wellness-linked data as sensitive from a trust and safety perspective.
      </p>

      <h3>1. Scope and Roles</h3>
      <p>
        Depending on the relationship, CREEDA may act as a data fiduciary/controller (for direct user accounts) and/or
        a processor/service provider (for certain team or organization workflows).
      </p>

      <h3>2. Data We Collect</h3>
      <ul>
        <li>Account identity data: name, email, role, profile identifiers.</li>
        <li>Athlete and fitness context: sport, training load, readiness inputs, goals, history.</li>
        <li>Wellness and health-like context: sleep, soreness, recovery, injuries, nutrition safety inputs.</li>
        <li>Optional objective and device signals: camera tests, connected health sync, movement analytics.</li>
        <li>Security and legal records: consent logs, request logs, access and audit metadata.</li>
      </ul>

      <h3>3. Why We Process Data (Purpose Limitation)</h3>
      <ul>
        <li>Deliver personalized decision-support outputs and dashboards.</li>
        <li>Enable team/coach workflows where authorized.</li>
        <li>Improve reliability, security, fraud prevention, and abuse controls.</li>
        <li>Comply with legal obligations and rights requests.</li>
      </ul>
      <p>We apply data minimization and avoid collecting data that is not needed for these functions.</p>

      <h3>4. Legal Basis and Consent</h3>
      <p>
        We rely on explicit consent and/or lawful processing grounds appropriate to your jurisdiction. Core policy
        version for consent tracking: <strong>{LEGAL_POLICY_VERSIONS.privacy}</strong>.
      </p>
      <p>
        For minors, guardian or authorized organizational consent is required before continued use of athlete workflows.
      </p>

      <h3>5. Sharing and Access Controls</h3>
      <p>
        Data is visible according to account role, team membership, and permissions. We apply role-based access
        controls and least-privilege principles for operational access.
      </p>
      <p>
        We do not sell personal data. We share data only as needed for platform operation, lawful requests, or user
        authorized workflows.
      </p>
      <p>Current core subprocessors used for service delivery include:</p>
      <ul>
        {CREEDA_SUBPROCESSORS.map((subprocessor) => (
          <li key={subprocessor}>{subprocessor}</li>
        ))}
      </ul>

      <h3>6. Storage, Security, and Retention</h3>
      <ul>
        <li>Encryption in transit (TLS) and platform-level encryption at rest.</li>
        <li>Authentication, session protection, and access controls.</li>
        <li>Audit-oriented records for consent and critical legal actions.</li>
      </ul>
      <p>
        See our <Link href="/security">Security Overview</Link> for operational security commitments.
      </p>
      <p>
        Retention policy:
      </p>
      <ul>
        <li>Active accounts: retained while the account remains active.</li>
        <li>Deletion requests: immediate deactivation, with permanent deletion targeted within 30-90 days.</li>
        <li>Backup data: retained up to 90 days.</li>
        <li>Analytics data: anonymized and may be retained longer.</li>
      </ul>
      <p>
        Users may request deletion of personal data at any time. Certain records may be retained where required for
        legal, security, fraud-prevention, or compliance obligations.
      </p>

      <h3>7. Data Rights</h3>
      <p>
        You can raise rights requests in-app or via {CREEDA_PRIVACY_EMAIL}. We support jurisdiction-appropriate rights,
        including:
      </p>

      <p>
        <strong>India DPDP Act, 2023 rights</strong>
      </p>
      <ul>
        {DPDP_RIGHTS.map((right) => (
          <li key={right}>{right}</li>
        ))}
      </ul>

      <p>
        <strong>GDPR rights (where applicable)</strong>
      </p>
      <ul>
        {GDPR_RIGHTS.map((right) => (
          <li key={right}>{right}</li>
        ))}
      </ul>

      <h3>8. Automated Decision Support and Transparency</h3>
      <p>
        CREEDA uses algorithmic scoring and rule-based logic to assist decisions. Outputs are advisory. We provide
        explainability context (confidence, freshness, and data quality where available) and do not position outputs as
        autonomous clinical diagnosis.
      </p>

      <h3>9. International Data Handling</h3>
      <p>
        CREEDA uses third-party service providers for hosting, authentication, and analytics. Data may be stored in
        India and other jurisdictions including Singapore and the European Union.
      </p>
      <ul>
        <li>Primary hosting region: {CREEDA_DATA_HOSTING_REGIONS.primary}</li>
        <li>Secondary hosting region: {CREEDA_DATA_HOSTING_REGIONS.secondary}</li>
        <li>Future GDPR-focused region: {CREEDA_DATA_HOSTING_REGIONS.future}</li>
      </ul>

      <h3>10. Contact and Grievance</h3>
      <p>
        Privacy and data rights contact: <strong>{CREEDA_PRIVACY_EMAIL}</strong> | <strong>{CREEDA_SUPPORT_PHONE}</strong>
      </p>
      <p>
        Grievance Officer: <strong>{CREEDA_GRIEVANCE_OFFICER_NAME}</strong> ({CREEDA_GRIEVANCE_OFFICER_DESIGNATION})
      </p>
      <p>
        Response time target: <strong>{CREEDA_GRIEVANCE_RESPONSE_TIME}</strong>
      </p>
    </LegalLayout>
  )
}
