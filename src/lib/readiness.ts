/**
 * Backend function to calculate athlete readiness based on wellness metrics.
 * 
 * Logic summarized:
 * - Scores (Sleep, Energy, Soreness, Stress) converted to 0-100 percentages.
 * - Readiness Score is a weighted average: Sleep(30%), Energy(30%), Soreness(20%), Stress(20%).
 * - Status and Decision derived from Readiness Score thresholds (75, 50).
 * - Reasons flagged based on critical individual metric thresholds.
 */

export interface WellnessInput {
  sleep: number;      // 1-5
  energy: number;     // 1-5
  soreness: number;   // 1-5
  stress: number;     // 1-5
  intensity: number;  // 1-10
  duration: number;   // minutes
}

export interface ReadinessResult {
  readiness_score: number;
  status: 'High' | 'Moderate' | 'Low';
  decision: 'Train Hard' | 'Train Moderate' | 'Recovery';
  reason: string[];
}

export function calculateReadiness(input: WellnessInput): ReadinessResult {
  const { sleep, energy, soreness, stress } = input;

  // 1. Convert to percentages (0-100)
  const sleep_score = (sleep / 5) * 100;
  const energy_score = (energy / 5) * 100;
  
  // Inverse relationship: High soreness/stress = Low score
  const soreness_score = ((5 - soreness) / 5) * 100;
  const stress_score = ((5 - stress) / 5) * 100;

  // 2. Calculate Weighted Readiness Score
  const readiness_score = Math.round(
    (sleep_score * 0.3) +
    (energy_score * 0.3) +
    (soreness_score * 0.2) +
    (stress_score * 0.2)
  );

  // 3. Determine Decision and Status
  let decision: ReadinessResult['decision'] = 'Recovery';
  let status: ReadinessResult['status'] = 'Low';

  if (readiness_score >= 75) {
    decision = 'Train Hard';
    status = 'High';
  } else if (readiness_score >= 50) {
    decision = 'Train Moderate';
    status = 'Moderate';
  }

  // 4. Determine Reasons (Critical Thresholds)
  const reason: string[] = [];
  if (sleep <= 2) reason.push('Low sleep');
  if (soreness >= 4) reason.push('High soreness');
  if (stress >= 4) reason.push('High stress');

  return {
    readiness_score,
    status,
    decision,
    reason
  };
}
