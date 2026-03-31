/**
 * CREEDA SESSION PLANNER
 * Daily actionable training and recovery outputs.
 */

import { goalEngine, PerformanceGoal } from "./goal_engine";
import { injuryProtocolEngine, InjuryStatus } from "./injury_protocol_engine";

export interface SessionPlan {
  title: string;
  type: "TRAINING" | "RECOVERY" | "REHAB" | "REST";
  intensity: "LOW" | "MODERATE" | "HIGH" | "MAX";
  focus: string;
  durationMin: number;
}

export class SessionPlanner {
  /**
   * Generates a daily session plan based on universal state.
   */
  generatePlan(
    readiness: number, 
    goal: PerformanceGoal, 
    injuryStatus: InjuryStatus
  ): SessionPlan {
    // 1. Check for Injury (Highest Priority)
    if (injuryStatus.is_injured) {
      return {
        title: "Rehab Progression",
        type: "REHAB",
        intensity: "LOW",
        focus: injuryProtocolEngine.getRehabFocus(injuryStatus.progression_stage || 0),
        durationMin: 30
      };
    }

    // 2. Map Readiness to Session Type
    if (readiness < 50) {
      return {
        title: "Active Recovery",
        type: "RECOVERY",
        intensity: "LOW",
        focus: "Mobility & Parasympathetic reset",
        durationMin: 20
      };
    }

    // 3. Goal-Driven Session (High Readiness)
    if (readiness > 80) {
      return {
        title: `${goal.replace("_", " ")} Focus`,
        type: "TRAINING",
        intensity: "HIGH",
        focus: "High-intensity adaptive block",
        durationMin: 60
      };
    }

    // 4. Default Moderate Session
    return {
      title: "Planned Training Block",
      type: "TRAINING",
      intensity: "MODERATE",
      focus: "Sustainable volume & efficiency",
      durationMin: 45
    };
  }
}

export const sessionPlanner = new SessionPlanner();
