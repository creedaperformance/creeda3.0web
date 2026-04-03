import LegalLayout from '@/components/LegalLayout'
import {
  CORE_MEDICAL_DISCLAIMER,
  CREEDA_PRIVACY_EMAIL,
  LEGAL_LAST_UPDATED_LABEL,
  LEGAL_POLICY_VERSIONS,
} from '@/lib/legal/constants'

export default function AiTransparencyPage() {
  return (
    <LegalLayout title="AI Transparency" lastUpdated={LEGAL_LAST_UPDATED_LABEL}>
      <p>
        CREEDA uses AI-assisted and rule-based systems to generate advisory outputs for performance, readiness,
        recovery, load, and behavior loops. Transparency version: <strong>{LEGAL_POLICY_VERSIONS.aiTransparency}</strong>.
      </p>

      <h3>1. What The AI Layer Does</h3>
      <ul>
        <li>Combines subjective inputs, objective tests, trend signals, and contextual factors.</li>
        <li>Generates advisory summaries, confidence labels, and risk/readiness guidance.</li>
        <li>Supports coaches and athletes with explainable decision-support, not autonomous diagnosis.</li>
      </ul>

      <h3>2. What It Does Not Do</h3>
      <ul>
        <li>It does not provide clinical diagnosis.</li>
        <li>It does not prescribe treatment plans as medical instructions.</li>
        <li>It does not guarantee injury prevention or competition outcomes.</li>
      </ul>

      <h3>3. Explainability Commitments</h3>
      <ul>
        <li>Key recommendations include confidence and data quality context.</li>
        <li>Signals are labeled where possible as measured, estimated, or self-reported.</li>
        <li>Decision context aims to show why recommendations changed.</li>
      </ul>

      <h3>4. Human Oversight</h3>
      <p>
        Final decisions remain with the athlete, coach, and qualified clinicians. In injury, illness, or emergency
        contexts, human clinical judgment must override app outputs.
      </p>

      <h3>5. Fairness and Reliability</h3>
      <p>
        CREEDA continuously improves model reliability and monitors performance across different user cohorts. Outputs
        may be less reliable when data quality is weak, stale, or incomplete.
      </p>

      <h3>6. Questions and Concerns</h3>
      <p>AI transparency and model-behavior inquiries can be sent to {CREEDA_PRIVACY_EMAIL}.</p>

      <p>
        <strong>{CORE_MEDICAL_DISCLAIMER}</strong>
      </p>
    </LegalLayout>
  )
}

