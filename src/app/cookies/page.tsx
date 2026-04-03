import LegalLayout from '@/components/LegalLayout'
import { CREEDA_PRIVACY_EMAIL, LEGAL_LAST_UPDATED_LABEL } from '@/lib/legal/constants'

export default function CookiesPage() {
  return (
    <LegalLayout title="Cookie Policy" lastUpdated={LEGAL_LAST_UPDATED_LABEL}>
      <p>
        This Cookie Policy explains how CREEDA uses cookies and similar technologies on public and authenticated
        surfaces.
      </p>

      <h3>1. Essential Cookies</h3>
      <p>
        Essential cookies are used for login sessions, security, and core site operation. These are required for the
        platform to function.
      </p>

      <h3>2. Optional Analytics Cookies</h3>
      <p>
        If optional analytics tools are enabled, they will be controlled through consent preferences and documented in
        this policy.
      </p>

      <h3>3. Cookie Choices</h3>
      <p>
        You can choose &quot;Essential only&quot; or &quot;Accept all&quot; via our cookie notice. You may clear browser cookies at
        any time.
      </p>

      <h3>4. Contact</h3>
      <p>For cookie and tracking questions, contact {CREEDA_PRIVACY_EMAIL}.</p>
    </LegalLayout>
  )
}

