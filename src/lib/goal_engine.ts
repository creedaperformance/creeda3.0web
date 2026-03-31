/**
 * CREEDA GOAL ENGINE
 * User-driven adaptation and scoring weights.
 * Enums match onboarding values stored in diagnostics.primary_goal.
 */

export type PerformanceGoal = 
  | "Performance Enhancement" 
  | "Injury Prevention" 
  | "Recovery Efficiency" 
  | "Return from Injury" 
  | "Competition Prep";

export interface GoalConfig {
  goal: PerformanceGoal;
  label: string;
  priorityMetrics: string[];
  weightAdjustments: Record<string, number>;
  dashboardFocus: string;
}

const GOAL_CONFIGS: Record<PerformanceGoal, GoalConfig> = {
  "Performance Enhancement": {
    goal: "Performance Enhancement",
    label: "Peak Output",
    priorityMetrics: ["readiness", "energy", "power", "neural_fatigue"],
    weightAdjustments: { readiness: 1.3, energy: 1.2, power: 1.2 },
    dashboardFocus: "Maximise training stimulus and push toward peak performance."
  },
  "Injury Prevention": {
    goal: "Injury Prevention",
    label: "Protection",
    priorityMetrics: ["pain", "soreness", "mobility", "load_tolerance"],
    weightAdjustments: { pain: 1.5, soreness: 1.3, mobility: 1.2 },
    dashboardFocus: "Monitor stress signals and protect against injury risk."
  },
  "Recovery Efficiency": {
    goal: "Recovery Efficiency",
    label: "Recharge",
    priorityMetrics: ["sleep", "stress", "recovery", "fatigue_resistance"],
    weightAdjustments: { sleep: 1.3, stress: 1.2, recovery: 1.3 },
    dashboardFocus: "Optimise rest and recovery to stay recharged between sessions."
  },
  "Return from Injury": {
    goal: "Return from Injury",
    label: "Comeback",
    priorityMetrics: ["pain", "mobility", "recovery", "soreness"],
    weightAdjustments: { pain: 1.5, mobility: 1.4, recovery: 1.3, soreness: 1.2 },
    dashboardFocus: "Build a safe, progressive path back to full training."
  },
  "Competition Prep": {
    goal: "Competition Prep",
    label: "Peak Day",
    priorityMetrics: ["readiness", "energy", "sleep", "neural_fatigue"],
    weightAdjustments: { readiness: 1.4, energy: 1.3, sleep: 1.2 },
    dashboardFocus: "Manage your taper and peak for competition day."
  }
};

export class GoalEngine {
  /**
   * Returns weights for current goal to be used by Scoring Engine.
   */
  getWeights(goal: PerformanceGoal) {
    return GOAL_CONFIGS[goal]?.weightAdjustments || {};
  }

  /**
   * Customizes dashboard priority metrics.
   */
  getPriorityMetrics(goal: PerformanceGoal) {
    return GOAL_CONFIGS[goal]?.priorityMetrics || [];
  }

  /**
   * Returns the goal configuration for dashboard focus labels.
   */
  getGoalConfig(goal: PerformanceGoal): GoalConfig | undefined {
    return GOAL_CONFIGS[goal];
  }

  /**
   * Resolves a raw string from the database to a valid PerformanceGoal.
   */
  resolveGoal(raw: string | undefined | null): PerformanceGoal {
    if (!raw) return "Performance Enhancement";
    const lower = raw.toLowerCase();
    if (lower.includes('performance')) return "Performance Enhancement";
    if (lower.includes('injury') && lower.includes('prevention')) return "Injury Prevention";
    if (lower.includes('recovery')) return "Recovery Efficiency";
    if (lower.includes('return')) return "Return from Injury";
    if (lower.includes('competition')) return "Competition Prep";
    return "Performance Enhancement";
  }
}

export const goalEngine = new GoalEngine();
