import { AthleteInput, ConfidenceOutput, UncertaintyOutput } from './types';

/**
 * CREEDA V4.2: ADVANCED UNCERTAINTY SERVICE
 * Trend-Variability & Stability Waveform Modeling
 */

export function calculateUncertainty(
  input: AthleteInput,
  confidence: ConfidenceOutput
): UncertaintyOutput {
  const { history } = input;
  const alpha = 0.4; // Smoothing factor
  
  // 1. EWMA Variance (Last 5 days)
  const last5Readiness = history.slice(0, 5).map(h => h.readinessScore || 70);
  let currentVariance = 0;
  if (last5Readiness.length > 1) {
    const avg = last5Readiness.reduce((a, b) => a + b, 0) / last5Readiness.length;
    currentVariance = last5Readiness.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / last5Readiness.length;
  }

  const previousVariance = history[0]?.intelligence_meta?.uncertainty?.smoothed_variance || currentVariance;
  const smoothedVariance = (alpha * currentVariance) + (1 - alpha) * previousVariance;

  // 2. Trend Variability (World-Class Fix 1 - V4.2)
  // Variance of 3-day slope over last 5 days
  let trendVariability = 0;
  if (history.length >= 8) {
    const slopes: number[] = [];
    for (let i = 0; i < 5; i++) {
      const subset = history.slice(i, i + 3).map(h => h.readinessScore || 70);
      if (subset.length >= 2) {
        slopes.push((subset[0] - subset[subset.length - 1]) / (subset.length - 1));
      }
    }
    if (slopes.length > 1) {
      const avgSlope = slopes.reduce((a, b) => a + b, 0) / slopes.length;
      trendVariability = slopes.reduce((a, b) => a + Math.pow(b - avgSlope, 2), 0) / slopes.length;
    }
  }

  // 3. Score Composition
  const normalizedVariance = Math.min(1.0, smoothedVariance / 100);
  const normalizedTrendVar = Math.min(1.0, trendVariability / 10); // Scale: slope var > 10 is extreme
  const densityImpact = 1.0 - confidence.data_density;

  const score = (isNaN(normalizedVariance) ? 0 : normalizedVariance * 0.6) + 
                (isNaN(densityImpact) ? 0 : densityImpact * 0.2) + 
                (isNaN(normalizedTrendVar) ? 0 : normalizedTrendVar * 0.2);

  // 4. Stability Waveform (UI Logic - V4.2)
  let stability_waveform: UncertaintyOutput['stability_waveform'] = "stable";
  if (score > 0.6) stability_waveform = "jagged_waveform";
  else if (score > 0.3) stability_waveform = "slight_waveform";

  return {
    score: Number(Math.max(0, Math.min(1.0, score)).toFixed(2)),
    smoothed_variance: Number(smoothedVariance.toFixed(2)),
    trend_variability: Number(trendVariability.toFixed(2)),
    density_impact: Number(densityImpact.toFixed(2)),
    alpha_smoothing: alpha,
    stability_waveform
  };
}
