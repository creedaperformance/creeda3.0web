export interface DosageInput {
  baseLoadRPE: number;
  readinessScore: number;
  injuryRiskScore: number;
  experienceLevel: number; // 1-Beginner, 2-Intermediate, 3-Advanced
  previousSessionLoad?: number;
}

export interface DosageOutput {
  targetRPE: number;
  sets: number;
  reps: string;
  restTimeSeconds: number;
  isCapped: boolean;
}

export class DosageEngine {

  /**
   * Calculates safe and optimal dosage for a given exercise block.
   */
  public calculateDosage(input: DosageInput, isRehab: boolean = false): DosageOutput {
    let load = input.baseLoadRPE;

    // Modifiers
    const readinessFactor = (input.readinessScore - 50) / 100; // -0.5 to +0.5 multiplier
    const riskModifier = (100 - input.injuryRiskScore) / 100;  // 1 is perfect, 0.5 is risky
    const experienceModifier = input.experienceLevel === 1 ? 0.9 : input.experienceLevel === 3 ? 1.1 : 1.0;

    // Apply scaling
    load = load * (1 + readinessFactor);
    load = load * riskModifier;
    load = load * experienceModifier;

    // Progression Limits & Caps
    let isCapped = false;
    if (input.previousSessionLoad) {
      const maxSpike = input.previousSessionLoad * 1.15; // Max 15% jump
      if (load > maxSpike) {
        load = maxSpike;
        isCapped = true;
      }
    }

    // Rehab override
    if (isRehab) {
      if (load > 6) { // Max 6 RPE for rehab stage elements
        load = 6;
        isCapped = true;
      }
    }

    // Final clean
    const finalRPE = Math.max(3, Math.min(10, Math.round(load)));

    return {
      targetRPE: finalRPE,
      sets: this.determineSets(finalRPE, isRehab),
      reps: this.determineReps(finalRPE, isRehab),
      restTimeSeconds: this.determineRest(finalRPE),
      isCapped
    };
  }

  private determineSets(rpe: number, isRehab: boolean): number {
    if (isRehab) return 2;
    if (rpe >= 9) return 2; // High intensity, lower volume
    if (rpe >= 7) return 3;
    return 4; // Moderate intensity, higher volume
  }

  private determineReps(rpe: number, isRehab: boolean): string {
    if (isRehab) return "10-15";
    if (rpe >= 9) return "3-5";
    if (rpe >= 7) return "6-8";
    if (rpe >= 5) return "8-12";
    return "12-15";
  }

  private determineRest(rpe: number): number {
    if (rpe >= 9) return 180;
    if (rpe >= 7) return 120;
    return 60;
  }
}

export const dosageEngine = new DosageEngine();
