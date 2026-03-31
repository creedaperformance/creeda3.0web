import { getSportData, getPositionData } from './sport_intelligence'
import { calculatePerformanceIntelligence, PredictiveRisk } from './analytics'

export interface AthleteContext {
  fullName: string;
  sport: string;
  position: string;
  goal: 'Performance' | 'Prevention' | 'Recovery';
  trainingPhase?: string;
}

export interface WellnessData {
  sleep: string;
  soreness: string;
  stress: string;
  pain: number;
  energy: string;
}

export interface TrendIndicator {
  metric: string;
  label: string;
  direction: 'up' | 'down' | 'stable';
  period: '7d' | '14d';
  currentValue: number | string;
  trendValue: number; // Percentage change or slope
}

export interface IntelligenceResult {
  readinessScore: number; // Unified performance marker (maps to compReadiness)
  score: number;          // Alias for readinessScore
  status: string;         // Alias for insight
  recoveryRisk: number;   // Physical risk (0-100)
  compReadiness: number;  // Performance potential (0-100)
  insight: string;
  reason: string[];
  action: string;
  focus: string;
  alerts: { type: 'yellow' | 'red'; message: string }[];
  trends: string[]; // Legacy compatibility
  trendIndicators: TrendIndicator[];
  todayStatus: {
    readiness: number;
    limiter: string;
    strength: string;
  };
  combinedInsight: string;
  athleteJudgement: string;
  coachJudgement: string;
  // New Structured Output
  structuredInsight: {
    primary: string;
    why: string;
    trend: string;
    action: string;
    priority: {
      limiter: string;
      strength: string;
      primaryAction: string;
    };
    // Dual Mindset Outputs
    athleteJudgement: string;   // Supportive + Self-focused
    coachJudgement: string;     // Decisive + Management-focused
    athleteConclusion: string;  // Final personal decision
    coachAction: string;        // Urgent intervention action (decisive)
  };
  competitionMode: boolean;
  reasonedRecommendations: { 
    category: string; 
    action: string; 
    reason: string; 
    priority: 'high' | 'medium' | 'low';
  }[];
  graphInterpretations: Record<string, string>;
  // Peak Engine Metrics
  currentPillars: Record<string, number>;
  peakPillars: Record<string, number>;
  targetPeak: string;
  roadmap: string[];
  suggestedData: string[];
  // Coach Specific Personality Labels
  coachReadinessLabel: string; // e.g. "Moderate-high"
  coachRiskLabel: string;      // e.g. "Mild caution"
  predictiveRisk: PredictiveRisk;
  explanation?: {
    rationale: string[];
    primaryFactor: string;
  };
  // UX Refinements (Phase 16)
  athleteWinBy: {
    protect: string;
    push: string;
    watch: string;
  };
  confidenceLevel: 'High confidence' | 'Moderate confidence' | 'Trend confirmation advised';
  feltRealityBridge?: string;
  strongDayIntelligence?: {
    maximize: string;
    adaptation: string;
    monitor: string;
  };
  coachDecision: {
    athleteName: string;
    limiter: string;
    action: string;
    confidence: string;
  };
  // Credibility Intelligence (Phase 17)
  inputCredibility: {
    score: number;
    level: 'High' | 'Moderate' | 'Low';
    flags: string[];
  };
  integrity_layer: {
    trust_score: number; // 0.6, 0.8, 1.0
    repetition_flag: boolean;
    contradiction_flag: boolean;
    objective_alignment: number; // 0-100
  };
  dataReliabilityLabel?: 'Stable' | 'Variable' | 'Low Confidence';
  softPrompt?: string;
  coachCredibilityFlag: boolean;
  coachCredibilityInsight?: string;
  // Internal Detection Flags (Phase 18-20)
  delayedHonestyDetected: boolean;
  strategicReportingDetected: boolean;
  socialBiasDetected: boolean;
  // Physiology Profiling (Phase 21-22)
  physiologySummary?: {
    baselineLabel: string; // Developing, Emerging, Stable, Advanced
    likelyLimiter: string; 
    watchSignal?: string;
    competitiveAdvantage?: string;
    sportReadinessAlignment?: number;
    adaptationTrend?: string;
    reactionTrend?: string;
    currentTrend: string;
    performanceNote: string;
    confidence: 'Low' | 'Moderate' | 'High';
    hasGap: boolean;
    topInsights: string[];
  };
  // Elite V3 Metrics
  loadMetrics?: import('./analytics').LoadMetricsV3;
  readinessV3?: any;
  riskV3?: any;
  directiveV3?: import('./analytics').DailyDirectiveV3;
  // V4.2 Synchronized Experience Fields
  primary_action?: 'Train' | 'Recover' | 'Modify' | 'Rest';
  structured_explanation?: { factor: string; reason: string; priority: number }[];
  trend_signal?: number;
  stability_waveform?: 'stable' | 'slight_waveform' | 'jagged_waveform';
  fatigue_memory?: number;
  priority_score?: number;
  logs?: any;
  felt_reality_gap?: number;
  reality_bridge?: string;
  referral?: {
    type: 'Physio' | 'Nutritionist' | 'Psychologist' | 'Ortho';
    reason: string;
    urgency: 'high' | 'moderate';
  };
}

const SPORT_FAMILIES: Record<string, Record<string, number>> = {
  endurance_dominant: { endurance: 4, strength: 2, power: 2, agility: 2, reaction: 3, recovery: 4, fatigue: 4, load: 4, robustness: 3, coordination: 3 },
  explosive_intermittent: { endurance: 3, strength: 3, power: 4, agility: 4, reaction: 4, recovery: 4, fatigue: 4, load: 4, robustness: 3, coordination: 4 },
  combat_power: { endurance: 4, strength: 4, power: 4, agility: 2, reaction: 3, recovery: 4, fatigue: 4, load: 4, robustness: 4, coordination: 4 },
  skill_speed_precision: { endurance: 2, strength: 2, power: 3, agility: 4, reaction: 4, recovery: 3, fatigue: 3, load: 3, robustness: 3, coordination: 4 },
  strength_dominant: { endurance: 2, strength: 4, power: 4, agility: 2, reaction: 2, recovery: 4, fatigue: 3, load: 4, robustness: 4, coordination: 3 },
  mixed_skill_endurance: { endurance: 3, strength: 3, power: 3, agility: 3, reaction: 3, recovery: 3, fatigue: 3, load: 3, robustness: 3, coordination: 4 }
}

const SPORT_FAMILY_MAP: Record<string, string> = {
  soccer: 'explosive_intermittent', hockey: 'explosive_intermittent', basketball: 'explosive_intermittent', rugby: 'explosive_intermittent',
  swimming: 'endurance_dominant', cycling: 'endurance_dominant', rowing: 'endurance_dominant',
  wrestling: 'combat_power', boxing: 'combat_power', judo: 'combat_power', taekwondo: 'combat_power',
  badminton: 'skill_speed_precision', tennis: 'skill_speed_precision', squash: 'skill_speed_precision', table_tennis: 'skill_speed_precision',
  weightlifting: 'strength_dominant', powerlifting: 'strength_dominant',
  cricket: 'mixed_skill_endurance', volleyball: 'mixed_skill_endurance', baseball: 'mixed_skill_endurance'
}

const SPORT_PHYSIOLOGY_DEMANDS: Record<string, Record<string, number>> = {
  // Base families map to their defaults
  ...SPORT_FAMILIES,
  // Sport-specific overrides if needed
  soccer: { ...SPORT_FAMILIES.explosive_intermittent, endurance: 4 }, // Soccer is 4 in endurance historically in CREEDA
  cricket: { ...SPORT_FAMILIES.mixed_skill_endurance, coordination: 4, reaction: 4 }
}

const DOMAIN_PRIORITY = [
  'recovery_efficiency', 'endurance_capacity', 'movement_robustness',
  'explosive_power', 'fatigue_resistance', 'load_tolerance',
  'agility_control', 'strength_capacity', 'coordination_control', 'reaction_self_perception'
]

const DOMAIN_LABELS: Record<string, string> = {
  recovery_efficiency: 'Recovery Efficiency',
  endurance_capacity: 'Endurance Capacity',
  movement_robustness: 'Movement Robustness',
  explosive_power: 'Explosive Power',
  fatigue_resistance: 'Fatigue Resistance',
  load_tolerance: 'Load Tolerance',
  agility_control: 'Agility',
  strength_capacity: 'Strength Capacity',
  coordination_control: 'Coordination',
  reaction_self_perception: 'Reaction Sharpness'
}

const DOMAIN_DEMAND_MAP: Record<string, string> = {
  recovery_efficiency: 'recovery',
  endurance_capacity: 'endurance',
  movement_robustness: 'robustness',
  explosive_power: 'power',
  fatigue_resistance: 'fatigue',
  load_tolerance: 'load',
  agility_control: 'agility',
  strength_capacity: 'strength',
  coordination_control: 'coordination',
  reaction_self_perception: 'reaction'
}

const INSIGHTS_DB: Record<string, string> = {
  endurance_capacity: "Your stamina might be a bit lower than what your sport needs right now.",
  recovery_efficiency: "Your body is taking longer to recharge after hard sessions.",
  explosive_power: "Your 'burst' power is currently lower than your typical baseline.",
  movement_robustness: "Feeling stiff or tight might make it harder to stay consistent.",
  fatigue_resistance: "You might feel tired towards the end of your training today.",
  load_tolerance: "Your body is still getting used to this much training volume.",
  agility_control: "You might feel slightly less sharp during quick turns today.",
  strength_capacity: "Your overall strength is currently a bit below your target.",
  coordination_control: "Focus on your technique today, especially when you start feeling tired.",
  reaction_self_perception: "Your reactions might feel a split-second slower than usual."
}

function processPhysiologyIntelligence(diagnostic: any, recentLogs: any[], sport: string, _accessTier: string = 'full-access') {
  const profile = diagnostic?.physiology_profile
  if (!profile) return null

  // 1. Calculate Onboarding Baseline (1-4)
  const domains = [
    'endurance_capacity', 'strength_capacity', 'explosive_power', 'agility_control',
    'reaction_self_perception', 'recovery_efficiency', 'fatigue_resistance',
    'load_tolerance', 'movement_robustness', 'coordination_control'
  ]
  const onboardingAvg = domains.reduce((sum, d) => sum + (profile[d] || 2), 0) / 10

  // 2. Trend Signal (Phase 6)
  let trendSignal = onboardingAvg 
  if (recentLogs.length >= 7) {
    const avgReadiness = recentLogs.reduce((sum, l) => sum + getReadinessScoreFromLog(l), 0) / recentLogs.length
    trendSignal = (avgReadiness / 100) * 3 + 1 
  }

  // 3. Final Weighted Score
  const weightTrend = recentLogs.length >= 28 ? 0.65 : (recentLogs.length >= 14 ? 0.45 : 0.15)
  const finalScore = (onboardingAvg * (1 - weightTrend)) + (trendSignal * weightTrend)

  // 4. Gap Engine (Phase 22)
  const sportLow = sport.toLowerCase()
  const familyKey = SPORT_FAMILY_MAP[sportLow] || 'mixed_skill_endurance'
  const sportDemands = SPORT_PHYSIOLOGY_DEMANDS[sportLow] || SPORT_FAMILIES[familyKey]
  
  const gaps = domains.map(d => {
    const demandKey = DOMAIN_DEMAND_MAP[d]
    const demandValue = sportDemands[demandKey] || 3
    const athleteValue = profile[d] || 2
    // Weighted Gap Formula
    const priorityIndex = DOMAIN_PRIORITY.indexOf(d)
    const priorityWeight = 1 + ( (10 - priorityIndex) / 10) // Higher priority domains get higher weight
    const rawGap = demandValue - athleteValue
    return { 
      domain: d, 
      gap: rawGap, 
      weightedGap: rawGap * priorityWeight,
      demand: demandValue, 
      score: athleteValue 
    }
  })

  // Sort by Weighted Gap
  const prioritizedGaps = gaps
    .filter(g => g.gap > 0)
    .sort((a, b) => b.weightedGap - a.weightedGap)

  // Advantage Analysis
  const prioritizedAdvantages = gaps
    .filter(g => g.gap < 0)
    .sort((a, b) => a.gap - b.gap) // Show the biggest advantage

  // 5. Interpretation Bands
  const label = finalScore < 2.3 ? 'Developing' : (finalScore < 3.0 ? 'Emerging' : (finalScore < 3.6 ? 'Stable' : 'Advanced'))
  
  // 6. Output Construction (Tier Gated)
  const confidence: 'Low' | 'Moderate' | 'High' = recentLogs.length >= 21 ? 'High' : (recentLogs.length >= 7 ? 'Moderate' : 'Low')
  const limiter = prioritizedGaps.length > 0 ? DOMAIN_LABELS[prioritizedGaps[0].domain] : 'General Volume'

  // Alignment Percentage
  const totalDemand = domains.reduce((sum, d) => sum + (sportDemands[DOMAIN_DEMAND_MAP[d]] || 3), 0)
  const currentTotal = domains.reduce((sum, d) => sum + (profile[d] || 2), 0)
  const alignment = Math.min(Math.round((currentTotal / totalDemand) * 100), 100)

  const summary: any = {
    baselineLabel: label,
    likelyLimiter: limiter,
    currentTrend: recentLogs.length < 7 ? 'Establishing baseline...' : (finalScore > onboardingAvg ? 'Adapting well under current load' : 'Recovery strain rising before visible performance drop'),
    performanceNote: prioritizedGaps.length > 0 
      ? `Your ${limiter} is a bit lower than your usual level.`
      : 'Everything looks good. Your body is handling the current load well.',
    confidence,
    hasGap: prioritizedGaps.length > 0,
    topInsights: prioritizedGaps.slice(0, 3).map(g => INSIGHTS_DB[g.domain] || `${DOMAIN_LABELS[g.domain]} may limit adaptation under current density.`)
  }

  summary.watchSignal = prioritizedGaps.length > 1 ? `${DOMAIN_LABELS[prioritizedGaps[1].domain]} drifting against demand` : 'Stable baseline metrics'
  summary.competitiveAdvantage = prioritizedAdvantages.length > 0 ? DOMAIN_LABELS[prioritizedAdvantages[0].domain] : 'Consistent Baseline'
  summary.sportReadinessAlignment = alignment
  summary.adaptationTrend = finalScore > onboardingAvg ? 'Improving' : (finalScore < onboardingAvg - 0.2 ? 'Declining' : 'Stable')
  
  // Reaction Trend (Current vs Baseline)
  const reactionProfile = diagnostic?.reaction_profile
  if (reactionProfile?.reaction_time_ms) {
    const baselineRT = reactionProfile.reaction_time_ms
    // Simple heuristic: If wellness is low, reaction is slower
    const wellnessFactor = trendSignal / 4 // 1 to 4
    const currentRT = baselineRT * (1.2 - (wellnessFactor * 0.2)) // 0.8 to 1. 
    summary.reactionTrend = currentRT < baselineRT - 10 ? 'Sharpness rising' : (currentRT > baselineRT + 10 ? 'Response lag detected' : 'Baseline stable')
  }

  return summary
}

/**
 * CORE DATA MODEL TRANSFORMATION
 * Translates raw DB logs and profile context into athletic intelligence.
 */
export function processAthleticIntelligence(
  context: AthleteContext,
  dailyLog: any,
  recentLogs: any[] = [],
  diagnostic: any = {},
  coachContext: { criticalRisks: string[] } = { criticalRisks: [] },
  requesterTier: string = 'full-access'
): IntelligenceResult {
  const sportData = getSportData(context.sport)
  const positionData = getPositionData(context.sport, context.position)

  // -- STEP 0: CANONICALIZATION (Fix Data Key Inconsistency) --
  const normalizedLog = normalizeLogRecord({ ...dailyLog });
  const normalizedRecentLogs = recentLogs.map(normalizeLogRecord)
  if (!normalizedLog.muscle_soreness && normalizedLog.body_feel) normalizedLog.muscle_soreness = normalizedLog.body_feel;
  if (!normalizedLog.energy_level && normalizedLog.fatigue) normalizedLog.energy_level = normalizedLog.fatigue === 'Low' ? 'High' : (normalizedLog.fatigue === 'High' ? 'Low' : 'Moderate');
  if (!normalizedLog.focus_level && normalizedLog.mental_readiness) normalizedLog.focus_level = normalizedLog.mental_readiness;

  // 1. Calculate Performance Intelligence (New Refined Logic)
  const perfIntel = calculatePerformanceIntelligence(normalizedLog, diagnostic, normalizedRecentLogs, "v4");
  
  let baseReadiness = Number.isNaN(perfIntel.compReadiness) ? 50 : perfIntel.compReadiness;
  let recoveryRisk = Number.isNaN(perfIntel.recoveryRisk) ? 0 : perfIntel.recoveryRisk;
  const painLevel = Number(normalizedLog.current_pain_level || 0)

  // Hard physiological guardrail to prevent false-green readiness under acute pain.
  if (painLevel >= 9) {
    baseReadiness = Math.min(baseReadiness, 30)
    recoveryRisk = Math.max(recoveryRisk, 90)
  } else if (painLevel >= 8) {
    baseReadiness = Math.min(baseReadiness, 35)
    recoveryRisk = Math.max(recoveryRisk, 85)
  } else if (painLevel >= 7) {
    baseReadiness = Math.min(baseReadiness, 45)
    recoveryRisk = Math.max(recoveryRisk, 75)
  }

  // 2. Generate Trends
  const trendIndicators = detectTrends(normalizedLog, normalizedRecentLogs)

  // 3. Detect Athlete Patterns (MANDATORY for Identity Memory)
  const patterns = detectAthletePatterns(
    { ...normalizedLog, fullName: context.fullName, readinessScore: baseReadiness },
    normalizedRecentLogs
  );

  // 4. Generate Alerts
  const alerts = generateAlerts(trendIndicators)

  // 5. Rule Engine for Sport Interpretation (Incorporates baseReadiness + patterns)
  const insightData = generateInsight(
    context, 
    normalizedLog, 
    baseReadiness, 
    trendIndicators,
    diagnostic,
    patterns,
    normalizedRecentLogs,
    coachContext
  )

  // 6. Build Peak Roadmap
  const peakIntelligence = generatePeakIntelligence(context, dailyLog, baseReadiness, diagnostic)

  // 7. Generate Graph Interpretations
  const graphInterpretations = generateGraphInterpretations(trendIndicators)

  // 8. Physiology Intelligence (Phase 21-22)
  const physiologySummary = processPhysiologyIntelligence(diagnostic, normalizedRecentLogs, context.sport, requesterTier)

  // 9. Data Integrity Layer (Phase 23)
  const integrity = calculateDataIntegrity(normalizedLog, normalizedRecentLogs, diagnostic, physiologySummary, requesterTier);
  const trustFactor = integrity.trust_score;

  const result: IntelligenceResult = {
    readinessScore: Math.round(baseReadiness * trustFactor) || 50,
    score: Math.round(baseReadiness * trustFactor) || 50,
    status: perfIntel.statusLabel || 'Stability',
    recoveryRisk: Math.round(recoveryRisk),
    compReadiness: Math.round(baseReadiness * trustFactor) || 50,
    physiologySummary: physiologySummary ? {
      ...physiologySummary,
      // Apply trust factor to alignment if present
      sportReadinessAlignment: physiologySummary.sportReadinessAlignment 
        ? Math.round(physiologySummary.sportReadinessAlignment * trustFactor) 
        : undefined
    } : undefined,
    integrity_layer: integrity,
    dataReliabilityLabel: trustFactor === 1.0 ? 'Stable' : (trustFactor === 0.8 ? 'Variable' : 'Low Confidence'),
    ...insightData,
    competitionMode: insightData.competitionMode,
    reasonedRecommendations: insightData.reasonedRecommendations,
    focus: sportData?.dashboardFocus || 'general recovery',
    alerts,
    trends: trendIndicators.map(t => `${t.label} is trending ${t.direction}`),
    trendIndicators,
    graphInterpretations,
    coachReadinessLabel: perfIntel.coachReadinessLabel,
    coachRiskLabel: perfIntel.coachRiskLabel,
    predictiveRisk: perfIntel.predictiveRisk,
    ...peakIntelligence,
    // V3 Pass-through
    loadMetrics: perfIntel.loadMetrics,
    readinessV3: perfIntel.readinessV3,
    riskV3: perfIntel.riskV3,
    directiveV3: perfIntel.directiveV3,
    felt_reality_gap: perfIntel.readinessV3?.felt_reality_gap,
    reality_bridge: perfIntel.readinessV3?.reality_bridge,
    // 8. Connective Intelligence: Specialist Referrals
    referral: (recoveryRisk > 75 || diagnostic?.physiology_profile?.movement_robustness < 30) ? {
      type: 'Physio',
      reason: 'Elevated recovery risk or movement robustness gaps detected.',
      urgency: recoveryRisk > 85 ? 'high' : 'moderate'
    } : (normalizedLog.energy_level === 'Low' || normalizedLog.energy_level === 'Very Low') ? {
      type: 'Nutritionist',
      reason: 'Persistent low energy levels may indicate nutritional gaps.',
      urgency: 'moderate'
    } : undefined
  }

  return sanitizeIntelligenceResult(result, requesterTier)
}

/**
 * Directive 10: Preserve a single full-access response shape.
 */
function sanitizeIntelligenceResult(result: IntelligenceResult, _accessTier: string): IntelligenceResult {
  // Access gating has been removed.
  return result;
}

/**
 * Directive: Data Integrity Layer (Phase 23)
 * Silently detects unreliable patterns and reduces signal influence.
 */
function calculateDataIntegrity(log: any, recentLogs: any[], diagnostic: any, physiology: any, _accessTier: string) {
  let trustScore = 1.0;
  const repetitionFlag = false;
  const contradictionFlag = false;
  let objectiveAlignment = 100;

  // 1. Repetition Detection (5+ consecutive)
  const wellnessKeys = ['sleep_quality', 'energy_level', 'muscle_soreness', 'stress_level'];
  let consecutiveIdentical = 0;
  for (const prev of recentLogs) {
    const isIdentical = wellnessKeys.every(k => log[k] === prev[k]);
    if (isIdentical) consecutiveIdentical++;
    else break;
  }
  
  const isPatternRepeated = consecutiveIdentical >= 4; // Today + 4 prev = 5
  if (isPatternRepeated) trustScore -= 0.2;

  // 2. Contradiction Detection
  const sorenessScore = mapMetricToScore(log.muscle_soreness || log.body_feel, 'soreness');
  const energyScore = mapMetricToScore(log.energy_level, 'energy');
  const sleepScore = mapMetricToScore(log.sleep_quality, 'sleep');
  
  const isSorenessEnergyContradiction = sorenessScore <= 40 && energyScore >= 80;
  const isSleepRecoveryContradiction = sleepScore <= 20 && physiology?.baselineLabel === 'Advanced';
  
  if (isSorenessEnergyContradiction || isSleepRecoveryContradiction) {
    // Only apply if it persists in recent logs (Rule 2)
    const recentContradictions = recentLogs.slice(0, 3).filter(l => {
      const s = mapMetricToScore(l.muscle_soreness || l.body_feel, 'soreness');
      const e = mapMetricToScore(l.energy_level, 'energy');
      return s <= 40 && e >= 80;
    }).length;
    
    if (recentContradictions >= 2) trustScore -= 0.2;
  }

  // 3. Reaction Alignment (Subjective vs Objective)
  const subjectiveReaction = diagnostic?.physiology_profile?.reaction_self_perception || 2;
  const objectiveRT = diagnostic?.reaction_profile?.reaction_time_ms;
  
  if (objectiveRT) {
    // Map RT to 1-4 scale (approximate)
    // < 250ms = 4, < 350ms = 3, < 450ms = 2, else 1
    const objectiveScaled = objectiveRT < 250 ? 4 : (objectiveRT < 350 ? 3 : (objectiveRT < 450 ? 2 : 1));
    const gap = Math.abs(subjectiveReaction - objectiveScaled);
    objectiveAlignment = Math.max(0, 100 - (gap * 25));
    
    if (gap >= 2) trustScore -= 0.2;
  }

  // 4. Physiological Improbability (Rapid Domain Jumps)
  // Check if current baseline has jumped > 1 level since last diagnostic (simulated here)
  if (recentLogs.length > 0 && physiology?.baselineLabel === 'Advanced') {
    const priorTrend = recentLogs.reduce((sum, l) => sum + getReadinessScoreFromLog(l), 0) / recentLogs.length;
    if (priorTrend < 50) { // Prior trend was poor, current is Advanced = Improbable
      trustScore -= 0.2;
    }
  }

  // Bracket Trust Levels
  const finalTrust = trustScore >= 0.9 ? 1.0 : (trustScore >= 0.7 ? 0.8 : 0.6);

  return {
    trust_score: finalTrust,
    repetition_flag: isPatternRepeated,
    contradiction_flag: isSorenessEnergyContradiction || isSleepRecoveryContradiction,
    objective_alignment: objectiveAlignment
  };
}

/**
 * Formula: Daily insight = wellness + sport demands + position weights + goal + trends
 */
function calculateWeightedReadiness(log: any, weights: Record<string, number>): number {
  const sleepVal = mapMetricToScore(log.sleep_quality, 'sleep')
  const energyVal = mapMetricToScore(log.energy_level, 'energy')
  const sorenessVal = mapMetricToScore(log.muscle_soreness || log.body_feel, 'soreness')
  const stressVal = mapMetricToScore(log.stress_level, 'stress')
  const painVal = (10 - (log.current_pain_level || 0)) * 10

  let score = 0
  
  const weightMap: Record<string, number> = {
    sleep: weights.sleep || 20,
    energy: weights.energy || 20,
    soreness: weights.soreness || 20,
    stress: weights.stress || 20,
    pain: weights.pain || 20
  }

  score += sleepVal * (weightMap.sleep / 100)
  score += energyVal * (weightMap.energy / 100)
  score += sorenessVal * (weightMap.soreness / 100)
  score += stressVal * (weightMap.stress / 100)
  score += painVal * (weightMap.pain / 100)

  return Math.round(score)
}

function mapMetricToScore(val: any, type: string): number {
  const MAP: Record<string, Record<string, number>> = {
    sleep: { 'Excellent': 100, 'Good': 80, 'Okay': 50, 'Poor': 20, '10': 100, '8': 80, '5': 50, '2': 20 },
    energy: { 'Peak': 100, 'High': 80, 'Moderate': 50, 'Low': 30, 'Drained': 10, '10': 100, '8': 80, '5': 50, '3': 30, '1': 10 },
    soreness: { 
      'Light/Fresh': 100, 'Normal': 75, 'Heavy': 40, 'Stiff/Sore': 20,
      'None': 100, 'Low': 80, 'Moderate': 50, 'High': 20,
      '0': 100, '2': 80, '4': 50, '7': 30, '10': 10
    },
    stress: { 'None': 100, 'Low': 80, 'Moderate': 50, 'High': 20, '0': 100, '3': 80, '5': 50, '8': 30, '10': 10 },
    mental: { 'Combat-ready': 100, 'Focused': 75, 'Distracted': 40, 'Not ready': 20, '10': 100, '8': 75, '5': 50, '2': 30, '0': 10 }
  }
  
  // Handle numeric 0-10 scale if passed as number or string
  if (typeof val === 'number' || (!isNaN(Number(val)) && String(val).length <= 2)) {
    const num = Number(val);
    if (num >= 0 && num <= 10) {
      const scaled = MAP[type]?.[String(num)];
      if (scaled !== undefined) return scaled;
      // Fallback linear scaling if not in map
      if (type === 'soreness' || type === 'stress') return 100 - (num * 10);
      return num * 10;
    }
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

/**
 * Rule Engine for Output Statements
 * Formula: Insight = Today + Trend + Sport + Position + Load + Risk
 */
function generateInsight(
  context: AthleteContext, 
  log: any, 
  score: number, 
  trendIndicators: TrendIndicator[],
  diagnostic: any = {},
  patterns: string[] = [],
  recentLogs: any[] = [],
  coachContext: { criticalRisks: string[] } = { criticalRisks: [] }
) {
  const sportId = context.sport?.toLowerCase();
  const sportData = getSportData(sportId);
  const position = context.position?.toLowerCase();
  const positionObj = sportData?.positions.find(p => p.name.toLowerCase() === position);
  const weights = positionObj?.weights || { sleep: 20, stress: 20, soreness: 20, energy: 20, pain: 20 };
  
  // -- MODULE INTEGRATION SIGNALS --
  const menstrualStatus = log.menstrual_status || 'Stable';
  const occupation = diagnostic?.daily_living?.occupation || 'General';
  const lifestyleStress = diagnostic?.daily_living?.mentalStress || 3;
  
  // 1. SIGNAL IDENTIFICATION & DEVIATION RANKING
  const signals = [
    { id: 'pain', label: 'Pain', value: log.current_pain_level || 0, severity: (log.current_pain_level || 0) * 1.5, weight: 30 },
    { id: 'soreness', label: 'Soreness', value: mapMetricToScore(log.muscle_soreness ?? log.soreness, 'soreness'), severity: (100 - mapMetricToScore(log.muscle_soreness ?? log.soreness, 'soreness')) / 10, weight: 20 },
    { id: 'sleep', label: 'Sleep', value: mapMetricToScore(log.sleep_quality ?? log.sleep, 'sleep'), severity: (100 - mapMetricToScore(log.sleep_quality ?? log.sleep, 'sleep')) / 10, weight: 20 },
    { id: 'energy', label: 'Energy', value: mapMetricToScore(log.energy_level ?? log.energy, 'energy'), severity: (100 - mapMetricToScore(log.energy_level ?? log.energy, 'energy')) / 10, weight: 20 },
    { id: 'stress', label: 'Stress', value: mapMetricToScore(log.stress_level ?? log.stress, 'stress'), severity: (100 - mapMetricToScore(log.stress_level ?? log.stress, 'stress')) / 10, weight: 10 },
    { id: 'psychological', label: 'Psychological Load', value: mapMetricToScore(log.mental_readiness || log.focus_level, 'mental'), severity: (100 - mapMetricToScore(log.mental_readiness || log.focus_level, 'mental')) / 10 * 1.2, weight: 10 }
  ];

  // Apply weights from position
  signals.forEach(s => {
    if (s.id === 'pain' && positionObj?.highRiskRegions.some(r => log.pain_location?.includes(r))) s.severity *= 1.5;
    
    // Coach Prioritization Boost (Scientific Data Utility Audit)
    if (coachContext.criticalRisks.some(risk => 
      risk.toLowerCase().includes(s.label.toLowerCase()) || 
      (risk === "Mental Burnout" && s.id === 'psychological') ||
      (risk === "Chronic Overload" && s.id === 'stress')
    )) {
      s.severity *= 1.3;
    }
  });

  // 1b. Goal-Driven Prioritization (Senior Technical Director's "Active Outcome" Layer)
  const goal = context.goal?.toLowerCase() || 'general wellness';
  signals.forEach(s => {
    if (goal.includes('performance')) {
      if (s.id === 'energy' || s.id === 'psychological') s.severity *= 1.25;
    } else if (goal.includes('injury') && goal.includes('prevention')) {
      if (s.id === 'pain' || s.id === 'soreness') s.severity *= 1.3;
    } else if (goal.includes('recovery')) {
      if (s.id === 'sleep' || s.id === 'stress') s.severity *= 1.25;
    } else if (goal.includes('return')) {
      if (s.id === 'pain') s.severity *= 1.5;
      if (s.id === 'soreness') s.severity *= 1.2;
    } else if (goal.includes('competition')) {
      if (s.id === 'energy' || s.id === 'sleep') s.severity *= 1.3;
      if (s.id === 'psychological') s.severity *= 1.2;
    }
  });

  // CNS Influence
  const neuralReadiness = mapMetricToScore(log.focus_level || log.mental_readiness, 'mental');
  
  // MODULE SPECIFIC SIGNALS (Biological Overrides)
  if (menstrualStatus.includes('Luteal')) {
    signals.push({ id: 'menstrual', label: 'Cycle Phase', value: 0, severity: 15, weight: 0 });
  }
  if (log.health_status === 'Marginal' || log.health_status === 'Poor') {
    signals.push({ id: 'health', label: 'Health Status', value: 0, severity: 20, weight: 0 });
  }
  if (occupation.includes('Physical')) {
    signals.push({ id: 'occupation', label: 'Manual Labor', value: 0, severity: 8, weight: 0 });
  }

  // Rank by Severity
  const sortedSignals = [...signals].sort((a, b) => b.severity - a.severity);
  const strongestByValue = [...signals].sort((a, b) => b.value - a.value)[0];
  const allSignalsOptimal = signals.every(s => s.severity <= 0.5);
  const dominant = allSignalsOptimal
    ? { id: 'optimal', label: 'System Balance', value: 100, severity: 0, weight: 0 }
    : sortedSignals[0];
  const secondary = allSignalsOptimal
    ? { id: 'optimal', label: 'System Balance', value: 100, severity: 0, weight: 0 }
    : (sortedSignals[1] || strongestByValue);

  // 1.5 Mixed-Signal Detection
  // True if multiple signals are in 'Moderate' range (4-8 severity) and top signal is not 'Critical' (>10).
  const moderateSignals = signals.filter(s => s.severity >= 4 && s.severity <= 9);
  const isMixedSignal = moderateSignals.length >= 2 && dominant.severity <= 10;

  // 2. EXPLANATION LAYER (Rationale)
  const rationale: string[] = [];
  if (log.current_pain_level > 0) rationale.push(`-${log.current_pain_level * 5}pts: Pain in ${log.pain_location?.join(', ')}`);
  if (mapMetricToScore(log.sleep_quality, 'sleep') < 75) rationale.push(`-15pts: Suboptimal sleep quality`);
  if (mapMetricToScore(log.energy_level, 'energy') < 50) rationale.push(`-20pts: Critical energy depletion`);
  if (menstrualStatus === 'Luteal') rationale.push(`-5pts: Hormonal recovery demand (Luteal)`);
  if (occupation.includes('Physical')) rationale.push(`-10pts: Baseline load from physical occupation`);
  
  // Goal-Specific Strategic Note
  if (goal.includes('performance') && score > 80) rationale.push("Goal Alignment: Optimal window for performance load");
  if (goal.includes('performance') && score <= 80) rationale.push("Goal Note: Readiness below peak threshold. Protect tomorrow's performance window.");
  if (goal.includes('injury') && goal.includes('prevention') && log.current_pain_level > 2) rationale.push("Goal Alert: Pain exceeding injury prevention threshold");
  if (goal.includes('recovery') && score < 70) rationale.push("Goal Focus: Recovery markers suggest extended rest will accelerate your recharge");
  if (goal.includes('return') && log.current_pain_level > 0) rationale.push("Goal Caution: Any pain during return-to-play requires immediate load reduction");
  if (goal.includes('competition') && score > 80) rationale.push("Goal Alignment: You're on track to peak for competition day");
  if (goal.includes('competition') && score <= 80) rationale.push("Goal Warning: Sub-optimal readiness. Adjust taper strategy to protect competition day.");

  if (rationale.length === 0) rationale.push("+10pts: Optimal recovery baseline");

  // 3. REASONING BUILDER (Dynamic judgements)
  const isCompToday = log.competition_today === true || log.day_type?.includes('COMPETITION');
  
  // supportive vs decisive fragments with higher entropy
  const openers = {
    optimal: [
      "You're in peak shape.", "All systems go.", "Ready for anything.", "Feeling 100%.", 
      "Your body is recovered and ready.", "Perfect time to push hard.", "You're primed for a great session.",
      "energy is high and indicators are positive.", "Ready for max effort.", "Recovery is spot on.",
      "Everything is clicking today.", "You're in the zone.", "Foundation is solid for today."
    ],
    warning: [
      "Listen to your body today.", "Take it steady.", "Stay focused and cautious.", "Check your rhythm.", 
      "You're near your limit for today.", "Don't overdo it.", "Focus on smooth movements.",
      "Scale things back slightly.", "Feeling a bit of friction today.", "Keep some energy in the tank.",
      "Reacting a bit slowly today.", "Stick to the basics.", "Cap your intensity for now."
    ],
    critical: [
      "Focus on recovery today.", "Strict rest advised.", "Your body needs a break.", "Time to recharge.",
      "Caution: Body is over-tired.", "Rest is the top priority now.", "Your energy is very low.",
      "High fatigue detected.", "Big recovery deficit today.", "Keep training extremely light.",
      "Body is asking for rest.", "Full rest is the best move.", "Recovery is the only goal."
    ],
    mixed: [
      "Your body is sending mixed signals.", "General tiredness detected across different markers.", 
      "You're feeling tired in a few different ways.", "Recovery is taking a bit longer today.",
      "Lots of little stressors adding up.", "Recovery isn't quite matching your load."
    ]
  };
  
  const salt = context.fullName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const bracket: 'optimal' | 'warning' | 'critical' | 'mixed' = isMixedSignal ? 'mixed' : (score > 85 ? 'optimal' : (score > 65 ? 'warning' : 'critical'));
  const opener = openers[bracket][(score + salt) % openers[bracket].length];

  const obsFragments: Record<string, string[]> = {
    optimal: [
      "all your key recovery markers are synchronized.",
      "your system is balanced and responding well to load.",
      "you are physically and mentally aligned for quality work."
    ],
    pain: ["those aches and pains are holding you back today.", "your body is protecting itself from the discomfort.", "those sore spots need some extra care."],
    soreness: ["your muscles are feeling heavy and tight.", "you've worked hard recently; your body needs light movement now.", "muscle stiffness will slow down your speed today."],
    sleep: ["your energy is down because you didn't get enough sleep.", "your body hasn't fully recharged yet; be careful today.", "you might feel a bit sluggish because of poor sleep."],
    energy: ["your battery is low; save your energy for what matters.", "you're not as fresh as usual for high-intensity work.", "you might find it hard to push into high gear today."],
    stress: ["overall stress is taking a toll on your recovery.", "too much on your mind is making your body feel tired.", "high pressure is making it harder to recover."],
    psychological: ["mental fatigue is affecting your focus and reactions.", "you're not quite 'mentally there' for complex drills.", "your mind feels a bit tired today; keep things simple."],
    menstrual: ["changes in your cycle are making things feel harder today.", "your body is working extra hard to keep things balanced right now.", "cycle-related tiredness is your main limiter today."],
    health: ["your immune system is busy fighting off something.", "you're feeling run down; keep things very light.", "your body is focused on staying healthy, not performing."],
    occupation: ["your work outside of sport has you feeling tired.", "physical work is eating into your recovery time.", "your job is taking some of the energy you need for training."],
    mixed: ["a few different things are adding up to make you feel tired.", "no single issue, but you're just generally a bit 'off' today.", "poor sleep and muscle soreness are combining to slow you down."]
  };

  const obsList = isMixedSignal ? obsFragments.mixed : (obsFragments[dominant.id] || [`Your ${dominant.label.toLowerCase()} is the primary performance limiter today.`]);
  const obsFragment = obsList[(score + salt) % obsList.length];

  const contextFragment = (menstrualStatus.includes('Luteal') || occupation.includes('Physical')) 
    ? ` Combined with your ${menstrualStatus.includes('Luteal') ? 'cycle phase' : 'physical markers'},` 
    : "";
  
  const recFragment = score > 80 
    ? ` you are cleared for high-intensity ${context.sport} drills.` 
    : (score < 40 ? ` prioritize systemic restoration over ${context.sport} volume.` : (isMixedSignal ? ` recommend an aggregate volume reduction for ${context.sport}.` : ` recommend scaling back ${context.sport} specific volume.`));

  const eliteRationale = {
    optimal: [
      "Physiological systems are synchronized; adaptation window is open.",
      "Recovery capacity and neural output are aligned for progressive loading.",
      "No primary limiter detected; maintain high-quality execution."
    ],
    pain: [
      "Neural inhibition from pain signals detected. Load must be localized and controlled.",
      "Protective motor patterns are active due to pain; avoid maximal loading.",
      "Pain feedback loops are competing with technical form; prioritize stability.",
      "Localized inflammation markers suggest a protective physical ceiling."
    ],
    soreness: [
      "Mechanical tension accumulation. Focus on blood flow and non-impact mobility.",
      "Muscle fiber damage requires active recovery to clear metabolic waste.",
      "Tissue stiffness is limiting transverse mobility; focus on range of motion.",
      "Eccentrically-induced microtrauma requires a concentric-only focus."
    ],
    sleep: [
      "Cognitive and hormonal recovery deficit. High-intensity CNS load is contraindicated.",
      "Sleep-related growth hormone suppression is limiting tissue repair speed.",
      "Neural pruning and cognitive consolidation deficit; technical learning will lag.",
      "Autonomic nervous system is showing a lack of parasympathetic depth."
    ],
    energy: [
      "Metabolic depletion. Protect glycogen stores with low-arousal technical work.",
      "Systemic ATP availability is low; avoid explosive or glycolytic intervals.",
      "Substrate availability is the primary bottleneck for today's desired output.",
      "Cellular energy markers suggest a need for high-density nutritional support."
    ],
    stress: [
      "Allostatic load threshold reached. Stress-recovery balance is non-negotiable.",
      "Cortisol-to-testosterone ratio likely skewed toward catabolic state.",
      "External environmental stress is siphoning resources from athletic adaptation.",
      "Psychosocial stressors are creating systemic friction against training load."
    ],
    psychological: [
      "Neural/Cognitive fatigue is outpacing physical recovery. High-arousal technical focus is compromised.",
      "Mental bandwidth is exhausted; reactive drills will have high error rates.",
      "Neurotransmitter depletion likely; focus on high-automation, low-intensity tasks.",
      "Psychological flat-lining observed; systemic arousal cannot meet performance demand."
    ],
    menstrual: [
      "Progesterone elevation in Luteal phase increases core temperature and CNS fatigue.",
      "Joint laxity and altered fuel utilization suggest a reduced high-intensity ceiling.",
      "Metabolic shift toward fat oxidation; high-intensity glycolytic work is harder.",
      "Hormonal climate is prioritizing internal stability over external performance."
    ],
    occupation: [
      "Total physical load surpasses technical capacity. Volume must be capped.",
      "Occupational load has created a systemic recovery debt before training begins.",
      "Physical labor demands have pre-fatigued secondary stabilizer muscle groups.",
      "Professional output is competing with athletic output for same biological budget."
    ],
    health: [
      "Immune markers are prioritizing internal host defense. External physical stress must be minimized.",
      "Systemic energy is being diverted to early-stage immune response patterns.",
      "Health markers indicate a vulnerability state; protect against secondary stressors.",
      "Biological resources are focused on restoration; performance load is high-risk."
    ],
    mixed: [
      "Total tiredness is high. Your body needs rest to clear this fatigue.",
      "Your body is working too hard right now; focus on recovery today.",
      "A few different things are making you feel tired; take it easy.",
      "Energy levels are low across the board, not just in one area."
    ]
  };

  const saltParts = [
    context.fullName,
    log.date || new Date().toISOString().split('T')[0],
    score.toString()
  ];
  const complexSalt = saltParts.join('|').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const selectedEliteRationaleList = isMixedSignal
    ? eliteRationale.mixed
    : (eliteRationale[dominant.id as keyof typeof eliteRationale] || ["Your primary biological limiter is currently the focus of recovery protocols."]);
  let selectedEliteRationale = typeof selectedEliteRationaleList === 'string' ? selectedEliteRationaleList : selectedEliteRationaleList[complexSalt % selectedEliteRationaleList.length];

  // Pattern Memory Injection
  if (patterns.length > 0) {
    const patternText = patterns.join(' ');
    selectedEliteRationale = `${patternText} ${selectedEliteRationale}`;
  }

  const rhythm = complexSalt % 3;
  let athleteJudgement = "";
  if (rhythm === 0) {
    athleteJudgement = `${opener} ${obsFragment}${contextFragment}${recFragment} ${selectedEliteRationale}`;
  } else if (rhythm === 1) {
    athleteJudgement = `${obsFragment} ${selectedEliteRationale} ${opener} Consequently,${recFragment}`;
  } else {
    athleteJudgement = `${opener} Given that ${obsFragment}${contextFragment}${recFragment} Please note: ${selectedEliteRationale}`;
  }
  const coachJudgements = {
    optimal: [
      `${bracket.toUpperCase()}: ${dominant.label} confirmed at peak levels. ${context.position} position is cleared for full stimulus exposure.`,
      `${bracket.toUpperCase()}: Data synchrony observed in ${dominant.label}. Maintain current microcycle progression without adjustment.`,
      `${bracket.toUpperCase()}: Internal load markers for ${dominant.label} suggest high adaptation capacity. Proceed with planned volume.`
    ],
    warning: [
      `${bracket.toUpperCase()}: ${dominant.label} variance detected. ${context.position} position requires 15-20% load reduction to avoid functional overreach.`,
      `${bracket.toUpperCase()}: Sub-optimal ${dominant.label} recovery. Strategic volume capping advised for today's technical block.`,
      `${bracket.toUpperCase()}: ${dominant.label} friction observed. Monitor RPE closely; pull athlete if technical breakdown occurs.`
    ],
    critical: [
      `${bracket.toUpperCase()}: CRITICAL ${dominant.label.toUpperCase()} DEFICIT. Mandatory removal from high-intensity ${context.sport} drills.`,
      `${bracket.toUpperCase()}: SYSTEMIC FAILURE RISK. ${dominant.label} markers necessitate immediate restoration protocol. Non-negotiable load suppression.`,
      `${bracket.toUpperCase()}: CLINICAL CAUTION. ${dominant.label} levels indicate high injury/illness vulnerability. Shift focus to passive recovery only.`
    ],
    mixed: [
      `${bracket.toUpperCase()}: MULTIPLE ISSUES. ${moderateSignals.map(s => s.label).join(', ')} are all a bit off. Cut training by 20%.`,
      `${bracket.toUpperCase()}: GENERAL TIREDNESS. No single cause, but overall pressure is high. Watch for bad form.`,
      `${bracket.toUpperCase()}: SEVERAL FACTORS. A few small things are adding up to a bigger recovery need.`
    ]
  };

  const coachJudgement = coachJudgements[bracket][(score + salt) % coachJudgements[bracket].length];

  const recommendations: any[] = [];
  const yesterdayLoad = log.yesterday_load_demand?.toLowerCase() || 'neutral';
  const urgency = dominant.severity > 15 ? 'high' : (dominant.severity > 8 ? 'medium' : 'low');
  
  // Expert Recommendations based on Dominant Signal
  if (dominant.id === 'pain') {
    recommendations.push({
      category: "Injury Prevention",
      action: `Targeted isometric stabilization for ${log.pain_location?.join(' and ') || 'affected regions'}.`,
      reason: "Isometrics maintain muscle activation while reducing joint shear during pain states.",
      priority: urgency
    });
  }

  if (menstrualStatus.includes('Luteal')) {
    recommendations.push({
      category: "Physiology",
      action: "Avoid maximal eccentric loading; focus on concentric power.",
      reason: "Joint laxity and core temperature are elevated in the Luteal phase; eccentrics increase injury risk.",
      priority: urgency
    });
  }

  if (dominant.id === 'health') {
    recommendations.push({
      category: "Immunology",
      action: "Immediate intensity cap (RPE < 3). Prioritize warm fluids and 9h sleep.",
      reason: "Marginal health markers suggest your system is fighting an early-stage infection.",
      priority: urgency
    });
  }

  if (occupation.includes('Physical')) {
    recommendations.push({
      category: "Recovery",
      action: "Limit technical volume to 60%; prioritize parasympathetic rest.",
      reason: "Your professional physical load competing for the same recovery resources as your training.",
      priority: urgency
    });
  }

  if (dominant.id === 'sleep' && score < 60) {
    recommendations.push({
      category: "CNS Support",
      action: "Limit reactive/velocity-based drills; focus on slow technical precision.",
      reason: "Reaction time and coordination are significantly impaired by sleep debt.",
      priority: urgency
    });
  }

  if (dominant.id === 'psychological') {
    recommendations.push({
      category: "Neuro-Recovery",
      action: "Low-complexity drills only. Prioritize 'Autopilot' technical repetitions.",
      reason: "Mental fatigue narrows focus; high-complexity learning today will lead to frustration and technical breakdown.",
      priority: urgency
    });
  }

  // Fallback Hydration (more specific)
  if (recommendations.length < 2) {
    recommendations.push({
      category: "Hydration",
      action: score < 70 ? "Hyper-hydration: 1L water + specific electrolytes pre-session." : "Maintain baseline hydration protocol.",
      reason: "Counteracting metabolic heat and fluid loss from yesterday's load.",
      priority: urgency
    });
  }

  // Sport Specific
  const sportSpecificAction = isCompToday 
    ? (sportData?.competitionProtocol?.pre[0] || "Execute match-day priming")
    : (score > 80 ? (positionObj?.drills?.primed?.[0] || "Game-speed technical simulation") : (positionObj?.drills?.recovering?.[0] || "Low-impact skill precision"));

  recommendations.push({
    category: "Sport Technical",
    action: sportSpecificAction,
    reason: `As a ${context.sport} ${context.position}, your system requires ${score > 80 ? 'maximal stimulus' : 'technical restoration'} to maintain peak trend.`,
    priority: urgency
  });

  // Menstrual/Lifestyle specific
  if (menstrualStatus === 'Luteal') {
    recommendations.push({
      category: "Physiology",
      action: "Avoid static stretching; prioritize dynamic control.",
      reason: "Joint laxity and core temperature are elevated in the Luteal phase.",
      priority: urgency
    });
  }

  return {
    todayStatus: {
      readiness: score,
      limiter: dominant.label,
      strength: strongestByValue?.label || 'System Balance'
    },
    insight: opener, 
    combinedInsight: athleteJudgement, 
    athleteJudgement,
    coachJudgement,
    reason: rationale,
    action: sportSpecificAction,
    competitionMode: isCompToday,
    reasonedRecommendations: recommendations,
    explanation: {
      rationale,
      primaryFactor: dominant.label
    },
    structuredInsight: {
      primary: opener,
      why: rationale[0] || "Markers are stable.",
      trend: "Recent behavior suggest standard adaptation.",
      action: sportSpecificAction,
      priority: {
        limiter: dominant.label,
        strength: strongestByValue?.label || 'System Balance',
        primaryAction: sportSpecificAction
      },
      athleteJudgement,
      coachJudgement,
      athleteConclusion: score > 80 ? "Go for it." : "Take it easy.",
      coachAction: score > 80 ? "Monitor intensity." : "Enforce recovery."
    },
    // Credibility Intelligence (Refined Phase 21)
    inputCredibility: calculateInputCredibility(log, recentLogs, score),
    softPrompt: generateSoftPrompt(calculateInputCredibility(log, recentLogs, score)),
    coachCredibilityFlag: calculateInputCredibility(log, recentLogs, score).level === 'Low',
    coachCredibilityInsight: generateCoachCredibilityInsight(calculateInputCredibility(log, recentLogs, score)),
    
    delayedHonestyDetected: calculateDelayedHonesty(log, recentLogs).detected,
    strategicReportingDetected: calculateStrategicReporting(log, recentLogs).detected,
    socialBiasDetected: calculateSocialBias(log, recentLogs).detected,

    // UX Refinements (Phase 16)
    athleteWinBy: calculateAthleteWinBy(dominant, secondary, score, isMixedSignal, context.sport),
    confidenceLevel: calculateConfidence(signals, score, isMixedSignal, calculateInputCredibility(log, recentLogs, score), calculateDelayedHonesty(log, recentLogs).detected, calculateStrategicReporting(log, recentLogs).detected, calculateSocialBias(log, recentLogs).detected),
    feltRealityBridge: calculateFeltRealityBridge(log, score),
    strongDayIntelligence: score > 85 ? calculateStrongDayIntel(dominant, context.sport) : undefined,
    coachDecision: {
      athleteName: context.fullName,
      limiter: isMixedSignal ? "Mixed Signals" : dominant.label,
      action: sportSpecificAction,
      confidence: generateCoachCredibilityInsight(calculateInputCredibility(log, recentLogs, score)) || calculateConfidence(signals, score, isMixedSignal, calculateInputCredibility(log, recentLogs, score), calculateDelayedHonesty(log, recentLogs).detected, calculateStrategicReporting(log, recentLogs).detected, calculateSocialBias(log, recentLogs).detected)
    }
  };
}

// -- HELPER LOGIC FOR PHASE 16 --

function calculateAthleteWinBy(dominant: any, secondary: any, score: number, isMixed: boolean, sport: string) {
  if (score > 85) {
    return {
      protect: "Current momentum",
      push: "Maximal technical stimulus",
      watch: "Post-session fatigue lag"
    };
  }
  
  const mapping: Record<string, any> = {
    pain: { protect: "Joint integrity", push: "Low-impact skill", watch: `${dominant.label} response` },
    soreness: { protect: "Tissue elasticity", push: "Concentric power", watch: "Range of motion" },
    sleep: { protect: "CNS bandwidth", push: "Automated drills", watch: "Decision speed" },
    energy: { protect: "Glycogen stores", push: "Technical precision", watch: "Arousal levels" },
    stress: { protect: "Allostatic capacity", push: "Stable routines", watch: "Mental burnout" },
    psychological: { protect: "Cognitive resources", push: "High-automation reps", watch: "Focus narrowing" },
    mixed: { protect: "Systemic baseline", push: "Holistic restoration", watch: "Aggregate fatigue" }
  };

  const base = isMixed ? mapping.mixed : (mapping[dominant.id] || mapping.energy);
  return {
    protect: base.protect,
    push: base.push,
    watch: base.watch
  };
}

function calculateConfidence(signals: any[], score: number, isMixed: boolean, credibility?: any, delayedHonesty?: boolean, strategicReporting?: boolean, socialBias?: boolean): 'High confidence' | 'Moderate confidence' | 'Trend confirmation advised' {
  const sorted = [...signals].sort((a, b) => b.severity - a.severity);
  const dominant = sorted[0];
  const allOptimal = signals.every(s => s.severity < 3);
  
  if (credibility?.level === 'Low' || delayedHonesty || strategicReporting || socialBias) return 'Trend confirmation advised';
  if (dominant.severity > 15) return 'High confidence'; // Critical override
  if (allOptimal || score > 90) return 'High confidence'; // Peak Synchrony
  if (isMixed) return 'Moderate confidence'; // Ambiguous but identified
  if (score > 70 && score <= 90) return 'Moderate confidence';
  return 'Trend confirmation advised';
}

function calculateFeltRealityBridge(log: any, score: number): string | undefined {
  const subjectivePeak = log.energy_level === 'Peak' || log.energy_level === 'High';
  const bioDipping = score < 75;
  if (subjectivePeak && bioDipping) {
    return "You may still feel capable today, but accumulated biological markers suggest reduced repeatability later in the session.";
  }
  return undefined;
}

function calculateStrongDayIntel(dominant: any, sport: string) {
  return {
    maximize: `High-velocity ${sport} technical blocks`,
    adaptation: "Maximal stimulus exposure for CNS power gains",
    monitor: "Post-session autonomic recovery lag"
  };
}

// -- HELPER LOGIC FOR PHASE 17 (Credibility) --

function calculateInputCredibility(log: any, recentLogs: any[], currentScore: number) {
  const flags: string[] = [];
  let credibilityScore = 100;

  // 1. Biological Contradiction (Highest Priority)
  const painLevel = log.current_pain_level || 0;
  const wellnessOnlyScore = (
    mapMetricToScore(log.sleep_quality, 'sleep') +
    mapMetricToScore(log.energy_level, 'energy') +
    mapMetricToScore(log.muscle_soreness || log.body_feel, 'soreness') +
    mapMetricToScore(log.stress_level, 'stress')
  ) / 4;

  if (painLevel >= 7 && (wellnessOnlyScore > 75 || currentScore > 60)) {
    credibilityScore -= 35;
    flags.push("Biological Contradiction");
  }

  // 2. Pattern Repetition / Zero Variance (FIX 4: 5-Day Grace Period)
  const wellnessKeys = ['sleep_quality', 'energy_level', 'muscle_soreness', 'stress_level'];
  const values = wellnessKeys.map(k => log[k]);
  const uniqueValues = new Set(values);
  const isAllExcellent = values.every(v => v === 'Excellent');
  const isZeroVariance = uniqueValues.size === 1 && !isAllExcellent;

  let consecutiveIdentical = 1; // Start with today
  for (const prev of recentLogs) {
    const isIdentical = wellnessKeys.every(k => log[k] === prev[k]);
    if (isIdentical) {
      consecutiveIdentical++;
    } else {
      break;
    }
  }
  const isPatternConfirmed = consecutiveIdentical >= 5;
  
  if (isPatternConfirmed) {
    credibilityScore -= 20;
    flags.push("Repeated same pattern");
  } else if (isZeroVariance && !isAllExcellent) {
    // Zero variance today (all fields same) but not yet a 5-day pattern
    credibilityScore -= 5; // Minimal penalty for low-variance input
  }

  // 3. Submission Speed (Tightened Logic)
  const isFast = log.submission_duration_ms && log.submission_duration_ms < 3000;
  const wasPreviouslyFast = recentLogs.length > 0 && recentLogs[0].submission_duration_ms < 3000;
  if (isFast) {
    if (wasPreviouslyFast || isZeroVariance || (consecutiveIdentical >= 2)) {
      credibilityScore -= 20;
      flags.push("Fast submission");
    } else {
      // Fast alone only reduces score slightly, no flag unless repeated or combined
      credibilityScore -= 5;
    }
  }

  // 4. Delayed Honesty (Neutralized Language)
  if (calculateDelayedHonesty(log, recentLogs).detected) {
    credibilityScore -= 30;
    flags.push("Recent reporting shift");
  }

  // 5. Strategic Reporting (Neutralized Language)
  if (calculateStrategicReporting(log, recentLogs).detected) {
    credibilityScore -= 20;
    flags.push("Session-linked variability");
  }

  // 6. Social Bias (Neutralized Language)
  if (calculateSocialBias(log, recentLogs).detected) {
    credibilityScore -= 15;
    flags.push("Post-intervention pattern change");
  }

  const level = credibilityScore >= 85 ? 'High' : (credibilityScore >= 60 ? 'Moderate' : 'Low');
  
  return {
    score: Math.max(0, credibilityScore),
    level: level as 'High' | 'Moderate' | 'Low',
    flags
  };
}

function generateCoachCredibilityInsight(credibility: any): string | undefined {
  if (credibility.level === 'High' && credibility.flags.length === 0) return undefined;

  // Refinement 4: Priority Hierarchy
  const priorityOrder = [
    "Biological Contradiction",
    "Repeated same pattern",
    "Fast submission",
    "Recent reporting shift",
    "Session-linked variability",
    "Post-intervention pattern change"
  ];

  const activeFlag = priorityOrder.find(f => credibility.flags.includes(f));
  if (!activeFlag) return undefined;

  let message = `Input confidence ${credibility.level.toLowerCase()}: `;

  // Refinement 1, 2, 5: Concise, Neutral, Cautious Language
  switch (activeFlag) {
    case "Biological Contradiction":
      message += "May require interpretation caution due to physiological markers mismatch.";
      break;
    case "Repeated same pattern":
      message += "Pattern suggests reduced reporting variability confidence.";
      break;
    case "Fast submission":
      message += "Repeated similarity and timing patterns observed.";
      break;
    case "Recent reporting shift":
      message += "May require interpretation caution following a recent reporting shift.";
      break;
    case "Session-linked variability":
      message += "Pattern suggests session-linked variability and may require caution.";
      break;
    case "Post-intervention pattern change":
      message += "May require caution following a post-intervention pattern change.";
      break;
  }

  return message;
}

function generateSoftPrompt(credibility: any): string | undefined {
  if (credibility.level === 'Low' || (credibility.level === 'Moderate' && credibility.score < 75)) {
    return "Your responses look unusually similar today — would you like to review before submitting?";
  }
  return undefined;
}

function calculateDelayedHonesty(log: any, recentLogs: any[]) {
  if (recentLogs.length < 3) return { detected: false };

  // 1. Check if the last 3 reports were "Ideal/Stable"
  const priorStability = recentLogs.slice(0, 3).every(prev => {
    const prevWellnessScore = (
      mapMetricToScore(prev.sleep_quality, 'sleep') +
      mapMetricToScore(prev.energy_level, 'energy') +
      mapMetricToScore(prev.muscle_soreness || prev.body_feel, 'soreness') +
      mapMetricToScore(prev.stress_level, 'stress')
    ) / 4;
    const prevPain = prev.current_pain_level || 0;
    return prevWellnessScore > 80 && prevPain < 3;
  });

  if (!priorStability) return { detected: false };

  // 2. Check if today's disclosure is "Severe"
  const currentPain = log.current_pain_level || 0;
  const currentWellnessScore = (
    mapMetricToScore(log.sleep_quality, 'sleep') +
    mapMetricToScore(log.energy_level, 'energy') +
    mapMetricToScore(log.muscle_soreness || log.body_feel, 'soreness') +
    mapMetricToScore(log.stress_level, 'stress')
  ) / 4;

  const isSevereDrop = currentPain >= 7 || currentWellnessScore < 40;

  return { detected: isSevereDrop };
}

function calculateStrategicReporting(log: any, recentLogs: any[]) {
  const combined = [log, ...recentLogs].filter(l => l.planned_load);
  if (combined.length < 4) return { detected: false };

  // Detect: High Load -> Poor/Moderate Wellness, Low Load -> Peak Wellness
  let strategicMatches = 0;
  combined.forEach(l => {
    const isHighLoad = l.planned_load === 'High' || l.planned_load === 'Very High';
    const isLowLoad = l.planned_load === 'Low' || l.planned_load === 'Very Low';
    
    // Check for "Worst" labels on High Load
    const isUnderperforming = 
      l.energy_level === 'Low' || 
      l.energy_level === 'Drained' || 
      l.muscle_soreness === 'Stiff/Sore' || 
      (l.current_pain_level || 0) >= 4;

    // Check for "Ideal" labels on Low Load
    const isIdealPerformance = 
      (l.energy_level === 'Peak' || l.energy_level === 'High') && 
      (l.current_pain_level || 0) < 2;

    if (isHighLoad && isUnderperforming) strategicMatches++;
    if (isLowLoad && isIdealPerformance) strategicMatches++;
  });

  // If 3+ occurrences found in recent history, flag the correlation
  return { 
    detected: strategicMatches >= 3,
    context: strategicMatches >= 3 ? "Reporting variability appears session-linked." : undefined
  };
}

function calculateSocialBias(log: any, recentLogs: any[]) {
  if (recentLogs.length < 1) return { detected: false };

  // 1. Check if recent results (1-3 days) showed a "Restricted" state
  const recentlyRestricted = recentLogs.slice(0, 3).some(prev => {
    const prevWellnessScore = (
      mapMetricToScore(prev.sleep_quality, 'sleep') +
      mapMetricToScore(prev.energy_level, 'energy') +
      mapMetricToScore(prev.muscle_soreness || prev.body_feel, 'soreness') +
      mapMetricToScore(prev.stress_level, 'stress')
    ) / 4;
    const prevPain = prev.current_pain_level || 0;
    return prevWellnessScore < 40 || prevPain >= 7;
  });

  if (!recentlyRestricted) return { detected: false };

  // 2. Check if today's reporting is "Unrealistically Ideal"
  const isIdeal = (log.energy_level === 'Peak' || log.energy_level === 'High') &&
                  (log.current_pain_level || 0) === 0 &&
                  (log.sleep_quality === 'Excellent' || log.sleep_quality === 'Good');

  // 3. Flag if the jump is suspicious (from Restricted to Perfect in < 48h)
  return { 
    detected: isIdeal,
    context: isIdeal ? "Recent reporting shift may reflect intervention response." : undefined
  };
}

/**
 * GENERATE GRAPH INTERPRETATIONS
 * Converts trend data into human-readable sport science context.
 */
function generateGraphInterpretations(trends: TrendIndicator[]): Record<string, string> {
  const interpretations: Record<string, string> = {
    overview: "Your performance profile is currently building as you log more data."
  };

  if (trends.length === 0) {
    return interpretations;
  }

  // Clear overview if we have real data
  delete interpretations.overview;

  trends.forEach(t => {
    let text = "";
    if (t.direction === 'stable') {
      text = `${t.label} has been steady for the last ${t.period === '14d' ? '14' : '7'} days.`;
    } else if (t.direction === 'up') {
      const impact = (t.metric === 'pain' || t.metric === 'soreness') ? 'more strain' : 'better recovery';
      text = `${t.label} is going up, which means ${impact}.`;
    } else if (t.direction === 'down') {
      const impact = (t.metric === 'pain' || t.metric === 'soreness') ? 'recovering' : 'growing fatigue';
      text = `${t.label} is going down, ${impact}.`;
    }
    interpretations[t.metric] = text;
  });

  return interpretations;
}

/**
 * TREND ENGINE (Simplified 7-day / 14-day analysis)
 */
function detectTrends(current: any, history: any[]): TrendIndicator[] {
  const indicators: TrendIndicator[] = [];
  // For new users, we allow 1+ history days to show initial stability/trends
  if (history.length < 1) return [];

  const metrics = [
    { key: 'sleep', db_key: 'sleep_quality', label: 'Sleep Quality' },
    { key: 'soreness', db_key: 'muscle_soreness', label: 'Muscle Soreness' },
    { key: 'energy', db_key: 'energy_level', label: 'Energy Levels' },
    { key: 'pain', db_key: 'current_pain_level', label: 'Pain Intensity' }
  ];

  metrics.forEach(m => {
    const curVal = m.key === 'pain' ? (current[m.db_key] || 0) : mapMetricToScore(current[m.db_key], m.key);
    
    // 7-day average
    const last7 = history.slice(0, 7);
    const avg7 = last7.reduce((acc, log) => {
      const val = m.key === 'pain' ? (log[m.db_key] || 0) : mapMetricToScore(log[m.db_key], m.key);
      return acc + val;
    }, 0) / last7.length;

    let direction: 'up' | 'down' | 'stable' = 'stable';
    const diff = curVal - avg7;
    
    // For Pain and Soreness, "Up" is bad (intensity rising), but for sleep/energy "Up" is good.
    // However, we'll just return direction of the value change.
    if (Math.abs(diff) > 10) direction = diff > 0 ? 'up' : 'down';

    indicators.push({
      metric: m.key,
      label: m.label,
      direction,
      period: history.length >= 14 ? '14d' : '7d',
      currentValue: current[m.db_key] || (m.key === 'pain' ? 0 : 'Moderate'),
      trendValue: Math.round(diff)
    });
  });

  return indicators;
}

/**
 * ALERT ENGINE
 * Generates Yellow/Red flags based on trends.
 */
function generateAlerts(trends: TrendIndicator[]): { type: 'yellow' | 'red'; message: string }[] {
  const alerts: { type: 'yellow' | 'red'; message: string }[] = []

  const sleepTrend = trends.find(t => t.metric === 'sleep')
  if (sleepTrend && sleepTrend.direction === 'down' && sleepTrend.trendValue <= -10) {
    alerts.push({ type: 'yellow', message: "Accumulated sleep debt may affect reaction speed." })
  }

  const painTrend = trends.find(t => t.metric === 'pain')
  if (painTrend && painTrend.direction === 'up' && painTrend.trendValue >= 2) {
    alerts.push({ type: 'red', message: "Pain trend is rising. Coach review is recommended." })
  }

  return alerts
}

/**
 * IDENTITY MEMORY ENGINE
 * Detects long-term behavioral and physiological patterns.
 */
function detectAthletePatterns(current: any, history: any[]): string[] {
  if (history.length < 2) return [];
  const patterns: string[] = [];

  // 1. Underreporter Detection (Sensitive)
  // Consistently reports "Normal" soreness despite declining energy and readiness.
  const historySoreness = history.slice(0, 7).map(h => h.muscle_soreness || h.body_feel || 'Normal');
  const alwaysNormal = historySoreness.every(s => s === 'Normal' || s === 'Light/Fresh') && (current.muscle_soreness === 'Normal' || current.body_feel === 'Normal');
  
  const avgReadinessStart = history.slice(-5).reduce((acc, h) => acc + getReadinessScoreFromLog(h), 0) / 5;
  const avgReadinessEnd = history.slice(0, 5).reduce((acc, h) => acc + getReadinessScoreFromLog(h), 0) / 5;
  
  if (alwaysNormal && avgReadinessEnd < (avgReadinessStart - 10)) {
    patterns.push("Historical data suggests a tendency to underreport physical strain.");
  }

  // 2. Delayed Fatigue (DOMS Pattern - 48h Memory)
  // Soreness spikes 48h after high load (>8).
  const highLoadRecent = history.slice(0, 4).find(h => (h.load >= 8 || h.rpe >= 8 || getReadinessScoreFromLog(h) < 50));
  if (highLoadRecent) {
    const isSoreToday = current.muscle_soreness === 'Stiff/Sore' || current.muscle_soreness === 'Heavy' || current.body_feel === 'Stiff/Sore' || current.body_feel === 'Heavy';
    if (isSoreToday) {
      patterns.push("Confirming your typical 48h delayed-onset fatigue cycle.");
    }
  }

  // 3. Psychological Volatility
  // Mental readiness flips regardless of load.
  const mentalHistory = history.slice(0, 10).map(h => h.mental_readiness || h.focus_level || 'Focused');
  const mentalFlips = mentalHistory.filter((m, i, arr) => i > 0 && m !== arr[i-1]).length;
  if (mentalFlips >= 4) {
    patterns.push("Your mental sharpness is changing a lot lately; try to stick to a stable routine.");
  }

  // 4. Persistence/Resilience (Refined Early Detection)
  // Maintains elite readiness despite chronic high load over 3-4 days.
  const resilienceWindow = history.slice(0, 3); // Last 3 days
  if (resilienceWindow.length >= 2) {
    const highLoad = resilienceWindow.every(h => (h.load >= 7 || h.rpe >= 7)) && (current.load >= 7 || current.rpe >= 7);
    const stableSleep = resilienceWindow.every(h => h.sleep_quality === 'Excellent' || h.sleep_quality === 'Good') && (current.sleep_quality === 'Excellent' || current.sleep_quality === 'Good');
    const stableSoreness = resilienceWindow.every(h => h.muscle_soreness === 'Normal' || h.body_feel === 'Normal' || h.muscle_soreness === 'Light/Fresh' || h.body_feel === 'Light/Fresh') && (current.muscle_soreness === 'Normal' || current.body_feel === 'Normal' || current.muscle_soreness === 'Light/Fresh' || current.body_feel === 'Light/Fresh');
    const stableReadiness = resilienceWindow.every(h => getReadinessScoreFromLog(h) > 80) && getReadinessScoreFromLog(current) > 80;

    if (highLoad && stableSleep && stableSoreness && stableReadiness) {
      patterns.push("You're handling the hard work amazingly well. Your body is really matching the load.");
    }
  }

  return patterns;
}

/**
 * PEAK ROADMAP ENGINE
 * Simulates a path to elite status for the sport/position.
 */
function generatePeakIntelligence(context: AthleteContext, log: any, score: number, diagnostic: any = {}) {
  const roadmap: string[] = []
  const mentalScore = mapMetricToScore(log.mental_readiness, 'mental') 
  
  const sportId = context.sport?.toLowerCase();
  const sportData = getSportData(sportId);
  const focusStr = sportData?.dashboardFocus || 'overall performance';
  const sportName = sportData?.name || context.sport || 'your sport';
  const positionName = context.position ? context.position.toLowerCase() : 'athlete';
  
  const phys = diagnostic?.physiology_profile || {}
  const goal = context.goal?.toLowerCase() || 'performance';
  
  if (score < 60) {
    roadmap.push(`Systemic fatigue detected. As a ${sportName} ${positionName}, prioritize recovery to protect your ${focusStr}.`);
  } else if (score < 80) {
    roadmap.push(`Stable biological foundation. Focus on building consistency in your ${focusStr} without exceeding ${sportName} ${positionName} game-day limits.`);
  } else {
    roadmap.push(`You are operating at peak capacity for ${sportName} ${positionName}. Your ${focusStr} is fully primed.`);
  }

  // Goal-Specific Active Roadmap (Trend-Aware)
  if (goal.includes('performance')) {
    const perfMsg = score > 80 ? 'Optimizing for high-velocity output.' : 'Building metabolic foundation for peak power.';
    roadmap.push(`Strategic Outcome [ACTIVE]: ${perfMsg} Creeda is tailoring your recovery protocols to support this outcome.`);
  } else if (goal.includes('injury')) {
    const injMsg = phys.movement_robustness < 3 ? 'Prioritizing joint stabilizer activation.' : 'Maintaining mechanical durability.';
    roadmap.push(`Strategic Outcome [ACTIVE]: ${injMsg} Creeda is tailoring your recovery protocols to support this outcome.`);
  } else if (goal.includes('recovery')) {
    const recMsg = mentalScore < 60 ? 'Prioritizing CNS down-regulation.' : 'Optimizing metabolic clearance.';
    roadmap.push(`Strategic Outcome [ACTIVE]: ${recMsg} Creeda is tailoring your recovery protocols to support this outcome.`);
  } else if (goal.includes('return')) {
    const retMsg = score < 50 ? 'Focusing on tissue resilience.' : 'Progressing to sports-specific load.';
    roadmap.push(`Strategic Outcome [ACTIVE]: ${retMsg} Creeda is tailoring your recovery protocols to support this outcome.`);
  } else if (goal.includes('prep')) {
    const prepMsg = score > 70 ? 'Peaking for competition intensity.' : 'Tapering for optimal freshness.';
    roadmap.push(`Strategic Outcome [ACTIVE]: ${prepMsg} Creeda is tailoring your recovery protocols to support this outcome.`);
  }

  // Directive: Use verified physiology_profile keys if present, fallback to readiness score
  // Map all 8 PhysiologicalDemand types to 0-100 scores
  // Scale factor for 1-4 baseline to 0-100: (val - 1) / 3 * 60 + 40 (maps 1->40, 2->60, 3->80, 4->100)
  // Scale factor for 1-4 baseline to 0-100: (val - 1) / 3 * 100
  // If val is missing, we return 0 as requested by the user.
  const getBase = (val: number) => (val ? Math.round(((val - 1) / 3) * 100) : 0);
  const readinessMult = score / 100; // Multiplier based on today's overall readiness

  const currentPillars: Record<string, number> = {
    'Explosive Power': Math.round(getBase(phys.explosive_power) * readinessMult),
    'Aerobic Endurance': Math.round(getBase(phys.endurance_capacity) * readinessMult),
    'Anaerobic Capacity': Math.round(getBase((phys.explosive_power + phys.endurance_capacity) / 2 || phys.fatigue_resistance) * readinessMult),
    'Agility': Math.round(getBase(phys.agility_control) * readinessMult),
    'Reaction Time': Math.round(getBase(phys.reaction_self_perception) * readinessMult),
    'Strength': Math.round(getBase(phys.strength_capacity) * readinessMult),
    'Skill Precision': Math.round(getBase(phys.coordination_control) * readinessMult),
    'Mental Focus': Math.round(mentalScore * readinessMult)
  };

  return {
    currentPillars,
    peakPillars: {
      'Explosive Power': 100,
      'Aerobic Endurance': 100,
      'Anaerobic Capacity': 100,
      'Agility': 100,
      'Reaction Time': 100,
      'Strength': 100,
      'Skill Precision': 100,
      'Mental Focus': 100
    },
    targetPeak: `${context.sport} ${context.position || 'Elite'}`,
    roadmap,
    suggestedData: ['HRV', 'Reaction Time', 'Sleep Stages']
  };
}

function getReadinessScoreFromLog(log: any): number {
  const readinessCandidate =
    log?.readinessScore ??
    log?.readiness_score ??
    log?.intelligence_meta?.readinessScore ??
    log?.intelligence_meta?.readiness_score

  const readiness = Number(readinessCandidate)
  return Number.isFinite(readiness) ? readiness : 70
}

function getLoadScoreFromLog(log: any): number {
  const direct = Number(log?.load_score ?? log?.load)
  if (Number.isFinite(direct) && direct > 0) return direct

  const rpe = Number(log?.session_rpe ?? log?.rpe ?? 0)
  const duration = Number(log?.duration_minutes ?? log?.session_duration ?? 0)
  if (Number.isFinite(rpe) && Number.isFinite(duration) && rpe > 0 && duration > 0) {
    return rpe * duration
  }

  return 0
}

function normalizeLogRecord(log: any) {
  const sleep = log?.sleep_quality ?? log?.sleep
  const energy = log?.energy_level ?? log?.energy ?? log?.fatigue
  const soreness = log?.muscle_soreness ?? log?.soreness ?? log?.body_feel
  const stress = log?.stress_level ?? log?.stress
  const readinessScore = getReadinessScoreFromLog(log)
  const loadScore = getLoadScoreFromLog(log)

  return {
    ...log,
    sleep_quality: sleep,
    sleep,
    energy_level: energy,
    energy,
    muscle_soreness: soreness,
    soreness,
    stress_level: stress,
    stress,
    readinessScore,
    readiness_score: Number.isFinite(Number(log?.readiness_score)) ? Number(log.readiness_score) : readinessScore,
    load_score: Number.isFinite(Number(log?.load_score)) ? Number(log.load_score) : loadScore,
    load: Number.isFinite(Number(log?.load)) ? Number(log.load) : loadScore,
    rpe: Number.isFinite(Number(log?.rpe)) ? Number(log.rpe) : Number(log?.session_rpe ?? 0),
    planned_load: log?.planned_load ?? log?.yesterday_load_demand
  }
}
