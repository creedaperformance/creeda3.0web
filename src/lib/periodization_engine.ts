/**
 * CREEDA PERIODIZATION ENGINE
 * Phase-based training logic and adaptation.
 */

export type TrainingPhase = "BASE" | "BUILD" | "PEAK" | "RECOVERY";

export interface PhaseConfig {
  phase: TrainingPhase;
  focus: string;
  loadMultiplier: number;
  readinessThreshold: number;
}

const PHASE_DEFAULTS: Record<TrainingPhase, PhaseConfig> = {
  BASE: {
    phase: "BASE",
    focus: "Aerobic foundation & movement quality",
    loadMultiplier: 0.8,
    readinessThreshold: 60
  },
  BUILD: {
    phase: "BUILD",
    focus: "Strength, power & sport-specific capacity",
    loadMultiplier: 1.1,
    readinessThreshold: 70
  },
  PEAK: {
    phase: "PEAK",
    focus: "Maximum performance & speed",
    loadMultiplier: 1.2,
    readinessThreshold: 80
  },
  RECOVERY: {
    phase: "RECOVERY",
    focus: "Regeneration & tissue repair",
    loadMultiplier: 0.5,
    readinessThreshold: 50
  }
};

export class PeriodizationEngine {
  /**
   * Gets current phase configuration.
   */
  getPhaseConfig(phase: TrainingPhase): PhaseConfig {
    return PHASE_DEFAULTS[phase];
  }

  /**
   * Adjusts readiness interpretation based on phase.
   * e.g., In PEAK phase, we are more strict about "Optimal" readiness.
   */
  interpretReadiness(score: number, phase: TrainingPhase) {
    const config = this.getPhaseConfig(phase);
    
    if (score >= config.readinessThreshold) return "OPTIMAL";
    if (score >= config.readinessThreshold - 15) return "MODERATE";
    return "RISK";
  }
}

export const periodizationEngine = new PeriodizationEngine();
