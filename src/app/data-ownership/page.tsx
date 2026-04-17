import LegalLayout from '@/components/LegalLayout'
import {
  CREEDA_LEGAL_ENTITY,
  CREEDA_PRIVACY_EMAIL,
  LEGAL_LAST_UPDATED_LABEL,
  LEGAL_POLICY_VERSIONS,
} from '@/lib/legal/constants'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Data Ownership & B2B Terms | CREEDA',
  description:
    'Review how CREEDA handles athlete data ownership, team responsibilities, portability, deletion, and organization-controlled workspaces.',
  path: '/data-ownership',
  keywords: [
    'athlete data ownership',
    'sports tech data rights',
    'academy data processing terms',
  ],
})

export default function DataOwnershipPage() {
  return (
    <LegalLayout title="Data Ownership & B2B Terms" lastUpdated={LEGAL_LAST_UPDATED_LABEL}>
      <p>
        This document summarizes default data ownership and responsibility principles for athlete accounts, coaches,
        teams, and academies using {CREEDA_LEGAL_ENTITY}. Version: <strong>{LEGAL_POLICY_VERSIONS.dataOwnership}</strong>.
      </p>

      <h3>1. Athlete Data Ownership Principle</h3>
      <p>
        Athletes and individual users retain rights over their personal data, subject to lawful team/organization
        workflows and applicable law.
      </p>

      <h3>2. Organization-Controlled Workspaces</h3>
      <p>
        In team or academy deployments, the organization may control workspace-level configurations and coach access.
        Organizations are responsible for lawful basis, consent management, and role permissions for users they onboard.
      </p>

      <h3>3. CREEDA Processing Role</h3>
      <p>
        Depending on the workflow, CREEDA may act as a data fiduciary/controller (direct users) or processor/service
        provider (organization workflows). Applicable contracts and privacy terms govern exact role boundaries.
      </p>

      <h3>4. Permitted and Restricted Use</h3>
      <ul>
        <li>Permitted: training management, recovery decisions, and coaching operations.</li>
        <li>Restricted: unauthorized resale, exploitation, discriminatory profiling, and non-consensual scouting use.</li>
      </ul>

      <h3>5. Portability, Export, and Deletion</h3>
      <p>
        Data export and deletion requests can be submitted via legal controls. Operational or statutory retention may
        apply for security, audit, legal defense, or payment compliance reasons.
      </p>

      <h3>6. Liability and Accountability Allocation</h3>
      <ul>
        <li>CREEDA is responsible for platform operation, security controls, and processing within contractual scope.</li>
        <li>Teams/coaches are responsible for lawful data use, athlete safeguarding, and decision oversight.</li>
        <li>Final training and participation decisions remain with qualified humans, not autonomous app output.</li>
      </ul>

      <h3>7. Contract Customization</h3>
      <p>
        Enterprise or academy-specific agreements (DPA, addenda, region-specific terms) can be executed through
        {CREEDA_PRIVACY_EMAIL}.
      </p>
    </LegalLayout>
  )
}
