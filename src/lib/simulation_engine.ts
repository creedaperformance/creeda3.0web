/**
 * CREEDA SIMULATION ENGINE
 * "What-if" predictive modeling for decision support.
 */

export interface SimulationResult {
  scenario: string;
  impactReadiness: number; // e.g., -8 or +12
  impactRecovery: number;
  message: string;
}

export class SimulationEngine {
  /**
   * Predicts readiness impact of a specific training load.
   */
  simulateTraining(currentReadiness: number, plannedLoad: number): SimulationResult {
    const impact = Math.round(-(plannedLoad / 10) - (100 - currentReadiness) / 20);
    
    return {
      scenario: "High Load Session",
      impactReadiness: impact,
      impactRecovery: -Math.abs(impact),
      message: `Training at this intensity will likely drop your readiness by ${Math.abs(impact)}% tomorrow.`
    };
  }

  /**
   * Predicts recovery impact of a specific rest choice.
   */
  simulateRecovery(currentReadiness: number, sleepHours: number): SimulationResult {
    const baselineSleep = 8;
    const impact = Math.round((sleepHours - baselineSleep) * 4);
    
    return {
      scenario: `${sleepHours}h Sleep Protocol`,
      impactReadiness: impact > 0 ? impact : 0,
      impactRecovery: impact,
      message: `Getting ${sleepHours}h of sleep will improve your recovery capacity by ${Math.abs(impact)}%.`
    };
  }
}

export const simulationEngine = new SimulationEngine();
