/**
 * CREEDA CONFIDENCE ENGINE
 * Reliability metrics for intelligence outputs.
 */

export interface ConfidenceReport {
  score: number; // 0-100
  status: "HIGH" | "MEDIUM" | "LOW";
  gaps: string[];
}

export class ConfidenceEngine {
  /**
   * Calculates data confidence based on input freshness and completeness.
   */
  calculateConfidence(inputs: { 
    lastLogDays: number; 
    missingMetrics: string[]; 
    consistencyScore: number 
  }): ConfidenceReport {
    let score = 100;
    const gaps: string[] = [];

    // 1. Freshness Penalty
    if (inputs.lastLogDays > 1) {
      const penalty = Math.min(40, inputs.lastLogDays * 10);
      score -= penalty;
      gaps.push("Data is outdated (>24h)");
    }

    // 2. Completeness Penalty
    if (inputs.missingMetrics.length > 0) {
      score -= (inputs.missingMetrics.length * 15);
      gaps.push(`Missing: ${inputs.missingMetrics.join(", ")}`);
    }

    // 3. Consistency
    score = Math.round(score * (inputs.consistencyScore / 100));

    return {
      score: Math.max(0, score),
      status: score > 80 ? "HIGH" : score > 50 ? "MEDIUM" : "LOW",
      gaps
    };
  }
}

export const confidenceEngine = new ConfidenceEngine();
