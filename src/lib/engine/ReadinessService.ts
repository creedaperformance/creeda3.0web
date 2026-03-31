import { AthleteInput, ReadinessOutput, LoadOutput } from './types';

/**
 * CREEDA V4: READINESS SERVICE
 * Adaptive Weighting & Non-Linear Physiological Modeling
 */

export function calculateReadiness(
  input: AthleteInput, 
  loadOutput: LoadOutput
): ReadinessOutput {
  const { wellness, context, adaptation_profile, cns_baseline } = input;
  const { fatigue_sensitivity } = adaptation_profile;

  // 1. Fallback Logic: Missing Data
  if (!wellness.sleep_quality) {
    const validLogs = input.history
      .filter((h): h is typeof h & { readinessScore: number } => typeof h.readinessScore === 'number')
      .slice(0, 3);
    if (validLogs.length > 0) {
      const avgScore = validLogs.reduce((acc, h) => acc + h.readinessScore, 0) / validLogs.length;
      const avgNM = validLogs.reduce((acc, h) => acc + (h.domains?.neuromuscular || 70), 0) / validLogs.length;
      const avgMet = validLogs.reduce((acc, h) => acc + (h.domains?.metabolic || 70), 0) / validLogs.length;
      const avgMen = validLogs.reduce((acc, h) => acc + (h.domains?.mental || 70), 0) / validLogs.length;

      return {
        score: Math.round(avgScore),
        domains: {
          neuromuscular: Math.round(avgNM),
          metabolic: Math.round(avgMet),
          mental: Math.round(avgMen)
        },
        factors: { sleep: 50, energy: 50, soreness: 50, stress: 50, pain: 0 },
        cns_fatigue: 50,
        confidence: 0.7 // 30% penalty for missing data
      };
    }
  }

  // 2. Metric Normalization (Categorical to 0-100)
  const subjectiveSleep = mapToScore(wellness.sleep_quality, 'sleep');
  const energy = mapToScore(wellness.energy_level, 'energy');
  const soreness = mapToScore(wellness.muscle_soreness, 'soreness');
  const stress = mapToScore(wellness.stress_level, 'stress');
  const motivation = wellness.motivation ?? 75;
  const pain = wellness.current_pain_level || 0;

  // 2b. CNS / Diagnostic Comparison (Accuracy Pivot)
  const sleep = subjectiveSleep;
  let reality_bridge = "";
  let felt_reality_gap = 0;

  // If reaction time is significantly slower than baseline, flag accuracy issues
  if (wellness.reaction_time_ms && cns_baseline && cns_baseline.mean > 0) {
    const deviation = wellness.reaction_time_ms - cns_baseline.mean;
    if (deviation > (cns_baseline.std_dev * 1.5)) {
      reality_bridge = "Neural response time is lagging behind your baseline. Mechanical recovery required regardless of perceived freshness.";
      felt_reality_gap = 25; // 25% gap if CNS is lagging
    }
  }

  // 3. CNS / HRV Fusion
  let cns_fatigue = 50; // Baseline neutral
  
  // A. Reaction Time CNS
  if (wellness.reaction_time_ms && cns_baseline && cns_baseline.std_dev > 0) {
    const z_score = (wellness.reaction_time_ms - cns_baseline.mean) / cns_baseline.std_dev;
    cns_fatigue = Math.max(0, Math.min(100, Math.round(50 + z_score * 10)));
  }


  // 4. Adaptive Domain Weighting
  const sport = context.sport.toLowerCase();
  let baseWeights = { nm: 0.33, met: 0.33, men: 0.34 };

  if (sport.includes('football') || sport.includes('rugby') || sport.includes('sprint')) {
    baseWeights = { nm: 0.45, met: 0.35, men: 0.20 };
  } else if (sport.includes('cycling') || sport.includes('swim') || sport.includes('marathon')) {
    baseWeights = { nm: 0.20, met: 0.50, men: 0.30 };
  }

  const weight_sleep = 0.4 * (1 + fatigue_sensitivity * 0.2);
  const weight_energy = 0.4 * (1 - fatigue_sensitivity * 0.1);

  // 5. Domain Calculations (Non-Linear)
  const k = 0.2; 
  const threshold = 50;
  const soreness_penalty = 100 / (1 + Math.exp(-k * (threshold - soreness)));
  
  const nmRaw = (soreness * 0.5 + (100 - (loadOutput.neuromuscular)) * 0.3 + (100 - cns_fatigue) * 0.2);
  const nmReadiness = Math.max(0, Math.min(100, nmRaw - (soreness_penalty * fatigue_sensitivity * 0.5)));

  const metRaw = (sleep * weight_sleep + energy * weight_energy + (100 - loadOutput.metabolic) * 0.2);
  const metabolicReadiness = Math.max(0, Math.min(100, metRaw));

  const mentalRaw = (motivation * 0.6 + stress * 0.4);
  const mentalReadiness = Math.max(0, Math.min(100, mentalRaw));

  // 6. Final Aggregation
  const finalScore = Math.round(
    (isNaN(nmReadiness) ? 70 : nmReadiness) * baseWeights.nm + 
    (isNaN(metabolicReadiness) ? 70 : metabolicReadiness) * baseWeights.met + 
    (isNaN(mentalReadiness) ? 70 : mentalReadiness) * baseWeights.men
  );

  return {
    score: Math.max(20, Math.min(100, finalScore)),
    domains: {
      neuromuscular: Math.round(nmReadiness),
      metabolic: Math.round(metabolicReadiness),
      mental: Math.round(mentalReadiness)
    },
    factors: { sleep, energy, soreness, stress, pain },
    cns_fatigue,
    confidence: cns_baseline ? 0.95 : 0.85, // Higher confidence if we have a baseline to compare against
    felt_reality_gap,
    reality_bridge: reality_bridge || "Intelligence markers are synchronized with your baseline."
  };
}

/**
 * Internal Helper: Metric Mapping
 */
function mapToScore(val: unknown, type: string): number {
  const MAP: Record<string, Record<string, number>> = {
    sleep: { 'Excellent': 100, 'Good': 80, 'Okay': 50, 'Poor': 20, '5': 100, '4': 80, '3': 50, '2': 30, '1': 10 },
    energy: { 'Peak': 100, 'High': 80, 'Moderate': 50, 'Low': 30, 'Drained': 10, '5': 100, '4': 80, '3': 50, '2': 30, '1': 10 },
    soreness: {
      'Light/Fresh': 100, 'Normal': 75, 'Heavy': 40, 'Stiff/Sore': 20,
      'None': 100, 'Low': 80, 'Moderate': 50, 'High': 20, 'Low / Normal': 85, 'High / Stiff': 25,
      '1': 100, '2': 80, '3': 50, '4': 30, '5': 10
    },
    stress: { 'None': 100, 'Low': 80, 'Moderate': 50, 'High': 20, 'Very High': 10, '1': 100, '2': 80, '3': 50, '4': 30, '5': 10 }
  };

  const numeric = Number(val)
  if (Number.isFinite(numeric)) {
    if (numeric >= 0 && numeric <= 5) {
      if (type === 'stress' || type === 'soreness') return Math.max(0, Math.min(100, 100 - ((numeric - 1) * 22.5)))
      return Math.max(0, Math.min(100, Math.round((numeric / 5) * 100)))
    }
    if (numeric > 5 && numeric <= 10) {
      if (type === 'stress' || type === 'soreness') return Math.max(0, Math.min(100, 100 - (numeric * 10)))
      return Math.max(0, Math.min(100, numeric * 10))
    }
    if (numeric > 10 && numeric <= 100) {
      if (type === 'stress' || type === 'soreness') return Math.max(0, Math.min(100, 100 - numeric))
      return Math.max(0, Math.min(100, numeric))
    }
  }

  const strVal = String(val);
  return MAP[type]?.[strVal] || 50;
}
