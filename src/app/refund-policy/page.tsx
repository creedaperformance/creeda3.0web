import LegalLayout from '@/components/LegalLayout'
import { CREEDA_SUPPORT_EMAIL, LEGAL_LAST_UPDATED_LABEL } from '@/lib/legal/constants'
import { createPageMetadata } from '@/lib/seo/metadata'

const refundPageSeo = {
  title: 'Refund Policy | CREEDA',
  description:
    'Review CREEDA’s approach to billing errors, unauthorized charges, refund reviews, and future paid-feature refund handling.',
  path: '/refund-policy',
  keywords: [
    'refund policy sports app',
    'billing support creeda',
    'payment refund policy India app',
  ],
} as const

export const metadata = createPageMetadata(refundPageSeo)

export default function RefundPage() {
  return (
    <LegalLayout
      title="Refund Policy"
      description={refundPageSeo.description}
      lastUpdated={LEGAL_LAST_UPDATED_LABEL}
      path={refundPageSeo.path}
    >
      <h3>1. Billing Errors and Unauthorized Charges</h3>
      <p>
        If you experience duplicate billing, unauthorized charges, or payment processing errors, contact{' '}
        {CREEDA_SUPPORT_EMAIL} with transaction details for investigation.
      </p>

      <h3>2. Refund Review Process</h3>
      <p>
        Verified billing issues are reviewed and, where applicable, refunded to the original payment method within
        commercially reasonable timelines.
      </p>

      <h3>3. Future Paid Features</h3>
      <p>
        If paid subscriptions or add-ons are launched, pricing, trial windows, cancellation terms, and refund
        conditions will be shown clearly at purchase.
      </p>

      <h3>4. Contact</h3>
      <p>For payment and refund support: {CREEDA_SUPPORT_EMAIL}</p>
    </LegalLayout>
  )
}
