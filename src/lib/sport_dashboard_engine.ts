/**
 * CREEDA SPORT DASHBOARD ENGINE
 * Powers all sport-specific, position-specific dashboard sections.
 * Includes: Performance Limiter, Adaptation Status, Performance Trajectory engines.
 */

import { SPORTS_DATABASE, SportData, SportPosition, PhysiologicalDemand } from './sport_intelligence';

// ─── Types ────────────────────────────────────────────────────────────────

export type AdaptationState = 'Building' | 'Plateau' | 'Overreaching' | 'Peaking';
export type TrajectoryDirection = 'Improving' | 'Stagnating' | 'Declining';
export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';
export type ReadinessState = 'fatigued' | 'primed' | 'recovering';

export interface HeroInsight {
  readinessScore: number;
  status: 'TRAIN' | 'MODIFY' | 'REST';
  sportInsight: string;
  dailyDecision: string;
}

export interface TodaysPlan {
  title: string;
  type: 'TRAINING' | 'RECOVERY' | 'REHAB' | 'REST';
  intensity: 'LOW' | 'MODERATE' | 'HIGH' | 'MAX';
  what: string;
  how: string;
  why: string;
  drills: string[];
  sportContext: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  isPriority: boolean;
  priorityRank: number; // 1 = highest
  description: string;
}

export interface BenchmarkComparison {
  metric: string;
  comparison: string; // e.g., "above average goalkeepers"
  direction: 'above' | 'below' | 'at';
  percentile: number;
  positionLabel: string;
}

export interface InjuryRisk {
  level: RiskLevel;
  riskScore: number;
  regions: string[];
  insight: string;
  positionContext: string;
}

export interface WorkloadData {
  label: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  sportMetrics: { label: string; value: string }[];
  acwr: number;
  acwrStatus: 'Safe' | 'Caution' | 'Danger';
}

export interface SportInsight {
  title: string;
  message: string;
  type: 'warning' | 'positive' | 'neutral';
  icon: 'brain' | 'target' | 'zap' | 'shield' | 'trending';
}

export interface PerformanceLimiter {
  statement: string;
  contributingFactors: { label: string; severity: 'high' | 'medium' | 'low' }[];
  impactPct: number;
  category: string;
}

export interface AdaptationStatus {
  state: AdaptationState;
  description: string;
  trend: 'improving' | 'declining' | 'stable';
  color: string;
}

export interface PerformanceTrajectory {
  projectedChange: number;
  direction: TrajectoryDirection;
  interpretation: string;
  sparkline: number[];
  timeframe: string;
}

export interface DashboardIntelligence {
  hero: HeroInsight;
  todaysPlan: TodaysPlan;
  performanceProfile: PerformanceMetric[];
  benchmarks: BenchmarkComparison[];
  injuryRisk: InjuryRisk;
  workload: WorkloadData;
  sportIntelligence: SportInsight[];
  limiter: PerformanceLimiter;
  adaptation: AdaptationStatus;
  trajectory: PerformanceTrajectory;
  sportName: string;
  positionName: string;
}

// ─── Context Input ─────────────────────────────────────────────────────────

export interface DashboardContext {
  sport: string;
  position: string;
  readinessScore: number;
  goal: string;
  dailyLog: any;
  diagnostic: any;
  historicalLogs: any[];
}

// ─── Helper: Get Readiness State ────────────────────────────────────────────

function getReadinessState(score: number): ReadinessState {
  if (score < 50) return 'fatigued';
  if (score > 80) return 'primed';
  return 'recovering';
}

// ─── Helper: Map demands to profile categories ─────────────────────────────

const DEMAND_TO_CATEGORY: Record<string, string> = {
  'Explosive Power': 'Power',
  'Aerobic Endurance': 'Endurance',
  'Anaerobic Capacity': 'Endurance',
  'Agility': 'Control',
  'Reaction Time': 'Reaction',
  'Strength': 'Strength',
  'Skill Precision': 'Control',
  'Mental Focus': 'Reaction',
  'Fatigue Resistance': 'Endurance',
};

// ─── MASTER FUNCTION ─────────────────────────────────────────────────────

export function getDashboardIntelligence(ctx: DashboardContext): DashboardIntelligence {
  const sportKey = ctx.sport?.toLowerCase() || 'football';
  const sportData = SPORTS_DATABASE[sportKey] || SPORTS_DATABASE['football'];
  const positionData = sportData.positions.find(
    p => p.name.toLowerCase() === (ctx.position || '').toLowerCase()
  ) || sportData.positions[0];

  const readinessState = getReadinessState(ctx.readinessScore);

  return {
    hero: buildHeroInsight(ctx, sportData, positionData, readinessState),
    todaysPlan: buildTodaysPlan(ctx, sportData, positionData, readinessState),
    performanceProfile: buildPerformanceProfile(ctx, sportData, positionData),
    benchmarks: buildBenchmarks(ctx, sportData, positionData),
    injuryRisk: buildInjuryRisk(ctx, sportData, positionData),
    workload: buildWorkload(ctx, sportData),
    sportIntelligence: buildSportIntelligence(ctx, sportData, positionData, readinessState),
    limiter: getPerformanceLimiter(ctx, sportData, positionData),
    adaptation: getAdaptationStatus(ctx),
    trajectory: getPerformanceTrajectory(ctx),
    sportName: sportData.name,
    positionName: positionData.name,
  };
}

// ─── Section Builders ────────────────────────────────────────────────────

function buildHeroInsight(
  ctx: DashboardContext, sport: SportData, position: SportPosition, state: ReadinessState
): HeroInsight {
  const status = ctx.readinessScore > 80 ? 'TRAIN' : ctx.readinessScore < 50 ? 'REST' : 'MODIFY';

  // Sport-specific readiness sentences
  const insightMap: Record<ReadinessState, Record<string, string>> = {
    primed: {
      football: `High aerobic readiness. Ideal for ${position.name}-specific high work-rate training.`,
      cricket: `Neuromuscular freshness optimal. ${position.name} can operate at full intensity.`,
      'field hockey': `Repeat-sprint capacity peaked. Excellent for ${position.name} match simulation.`,
      badminton: `Reaction speed optimal. ${position.name} can target maximal court coverage.`,
      boxing: `Impact readiness peaked. ${position.name} can execute high-velocity work.`,
      wrestling: `Combat readiness optimal. ${position.name} can target maximal intensity exchanges.`,
      weightlifting: `Structural readiness primed. Safe for ${position.name} heavy loading.`,
      tennis: `Stroke power optimal. ${position.name} can target maximal serve and rally intensity.`,
      volleyball: `Explosive jump readiness peaked. ${position.name} can target max vertical output.`,
      default: `System readiness optimal. ${position.name} cleared for high-intensity training.`,
    },
    fatigued: {
      football: `Aerobic markers low. ${position.name} should limit high-speed running volume.`,
      cricket: `Load fatigue detected. ${position.name} should manage bowling/batting intensity.`,
      'field hockey': `Hamstring stiffness markers elevated. ${position.name} should avoid explosive sprints.`,
      badminton: `Neural fatigue detected. ${position.name} should limit high-speed court drills.`,
      boxing: `Impact fatigue present. ${position.name} should limit heavy bag and sparring work.`,
      wrestling: `Structural fatigue detected. ${position.name} should avoid heavy grappling.`,
      weightlifting: `CNS fatigue markers high. ${position.name} should reduce loading to 70%.`,
      tennis: `Shoulder load markers elevated. ${position.name} should limit serve volume.`,
      volleyball: `Jump-landing fatigue detected. ${position.name} should limit peak vertical drills.`,
      default: `System fatigue detected. ${position.name} should modify training intensity.`,
    },
    recovering: {
      football: `Recovery in progress. ${position.name} can focus on positioning and technical work.`,
      cricket: `Recovery progressing well. ${position.name} should focus on rhythm and technique.`,
      'field hockey': `Structural recovery positive. ${position.name} can do controlled stick-work.`,
      badminton: `Recovery stable. ${position.name} should prioritize stroke precision over speed.`,
      boxing: `Recovery window active. ${position.name} should focus on defensive footwork.`,
      wrestling: `Recovery ongoing. ${position.name} should focus on balance and grip rhythm.`,
      weightlifting: `Recovery positive. ${position.name} can focus on movement quality at 60%.`,
      tennis: `Recovery in progress. ${position.name} should focus on consistency and placement.`,
      volleyball: `Recovery ongoing. ${position.name} should focus on positioning and soft-touch.`,
      default: `Recovery in progress. ${position.name} cleared for moderate technical training.`,
    },
  };

  const sportInsights = insightMap[state];
  const sportInsight = sportInsights[sport.id] || sportInsights['default'];

  const decisionMap: Record<string, string> = {
    TRAIN: 'Full training cleared — push your limits today.',
    MODIFY: 'Modified session — focus on quality over intensity.',
    REST: 'Active recovery — protect your body today.',
  };

  return {
    readinessScore: ctx.readinessScore,
    status,
    sportInsight,
    dailyDecision: decisionMap[status],
  };
}

function buildTodaysPlan(
  ctx: DashboardContext, sport: SportData, position: SportPosition, state: ReadinessState
): TodaysPlan {
  const template = sport.precisionTemplates[state === 'primed' ? 'primed' : state === 'fatigued' ? 'fatigued' : 'recovering'];
  const drills = position.drills?.[state] || [];

  const intensityMap: Record<ReadinessState, TodaysPlan['intensity']> = {
    primed: 'HIGH',
    recovering: 'MODERATE',
    fatigued: 'LOW',
  };

  const typeMap: Record<ReadinessState, TodaysPlan['type']> = {
    primed: 'TRAINING',
    recovering: 'TRAINING',
    fatigued: 'RECOVERY',
  };

  return {
    title: `${position.name} ${state === 'primed' ? 'Peak' : state === 'fatigued' ? 'Recovery' : 'Build'} Session`,
    type: typeMap[state],
    intensity: intensityMap[state],
    what: template.what,
    how: template.how,
    why: template.why,
    drills,
    sportContext: sport.dashboardFocus,
  };
}

function buildPerformanceProfile(
  ctx: DashboardContext, sport: SportData, position: SportPosition
): PerformanceMetric[] {
  const categories = ['Endurance', 'Strength', 'Power', 'Control', 'Reaction'];

  // Determine priority from position-specific demands
  const positionPriorities = position.specificDemands.map(d => DEMAND_TO_CATEGORY[d]).filter(Boolean);
  const sportPriorities = sport.topDemands.map(d => DEMAND_TO_CATEGORY[d]).filter(Boolean);

  // Build combined priority ordering
  const priorityOrder = [...new Set([...positionPriorities, ...sportPriorities])];

  // Extract baseline values from diagnostic if available
  const baseline = ctx.diagnostic?.performance_baseline || {};

  return categories.map(cat => {
    const priorityIndex = priorityOrder.indexOf(cat);
    const isPriority = priorityIndex !== -1;

    // Calculate value from baseline or generate contextual default
    let value = 0;
    const key = cat.toLowerCase();
    if (baseline[key] !== undefined) {
      value = Math.round(Math.max(0, Math.min(100, Number(baseline[key]))));
    } else {
      // Contextual defaults: higher for priority metrics
      value = isPriority ? 65 + Math.round(Math.random() * 20) : 45 + Math.round(Math.random() * 20);
    }

    return {
      name: cat,
      value,
      isPriority,
      priorityRank: isPriority ? priorityIndex + 1 : 99,
      description: getMetricDescription(cat, position.name, isPriority),
    };
  }).sort((a, b) => a.priorityRank - b.priorityRank);
}

function getMetricDescription(metric: string, position: string, isPriority: boolean): string {
  if (!isPriority) return `Standard ${metric.toLowerCase()} tracking for ${position}`;
  const map: Record<string, string> = {
    Endurance: `Critical for ${position} sustained output and late-game performance`,
    Strength: `Key for ${position} physical dominance and structural resilience`,
    Power: `Essential for ${position} explosive actions and peak force output`,
    Control: `Core to ${position} precision, agility and skill execution`,
    Reaction: `Vital for ${position} decision speed and reflexive responses`,
  };
  return map[metric] || `Priority metric for ${position}`;
}

function buildBenchmarks(
  ctx: DashboardContext, sport: SportData, position: SportPosition
): BenchmarkComparison[] {
  const categories = ['Endurance', 'Strength', 'Power', 'Control', 'Reaction'];
  const positionPriorities = position.specificDemands.map(d => DEMAND_TO_CATEGORY[d]).filter(Boolean);
  const baseline = ctx.diagnostic?.performance_baseline || {};
  const posLabel = position.name.toLowerCase();

  return categories
    .filter(cat => positionPriorities.includes(cat) || Math.random() > 0.5)
    .slice(0, 4)
    .map(cat => {
      const key = cat.toLowerCase();
      const value = Number(baseline[key]) || (50 + Math.round(Math.random() * 30));
      const eliteThreshold = 80;
      const avgThreshold = 60;

      let direction: 'above' | 'below' | 'at' = 'at';
      let comparison = '';
      const percentile = Math.round(((value - avgThreshold) / (eliteThreshold - avgThreshold)) * 100);

      if (value >= eliteThreshold) {
        direction = 'above';
        comparison = `above elite ${posLabel}s`;
      } else if (value >= avgThreshold) {
        direction = 'above';
        comparison = `above average ${posLabel}s`;
      } else {
        direction = 'below';
        comparison = `below elite ${posLabel}s`;
      }

      return {
        metric: cat,
        comparison,
        direction,
        percentile: Math.max(0, Math.min(100, percentile)),
        positionLabel: `${sport.name} ${position.name}`,
      };
    });
}

function buildInjuryRisk(
  ctx: DashboardContext, sport: SportData, position: SportPosition
): InjuryRisk {
  const regions = position.highRiskRegions;
  const dailyLog = ctx.dailyLog || {};
  const painLevel = Number(dailyLog.current_pain_level) || 0;
  const soreness = Number(dailyLog.muscle_soreness) || 0;

  let riskScore = 20; // Baseline
  if (painLevel >= 6) riskScore += 40;
  else if (painLevel >= 3) riskScore += 20;
  if (typeof soreness === 'number' && soreness >= 4) riskScore += 20;
  else if (typeof soreness === 'string' && ['High', 'Very High', 'Stiff/Sore'].includes(soreness)) riskScore += 25;

  // Historical load spike
  if (ctx.historicalLogs.length >= 7) {
    const recentLoads = ctx.historicalLogs.slice(0, 7).map(l => Number(l.load_score) || 0);
    const avg = recentLoads.reduce((a, b) => a + b, 0) / recentLoads.length;
    const currentLoad = Number(dailyLog.load_score) || avg;
    if (currentLoad > avg * 1.3) riskScore += 15;
  }

  riskScore = Math.min(100, riskScore);

  let level: RiskLevel = 'Low';
  if (riskScore >= 70) level = 'Critical';
  else if (riskScore >= 50) level = 'High';
  else if (riskScore >= 30) level = 'Moderate';

  // Position-specific insight
  const insightMap: Record<string, Record<string, string>> = {
    football: {
      default: `Sprint load increases hamstring strain risk for ${position.name}s.`,
      Goalkeeper: 'Diving and shot-stopping increases shoulder and groin load.',
      Defender: 'Aerial duels and tackles increase lower back stress.',
    },
    cricket: {
      default: `Bowling workload increases lumbar and shoulder load for ${position.name}s.`,
      Batsman: 'Hamstring strain risk elevated from running between wickets.',
      Wicketkeeper: 'Repeated squatting increases knee and upper back stress.',
    },
    boxing: { default: `Impact forces increase wrist and shoulder load for ${position.name}s.` },
    tennis: { default: `Serve volume increases shoulder and elbow load for ${position.name}s.` },
    volleyball: { default: `Jump-landing cycles increase ankle and knee stress for ${position.name}s.` },
    wrestling: { default: `Grappling intensity increases shoulder and neck load for ${position.name}s.` },
  };

  const sportInsights = insightMap[sport.id] || {};
  const insight = sportInsights[position.name] || sportInsights['default'] || `Monitor ${regions[0]} load for ${position.name}s in ${sport.name}.`;

  return {
    level,
    riskScore,
    regions,
    insight,
    positionContext: `${sport.name} ${position.name}`,
  };
}

function buildWorkload(ctx: DashboardContext, sport: SportData): WorkloadData {
  const dailyLog = ctx.dailyLog || {};
  const currentLoad = Number(dailyLog.load_score) || 0;

  // ACWR calculation
  const loads = ctx.historicalLogs.map(l => Number(l.load_score) || 0);
  const acuteLoads = [currentLoad, ...loads.slice(0, 6)].filter(Number.isFinite);
  const chronicLoads = [currentLoad, ...loads.slice(0, 27)].filter(Number.isFinite);
  const acuteAvg = acuteLoads.length ? acuteLoads.reduce((a, b) => a + b, 0) / acuteLoads.length : 0;
  const chronicAvg = chronicLoads.length ? chronicLoads.reduce((a, b) => a + b, 0) / chronicLoads.length : 1;
  const acwr = chronicAvg > 0 ? Number((acuteAvg / chronicAvg).toFixed(2)) : 1.0;

  let acwrStatus: WorkloadData['acwrStatus'] = 'Safe';
  if (acwr > 1.5) acwrStatus = 'Danger';
  else if (acwr > 1.3) acwrStatus = 'Caution';

  // Trend
  const prev7 = loads.slice(0, 7);
  const prev14 = loads.slice(7, 14);
  const avg7 = prev7.length ? prev7.reduce((a, b) => a + b, 0) / prev7.length : 0;
  const avg14 = prev14.length ? prev14.reduce((a, b) => a + b, 0) / prev14.length : avg7;
  const trend: WorkloadData['trend'] = avg7 > avg14 * 1.1 ? 'up' : avg7 < avg14 * 0.9 ? 'down' : 'stable';

  // Sport-specific metrics
  const sportMetricMap: Record<string, { label: string; value: string }[]> = {
    football: [
      { label: 'High-Speed Running', value: `${Math.round(currentLoad * 0.3)}m` },
      { label: 'Sprint Distance', value: `${Math.round(currentLoad * 0.15)}m` },
      { label: 'Total Distance', value: `${Math.round(currentLoad * 2)}m` },
    ],
    cricket: [
      { label: 'Bowling Overs', value: `${Math.round(currentLoad / 50)}` },
      { label: 'Delivery Intensity', value: `${Math.round(currentLoad * 0.8)}%` },
      { label: 'Recovery Status', value: acwr < 1.2 ? 'Adequate' : 'Insufficient' },
    ],
    weightlifting: [
      { label: 'Total Volume', value: `${Math.round(currentLoad * 10)} kg` },
      { label: 'Intensity', value: `${Math.round(currentLoad * 8)}%` },
      { label: 'Sets Completed', value: `${Math.round(currentLoad / 15)}` },
    ],
  };

  const sportMetrics = sportMetricMap[sport.id] || [
    { label: 'Session Load', value: `${currentLoad} AU` },
    { label: 'Session Intensity', value: `${Math.round(currentLoad * 0.8)}%` },
    { label: 'Volume', value: `${Math.round(currentLoad * 1.5)} units` },
  ];

  // Sport label
  const labelMap: Record<string, string> = {
    football: 'Running Load',
    cricket: 'Bowling Load',
    weightlifting: 'Lifting Volume',
    boxing: 'Impact Load',
    tennis: 'Stroke Volume',
  };

  return {
    label: labelMap[sport.id] || 'Training Load',
    value: currentLoad,
    unit: 'AU',
    trend,
    sportMetrics,
    acwr,
    acwrStatus,
  };
}

function buildSportIntelligence(
  ctx: DashboardContext, sport: SportData, position: SportPosition, state: ReadinessState
): SportInsight[] {
  const insights: SportInsight[] = [];
  const baseline = ctx.diagnostic?.performance_baseline || {};
  const posName = position.name;

  // 1. Performance vs. Position demands
  const primaryDemand = position.specificDemands[0];
  const demandCategory = DEMAND_TO_CATEGORY[primaryDemand] || 'Endurance';
  const demandValue = Number(baseline[demandCategory.toLowerCase()]) || 55;

  if (demandValue < 60) {
    insights.push({
      title: `${demandCategory} Gap`,
      message: `Your ${demandCategory.toLowerCase()} is limiting ${posName}-specific performance. Focus training on this area for measurable game-day improvement.`,
      type: 'warning',
      icon: 'brain',
    });
  } else if (demandValue >= 80) {
    insights.push({
      title: `${demandCategory} Advantage`,
      message: `Your ${demandCategory.toLowerCase()} is a competitive edge for ${posName}s. Maintain current levels while developing complementary attributes.`,
      type: 'positive',
      icon: 'zap',
    });
  }

  // 2. Recovery quality insight
  if (state === 'fatigued') {
    insights.push({
      title: 'Recovery Deficit',
      message: `Recovery between sessions is suboptimal. This will compound fatigue and limit ${posName} performance across multiple sessions.`,
      type: 'warning',
      icon: 'shield',
    });
  } else if (state === 'primed') {
    insights.push({
      title: 'Peak Window',
      message: `You are in an optimal readiness window. This is ideal for high-quality ${sport.name} ${posName} training or competition.`,
      type: 'positive',
      icon: 'target',
    });
  }

  // 3. Sport-specific insight
  const sportInsightMap: Record<string, SportInsight> = {
    football: {
      title: 'Match Readiness',
      message: ctx.readinessScore > 75
        ? `Late-game endurance capacity is strong. ${posName} performance should be sustained through 90 minutes.`
        : `Endurance markers suggest reduced late-game output. ${posName} effectiveness may drop after 60 minutes.`,
      type: ctx.readinessScore > 75 ? 'positive' : 'warning',
      icon: 'trending',
    },
    cricket: {
      title: 'Spell Recovery',
      message: ctx.readinessScore > 70
        ? `Recovery between spells is adequate. ${posName} can maintain intensity across sessions.`
        : `Recovery between spells is suboptimal. ${posName} should extend rest periods between efforts.`,
      type: ctx.readinessScore > 70 ? 'positive' : 'warning',
      icon: 'trending',
    },
    boxing: {
      title: 'Round Endurance',
      message: ctx.readinessScore > 75
        ? `Anaerobic capacity supports sustained output across rounds. ${posName} can push the pace.`
        : `Fatigue markers suggest reduced output in later rounds. ${posName} should conserve early.`,
      type: ctx.readinessScore > 75 ? 'positive' : 'warning',
      icon: 'trending',
    },
  };

  const sportInsight = sportInsightMap[sport.id];
  if (sportInsight) insights.push(sportInsight);

  // Ensure at least 2 insights
  if (insights.length < 2) {
    insights.push({
      title: 'Training Consistency',
      message: `Consistent ${sport.name} training is the foundation of ${posName} development. Maintain current frequency for optimal adaptation.`,
      type: 'neutral',
      icon: 'target',
    });
  }

  return insights.slice(0, 3);
}

// ─── PERFORMANCE LIMITER ENGINE ──────────────────────────────────────────

/**
 * FIXED: Performance Limiter Stability
 * - 40/30/30 Weighting: Daily Log (40%), Last 7 Days (30%), Baseline (30%)
 * - Returns ONE stable limiter based on structural trends.
 */
export function getPerformanceLimiter(
  ctx: DashboardContext, sport?: SportData, position?: SportPosition
): PerformanceLimiter {
  const sportKey = ctx.sport?.toLowerCase() || 'football';
  const sd = sport || SPORTS_DATABASE[sportKey] || SPORTS_DATABASE['football'];
  const pd = position || sd.positions.find(
    p => p.name.toLowerCase() === (ctx.position || '').toLowerCase()
  ) || sd.positions[0];

  const dailyLog = ctx.dailyLog || {};
  const history = ctx.historicalLogs || [];
  const baseline = ctx.diagnostic?.performance_baseline || {};

  // Helper to get historical average for a key
  const getHistAvg = (key: string, defaultValue: number = 3) => {
    if (history.length === 0) return defaultValue;
    const vals = history.slice(0, 7).map(l => Number(l[key]) || defaultValue);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  // Helper to calculate weighted score (High score = bigger limiter)
  const calcWeightedScore = (current: number, historical: number, baselineVal: number, type: 'high-is-bad' | 'low-is-bad') => {
    let rawCurrent = current;
    let rawHist = historical;
    let rawBase = baselineVal;

    // Normalize: 0 to 100 where 100 is "worst" (biggest limiter)
    if (type === 'low-is-bad') {
      rawCurrent = Math.max(0, 100 - (current * 20)); // scale 1-5 to 100-0
      rawHist = Math.max(0, 100 - (historical * 20));
      rawBase = Math.max(0, 100 - (baselineVal)); // baseline is already 0-100
    } else {
      rawCurrent = Math.min(100, current * 20);
      rawHist = Math.min(100, historical * 20);
      rawBase = Math.min(100, baselineVal);
    }

    return (rawCurrent * 0.4) + (rawHist * 0.3) + (rawBase * 0.3);
  };

  const limiterScores = [
    {
      category: 'Recovery/Sleep',
      score: calcWeightedScore(Number(dailyLog.sleep_quality) || 3, getHistAvg('sleep_quality'), 100 - (Number(baseline.recovery) || 70), 'low-is-bad'),
      statement: 'Poor sleep hygiene is preventing complete neurological recovery between sessions.',
      factors: ['Sleep Quality', 'Recovery Window'],
    },
    {
      category: 'Energy/Metabolic',
      score: calcWeightedScore(Number(dailyLog.energy_level) || 3, getHistAvg('energy_level'), 100 - (Number(baseline.endurance) || 70), 'low-is-bad'),
      statement: 'Low metabolic energy reserves are capping your training intensity and late-game output.',
      factors: ['Energy Levels', 'Caloric Balance'],
    },
    {
      category: 'Stress/CNS',
      score: calcWeightedScore(Number(dailyLog.stress_level) || 3, getHistAvg('stress_level'), Number(baseline.stress_sensitivity) || 40, 'high-is-bad'),
      statement: 'Elevated systemic stress is competing for physiological resources, limiting performance adaptation.',
      factors: ['Stress Load', 'CNS Readiness'],
    },
    {
      category: 'Muscular/Soreness',
      score: calcWeightedScore(Number(dailyLog.muscle_soreness) || 1, getHistAvg('muscle_soreness', 1), Number(baseline.injury_history_score) || 30, 'high-is-bad'),
      statement: 'Persistent muscle soreness and structural tension are reducing movement efficiency.',
      factors: ['Muscle Soreness', 'Structural Load'],
    },
  ];

  // Add Demand Gap (Structural)
  const primaryDemand = pd.specificDemands[0];
  const primaryCategory = DEMAND_TO_CATEGORY[primaryDemand] || 'Endurance';
  const primaryValue = Number(baseline[primaryCategory.toLowerCase()]) || 50;
  const demandGapScore = Math.max(0, 75 - primaryValue) * 1.2; // Structural gap
  limiterScores.push({
    category: primaryCategory,
    score: demandGapScore,
    statement: `${primaryCategory} capacity is significantly below ${pd.name} requirements, creating a performance ceiling.`,
    factors: [`Low ${primaryCategory}`, 'Position Demand Gap'],
  });

  // Sort by weighted score
  limiterScores.sort((a, b) => b.score - a.score);
  const winner = limiterScores[0];

  const impactPct = Math.min(30, Math.round(winner.score * 0.35));

  return {
    statement: winner.statement,
    contributingFactors: winner.factors.map(f => ({ label: f, severity: winner.score > 60 ? 'high' : 'medium' })),
    impactPct: impactPct || 5,
    category: winner.category,
  };
}

// ─── ADAPTATION STATUS ENGINE ────────────────────────────────────────────

/**
 * FIXED: Adaptation Status with Memory
 * - Implements state inertia (3-5 days)
 * - Respects biological transition rules (e.g., Overreaching -> Plateau)
 */
export function getAdaptationStatus(ctx: DashboardContext): AdaptationStatus {
  const logs = ctx.historicalLogs || [];

  if (logs.length < 5) {
    return {
      state: 'Building',
      description: 'System initializing. Early baseline adaptation phase assumed.',
      trend: 'stable',
      color: '#22c55e',
    };
  }

  // Calculate raw state for a specific log window
  const calculateRawState = (window: any[]): AdaptationState => {
    const recent = window.slice(0, 4);
    const older = window.slice(4, 8);
    const avgRecentR = recent.map(l => Number(l.readiness_score) || 50).reduce((a, b) => a + b, 0) / (recent.length || 1);
    const avgOlderR = older.length ? older.map(l => Number(l.readiness_score) || 50).reduce((a, b) => a + b, 0) / older.length : avgRecentR;
    const avgRecentL = recent.map(l => Number(l.load_score) || 50).reduce((a, b) => a + b, 0) / (recent.length || 1);
    const avgOlderL = older.length ? older.map(l => Number(l.load_score) || 50).reduce((a, b) => a + b, 0) / older.length : avgRecentL;

    const rDelta = avgRecentR - avgOlderR;
    const lDelta = avgRecentL - avgOlderL;

    if (rDelta > 5 && lDelta >= -5) return 'Building';
    if (avgRecentR > 85 && rDelta >= 0) return 'Peaking';
    if (rDelta < -6 && lDelta > 5) return 'Overreaching';
    return rDelta < -4 ? 'Overreaching' : 'Plateau';
  };

  // Raw state for today (using last 4 days)
  const todayRaw = calculateRawState(logs);

  // Derive "Previous State" from the 3 days BEFORE today's window
  // (In a real system, we'd pull from DB, here we simulate memory from history)
  const prevRaw = calculateRawState(logs.slice(3));

  // State Transition Rules & Inertia
  let finalState: AdaptationState = todayRaw;

  // Rule: Transition constraints
  if (prevRaw === 'Overreaching' && todayRaw === 'Peaking') {
    finalState = 'Plateau'; // Must pass through recovery/plateau
  } else if (prevRaw === 'Building' && todayRaw === 'Overreaching') {
    // If we were building but today is a spike in fatigue, check if it's sustained
    const consistentFatigue = logs.slice(0, 3).every(l => (Number(l.readiness_score) || 70) < 60);
    if (!consistentFatigue) finalState = 'Plateau'; // Too sudden, move to Plateau first
  }

  // Descriptions & Trends
  const config: Record<AdaptationState, { desc: string; color: string; trend: AdaptationStatus['trend'] }> = {
    Building: {
      desc: 'Your body is adapting positively to training stimulus. Readiness is trending up with load.',
      color: '#22c55e',
      trend: 'improving',
    },
    Plateau: {
      desc: 'Adaptation has leveled off. Stimulus may be insufficient or recovery is stalling.',
      color: '#eab308',
      trend: 'stable',
    },
    Overreaching: {
      desc: 'Biological fatigue is exceeding recovery capacity. Immediate load reduction required.',
      color: '#ef4444',
      trend: 'declining',
    },
    Peaking: {
      desc: 'System is fully super-compensated. Optimal window for maximal performance output.',
      color: '#3b82f6',
      trend: 'improving',
    },
  };

  return {
    state: finalState,
    description: config[finalState].desc,
    trend: config[finalState].trend,
    color: config[finalState].color,
  };
}

// ─── PERFORMANCE TRAJECTORY ENGINE ───────────────────────────────────────

/**
 * FIXED: Simplified Performance Trajectory
 * - Prioritizes directional output (↑, →, ↓)
 * - Human-readable one-line interpretations
 */
export function getPerformanceTrajectory(ctx: DashboardContext): PerformanceTrajectory {
  const logs = ctx.historicalLogs || [];

  if (logs.length < 3) {
    return {
      projectedChange: 0,
      direction: 'Stagnating',
      interpretation: 'Insufficient data for trajectory. Log consistently for 3+ days.',
      sparkline: [50, 50, 50, 50, 50, 50, 50],
      timeframe: '14 days',
    };
  }

  // Build sparkline
  const readinessHistory = logs.slice(0, 7).map(l => Number(l.readiness_score) || 50).reverse();
  while (readinessHistory.length < 7) readinessHistory.unshift(readinessHistory[0] || 50);

  // Linear trend slope
  const n = readinessHistory.length;
  const xMean = (n - 1) / 2;
  const yMean = readinessHistory.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (readinessHistory[i] - yMean);
    den += (i - xMean) * (i - xMean);
  }
  const slope = den !== 0 ? num / den : 0;
  const change = Math.round(slope * 14);

  let direction: TrajectoryDirection = 'Stagnating';
  let interpretation = 'You are maintaining current performance levels.';

  if (change > 3) {
    direction = 'Improving';
    interpretation = 'You are improving if current training continues.';
  } else if (change < -3) {
    direction = 'Declining';
    interpretation = 'Fatigue may reduce performance if trajectory continues.';
  }

  return {
    projectedChange: change,
    direction,
    interpretation,
    sparkline: readinessHistory,
    timeframe: 'Trend',
  };
}
