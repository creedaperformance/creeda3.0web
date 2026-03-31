import LegalLayout from '@/components/LegalLayout';

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>Last Updated: March 19, 2026</p>
      
      <h3>1. Data Intelligence & Processing</h3>
      <p>CREEDA ("the Platform") utilize a proprietary <strong>Intelligence Engine (v5)</strong> to process athlete wellness, load metrics, and physiological data. Our goal is to provide evidence-based training decisions. We collect authentication data (Full Name, Email) to secure your performance profile.</p>
      
      <h3>2. Squad Transparency & Locker Codes</h3>
      <p>By connecting to a squad using a <strong>Locker Code</strong>, you explicitly authorize your authorized coach to view your aggregate performance intelligence, daily readiness scores, and wellness logs. This sharing is foundational to the Digital Sports Scientist model. You can revoke this access at any time in your profile settings.</p>
      
      <h3>3. Computer Vision & Biomechanics</h3>
      <p>Our vision-based biometric engine analyzes video feeds for movement faults (e.g., knee valgus, squat depth). Video data is processed securely and is never used for facial recognition. We analyze these patterns solely to minimize injury risk and optimize movement quality.</p>
      
      <h3>4. Deep Brain Analysis</h3>
      <p>Your logs are processed by our <strong>Deep Brain</strong> neural logic to generate daily "TRAIN," "MODIFY," or "RECOVER" decisions. Aggregated, non-identifiable data may be used to benchmark performance metrics for Indian Sports Excellence.</p>
      
      <h3>5. Information Rights & Deletion</h3>
      <p>You maintain full ownership of your data. You may request a full export or permanent account deletion at any time. Upon deletion, all identifiable records are permanently purged from our primary performance database.</p>
      
      <h3>6. Contact</h3>
      <p>Legal & Data Privacy: creedaperformance@gmail.com</p>

      <h3>7. Cookies & Sessions</h3>
      <p>CREEDA uses only essential session cookies required for secure authentication and state management. We do not use third-party tracking or marketing cookies.</p>
    </LegalLayout>
  );
}
