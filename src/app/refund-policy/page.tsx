import LegalLayout from '@/components/LegalLayout';

export default function RefundPage() {
  return (
    <LegalLayout title="Refund Policy">
      <p>Last Updated: March 19, 2026</p>
      
      <h3>1. Billing Errors & Verified Charges</h3>
      <p>CREEDA currently offers the core platform without subscription tiers. If you are charged in error, billed twice, or encounter a verified payment-processing issue, contact creedaperformance@gmail.com with your account details and transaction receipt so we can investigate and issue a refund when appropriate.</p>
      
      <h3>2. Refund Process</h3>
      <p>To request a refund, please email creedaperformance@gmail.com with your account details and transaction receipt. Refunds are processed back to the original payment method via Razorpay within 5-7 business days of approval.</p>
      
      <h3>3. Future Paid Services</h3>
      <p>If CREEDA introduces optional paid services in the future, any service-specific billing terms, trial periods, and refund windows will be presented clearly at the time of purchase.</p>
      
      <h3>4. Transaction Disputes</h3>
      <p>If you encounter a payment error, double-billing, or unauthorized transaction, please notify us immediately at creedaperformance@gmail.com for prompt resolution.</p>
    </LegalLayout>
  );
}
