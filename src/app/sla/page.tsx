import LegalLayout from '@/components/LegalLayout'
import {
  CREEDA_SUPPORT_PHONE,
  CREEDA_SUPPORT_RESPONSE_TIMES,
  CREEDA_SUPPORT_EMAIL,
  LEGAL_LAST_UPDATED_LABEL,
  LEGAL_POLICY_VERSIONS,
} from '@/lib/legal/constants'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Service Level Agreement | CREEDA',
  description:
    'Review CREEDA’s baseline service availability, support response objectives, incident severity model, and operational support commitments.',
  path: '/sla',
  keywords: [
    'service level agreement app',
    'support SLA sports platform',
    'incident response commitments creeda',
  ],
})

export default function SlaPage() {
  return (
    <LegalLayout title="Service Level Agreement (SLA)" lastUpdated={LEGAL_LAST_UPDATED_LABEL}>
      <p>
        This SLA describes baseline availability, support, and incident-response commitments for CREEDA managed service
        usage. Version: <strong>{LEGAL_POLICY_VERSIONS.sla}</strong>.
      </p>

      <h3>1. Service Availability Target</h3>
      <p>
        CREEDA targets high platform availability for core app functions on a commercially reasonable basis, excluding
        planned maintenance windows and force majeure events.
      </p>

      <h3>2. Incident Severity Model</h3>
      <ul>
        <li>P1 Critical: platform unavailable or severe data-access disruption.</li>
        <li>P2 High: major feature degradation impacting active operations.</li>
        <li>P3 Medium: partial impairment with workaround available.</li>
        <li>P4 Low: minor issue, cosmetic bug, or documentation gap.</li>
      </ul>

      <h3>3. Support Channels and Response Objectives</h3>
      <p>Email support channel: {CREEDA_SUPPORT_EMAIL}</p>
      <ul>
        <li>Free users: {CREEDA_SUPPORT_RESPONSE_TIMES.freeUsers}</li>
        <li>Premium/teams: {CREEDA_SUPPORT_RESPONSE_TIMES.premiumTeams}</li>
        <li>Critical issues: {CREEDA_SUPPORT_RESPONSE_TIMES.criticalIssues}</li>
      </ul>
      <p>
        CREEDA provides support on a best-effort basis. While we aim to respond within defined timelines, resolution
        timelines are not guaranteed and depend on issue complexity.
      </p>

      <h3>4. Security and Breach Handling</h3>
      <p>
        CREEDA operates security controls aligned with modern cloud practices and investigates suspected incidents
        promptly. Material incidents are communicated to affected stakeholders within legally required windows.
      </p>

      <h3>5. Exclusions</h3>
      <ul>
        <li>Outages caused by third-party providers outside CREEDA operational control.</li>
        <li>Misconfiguration, misuse, or unauthorized access from customer-side credentials.</li>
        <li>Scheduled maintenance and emergency patch windows.</li>
      </ul>

      <h3>6. Remedies and Limits</h3>
      <p>
        Unless separately agreed in writing, this SLA does not create unlimited compensation rights and is subject to
        Terms of Service liability limits.
      </p>

      <h3>7. Support Contact</h3>
      <p>
        Operational support and SLA escalation contact: {CREEDA_SUPPORT_EMAIL} | {CREEDA_SUPPORT_PHONE}
      </p>
    </LegalLayout>
  )
}
