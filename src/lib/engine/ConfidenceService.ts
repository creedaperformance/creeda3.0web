import { AthleteInput, ConfidenceOutput } from './types';

/**
 * CREEDA V4: CONFIDENCE SERVICE
 * Data Integrity & System Reliability Modeling
 */

export function calculateConfidence(input: AthleteInput): ConfidenceOutput {
  const { history, wellness } = input;
  
  // 1. Data Mode Detection
  let mode: ConfidenceOutput['mode'] = 'normal';
  if (history.length < 3) mode = 'cold_start';
  else if (history.length < 7) mode = 'low_data';
  else if (!wellness.sleep_quality) mode = 'missing_data';

  // 2. Trust Score (0-1)
  // Consistency: Check for identical inputs in last 5 logs
  const last5 = history.slice(0, 5);
  let consistencyScore = 1.0;
  if (last5.length >= 3) {
    const sleepCodes = last5.map(h => h.sleep_quality);
    const uniqueValues = new Set(sleepCodes).size;
    if (uniqueValues === 1) consistencyScore = 0.4; // "Robot" entry detected
  }

  // Variance: Biologically expected variation (Coefficient of Variation)
  const scores = history.map(h => h.readinessScore || 70);
  const avg = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
  const variance = Math.sqrt(scores.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / (scores.length || 1));
  const varianceScore = Math.min(1.0, variance / 5); // Expect at least 5 pts variation

  const trust_score = (consistencyScore * 0.7 + varianceScore * 0.3);

  // 3. Data Density (0-1)
  // Percent of mandatory logs present in last 28 days
  const data_density = Math.min(1.0, history.length / 28);

  // 4. Baseline Stability (0-1)
  // High volatility reduces stability score
  const baseline_stability = Math.max(0, 1.0 - (variance / 40));

  // 5. Total Confidence Calculation
  let total_confidence = (trust_score * 0.4 + data_density * 0.4 + baseline_stability * 0.2);

  // Mode Penalties
  if (mode === 'cold_start') total_confidence *= 0.4;
  else if (mode === 'low_data') total_confidence *= 0.7;
  else if (mode === 'missing_data') total_confidence *= 0.6;

  // 6. Multi-Factor Reasons (Fix #1)
  const reasons: string[] = [];
  if (mode === 'cold_start') reasons.push("initial calibration phase");
  if (mode === 'low_data') reasons.push("limited training history");
  if (mode === 'missing_data') reasons.push("missing recent sleep/wellness data");
  if (consistencyScore < 1) reasons.push("possible automated data entry detected");
  if (varianceScore < 0.5) reasons.push("low physiological variability");
  if (data_density < 0.5) reasons.push("inconsistent logging adherence");

  return {
    trust_score: Number(trust_score.toFixed(2)),
    data_density: Number(data_density.toFixed(2)),
    baseline_stability: Number(baseline_stability.toFixed(2)),
    total_confidence: Number(Math.max(0, Math.min(1.0, total_confidence)).toFixed(2)),
    mode,
    reasons: reasons.length > 0 ? reasons : ["high data integrity"]
  };
}
