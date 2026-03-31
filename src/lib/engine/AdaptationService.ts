import { AthleteInput, AdaptationProfile, ReadinessOutput, LoadOutput } from './types';

/**
 * CREEDA V4: ADAPTATION SERVICE
 * Longitudinal Learning & Athlete-Specific Tuning
 */

export function calculateAdaptation(
  input: AthleteInput,
  readiness: ReadinessOutput,
  load: LoadOutput
): AdaptationProfile {
  const current = input.adaptation_profile;
  const learningRate = Math.min(0.1, current.learning_rate || 0.05);

  // 1. Response Detection (World-Class Fix 3)
  // Process the last 3 days with exponential weight decay to prioritize recency
  const { history } = input;
  const lookbackDays = history.slice(0, 3);
  let sensitivitySignalTotal = 0;
  let speedSignalTotal = 0;
  let weightTotal = 0;

  lookbackDays.forEach((log: any, index: number) => {
    const daysAgo = index + 1;
    const weight = Math.exp(-0.07 * daysAgo); // Lambda = 0.07
    weightTotal += weight;

    const histLoadIntensity = (log.load_score || 500) / 500;
    const histReadiness = log.readinessScore || 70;

    // A. Sensitivity Signal
    if (histLoadIntensity > 1.2 && histReadiness < 40) {
      sensitivitySignalTotal += 0.1 * weight;
    } else if (histLoadIntensity > 1.5 && histReadiness > 70) {
      sensitivitySignalTotal -= 0.05 * weight;
    }

    // B. Speed Signal
    const prevScore = history[index + 1]?.readinessScore || 70;
    const recoveryDelta = histReadiness - prevScore;
    if (recoveryDelta > 20 && histLoadIntensity < 0.5) {
      speedSignalTotal += 0.05 * weight;
    } else if (recoveryDelta < 5 && histLoadIntensity < 0.5) {
      speedSignalTotal -= 0.05 * weight;
    }
  });

  const sensitivitySignal = weightTotal > 0 ? sensitivitySignalTotal / weightTotal : 0;
  const speedSignal = weightTotal > 0 ? speedSignalTotal / weightTotal : 0;

  // 2. EWMA Decay Logic (Fix #3: alpha=0.7 for current, 0.3 for past)
  const alpha = 0.7;
  const ewmaReadiness = (alpha * readiness.score) + ((1 - alpha) * (current.ewma_readiness_avg || 70));
  const ewmaFatigue = (alpha * (100 - readiness.score)) + ((1 - alpha) * (current.ewma_fatigue_avg || 30));

  // 3. Apply Learning Rate & Decay
  const update = (old: number, signal: number) => {
    const newVal = old + (learningRate * signal);
    return Math.max(0.1, Math.min(0.9, newVal)); // Bound [0.1, 0.9]
  };

  return {
    ...current,
    fatigue_sensitivity: Number(update(current.fatigue_sensitivity, sensitivitySignal).toFixed(3)),
    recovery_speed: Number(update(current.recovery_speed, speedSignal).toFixed(3)),
    load_tolerance: Number(update(current.load_tolerance, (readiness.score > 80 ? 0.02 : -0.01)).toFixed(3)),
    
    // EWMA Updates
    ewma_readiness_avg: Number(ewmaReadiness.toFixed(2)),
    ewma_fatigue_avg: Number(ewmaFatigue.toFixed(2)),
    
    learning_rate: learningRate,
    last_updated: new Date().toISOString()
  };
}
