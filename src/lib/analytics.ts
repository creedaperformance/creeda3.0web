import { SPORTS_DATABASE, getSportData } from './sport_intelligence'

export function calculateACWR(avg7Days: number, avg28Days: number): { ratio: number; status: string; statusColor: string } {
  if (avg28Days === 0) {
    return { ratio: 0, status: 'Not Enough Data', statusColor: 'text-muted-foreground' }
  }
  
  const ratio = Number((avg7Days / avg28Days).toFixed(2))
  
  if (ratio < 0.8) {
    return { ratio, status: 'Doing too little', statusColor: 'text-blue-500' }
  } else if (ratio >= 0.8 && ratio <= 1.3) {
    return { ratio, status: 'Perfect training amount', statusColor: 'text-green-500' }
  } else {
    return { ratio, status: 'Doing too much / Risk of injury', statusColor: 'text-red-500' }
  }
}

export const POSITION_RISK_FACTORS: Record<string, number> = {
  // Cricket
  'Fast Bowler': 1.15,
  'Wicketkeeper': 1.1,
  
  // Football/Hockey/Handball
  'Goalkeeper': 0.9,
  'Forward': 1.05,
  
  // Athletics
  'Sprints': 1.1,
  'Jumps': 1.1,
  'Throws': 1.05,
  
  // Others
  'Heavyweight': 1.05,
  'Professional': 1.1, // Multiplier for high competitive stress
}

export function calculateBMI(heightCm: number, weightKg: number): number {
  if (!heightCm || !weightKg) return 0
  const heightM = heightCm / 100
  return Number((weightKg / (heightM * heightM)).toFixed(1))
}

export function getSportInjuryRiskMultiplier(sport: string, position: string, painLocations: string[]): number {
  let risk = 1.0
  
  const locations = painLocations.map(l => l.toLowerCase())
  
  // High-Risk Sport/Position + Body Part Combinations
  if (sport === 'Football' && (locations.includes('knee') || locations.includes('ankle'))) risk *= 1.2
  if (sport === 'Cricket' && position === 'Fast Bowler' && (locations.includes('lower back') || locations.includes('side'))) risk *= 1.25
  if (sport === 'Swimming' && locations.includes('shoulder')) risk *= 1.2
  if (sport === 'Athletics' && (position === 'Sprints' || position === 'Jumps') && (locations.includes('hamstring') || locations.includes('achilles'))) risk *= 1.2
  if (sport === 'Badminton' && (locations.includes('knee') || locations.includes('shoulder'))) risk *= 1.15
  
  return risk
}

/**
 * Canonical Load Normalizer (0-100)
 * Handles BOTH legacy categorical ('Low','Moderate','High') AND numeric RPE strings ('7').
 * Prevents blind fallback-to-50 when new numeric RPE is stored as a string.
 */
export function normalizeLoadToPercent(value: any): number {
  if (value === null || value === undefined) return 50;
  // Legacy categorical
  const catMap: Record<string, number> = { 'Low': 20, 'Moderate': 50, 'High': 80, 'Very High': 100, 'Rest': 0 };
  if (typeof value === 'string' && catMap[value] !== undefined) return catMap[value];
  // Numeric (RPE 1-10, possibly as string)
  const num = Number(value);
  if (!isNaN(num) && num >= 0) {
    if (num <= 10) return Math.round((num / 10) * 100); // RPE scale
    return Math.min(100, Math.round(num)); // Already a percentage or raw score
  }
  return 50; // True unknown
}

import { 
  orchestratePerformanceEngine 
} from './engine/EngineOrchestrator';
import { 
  AthleteInput, 
  EngineVersion 
} from './engine/types';

// Mappings for discrete metrics to percentages
export const METRIC_MAP: Record<string, number> = {
  // Common scales
  'Low': 25, 'Moderate': 50, 'High': 75, 'Peak': 100,
  'None': 100,
  // Sleep Quality
  'Poor': 25, 'Okay': 50, 'Good': 75, 'Excellent': 100,
  '1': 20, '2': 40, '3': 60, '4': 80, '5': 100,
  // Energy Level
  'Drained': 20, 
  // Body Feel / Soreness (Explicit Mapping)
  'Light/Fresh': 100, 'Normal': 75, 'Heavy': 40, 'Stiff/Sore': 20,
  // New Soreness Labels (Phase 22 Alignment)
  'Soreness_None': 100, 'Soreness_Low': 80, 'Soreness_Moderate': 50, 'Soreness_High': 20,
  // Numeric Soreness (1=Fresh, 5=Exhausted) - Must be distinct if using flat map
  'Soreness_1': 100, 'Soreness_2': 80, 'Soreness_3': 50, 'Soreness_4': 30, 'Soreness_5': 10,
  // Mental Readiness
  'Not ready': 25, 'Distracted': 50, 'Focused': 75, 'Combat-ready': 100, 'Locked In': 100,
  // Health Status
  'Healthy': 100, 'Minor symptoms': 60, 'Ill / Injury restricted': 20,
  // Sport Specific Micro
  'Elite': 100
};

export function getReadinessColor(score: number, type: 'risk' | 'readiness' = 'readiness'): string {
  if (type === 'risk') {
    if (score < 30) return 'text-green-500 border-green-500/20 bg-green-500/10'
    if (score < 60) return 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10'
    return 'text-red-500 border-red-500/20 bg-red-500/10'
  }
  
  if (score >= 80) return 'text-green-500 border-green-500/20 bg-green-500/10'
  if (score >= 60) return 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10'
  return 'text-red-500 border-red-500/20 bg-red-500/10'
}

/**
 * Scientific Load Recovery Modifier
 * Thresholds: <300 (Low), 300-500 (Moderate), 500-700 (High), >700 (Very High)
 */
function calculateLoadRecoveryModifier(loadScore: number): number {
  if (loadScore < 300) return 100;
  if (loadScore <= 500) return 85;
  if (loadScore <= 700) return 70;
  return 55;
}

export interface PredictiveRisk {
  type: 'injury' | 'illness' | 'fatigue' | 'overload' | 'none';
  label: string;
  area?: string;
  timeWindow: string;
  why: string;
  athleteAction: string;
  coachAction: string;
  score: number;
}

export interface PerformanceIntelligence {
  recoveryRisk: number;
  compReadiness: number;
  coachReadinessLabel: string;
  coachRiskLabel: string;
  athleteJudgement: string;
  coachJudgement: string;
  statusLabel: string;
  combinedInsight?: string;
  visualLevel: 'optimal' | 'warning' | 'critical' | 'neutral';
  alerts?: string[];
  reason?: string[];
  predictiveRisk?: any;
  loadMetrics?: any;
  // V3 specific
  readinessV3?: any;
  riskV3?: any;
  directiveV3?: any;
  domains?: {
    neuromuscular: number;
    metabolic: number;
    mental: number;
  };
  // V4 specific
  engine_version?: EngineVersion;
  confidence_score?: number;
  uncertainty_score?: number;
  health_metrics?: any;
  stability_waveform?: "stable" | "slight_waveform" | "jagged_waveform";
  trend?: number;
  trend_signal?: number;
  fatigue_memory?: number;
  priority_score?: number;
  primary_action?: "Train" | "Recover" | "Modify" | "Rest";
  structured_explanation?: { factor: string; reason: string; priority: number }[];
  logs?: any;
}


/**
 * PREDICTIVE INTELLIGENCE MODEL
 * Formula: Risk = Trend (40%) × Exposure (35%) × Vulnerability (25%)
 */
export function calculatePredictiveRisk(log: any, history: any[] = [], diagnostic: any = {}): PredictiveRisk {
  const recentLogs = history.slice(0, 5);
  const sport = diagnostic?.sport_context?.primarySport || 'General';
  const position = diagnostic?.sport_context?.position || 'General';

  // 1. TREND (40%) - Repeated soreness or declining readiness
  const repeatedSorenessCount = recentLogs.filter(l => (METRIC_MAP[l.muscle_soreness] || 75) <= 50).length;
  const trendScore = Math.min(100, (repeatedSorenessCount / 3) * 100);

  // 2. EXPOSURE (35%) - Recent load and intensity (uses canonical normalizer)
  const yesterdayLoad = normalizeLoadToPercent(log.yesterday_load_demand);
  const avgHistoryLoad = recentLogs.length > 0 
    ? recentLogs.reduce((acc, l) => acc + normalizeLoadToPercent(l.yesterday_load_demand), 0) / recentLogs.length 
    : 50;
  const exposureScore = (yesterdayLoad * 0.6 + avgHistoryLoad * 0.4);

  // 3. VULNERABILITY (25%) - Sport/Position Context
  const bodyVulnerabilityMap: Record<string, Record<string, string>> = {
    'Football': { 'Striker': 'hamstring', 'Forward': 'hamstring', 'Midfielder': 'lower limb', 'Defender': 'knee/ankle' },
    'Hockey': { 'Midfielder': 'lower limb', 'Forward': 'hamstring/adductor' },
    'Wrestling': { 'General': 'shoulder/grip/lower back' },
    'Swimming': { 'General': 'shoulder' },
    'Athletics': { 'Sprints': 'hamstring/achilles', 'Jumps': 'achilles/knee' },
    'Cricket': { 'Fast Bowler': 'lower back/side', 'Batsman': 'forearm' }
  };
  
  const targetArea = bodyVulnerabilityMap[sport]?.[position] || bodyVulnerabilityMap[sport]?.['General'] || 'systemic';
  const hasCurrentPainInArea = (log.pain_location || []).some((loc: string) => targetArea.includes(loc.toLowerCase()));
  const vulnerabilityScore = hasCurrentPainInArea ? 100 : (targetArea !== 'systemic' ? 60 : 30);

  // Weighted Risk Score
  const totalRiskScore = (trendScore * 0.4 + exposureScore * 0.35 + vulnerabilityScore * 0.25);

  // Determine Dominant Risk Type
  let type: PredictiveRisk['type'] = 'none';
  let label = "No immediate vulnerability trend detected.";
  let area = targetArea;
  let timeWindow = "next 5-7 days";
  let why = "";
  let athleteAction = "Maintain current training consistency.";
  let coachAction = "Maintain planned load.";

  if (totalRiskScore > 25) {
    const sleepVal = METRIC_MAP[log.sleep_quality] || 75;
    const stressVal = METRIC_MAP[log.stress_level] || 50;
    const energyVal = METRIC_MAP[log.energy_level] || 50;

    // Logic to select dominant risk
    if (sleepVal < 50 || (stressVal >= 75 && energyVal < 50)) {
      type = 'illness';
      label = "Illness vulnerability";
      area = 'Immune System';
      why = "Recovery markers and rising stress suggest reduced immune resilience.";
      athleteAction = "Boost micronutrient intake and prioritize 8h+ sleep window.";
      coachAction = "Monitor athlete for early respiratory symptoms; reduce high-intensity exposure.";
    } else if (trendScore >= 60 && exposureScore >= 60) {
      type = 'overload';
      label = "Overload Trend";
      why = "Repeated high load without sufficient recovery intervals is creating a systemic deficit.";
      athleteAction = "Insert a proactive deload day with active recovery.";
      coachAction = "Mandatory 30% volume reduction in today's technical session.";
    } else if (repeatedSorenessCount >= 2 && energyVal <= 50) {
      type = 'fatigue';
      label = "Fatigue Accumulation";
      why = "Persistent soreness and low energy levels indicate incomplete physiological repair.";
      athleteAction = "Prioritize hydration and contrast therapy post-session.";
      coachAction = "Focus on technical execution; avoid maximal velocity work.";
    } else {
      type = 'injury';
      label = `${area} injury vulnerability`;
      why = `${area !== 'systemic' ? `Load in ${area} zones` : 'Systemic load'} is outpacing recovery history.`;
      athleteAction = `Prioritize ${area !== 'systemic' ? `${area} ` : ''}mobility and controlled activation.`;
      coachAction = `Reduce ${area.includes('lower') ? 'sprint' : 'high-velocity'} volume today.`;
    }
  }

  // Time Window Logic
  if (totalRiskScore > 65) timeWindow = "next 48-72 hours";
  else if (totalRiskScore > 40) timeWindow = "next 3-5 days";

  // Context Modifier: Respect match context and mental overrides
  const isMatchTomorrow = log.competition_tomorrow === true || log.session_importance === 'Match / Competition';
  const focusVal = METRIC_MAP[log.focus_level] || 50;
  
  if (isMatchTomorrow && focusVal >= 75 && type === 'fatigue' && totalRiskScore < 60) {
    // Dampen fatigue risk for match day if mental is high (interpreting as controlled tapering)
    return {
      type: 'none',
      label: "No immediate vulnerability trend detected.",
      timeWindow: "next 5-7 days",
      why: "Controlled competition preparation detected. Markers are within acceptable tapering limits.",
      athleteAction: "Stay focused on match-day priming.",
      coachAction: "Clear for match-day intensity.",
      score: totalRiskScore
    };
  }

  if (type === 'none') {
    return {
      type: 'none',
      label: "No immediate vulnerability trend detected.",
      timeWindow: "next 5-7 days",
      why: "Recovery markers are stabilizing relative to current load exposure.",
      athleteAction: "Maintain current recovery hygiene.",
      coachAction: "No load intervention required.",
      score: totalRiskScore
    };
  }

  return {
    type,
    label: label.charAt(0).toUpperCase() + label.slice(1),
    area: area.charAt(0).toUpperCase() + area.slice(1),
    timeWindow,
    why,
    athleteAction,
    coachAction,
    score: Math.round(totalRiskScore)
  };
}

export function calculateAdvancedACWR(log: any, history: any[], diagnostic: any) {
  const last7 = history.slice(0, 7);
  const last28 = history.slice(0, 28);
  
  const acuteLoad = (last7.reduce((acc, l) => acc + (l.load_score || 0), 0) + (log.load_score || 0)) / (last7.length + 1);
  
  // Chronic Load: Use baseline if history is short
  let chronicLoad = 0;
  // Fallback: typical session = RPE 5 * 60 min = 300. Safe default that won't skew ratios.
  const baselineLoad = diagnostic?.performance_baseline?.chronic_load_seed || 300;

  if (last28.length < 14) {
    // Weighted average of baseline and available history
    const historyWeight = last28.length / 28;
    const historyLoad = last28.length > 0 ? last28.reduce((acc, l) => acc + (l.load_score || 0), 0) / last28.length : baselineLoad;
    chronicLoad = (historyLoad * historyWeight) + (baselineLoad * (1 - historyWeight));
  } else {
    chronicLoad = last28.reduce((acc, l) => acc + (l.load_score || 0), 0) / last28.length;
  }

  return calculateACWR(acuteLoad, chronicLoad);
}

export function calculateLoadScore(durationCategory: string, rpe: number): number {
  let minutes = 45; // Default fallback
  if (durationCategory === '<30 min') minutes = 20;
  if (durationCategory === '30-60 min') minutes = 45;
  if (durationCategory === '60-90 min') minutes = 75;
  if (durationCategory === '90-120 min') minutes = 105;
  if (durationCategory === '120+ min') minutes = 135;
  
  return minutes * rpe;
}

export function calculateComplianceScore(logs: any[]): number {
  if (!logs || logs.length === 0) return 0
  
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const recentLogs = logs.filter(l => new Date(l.log_date) >= sevenDaysAgo)
  return Math.round((recentLogs.length / 7) * 100)
}

export function getRiskIntelligence(diagnostic: any, dailyLog: any, _accessTier: string = 'full-access') {
  const risks: any[] = [];
  const mitigations: any[] = [];
  const reasons: string[] = [];

  // Onboarding Context
  const sport = diagnostic?.sport_context?.primarySport || 'Other';
  const position = diagnostic?.sport_context?.position || 'General';
  const level = diagnostic?.sport_context?.playingLevel || 'District';
  const occupation = diagnostic?.daily_living?.occupation || 'General';
  
  // Latest Log Triggers (fallback to diagnostic if dailyLog is null)
  const painLocations = dailyLog?.pain_location || diagnostic?.physical_status?.activeInjuries?.map((i: any) => i.region) || [];
  const sleep = dailyLog?.sleep_quality || diagnostic?.recovery_baseline?.sleepQuality || 3;
  const fatigue = dailyLog?.fatigue || diagnostic?.daily_living?.physicalFatigue || 3;
  const stress = dailyLog?.stress_level || diagnostic?.daily_living?.mentalStress || 3;
  const recoveryFeel = dailyLog?.recovery_feel || 3;
  const trainingFreq = diagnostic?.training_reality?.trainingFrequency || 4;

  // --- STRUCTURED INJURY INTELLIGENCE ---
  const activeInjuries = diagnostic?.physical_status?.activeInjuries || [];
  const pastInjuries = diagnostic?.physical_status?.pastInjuries || [];

  // Active Injuries: Generate region-specific warnings
  if (activeInjuries.length > 0) {
    activeInjuries.forEach((injury: any) => {
      const label = `${injury.side && injury.side !== 'N/A' ? injury.side + ' ' : ''}${injury.region}`;
      risks.push({ category: 'Active Injury', factor: `${label} (${injury.type})`, magnitude: 'Critical' });
      reasons.push(`Active Injury: ${label} — ${injury.type} injury. All load on this region must be modified.`);
      mitigations.push(`Protect ${label}: Avoid impact and explosive loading. Focus on control-based movement around this region.`);
      if (injury.recurring) {
        reasons.push(`⟳ Recurring: Your ${label} has a history of recurring. Extra caution is critical to prevent re-injury.`);
        mitigations.push(`Recurring ${label}: Mandatory warm-up and stabilisation work before every session.`);
      }
    });
  }

  // Past Injuries: Cross-reference with sport high-risk regions
  if (pastInjuries.length > 0) {
    const sportData = getSportData(sport);
    const positionData = sportData?.positions.find(p => p.name === position);
    const highRiskRegions = [...(sportData?.highRiskRegions || []), ...(positionData?.highRiskRegions || [])];

    pastInjuries.forEach((injury: any) => {
      const label = `${injury.side && injury.side !== 'N/A' ? injury.side + ' ' : ''}${injury.region}`;
      const isHighRiskForSport = highRiskRegions.some(r => injury.region.toLowerCase().includes(r.toLowerCase()));
      
      if (isHighRiskForSport) {
        risks.push({ category: 'Vulnerability', factor: `Past ${label} Injury in High-Risk Zone`, magnitude: 'High' });
        reasons.push(`Past ${label} ${injury.type} injury is in a high-demand zone for ${sport} ${position}s. This region needs ongoing monitoring.`);
        mitigations.push(`Prehabilitation: 10-min targeted strengthening for ${label} before high-load sessions.`);
      }
      if (injury.recurring) {
        reasons.push(`⟳ Recurring History: ${label} has re-injured before. Progressive overload must be strictly controlled.`);
      }
    });
  }

  // --- MEDICAL CONDITIONS INTELLIGENCE ---
  const illnesses = diagnostic?.physical_status?.illnesses || [];
  if (illnesses.length > 0) {
    illnesses.forEach((condition: string) => {
      if (condition === "Asthma") {
        risks.push({ category: 'Respiration', factor: 'Asthma Trigger Risk', magnitude: 'High' });
        reasons.push("Medical: Asthma highlighted. Respiratory stress can spike during high-intensity or cold-weather training.");
        mitigations.push("Pre-Session: Ensure inhaler is on hand. Extend warm-up to 15+ mins to prevent exercise-induced bronchoconstriction.");
      } else if (condition.includes("Diabetes")) {
        risks.push({ category: 'Metabolic', factor: 'Glycemic Fluctuation', magnitude: 'Critical' });
        reasons.push(`Medical: ${condition} highlighted. High-intensity efforts can rapidly deplete circulating glucose or cause post-exercise hypoglycemia.`);
        mitigations.push("Fueling: Mandatory carbohydrate intake prior to sessions lasting >45 mins. Test glucose immediately post-training.");
      } else if (condition === "Hypertension") {
        risks.push({ category: 'Cardiovascular', factor: 'Blood Pressure Spike', magnitude: 'High' });
        reasons.push("Medical: Hypertension. Heavy isometric lifting and breath-holding (Valsalva) pose acute cardiovascular risks.");
        mitigations.push("Lifting Protocol: Avoid heavy one-rep maxes. Ensure continuous breathing through all reps. Cap effort at RPE 8.");
      } else if (condition === "Cardiac Condition") {
        risks.push({ category: 'Cardiovascular', factor: 'Cardiac Load Limit', magnitude: 'Critical' });
        reasons.push("Medical: Cardiac Condition. Unregulated anaerobic spikes present extreme physiological risk.");
        mitigations.push("Monitoring Required: Keep heart rate strictly within prescribed zones. Cease activity instantly if chest tightness occurs.");
      } else if (condition === "Autoimmune Disorder") {
        risks.push({ category: 'Systemic', factor: 'Inflammatory Flare Risk', magnitude: 'Moderate' });
        reasons.push("Medical: Autoimmune tracking. Recovery debt can trigger systemic inflammatory flares.");
        mitigations.push("Regulation Strategy: Cap high-intensity CNS work at 45 minutes to manage cortisol response. Prioritize 9h sleep.");
      } else if (condition !== "Other") {
        reasons.push(`Medical Context: Documented condition (${condition}) factored into baseline. Monitor overall fatigue response.`);
      }
    });
  }

  // --- GOAL-CENTRIC PRIORITIZATION ---
  const primaryGoal = (diagnostic?.primary_goal || 'General fitness').toLowerCase();
  if (primaryGoal.includes('performance')) {
    reasons.push("Goal: Performance Enhancement. Creeda is tracking your readiness to push you toward peak output.");
    mitigations.push("To hit peak form: Eat protein and carbs within 20 minutes of every high-intensity session.");
  } else if (primaryGoal.includes('injury') && primaryGoal.includes('prevention')) {
    reasons.push("Goal: Injury Prevention. Creeda is monitoring stress signals and flagging risks early.");
    mitigations.push("Safety Plan: 10 minutes of balance and proprioception work before every heavy session.");
  } else if (primaryGoal.includes('return')) {
    reasons.push("Goal: Return from Injury. Creeda is building a safe, progressive path back to full capacity.");
    mitigations.push("Healing Rule: If pain increases after today's session, halve tomorrow's volume.");
  } else if (primaryGoal.includes('recovery')) {
    reasons.push("Goal: Recovery Efficiency. Creeda is optimising your rest periods to keep you recharged.");
    mitigations.push("Recovery Protocol: Prioritise 8+ hours of sleep and contrast therapy after intense days.");
  } else if (primaryGoal.includes('competition')) {
    reasons.push("Goal: Competition Prep. Creeda is managing your taper and build-up to peak on game day.");
    mitigations.push("Peaking Plan: Reduce training volume by 20% this week to allow supercompensation.");
  }

  // 1. Sport & Position Hazards (Static Baselines)
  const sportData = getSportData(sport);
  const positionData = sportData?.positions.find(p => p.name === position);
  
  if (sportData) {
    reasons.push(`Targeting your peak in ${sportData.name}: ${position}`);
  }

  // Check matching pain locations against high risk zones
  const highRiskRegions = [...(sportData?.highRiskRegions || []), ...(positionData?.highRiskRegions || [])];
  highRiskRegions.forEach(riskZone => {
    if (painLocations.some((loc: string) => loc.toLowerCase().includes(riskZone.toLowerCase()))) {
      risks.push({ category: 'High Priority', factor: `${riskZone} Trigger`, magnitude: 'Critical' });
      reasons.push(`Critical: Your ${riskZone} is a high-load zone for ${position}s. Pain here requires immediate attention.`);
      mitigations.unshift(`Absolute rest for ${riskZone} for 24-48h. Prioritize stability and light mobility.`);
    }
  });

  // Additional deeper checks are now available to every user.
  const burnoutRaw = (stress + fatigue + (trainingFreq / 3)) / sleep; 
  if (burnoutRaw > 8) {
    reasons.push("Personal Health: You are working harder than your sleep can fix. You might burn out soon.");
    risks.push({ category: 'Body System', factor: 'Feeling Burnt Out', magnitude: 'High' });
    mitigations.push("Take a rest day or an easy day. Get extra sleep tonight.");
  }

  if (dailyLog?.menstrual_status && dailyLog.menstrual_status !== 'Stable') {
     reasons.push(`Your period cycle (${dailyLog.menstrual_status}) can make your joints feel a bit loose today.`);
     mitigations.push("Be careful with deep stretching. Focus on controlled movements.");
  }

  if (occupation.includes('Student') || occupation.includes('Desk')) {
    if (stress >= 4) {
      reasons.push("Stress from school or work is adding to your training load, making it harder for your body to recover.");
      mitigations.push("Try 10 minutes of deep breathing after training to help your body relax and switch into recovery mode.");
    }
  }

  if (sleep <= 2) {
    reasons.push("Insufficient sleep quality is preventing cellular repair of micro-trauma from your last session.");
    risks.push({ category: 'Recovery', factor: 'Sleep Deficit', magnitude: 'Critical' });
    mitigations.push("Today's session should be strictly <60% intensity. Prioritize an 8-hour sleep window tonight.");
  }

  if (painLocations.length > 0) {
    painLocations.forEach((loc: string) => {
      reasons.push(`Pain found in ${loc}.`);
      risks.push({ category: 'Body', factor: `${loc} Pain`, magnitude: 'High' });
      mitigations.push(`Spend 15 minutes warming up your ${loc} gently before any fast movements.`);
    });
  }

  if (fatigue >= 4 && recoveryFeel <= 2) {
    reasons.push("High physical tiredness and poor recovery feeling suggest you have done too much recently.");
    risks.push({ category: 'Readiness', factor: 'Nerve Fatigue', magnitude: 'High' });
    mitigations.push("Replace high-intensity movements (like jumping or sprinting) with slow, technical practice today.");
  }

  // Female-specific menstrual logic (if status is provided in latest log)
  if (dailyLog?.menstrual_status && dailyLog.menstrual_status !== 'Stable') {
    reasons.push(`Cycle Phase (${dailyLog.menstrual_status}) is currently impacting systemic inflammatory markers and joint laxity.`);
    mitigations.push("Be cautious with end-range joint loading. Focus on control-based movement.");
  }

  // Fallback
  if (mitigations.length === 0) {
    mitigations.push('Maintain current training consistency.');
    mitigations.push('Focus on high-quality hydration and electrolyte balance.');
  }

  if (reasons.length === 0) {
    reasons.push("Your current wellness markers align well with your athletic baseline.");
  }

  return { risks, mitigations, reasons };
}

export function getLifestyleIntelligence(diagnostic: any, dailyLog: any, _accessTier: string = 'full-access') {
  const factors: string[] = [];
  const recommendations: string[] = [];
  const occupation = diagnostic?.daily_living?.occupation || 'General';
  
  // Markers
  const stress = dailyLog?.stress_level || diagnostic?.daily_living?.mentalStress || 3;
  const fatigue = dailyLog?.fatigue || diagnostic?.daily_living?.physicalFatigue || 3;
  const sleep = dailyLog?.sleep_quality || diagnostic?.recovery_baseline?.sleepQuality || 3;

  // 1. Occupation Analysis
  if (occupation.includes('Student')) {
    factors.push("Academic load creates high cognitive demand, which competes with your nervous system's ability to repair muscle tissue.");
    if (stress >= 4) {
      recommendations.push("Prioritize a 20-minute 'digital sunset' (no screens) before bed to lower cortisol.");
    }
  } else if (occupation.includes('Physical')) {
    factors.push("Manual labor consumes significant glycogen stores and creates systemic inflammation before you even start training.");
    recommendations.push("Increase daily protein-to-carb ratio to support systemic repair. Avoid fasted training.");
  } else if (occupation.includes('Desk') || occupation.includes('Corporate')) {
    factors.push("Prolonged sitting causes hip flexor tightness and reduced blood flow, leads to 'Sluggish' recovery markers.");
    recommendations.push("Implement 5-minute movement snacks every hour. Focus on glute activation before training.");
  }

  // 2. Stress/Fatigue Correlation
  if (stress > 3 && fatigue > 3) {
    factors.push("Stress & Tiredness: Feeling stressed at work/school is making you feel more tired physically.");
    recommendations.push("Do something relaxing today like yoga or swimming instead of a hard workout.");
  }

  // 3. Recovery Efficiency
  const recoveryScore = (sleep * 2) - fatigue;
  if (recoveryScore < 4) {
    factors.push("Lifestyle Deficit: Your daily activity is currently outpacing your recovery window.");
    recommendations.push("Strict 8-hour sleep requirement. Add a 15-minute afternoon nap if possible.");
  } else {
    factors.push("Resilient Baseline: Your daily lifestyle is well-managed, providing a strong foundation for high-intensity training.");
  }

  return { factors, recommendations, occupation };
}

export function getMatchDayIntelligence(diagnostic: any, todayLog: any, _accessTier: string = 'full-access') {
  const rituals: string[] = [];
  const nutrition: string[] = [];
  const hydration: string[] = [];
  const timeline: string[] = [];
  const sport = diagnostic?.sport_context?.primarySport || 'General';
  const position = diagnostic?.sport_context?.position || 'General';
  const gender = diagnostic?.profile_data?.gender || 'Male';
  const primaryGoal = (diagnostic?.primary_goal || 'General fitness').toLowerCase();

  // --- GOAL REFINEMENT : MATCH DAY ---
  if (primaryGoal.includes('performance')) {
    rituals.push("Performance Priming: 3 explosive sprints 45 minutes before kick-off to activate fast-twitch fibres.");
    nutrition.push("Quick Energy: Electrolyte-rich fluid 90 minutes before the match to sustain peak output.");
  } else if (primaryGoal.includes('injury') && primaryGoal.includes('prevention')) {
    rituals.unshift("Protection Protocol: 15-minute joint mobilisation warm-up before any match intensity.");
  } else if (primaryGoal.includes('return')) {
    rituals.unshift("Safe Return: Extended 20-min graduated warm-up. Stop immediately if pain exceeds baseline.");
  } else if (primaryGoal.includes('recovery')) {
    rituals.push("Recovery Focus: Keep match intensity to 80% ceiling. Protect tomorrow's recovery window.");
  } else if (primaryGoal.includes('competition')) {
    rituals.unshift("Peak Day: Execute your rehearsed pre-match routine exactly. Trust the preparation.");
    nutrition.push("Competition Fuel: Carb-load 3 hours prior. Strategic caffeine 45 minutes before.");
  }

  const occupation = diagnostic?.daily_living?.occupation || 'General';
  const injuryStatus = diagnostic?.physical_status?.injuryStatus || 'Clear';
  const painLocations = todayLog?.pain_location || [];
  const sleep = todayLog?.sleep_quality || 3;
  const stress = todayLog?.stress_level || 3;
  
  const matchDensity = diagnostic?.training_reality?.matchDensity || 'Low (1 match/week)';
  const caffeineSensitivity = diagnostic?.recovery_baseline?.caffeineSensitivity || 'Normal';
  const availableTools = diagnostic?.recovery_baseline?.available_tools || [];

  // INJURY & MEDICAL ALERTS
  if (injuryStatus === 'Restricted' || injuryStatus === 'Rehabilitating') {
    rituals.push(`ALERT: You are currently marked as '${injuryStatus}'. Defer strictly to your physio's activation guidelines before attempting any explosive movements.`);
  }

  // TOOL-SPECIFIC ACTIVATION
  if (availableTools.includes('Foam Roller')) {
    rituals.push("Pre-Match mobilization: 5 mins foam rolling on calves/quads to improve local blood flow.");
  }
  if (availableTools.includes('Massage Gun')) {
    rituals.push("Neural Priming: 2 mins massage gun on glutes at high frequency to 'wake up' the posterior chain.");
  }

  // BASELINES
  rituals.push("10 mins visualization of successful executions.");
  hydration.push("Sip 500-700ml of electrolyte-rich fluid (e.g. Nimbu Pani with rock salt) 2-3 hours before kick-off.");
  nutrition.push("High-carb, moderate-protein, low-fat Dalia, Poha, or Idli/Dosa 3-4 hours prior.");
  timeline.push("T-minus 3 Hours: Final large meal.");
  timeline.push("T-minus 60 Mins: Dynamic warm-up and movement prep.");

  // DYNAMIC MODIFIERS (Sleep & Stress)
  if (sleep <= 2) {
    timeline.unshift("T-minus 4 Hours: Contrast shower (alternating hot/cold) to stimulate CNS due to poor sleep.");
    nutrition.push("Consider strategic 100-200mg caffeine intake 45 mins prior to boost neural drive from sleep deficit.");
  }
  if (stress >= 4) {
    rituals.unshift("Mandatory 5-min box breathing (4 sec inhale, 4 hold, 4 exhale, 4 hold) to lower pre-match cortisol.");
  }

  // MATCH DENSITY MODIFIERS
  if (matchDensity === 'High (Tournament/Daily)') {
    nutrition.push("Tournament Mode: Glycemic control is critical. Avoid large insulin spikes between matches to prevent reactive hypoglycemia.");
    rituals.push("Tournament Focus: Prioritize mental decompression. 10 mins of complete silence between sessions.");
  }

  // CAFFEINE SENSITIVITY
  if (caffeineSensitivity === 'Sensitive (Jitters)') {
    nutrition.push("Caffeine Alert: You are sensitive. If using caffeine, limit to <50mg (Green tea or half-cup coffee) and stop 8+ hours before expected sleep.");
  } else if (caffeineSensitivity === 'High Tolerance') {
    nutrition.push("Neural Drive: High tolerance detected. Ensure you don't over-rely on stimulants; focus on carb-loading for true ATP energy.");
  }

  // Expanded match-day intelligence is available to every user.
  if (occupation.includes('Desk') || occupation.includes('Corporate')) {
    rituals.push("Pro Tip (Desk): Add 10 mins of extreme hip-flexor release (couch stretch) and glute activation bridge marching to 'wake up' seated muscles.");
  } else if (occupation.includes('Physical') || occupation.includes('Labor')) {
    timeline.push("Pro Timeline (Labor): T-minus 90 Mins - Spinal decompression hangs (60 seconds) to reverse manual labor compression.");
    hydration.push("Pro Hydration (Labor): Add an extra 500ml of water immediately; you are likely already dehydrated from work.");
  }

  if (sport === 'Football') {
    if (position === 'Forward') {
      rituals.push("Pro activation: Explosive sprint prime and rapid change-of-direction drills.");
      nutrition.push("Pro Fuel: Fast-acting carb source (Dates/Honey) 30 mins before kick-off.");
    } else if (position === 'Midfielder') {
      rituals.push("Pro activation: Endurance-focused aerobic warm-up for high volume.");
      nutrition.push("Pro Refuel: Maximize glycogen stores with complex carbs (Sweet Potato/Ragi).");
    } else if (position === 'Goalkeeper') {
      rituals.push("Pro activation: Eye-tracking and plyometric jump prep.");
    }
  } else if (sport === 'Cricket') {
    if (position === 'Fast Bowler') {
      rituals.push("Pro Bowl Prep: 15-min lumbar/core/glute complex activation.");
      hydration.push("Pro Hydration: Carry a sodium-heavy fluid directly to the boundary.");
    } else if (position === 'Batsman') {
      rituals.push("Pro coordination: Extended hand-eye coordination drills.");
      nutrition.push("Pro Sustenance: Low-GI focus (Dal/Rice) to avoid sugar crashes during long innings.");
    }
  } else if (sport === 'Athletics') {
     if (position === 'Sprints' || position === 'Jumps') {
       rituals.push("Pro neural: Very aggressive, short dynamic bounds.");
     }
  }

  // ANATOMICAL MODIFIERS (Pain & Injury)
  if (painLocations.includes('Lower Back')) {
    rituals.push("Back Pain Triggered: Add Cat-Cow and McGill curl-ups to activation block.");
  }
  if (painLocations.includes('Knee') || painLocations.includes('Hip/Groin')) {
    rituals.push("Lower Extremity Alert: Incorporate lateral band walks and deep glute/psoas activation.");
  }

  // (Moved inside Pro block above)

  // GENDER SPECIFICS
  if (gender === 'Female') {
    nutrition.push("Note: If in high-hormone phase (luteal), your core temperature will be elevated. Pre-cooling strategies (like ice vests or slushies) are highly beneficial.");
  }

  // FINAL TOOL CHECK
  if (availableTools.length === 0 || availableTools.includes('None')) {
    rituals.push("No tools detected? Focus on regular stretching and visualizing your performance.");
  }

  return { rituals, nutrition, hydration, timeline };
}

export function getPostGameIntelligence(diagnostic: any, todayLog: any, _accessTier: string = 'full-access') {
  const recoveryDetails: string[] = [];
  const diet: string[] = [];
  const hydration: string[] = [];

  const sport = diagnostic?.sport_context?.primarySport || 'General';
  const position = diagnostic?.sport_context?.position || 'General';
  const gender = diagnostic?.profile_data?.gender || 'Male';
  const trainingFreq = diagnostic?.training_reality?.trainingFrequency || 3;
  const trainingDurationStr = diagnostic?.training_reality?.trainingDuration || '0-30 min';
  const recoveryRoutine = diagnostic?.recovery_baseline?.recoveryRoutine || 'Often';
  const painLocations = todayLog?.pain_location || [];
  
  const matchMinutes = todayLog?.match_minutes || 0;
  const matchIntensity = todayLog?.match_intensity || 0;
  const isTravelDay = todayLog?.travel_day === true;
  
  const dietaryPreference = diagnostic?.daily_living?.dietary_preference || 'Vegetarian';
  const recovery_routine = diagnostic?.recovery_baseline?.recoveryRoutine || 'Often';
  const availableTools = diagnostic?.recovery_baseline?.available_tools || [];
  const primaryGoal = (diagnostic?.primary_goal || 'General fitness').toLowerCase();
  // --- GOAL REFINEMENT : POST GAME ---
  if (primaryGoal.includes('return')) {
    recoveryDetails.push("Return-to-Play Recovery: Icing for 15 mins and static elevation to reduce local edema.");
  } else if (primaryGoal.includes('recovery')) {
    recoveryDetails.push("Recovery Optimisation: Execute a 10-min post-game mobility flow immediately to normalise muscle tone.");
  } else if (primaryGoal.includes('performance')) {
    recoveryDetails.push("Performance Recovery: Protein-carb intake within 30 mins to maximise adaptation from today's stimulus.");
  } else if (primaryGoal.includes('competition')) {
    recoveryDetails.push("Competition Recovery: Prioritise full systemic restoration. No training for 24-48 hours post-event.");
  } else if (primaryGoal.includes('injury') && primaryGoal.includes('prevention')) {
    recoveryDetails.push("Injury Prevention Recovery: 15-min targeted mobility on high-risk regions before sleep tonight.");
  }

  // BASELINES
  recoveryDetails.push("Get 8-9 hours of good sleep tonight in a dark, cool room.");
  diet.push("Eat some protein and carbs (like chicken/paneer and rice) within 45 minutes of finishing.");
  
  // BEHAVIORAL COACHING
  if (recoveryRoutine === 'Rarely' || recoveryRoutine === 'Never') {
    diet.push("RECOVERY ALERT: Because you don't use a standard routine, hitting this exact nutritional window is your ONLY defense against extreme soreness tomorrow.");
  }
  
  // DIETARY PREFERENCE LOGIC
  if (dietaryPreference === 'Vegetarian') {
    diet.push("Veg Recovery: High-protein Paneer Bhurji or Soya Chunks with Rice/Roti, plus Dal Tadka.");
  } else if (dietaryPreference === 'Non-Veg') {
    diet.push("Non-Veg Recovery: Grilled Chicken Tikka or Fish with Rice, plus a side of Moong Dal.");
  } else if (dietaryPreference === 'Jain') {
    diet.push("Jain Recovery: Pulse-based high-protein bowl (Moong/Chana) with Rice and Lemon moisture. Avoid root vegetables.");
  } else if (dietaryPreference === 'Vegan') {
    diet.push("Vegan Recovery: Tofu Scramble or Tempeh with Quinoa/Rice and Spinach Dal.");
  }

  // TRAINING VOLUME MODIFIERS
  let isHighVolume = trainingFreq >= 5 || trainingDurationStr.includes('90-120') || trainingDurationStr.includes('120+');
  if (isHighVolume) {
     diet.push("High Volume Alert: You train heavily. Increase your post-match carbohydrate intake by 30% above normal to survive this week's chronic glycogen deficit.");
  }

  hydration.push("Drink 1.5x the water weight you lost during the match (approx 1.5 - 2 Liters over the next 4 hours). Add coconut water or ORS.");

  // MATCH PERFORMANCE MODIFIERS
  if (matchMinutes >= 80) {
    if (availableTools.includes('Ice Bath Access')) {
       recoveryDetails.push(`High Volume Logged (${matchMinutes}m): Mandatory 12-min cold water immersion (10-12 C) to reduce lower-body muscle damage.`);
    } else {
       recoveryDetails.push(`High Volume Logged (${matchMinutes}m): No ice bath? Use contrast showers (30s cold / 30s hot) for 10 cycles to stimulate blood flow.`);
    }
    diet.push("High Volume Refuel: Prioritize a second carbohydrate-loading meal 3 hours after the first post-match meal.");
  }
  if (matchIntensity >= 8) {
    recoveryDetails.push(`Max Intensity (${matchIntensity}/10): High brain and nerve fatigue (CNS) suspected. Prioritize sleep and recovery tonight.`);
  }

  // TRAVEL MODIFIERS
  if (isTravelDay) {
    recoveryDetails.push("Travel Day Recovery: Use compression socks during transit. Perform 5 mins of ankle circles and hip cycles immediately after arrival to counter systemic stiffness.");
    diet.push("Travel Nutrition: Focus on anti-inflammatory hydration (Ginger tea or Turmeric lassi) to counter travel-induced inflammation.");
  }

  // ANATOMICAL MODIFIERS
  if (painLocations.includes('Shoulder') || painLocations.includes('Elbow')) {
    recoveryDetails.push("Upper body joint stress detected. Do NOT heat. Ice for 15 mins to blunt inflammation.");
  }

  // SPORT & POSITION SPECIFICS
  if (sport === 'Football' || sport === 'Rugby') {
     recoveryDetails.push("High impact sustained. Consider 10-15 mins of cold-water immersion (ice bath) to blunt acute systemic inflammation.");
     if (position === 'Forward' || position === 'Midfielder') {
        diet.push("Extreme glycogen depletion detected. High-GI carbohydrates (White Rice, Khichdi, or Pasta) are required immediately.");
     }
  } else if (sport === 'Cricket') {
     if (position === 'Fast Bowler') {
        recoveryDetails.push("Maximal lumbar and joint stress. Execute strict decompression stretching (child's pose, 90/90s) before leaving the stadium.");
        diet.push("Increase Omega-3 and anti-inflammatory spices (Turmeric/Haldi doodh, Ginger) to speed up joint repair.");
     }
  } else if (sport === 'Swimming') {
     recoveryDetails.push("Focus on thoracic and shoulder mobility post-race to prevent tightening.");
  }

  // Gender-specific recovery guidance is available to every user.
  if (gender === 'Female') {
    diet.push("Pro Recovery (Female): Systemic recovery window is shorter when estrogen is low. Do not delay your post-match protein intake beyond 30 minutes.");
  }

  return { recoveryDetails, diet, hydration };
}

export function getCoachSportIntelligence(sport: string) {
  const focusAreas: string[] = [];
  const monitoringTips: string[] = [];
  const riskHazards: string[] = [];

  switch (sport) {
    case 'Cricket':
      focusAreas.push("Fast Bowler Workload: Monitor delivery counts and back-to-back high intensity days.");
      focusAreas.push("Lumbar Stress: Prioritize core stability for bowlers and keepers.");
      monitoringTips.push("Watch for 'Silent Fatigue': Batsmen showing slightly slower reaction times may need a rest day for their brain and nerves (CNS).");
      riskHazards.push("High heat-stress hazard during long fielding sessions.");
      break;
    case 'Football':
      focusAreas.push("HI Sprints: Monitor high-velocity distance to prevent hamstring strains.");
      focusAreas.push("Knee Stability: Implement ACL-prevention jumping/landing drills for all squad members.");
      monitoringTips.push("Post-Match Triage: Ensure immediate glycogen replenishment within 30 mins for midfielders.");
      riskHazards.push("Ankle inversion injuries on uneven playing surfaces.");
      break;
    case 'Athletics':
      focusAreas.push("Brain & Nerve Readiness: Sprints and Jumps require you to feel fresh and alert.");
      focusAreas.push("Tendon Health: Monitor Achilles and Patellar tendon reactivity in high-volume weeks.");
      monitoringTips.push("Plyometric Load: Total jump count should stay within 10% of weekly baseline.");
      riskHazards.push("Rapid increase in track intensity leads to stress fractures.");
      break;
    case 'Badminton':
      focusAreas.push("Shoulder Girdle: Focus on scapular stability to prevent overuse impingement.");
      focusAreas.push("Lateral Velocity: Monitor ankle and knee control during multi-directional lunges.");
      monitoringTips.push("Focus on sleep quality; high-density tournament schedules require perfect recovery hygiene.");
      riskHazards.push("Rotator cuff inflammation from repetitive overhead swinging.");
      break;
    case 'Kabaddi':
      focusAreas.push("Contact Prep: High-impact absorption and shoulder/neck stability.");
      focusAreas.push("Knee Integrity: MCL/ACL hazard is high during ankle holds and pivots.");
      monitoringTips.push("Monitor skin health and hydration to prevent cramping during high-intensity raids.");
      riskHazards.push("Shoulder dislocations and knee ligament damage during grappling.");
      break;
    case 'Hockey':
      focusAreas.push("Lumbar Flexion: Constant bent-over posture requires aggressive spinal extension recovery.");
      focusAreas.push("Hamstring/Adductor: High demand during low-stance lunging and sprinting.");
      monitoringTips.push("Hydration: High sweat rates occur under heavy protective gear.");
      riskHazards.push("Chronic lower back pain from sustained lumbar flexion.");
      break;
    default:
      focusAreas.push("Readiness Management: Focus on the 7-day moving average of squad wellness.");
      focusAreas.push("Risk Mitigation: Prioritize athletes with Readiness scores below 60%.");
      monitoringTips.push("Consistency: Encourage athletes to log daily to build a reliable health baseline.");
      riskHazards.push("Systemic overtraining from unmonitored load spikes.");
  }

  return { focusAreas, monitoringTips, riskHazards };
}

export function getIntelligenceFlash(data: any, weather?: { temp: number; humidity: number; location: string }) {
  const flashes: string[] = [];
  
  // 1. Sleep & Recovery context
  if (data.sleepHours === '<5 hours' || data.sleepHours === '5-6 hours') {
    flashes.push(`Sleep Deficit: Your recovery capacity is compromised by low sleep volume. Avoid maximal intensity sprints today.`);
    
    // Joint logic with weather
    if (weather && weather.temp > 32) {
      flashes.push(`Heat Hazard: With ${weather.temp}°C heat in ${weather.location}, your sprint stamina will drop by ~15% due to your sleep deficit. Focus on hydration before 11 AM.`);
    }
  }

  // 2. Soreness & Muscle Context
  const soreness = data.muscleSoreness || 0;
  if (soreness >= 4) {
    flashes.push(`High Soreness: Tissue markers indicate elevated muscle damage. Prioritize active recovery (walking/swimming) over heavy eccentric loading.`);
  }

  // 3. Hydration Context (New B2B2C Field)
  if (data.hydrationLevel && data.hydrationLevel <= 2) {
    flashes.push(`Hydration Crisis: Bio-markers suggest sub-par fluid intake. Add 1L of electrolyte-rich water (ORs/Nimbu Pani) now to prevent cramping during drills.`);
  }

  // 4. Mood & Burnout (New B2B2C Field)
  if (data.moodScore && data.moodScore <= 2) {
     flashes.push(`Burnout Risk: Your mood score indicates high reactive stress. Replace high-velocity drills with technical shadow-practice to save neural energy.`);
  }

  // 5. Match Day Context
  if (data.isMatchDay) {
    flashes.push(`Big Match Priority: Zero in on explosive priming. Keep your warm-up strictly below 20 mins to save glycogen for the second half.`);
  }

  // Fallback to a positive baseline
  if (flashes.length === 0) {
    return "Everything looks good! Your body is ready for a hard workout today. Go for it.";
  }

  // Return the most critical flash or a combined condensed version
  return flashes[0]; 
}

export function getPhysiologicalIntelligence(diagnostic: any, dailyLog: any) {
  const sport = diagnostic?.sport_context?.primarySport || 'Other';
  const position = diagnostic?.sport_context?.position || 'General';
  const sportData = getSportData(sport);
  
  // Current Factors (0.0 to 1.0)
  const s = METRIC_MAP[dailyLog?.sleepQuality] || 75;
  const e = METRIC_MAP[dailyLog?.energyLevel] || 60;
  const b = METRIC_MAP[dailyLog?.bodyFeel] || 75;
  const h = METRIC_MAP[dailyLog?.healthStatus] || 100;
  const m = METRIC_MAP[dailyLog?.mentalReadiness] || 75;

  const readiness = (s + e + b + h + m) / 5;

  // Roadmap Advice
  const roadmap: string[] = [];
  if (readiness < 60) {
    roadmap.push("Systemic fatigue detected. Prioritize recovery and low-intensity technical work.");
  } else if (readiness < 80) {
    roadmap.push("Stable foundation. Focus on building consistency in your primary sport demands.");
  } else {
    roadmap.push(`You are operating at peak capacity for ${sport}. Maintain current intensity.`);
  }

  return {
    currentPillars: {
      endurance: readiness,
      power: readiness,
      agility: readiness,
      strength: readiness,
      neural: m
    },
    peakPillars: {
      endurance: 100,
      power: 100,
      agility: 100,
      strength: 100,
      neural: 100
    },
    primaryGap: { pillar: 'overall', gap: 100 - readiness },
    roadmap,
    targetPeak: sportData?.name || 'Peak Performance',
    suggestedData: ['HRV', 'Reaction Time', 'Sleep Stages']
  };
}

export function getReadinessFromLog(log: any, diagnostic: any): number {
  if (!log) return 0;
  
  const intel = calculatePerformanceIntelligence(log, diagnostic);
  return intel.compReadiness;
}

export function generateDashboardHeroInsight(readinessScore: number, sport: string, metricValues: any): string {
  if (readinessScore >= 85) {
    return `You're in peak condition for today's ${sport} session. Your energy and recovery markers are elite.`;
  }
  if (readinessScore >= 70) {
    return `You're ready to perform. Your body is responsive and mental focus is high for ${sport}.`;
  }
  if (readinessScore >= 50) {
    return `You're stable but slightly fatigued. Focus on technical quality over sheer volume in ${sport} today.`;
  }
  if (readinessScore >= 30) {
    return `Recovery is your main priority today. Your markers suggest significant fatigue; light mobility only.`;
  }
  return `Critical fatigue detected. Absolute rest is required to prevent injury and reset your system.`;
}

export function mapMetricToScore(val: any, type: string): number {
  const MAP: Record<string, Record<string, number>> = {
    sleep: { 'Excellent': 100, 'Good': 80, 'Okay': 50, 'Poor': 20, '3': 50, '4': 80, '2': 30, '5': 100, '1': 10 },
    energy: { 'Peak': 100, 'High': 80, 'Moderate': 50, 'Low': 30, 'Drained': 10, '5': 100, '4': 80, '3': 50, '2': 30, '1': 10 },
    soreness: { 
      'Light/Fresh': 100, 'Normal': 75, 'Heavy': 40, 'Stiff/Sore': 20,
      'None': 100, 'Low': 80, 'Moderate': 50, 'High': 20,
      'Low / Normal': 85, 'High / Stiff': 25,
      '1': 100, '2': 80, '3': 50, '4': 30, '5': 10
    },
    stress: { 'None': 100, 'Low': 80, 'Moderate': 50, 'High': 20, '1': 100, '2': 80, '3': 50, '4': 30, '5': 10 },
    mental: { 'Combat-ready': 100, 'Focused': 75, 'Distracted': 40, 'Not ready': 20, '5': 100, '4': 75, '3': 50, '2': 30, '1': 10 }
  }
  
  // Handle numeric 1-10 scale if passed as actual numbers or strings
  const numVal = Number(val);
  if (!isNaN(numVal) && numVal >= 1 && numVal <= 10) {
    // Basic linear map for 1-10 if not in discrete map
    const strVal = String(val);
    if (MAP[type]?.[strVal]) return MAP[type][strVal];
    return Math.round((numVal / 10) * 100);
  }

  const strVal = String(val)
  return MAP[type]?.[strVal] || MAP[type]?.[val] || 50
}

export const CNS_LIMIT_EXPLAINER = "The Central Nervous System (CNS) Load Index detects how fast you are burning out. It tracks if your physical fatigue and mental stress are growing faster than your sleep can fix them. A high score means you are at risk of 'crashing' or feeling extremely tired in the next 2-3 weeks.";

/**
 * ==========================================
 * CREEDA PERFORMANCE V3: ELITE MODULES
 * ==========================================
 */

/**
 * V3 Load Intelligence: Multi-dimensional Load & Inference
 */
export interface LoadMetricsV3 {
  neuromuscular: number;
  metabolic: number;
  mechanical: number;
  total: number;
  ewma: number;
  monotony: number;
  strain: number;
  inferred: boolean;
  confidence: number;
}

export function calculateLoadMetricsV3(
  log: any,
  history: any[] = [],
  sport: string = 'General',
  adaptation: any = {}
): LoadMetricsV3 {
  const rpe = log.session_rpe || 5;
  const duration = log.duration_minutes || 60;
  const tags = log.session_tags || [];
  
  let nm = 0; // Neuromuscular
  let met = 0; // Metabolic
  let mech = 0; // Mechanical
  let inferred = false;
  let confidence = 1.0;

  // 1. Explicit Tag Detection
  if (tags.length > 0) {
    if (tags.includes('explosive') || tags.includes('sprint') || tags.includes('jumps')) nm = rpe * 1.2;
    if (tags.includes('endurance') || tags.includes('threshold')) met = rpe * 1.5;
    if (tags.includes('contact') || tags.includes('heavy_load')) mech = rpe * 1.3;
  } else {
    // 2. Fallback Inference
    inferred = true;
    confidence = 0.7; // Initial baseline confidence for inference
    
    const sportLow = sport.toLowerCase();
    if (sportLow.includes('football') || sportLow.includes('rugby')) {
      nm = rpe * 0.8; // Partial sprint bias
      met = rpe * 0.8;
      mech = rpe * 0.4;
    } else if (sportLow.includes('swimming') || sportLow.includes('cycling')) {
      met = rpe * 1.4;
      nm = rpe * 0.2;
    } else if (sportLow.includes('cricket') && log.position === 'Fast Bowler') {
      nm = rpe * 1.2;
      mech = rpe * 0.8;
    }
  }

  const total = rpe * duration;
  
  // 3. Rolling Metrics (Monotony & Strain)
  const last7Days = history.slice(0, 7);
  const avgLoad = last7Days.length > 0
    ? (last7Days.reduce((acc, l) => acc + (l.load_score || 300), 0) + total) / (last7Days.length + 1)
    : total;
  
  const stdDevLoad = last7Days.length > 1
    ? Math.sqrt(
        [...last7Days.map(l => l.load_score || 300), total]
          .map(x => Math.pow(x - avgLoad, 2))
          .reduce((a, b) => a + b) / (last7Days.length + 1)
      )
    : 1.0;

  const monotony = Number((avgLoad / (stdDevLoad || 1.0)).toFixed(2));
  const strain = total * monotony;

  // 4. EWMA Calculation (0.2 smoothing)
  const prevEWMA = history[0]?.intelligence_meta?.loadMetrics?.ewma || total;
  const ewma = Number((total * 0.2 + prevEWMA * 0.8).toFixed(2));

  return {
    neuromuscular: Math.round(nm),
    metabolic: Math.round(met),
    mechanical: Math.round(mech),
    total,
    ewma,
    monotony,
    strain,
    inferred,
    confidence
  };
}

/**
 * V3 Readiness Engine: Non-Linear & Adaptation-Aware
 */
export function calculateReadinessV3(
  log: any,
  history: any[] = [],
  adaptation: any = {}
): { score: number; factors: any; cnsFatigue: number } {
  const sensitivity = Math.max(0.2, Math.min(0.8, adaptation.fatigue_sensitivity || 0.5));
  const speed = Math.max(0.2, Math.min(0.8, adaptation.recovery_speed || 0.5));
  
  // 1. Core Z-Score & Baseline Normalization
  const last28 = history.slice(0, 28);
  const avg28 = last28.length > 0 
    ? last28.reduce((acc, l) => acc + (l.readinessScore || 70), 0) / last28.length 
    : 70;
  
  // 2. Multi-Dimensional Component Scoring
  const sleep = mapMetricToScore(log.sleep_quality, 'sleep');
  const energy = mapMetricToScore(log.energy_level, 'energy');
  const soreness = mapMetricToScore(log.muscle_soreness, 'soreness');
  const stress = mapMetricToScore(log.stress_level, 'stress');
  const pain = (log.current_pain_level || 0);

  // Non-linear penalties (Exponential but capped)
  const sorenessPenalty = soreness < 40 ? Math.pow((40 - soreness) / 10, 1.5) * 5 : 0;
  const sleepPenalty = sleep < 40 ? Math.pow((40 - sleep) / 10, 1.3) * 4 : 0;
  
  // 3. CNS Fatigue Component (Conservative weight 0.15)
  const cnsFatigue = calculateCNSFatigue(log, history);
  const cnsImpact = cnsFatigue * 0.15;

  // 4. Adaptation Adjustments
  let baseScore = (sleep * 0.25 + energy * 0.25 + soreness * 0.25 + (100 - stress) * 0.25);
  baseScore -= (sorenessPenalty * sensitivity);
  baseScore -= (sleepPenalty * (1 - speed));
  baseScore -= (pain * 8); // Hard linear pain deduction
  baseScore -= cnsImpact;

  // 5. Outcome Clamping [20, 100]
  const finalScore = Math.max(20, Math.min(100, Math.round(baseScore)));

  return {
    score: finalScore,
    factors: { sleep, energy, soreness, stress, pain, sorenessPenalty, sleepPenalty },
    cnsFatigue
  };
}

/**
 * CNS Fatigue Tracking: Conservative & Multi-factor
 */
export function calculateCNSFatigue(log: any, history: any[] = []): number {
  const rtCurrent = log.reaction_time_ms;
  const rtHistory = history.map(h => h.reaction_time_ms).filter(Boolean);
  
  let rtSignal = 0;
  if (rtCurrent && rtHistory.length > 0) {
    const avgRT = rtHistory.reduce((a, b) => a + b, 0) / rtHistory.length;
    rtSignal = Math.max(0, (rtCurrent - avgRT) / 10); // 1 point per 10ms lag
  }

  // Volatility Signal
  const last7Readiness = history.slice(0, 7).map(h => h.readinessScore || 70);
  const volatility = last7Readiness.length > 1
    ? Math.sqrt(last7Readiness.map(x => Math.pow(x - (last7Readiness.reduce((a,b)=>a+b)/last7Readiness.length), 2)).reduce((a,b)=>a+b) / last7Readiness.length)
    : 0;

  const vSignal = Math.max(0, (volatility - 15) * 2);

  // CNS Score (0-100) - Conservative aggregation
  const score = (rtSignal * 4 + vSignal * 6);
  return Math.min(100, Math.round(score));
}
/**
 * V3.1.1 Readiness Engine: Domain-Based & Standardized
 */
export function calculateReadinessV31(
  log: any,
  history: any[] = [],
  adaptation: any = {},
  sport: string = 'General'
): { score: number; domains: any; factors: any; cnsFatigue: number; confidence: number } {
  // 0. Fallback Logic: Missing Data (Fix 4)
  const lastLogs = history.filter(h => h.log_date).slice(0, 3);
  let confidence = 1.0;
  
  if (Object.keys(log).length === 0 || !log.sleep_quality) {
    if (lastLogs.length > 0) {
      const avgScore = lastLogs.reduce((acc, l) => acc + (l.readinessScore || 70), 0) / lastLogs.length;
      return {
        score: Math.round(avgScore),
        domains: { neuromuscular: avgScore, metabolic: avgScore, mental: avgScore },
        factors: {},
        cnsFatigue: 0,
        confidence: 0.75 // 25% penalty for missing data
      };
    }
  }

  const sensitivity = Math.max(0.2, Math.min(0.8, adaptation.fatigue_sensitivity || 0.5));
  const speed = Math.max(0.2, Math.min(0.8, adaptation.recovery_speed || 0.5));
  
  // 1. Standardized Domain Scoring (Fix 1)
  const sleep = mapMetricToScore(log.sleep_quality, 'sleep');
  const energy = mapMetricToScore(log.energy_level, 'energy');
  const soreness = mapMetricToScore(log.muscle_soreness, 'soreness');
  const stress = mapMetricToScore(log.stress_level, 'stress');
  const motivation = mapMetricToScore(log.motivation, 'energy'); // Proxy for motivation
  const nmLoad = (log.neuromuscular_load || 0); // Normalized 0-10
  const metLoad = (log.metabolic_load || 0); 

  // Domain A: Neuromuscular Readiness (0-100)
  const cnsFatigue = calculateCNSFatigue(log, history);
  const nmRaw = (soreness * 0.5 + (100 - (nmLoad * 10)) * 0.3 + (100 - cnsFatigue) * 0.2);
  const nmReadiness = Math.max(0, Math.min(100, nmRaw));

  // Domain B: Metabolic Readiness (0-100)
  const metRaw = (sleep * 0.4 + energy * 0.4 + (100 - (metLoad * 10)) * 0.2);
  const metabolicReadiness = Math.max(0, Math.min(100, metRaw));

  // Domain C: Mental Readiness (0-100)
  const mentalRaw = (motivation * 0.6 + (100 - stress) * 0.4);
  const mentalReadiness = Math.max(0, Math.min(100, mentalRaw));

  // 2. Final Readiness: Sport-Weighted Aggregation
  let wNM = 0.33, wMet = 0.33, wMen = 0.34;
  const sportLow = sport.toLowerCase();
  if (sportLow.includes('football') || sportLow.includes('rugby')) {
    wNM = 0.45; wMet = 0.35; wMen = 0.20;
  } else if (sportLow.includes('cycling') || sportLow.includes('swimming')) {
    wMet = 0.50; wNM = 0.20; wMen = 0.30;
  }

  const baseScore = (nmReadiness * wNM + metabolicReadiness * wMet + mentalReadiness * wMen);
  
  // Non-linear penalties (Capped to prevent zeroing)
  const sorenessPenalty = soreness < 40 ? Math.pow((40 - soreness) / 10, 1.5) * 5 : 0;
  const finalScore = Math.max(20, Math.min(100, Math.round(baseScore - sorenessPenalty)));

  return {
    score: finalScore,
    domains: { 
      neuromuscular: Math.round(nmReadiness), 
      metabolic: Math.round(metabolicReadiness), 
      mental: Math.round(mentalReadiness) 
    },
    factors: { sleep, energy, soreness, stress, pain: log.current_pain_level || 0 },
    cnsFatigue,
    confidence
  };
}

/**
 * V3.1.1 Risk Engine: Interaction-Driven & Bounded
 */
export function calculateRiskV31(
  log: any,
  loadMetrics: LoadMetricsV3,
  readinessV31: any,
  history: any[] = [],
  adaptation: any = {}
): { score: number; label: string; priority: 'low' | 'moderate' | 'high'; multiplier: number } {
  const sensitivity = adaptation.fatigue_sensitivity || 0.5;
  const pain = log.current_pain_level || 0;
  
  // 1. Base Risk Calculation
  let riskBase = 0;
  if (loadMetrics.monotony > 1.5) riskBase += 40;
  if (pain >= 4) riskBase += 50;

  // 2. Interaction Multipliers (Fix 2)
  let multiplier = 1.0;
  
  // Rule A: NM Load x Soreness interaction
  if (loadMetrics.neuromuscular > 5 && readinessV31.domains.neuromuscular < 50) {
    multiplier += 0.3;
  }

  // Rule B: Monotony x Strain interaction
  if (loadMetrics.monotony > 2.0 && loadMetrics.strain > 2000) {
    multiplier += 0.4;
  }

  // Cap total multiplier (Max 1.5x)
  multiplier = Math.min(1.5, multiplier);

  // 3. Trajectory Trigger
  if (history.length >= 2) {
    const rCurrent = readinessV31.score;
    const rYesterday = history[0].readinessScore || 70;
    const lCurrent = loadMetrics.total;
    const lYesterday = history[0].load_score || 300;
    if (rCurrent < rYesterday && lCurrent > lYesterday) {
      riskBase += 20; // Trajectory warning
    }
  }

  // 4. Final Risk Calculation & Bounding
  const finalScore = Math.max(0, Math.min(100, Math.round(riskBase * multiplier * (1 + (sensitivity - 0.5)))));

  let label = 'Stable';
  let priority: 'low' | 'moderate' | 'high' = 'low';

  if (finalScore >= 75 || pain >= 7) {
    label = 'Critical Risk';
    priority = 'high';
  } else if (finalScore >= 40 || pain >= 4) {
    label = 'High Caution';
    priority = 'moderate';
  }

  return { score: finalScore, label, priority, multiplier };
}

export interface DailyDirectiveV3 {
  intensity: 'Low' | 'Moderate' | 'High' | 'Maximal' | 'Rest';
  volumeCap: string; // e.g. "60%", "100%"
  focusArea: string; // e.g. "Technical", "Explosive", "Recovery"
  riskFlag: boolean;
  message: string;
}

/**
 * V3.1.1 Decision Engine: Gap-Enforced & Safety Capped
 */
export function getDailyDirectiveV31(
  readinessV31: any,
  riskV31: any,
  sport: string = 'General',
  adaptation: any = {}
): DailyDirectiveV3 {
  const gap_threshold = 1.0; // Fix 3
  const nmGap = (adaptation.neuromuscular_bias || 0.5) * 10 - (readinessV31.domains.neuromuscular / 10);
  
  let intensity: DailyDirectiveV3['intensity'] = 'Moderate';
  let volumeCap = '100%';
  let focusArea = 'General Practice';
  let message = "System stable. Maintain standard training block.";

  // 1. Gap Enforcement (Fix 3)
  if (nmGap > gap_threshold) {
    focusArea = 'Technical / Low Impact';
    message = "High neuromuscular gap detected. Block all sprint/jump drills.";
  }

  // 2. Performance Mapping
  if (readinessV31.score > 90 && riskV31.priority === 'low') {
    intensity = 'Maximal';
    message = "Peak physiological synchronization. Optimized for maximal adaptive stimulus.";
  } else if (readinessV31.score > 75 && riskV31.priority === 'low') {
    intensity = 'High';
    message = "Optimal physiological alignment. Cleared for high-velocity effort.";
  } else if (readinessV31.score < 50) {
    intensity = 'Low';
    volumeCap = '60%';
    message = "Low readiness state. Focus on movement quality over intensity.";
  }

  // 3. CNS Mapping (Fix 4)
  if (readinessV31.cnsFatigue > 50) {
    focusArea = 'Recovery / Neuro-Rest';
    intensity = 'Rest';
    message = "Significant CNS fatigue detected. Reduce reaction-based drills.";
  }

  // 4. FINAL SAFETY OVERRIDE (Fix 5)
  if (riskV31.priority === 'high') {
    intensity = 'Rest';
    volumeCap = '20%';
    message = "CRITICAL RISK OVERRIDE: Strict recovery required.";
  } else if (riskV31.priority === 'moderate') {
    // Intensity cap at 60 (Moderate/Low)
    intensity = (intensity === 'High' || intensity === 'Maximal') ? 'Moderate' : intensity;
    volumeCap = '60%';
  }

  return { intensity, volumeCap, focusArea, riskFlag: riskV31.priority !== 'low', message };
}

/**
 * V4/V31 Wrapper: Performance Intelligence Intelligence
 */
export function calculatePerformanceIntelligence(
  log: any, 
  diagnostic: any, 
  history: any[] = [],
  version: EngineVersion = "v4",
  healthMetrics: any = null
): PerformanceIntelligence {
  const sport = diagnostic?.sport_context?.primarySport || 'General';
  const adaptation = diagnostic?.adaptation_profile || {};
  const cnsBaseline = diagnostic?.cns_baseline || { mean: 250, std_dev: 20, rolling_window: [] };

  // --- V4 ENGINE BRANCH ---
  if (version === "v4") {
    // Standardize wellness input with fallbacks for baseline/null state
    const wellnessBase = diagnostic?.performance_baseline || diagnostic?.physiology_profile || {};
    
    const athleteInput: AthleteInput = {
      wellness: {
        sleep_quality: log?.sleep_quality || wellnessBase.sleepQuality || wellnessBase.sleep_quality || 3,
        energy_level: mapMetricToScore(log?.energy_level || wellnessBase.energyLevels || wellnessBase.energy_level || 'Moderate', 'energy') / 20, 
        muscle_soreness: log?.muscle_soreness || wellnessBase.muscleSoreness || wellnessBase.soreness_level || 2,
        stress_level: log?.stress_level || wellnessBase.stressLevels || wellnessBase.stress_level || 2,
        motivation: log?.motivation || wellnessBase.motivation || 3,
        current_pain_level: log?.current_pain_level || wellnessBase.painLevel || 0,
        reaction_time_ms: log?.reaction_time_ms || diagnostic?.reaction_profile?.mean_reaction_time || 250
      },
      session: {
        rpe: log?.session_rpe || 5,
        duration_minutes: log?.duration_minutes || 60,
        type: log?.session_type || 'Training',
        tags: log?.session_tags || []
      },
      health_metrics: healthMetrics ? {
        steps: Number(healthMetrics.steps || 0),
        sleep_hours: Number(healthMetrics.sleep_hours || 0),
        heart_rate_avg: Number(healthMetrics.heart_rate_avg || 0),
        hrv: Number(healthMetrics.hrv || 0)
      } : undefined,
      context: {
        sport,
        position: diagnostic?.sport_context?.position,
        is_match_day: log.is_match_day || false,
        travel_day: log.travel_day || false
      },
      history,
      adaptation_profile: {
        fatigue_sensitivity: adaptation.fatigue_sensitivity || 0.5,
        recovery_speed: adaptation.recovery_speed || 0.5,
        load_tolerance: adaptation.load_tolerance || 0.5,
        neuromuscular_bias: adaptation.neuromuscular_bias || 0.5,
        learning_rate: adaptation.learning_rate || 0.05,
        ewma_readiness_avg: adaptation.ewma_readiness_avg || 70,
        ewma_fatigue_avg: adaptation.ewma_fatigue_avg || 30,
        strength_progression_rate: adaptation.strength_progression_rate || 0,
        last_updated: adaptation.last_updated || new Date().toISOString()
      },
      cns_baseline: cnsBaseline
    };

    const v4Output = orchestratePerformanceEngine(athleteInput);
    const { metrics, decision, logs } = v4Output;

    return {
      recoveryRisk: metrics.risk.score,
      compReadiness: metrics.readiness.score,
      coachReadinessLabel: metrics.readiness.score > 75 ? "Optimal" : (metrics.readiness.score > 50 ? "Stable" : "Caution"),
      coachRiskLabel: metrics.risk.label,
      athleteJudgement: decision.message,
      coachJudgement: `Target: ${decision.intensity}. Volume Cap: ${decision.volume_cap}.`,
      combinedInsight: decision.message,
      statusLabel: metrics.risk.label,
      visualLevel: metrics.risk.priority === 'critical' ? 'critical' : (metrics.risk.priority === 'low' ? 'optimal' : 'warning'),
      alerts: metrics.risk.priority !== 'low' ? [metrics.risk.label] : [],
      reason: [decision.focus_area, ...decision.blocked_movements],
      loadMetrics: metrics.load,
      readinessV3: metrics.readiness,
      riskV3: metrics.risk,
      directiveV3: decision,
      domains: metrics.readiness.domains,
      engine_version: "v4",
      confidence_score: metrics.confidence.total_confidence,
      uncertainty_score: metrics.uncertainty.score,
      stability_waveform: metrics.uncertainty.stability_waveform,
      trend: metrics.trend,
      trend_signal: metrics.trend_signal,
      fatigue_memory: metrics.risk.fatigue_memory,
      priority_score: metrics.priority_score,
      primary_action: decision.primary_action,
      structured_explanation: decision.structured_explanation,
      logs
    };
  }

  // --- V3.1.1 LEGACY FALLBACK ---
  const loadMetrics = calculateLoadMetricsV3(log, history, sport, adaptation);
  const readinessV31 = calculateReadinessV31(log, history, adaptation, sport);
  const riskV31 = calculateRiskV31(log, loadMetrics, readinessV31, history, adaptation);
  const directiveV31 = getDailyDirectiveV31(readinessV31, riskV31, sport, adaptation);

  // --- OUTPUT STABILITY ---
  const lastScore = history[0]?.readinessScore || 70;
  let finalScore = readinessV31.score;
  const delta = finalScore - lastScore;
  if (Math.abs(delta) > 35) {
    finalScore = lastScore + (delta * 0.7);
  }

  let visualLevel: 'optimal' | 'warning' | 'critical' | 'neutral' = 'optimal';
  if (riskV31.priority === 'high') visualLevel = 'critical';
  else if (riskV31.priority === 'moderate' || finalScore < 55) visualLevel = 'warning';

  return {
    recoveryRisk: riskV31.score,
    compReadiness: Math.round(finalScore),
    coachReadinessLabel: finalScore > 75 ? "Optimal" : (finalScore > 50 ? "Stable" : "Caution"),
    coachRiskLabel: riskV31.label,
    athleteJudgement: directiveV31.message,
    coachJudgement: `Target Intensity: ${directiveV31.intensity}. Volume Cap: ${directiveV31.volumeCap}.`,
    combinedInsight: directiveV31.message,
    statusLabel: riskV31.label === 'Critical Risk' ? "Critical" : (finalScore < 50 ? "Recovery" : "Optimal"),
    visualLevel,
    alerts: riskV31.priority !== 'low' ? [riskV31.label] : [],
    reason: [directiveV31.focusArea],
    loadMetrics,
    readinessV3: readinessV31,
    riskV3: riskV31,
    directiveV3: directiveV31,
    domains: readinessV31.domains,
    engine_version: "v3"
  };
}

/**
 * V3.1.1 Adaptation Engine: Longitudinal Learning (Backend Only)
 */
export function updateAdaptationProfileV3(
  currentProfile: any,
  readinessV3: any,
  loadMetrics: any
): any {
  const oldSens = currentProfile.fatigue_sensitivity || 0.5;
  const oldSpeed = currentProfile.recovery_speed || 0.5;
  const oldTol = currentProfile.load_tolerance || 0.5;
  
  const decay = (old: number, signal: number) => {
    const newVal = (old * 0.9) + (signal * 0.1);
    return Math.max(0.2, Math.min(0.8, newVal));
  };

  return {
    ...currentProfile,
    fatigue_sensitivity: Number(decay(oldSens, (readinessV3.score < 50 ? oldSens + 0.05 : oldSens)).toFixed(3)),
    recovery_speed: oldSpeed,
    load_tolerance: oldTol,
    last_updated: new Date().toISOString()
  };
}
