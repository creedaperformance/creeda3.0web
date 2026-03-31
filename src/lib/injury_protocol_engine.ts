/**
 * CREEDA INJURY PROTOCOL ENGINE
 * Rehab logic and return-to-play progression.
 */

export interface InjuryStatus {
  is_injured: boolean;
  type?: string;
  severity?: "MINOR" | "MODERATE" | "MAJOR";
  return_to_play_target?: string; // ISO Date
  progression_stage?: number; // 0-100%
}

export class InjuryProtocolEngine {
  /**
   * Processes current status and returns load restrictions.
   */
  getLoadRestriction(status: InjuryStatus): number {
    if (!status.is_injured) return 1.0;
    
    switch (status.severity) {
      case "MAJOR": return 0.2; // 80% restriction
      case "MODERATE": return 0.5; // 50% restriction
      case "MINOR": return 0.8; // 20% restriction
      default: return 0.5;
    }
  }

  /**
   * Maps injury stage to recommended training focus.
   */
  getRehabFocus(stage: number): string {
    if (stage < 25) return "Mobility & Tissue Healing";
    if (stage < 50) return "Strength endurance & controlled load";
    if (stage < 75) return "Power & Dynamic stability";
    return "Sport-specific transition";
  }

  /**
   * Forces system mode into RECOVERY when injured.
   */
  shouldForceRecoveryMode(status: InjuryStatus): boolean {
    return status.is_injured;
  }
}

export const injuryProtocolEngine = new InjuryProtocolEngine();
