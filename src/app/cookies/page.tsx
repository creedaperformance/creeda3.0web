import LegalLayout from '@/components/LegalLayout'
import { CREEDA_PRIVACY_EMAIL, LEGAL_LAST_UPDATED_LABEL } from '@/lib/legal/constants'
import { createPageMetadata } from '@/lib/seo/metadata'

const cookiesPageSeo = {
  title: 'Cookie Policy | CREEDA',
  description:
    'Review how CREEDA uses essential cookies and consent-based analytics cookies across its public site and authenticated app surfaces.',
  path: '/cookies',
  keywords: ['cookie policy India', 'analytics consent sports app', 'GA4 consent banner'],
} as const

export const metadata = createPageMetadata(cookiesPageSeo)

export default function CookiesPage() {
  return (
    <LegalLayout
      title="Cookie Policy"
      description={cookiesPageSeo.description}
      lastUpdated={LEGAL_LAST_UPDATED_LABEL}
      path={cookiesPageSeo.path}
    >
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
        CREEDA uses Google Analytics 4 on public-site surfaces to understand visits, page performance, and aggregate
        engagement trends. These analytics cookies only run after a user explicitly chooses &quot;Accept all&quot;.
      </p>
      <p>
        Choosing &quot;Essential only&quot; keeps the site functional without loading optional analytics tags.
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
