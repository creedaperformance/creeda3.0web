import LegalLayout from '@/components/LegalLayout'
import {
  CREEDA_DATA_HOSTING_REGIONS,
  CREEDA_SUBPROCESSORS,
  CREEDA_SUPPORT_EMAIL,
  CREEDA_SUPPORT_PHONE,
  LEGAL_LAST_UPDATED_LABEL,
  LEGAL_POLICY_VERSIONS,
} from '@/lib/legal/constants'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Security Overview | CREEDA',
  description:
    'See how CREEDA approaches encryption, hosting, access control, audit trails, incident handling, and shared security responsibilities.',
  path: '/security',
  keywords: [
    'security overview sports app',
    'athlete data security India',
    'sports platform security controls',
  ],
})

export default function SecurityPage() {
  return (
    <LegalLayout title="Security Overview" lastUpdated={LEGAL_LAST_UPDATED_LABEL}>
      <p>
        CREEDA applies layered technical and organizational safeguards for athlete, wellness, and account data.
        Security disclosure version: <strong>{LEGAL_POLICY_VERSIONS.security}</strong>.
      </p>

      <h3>1. Encryption and Storage Controls</h3>
      <ul>
        <li>Encryption in transit via TLS.</li>
        <li>Cloud-provider encryption at rest for managed data stores.</li>
        <li>Access control boundaries between application roles.</li>
      </ul>

      <h3>2. Hosting and Subprocessors</h3>
      <p>Core service providers include:</p>
      <ul>
        {CREEDA_SUBPROCESSORS.map((subprocessor) => (
          <li key={subprocessor}>{subprocessor}</li>
        ))}
      </ul>
      <ul>
        <li>Primary data hosting region: {CREEDA_DATA_HOSTING_REGIONS.primary}</li>
        <li>Secondary region: {CREEDA_DATA_HOSTING_REGIONS.secondary}</li>
        <li>Planned GDPR-oriented region: {CREEDA_DATA_HOSTING_REGIONS.future}</li>
      </ul>

      <h3>3. Identity and Access Management</h3>
      <ul>
        <li>Role-based access design for athlete, coach, and admin paths.</li>
        <li>Session-based authentication and least-privilege enforcement.</li>
        <li>Operational access restricted to authorized personnel only.</li>
      </ul>

      <h3>4. Consent and Audit Trail</h3>
      <p>
        Legal acknowledgements, key rights requests, and critical data operations are tracked to support compliance and
        accountability.
      </p>

      <h3>5. Vulnerability and Incident Management</h3>
      <ul>
        <li>Security patches and dependency updates are applied on a risk-priority basis.</li>
        <li>Suspected incidents are triaged and investigated with urgency.</li>
        <li>Material incidents are communicated to affected stakeholders per applicable law.</li>
      </ul>

      <h3>6. Shared Responsibility</h3>
      <p>
        Users and organizations must protect account credentials, configure role access responsibly, and report
        suspected misuse quickly.
      </p>

      <h3>7. Security Contact</h3>
      <p>
        Report vulnerabilities or urgent security concerns to {CREEDA_SUPPORT_EMAIL} | {CREEDA_SUPPORT_PHONE}.
      </p>
    </LegalLayout>
  )
}
