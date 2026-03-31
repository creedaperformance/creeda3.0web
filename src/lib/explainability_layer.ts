/**
 * CREEDA EXPLAINABILITY LAYER
 * Multi-factor reasoning and score transparency.
 */

export interface ScoreExplanation {
  metric: string;
  contributionPct: number;
  reason: string;
  impact: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
}

export class ExplainabilityLayer {
  /**
   * Decomposes readiness score into actionable reasons.
   */
  explainReadiness(
    score: number, 
    inputs: { sleep: number; load: number; stress: number; hrv?: number }
  ): ScoreExplanation[] {
    const explanations: ScoreExplanation[] = [];

    // 1. Sleep Contribution
    if (inputs.sleep < 7) {
      explanations.push({
        metric: "Sleep Quality",
        contributionPct: -15,
        reason: "Sub-optimal sleep duration is the primary recovery bottleneck.",
        impact: "NEGATIVE"
      });
    }

    // 2. Load Contribution
    if (inputs.load > 8) {
      explanations.push({
        metric: "Acute Load",
        contributionPct: -10,
        reason: "High acute training volume has increased systemic fatigue.",
        impact: "NEGATIVE"
      });
    }

    // 3. HRV Contribution (If available)
    if (inputs.hrv && inputs.hrv > 80) {
      explanations.push({
        metric: "Autonomic Balance",
        contributionPct: 15,
        reason: "High HRV indicates strong parasympathetic recovery potential.",
        impact: "POSITIVE"
      });
    }

    return explanations;
  }
}

export const explainabilityLayer = new ExplainabilityLayer();
