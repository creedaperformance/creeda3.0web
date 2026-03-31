import {
  AthleteInput, OrchestratorOutput, OrchestratorOutputV5, EngineLogs, DecisionOutput,
  CreedaDecision, AdherenceData, VisionFault, RehabHistoryEntry
} from './types';
import { calculateLoad } from './LoadService';
import { calculateReadiness } from './ReadinessService';
import { calculateAdaptation } from './AdaptationService';
import { calculateRisk } from './RiskService';
import { calculateConfidence } from './ConfidenceService';
import { calculateUncertainty } from './UncertaintyService';
import { generateDecision, generateCreedaDecision } from './DecisionService';
import { calculateRehab, inferInjuryContext } from './RehabEngine';

/**
 * CREEDA V5: ENGINE ORCHESTRATOR
 * 
 * PIPELINE:
 *   Inputs → LoadService → ReadinessService → RiskService → RehabEngine → DecisionService → CreedaDecision
 * 
 * RULE: All services feed into ONE CreedaDecision.
 * RULE: No service outputs directly to UI.
 * RULE: DecisionService is the FINAL AUTHORITY.
 */

// ─── V5 ORCHESTRATOR (PRIMARY) ───────────────────────────────────────────

export async function orchestrateV5(
  input: AthleteInput,
  rehabHistory: RehabHistoryEntry[] = [],
  adherence: AdherenceData = { yesterdayPlanFollowed: true, adherenceScore: 0.8 },
): Promise<OrchestratorOutputV5> {
  const timestamp = new Date().toISOString();
  let systemConfidencePenalty = 0;
  const errors: string[] = [];

  // Contextual Helpers
  const safeRun = <T>(fn: () => T, fallback: T, name: string): T => {
    try {
      return fn();
    } catch (e) {
      console.error(`[Engine Error] ${name} failed:`, e);
      errors.push(`${name} failure`);
      systemConfidencePenalty += 0.2;
      return fallback;
    }
  };

  const asyncSafeRun = async <T>(fn: () => Promise<T>, fallback: T, name: string): Promise<T> => {
    try {
      return await fn();
    } catch (e) {
      console.error(`[Engine Error] ${name} async failed:`, e);
      errors.push(`${name} async failure`);
      systemConfidencePenalty += 0.2;
      return fallback;
    }
  };

  const safeNum = (val: any, fallback: number = 0): number => {
    const n = Number(val);
    return isNaN(n) ? fallback : n;
  };

  // ─── PIPELINE EXECUTION ────────────────────────────────────────────────

  // A. Load Analysis
  const loadMetrics = safeRun(
    () => calculateLoad(input),
    { neuromuscular: 0, metabolic: 0, mechanical: 0, total: 0, ewma_7: 0, ewma_28: 0, acwr: 1, monotony: 1, strain: 0, classification: "skill" as const, inferred: true },
    "LoadService"
  );

  // B. Readiness Analysis
  const readinessMetrics = safeRun(
    () => calculateReadiness(input, loadMetrics),
    { score: 70, domains: { neuromuscular: 70, metabolic: 70, mental: 70 }, factors: { sleep: 50, energy: 50, soreness: 50, stress: 50, pain: 0 }, cns_fatigue: 50, confidence: 0.5, felt_reality_gap: 0, reality_bridge: "Engine offline." },
    "ReadinessService"
  );

  // C. Confidence & Uncertainty Layer
  const confidenceMetrics = safeRun(
    () => calculateConfidence(input),
    { trust_score: 0.5, data_density: 0.5, baseline_stability: 0.5, total_confidence: 0.5, mode: "normal" as const, reasons: ['Confidence fallback engaged.'] },
    "ConfidenceService"
  );

  const uncertaintyMetrics = safeRun(
    () => calculateUncertainty(input, confidenceMetrics),
    { score: 0.5, smoothed_variance: 50, trend_variability: 5, density_impact: 0.5, alpha_smoothing: 0.4, stability_waveform: "slight_waveform" as const },
    "UncertaintyService"
  );

  // D. Risk Modeling (V5: includes vision faults & biomechanical weighting)
  const riskMetrics = safeRun(
    () => calculateRisk(input, loadMetrics, readinessMetrics),
    {
      score: 50, label: "Stability Caution", priority: "moderate" as const,
      multiplier: 1, interactions: [], trajectory: "stable" as const,
      cross_domain_impact: 0, fatigue_memory: 40,
      predictedInjuryType: null, trendDirection: 'stable' as const,
      visionFaults: [], biomechanicalRiskScore: 0,
    },
    "RiskService"
  );

  // E. Adaptation Learning
  const adaptationUpdate = safeRun(
    () => calculateAdaptation(input, readinessMetrics, loadMetrics),
    input.adaptation_profile,
    "AdaptationService"
  );

  // F. Rehab Engine (V5: injury-aware state machine)
  const visionFaults = input.visionFaults || [];
  const painLevel = input.wellness.current_pain_level || 0;
  const sorenessVal = typeof input.wellness.muscle_soreness === 'number'
    ? input.wellness.muscle_soreness
    : 3;
  
  const injuryContext = safeRun(
    () => inferInjuryContext(
      painLevel,
      sorenessVal,
      input.context.sport,
      visionFaults,
      rehabHistory
    ),
    { type: null, confidence: 0.5 },
    "InjuryContextInference"
  );

  const rehabOutput = safeRun(
    () => {
      // Only run rehab engine if there's pain, active injury, or rehab history
      if (painLevel >= 3 || injuryContext.type !== null || rehabHistory.length > 0) {
        return calculateRehab({
          painScore: painLevel,
          soreness: sorenessVal,
          movementQuality: visionFaults.length > 0 ? Math.max(20, 80 - (visionFaults.filter(f => f.severity === 'high').length * 25)) : 75,
          loadTolerance: adaptationUpdate.load_tolerance,
          injuryContext,
          rehabHistory,
          visionFaults,
        });
      }
      return null;
    },
    null,
    "RehabEngine"
  );

  // G. Legacy V4 Decision (backward compat)
  confidenceMetrics.total_confidence = safeNum(Math.max(0, confidenceMetrics.total_confidence - systemConfidencePenalty), 0.5);

  const legacyDecision = safeRun(
    () => generateDecision(
      readinessMetrics, riskMetrics, confidenceMetrics,
      input.history, uncertaintyMetrics, painLevel, adaptationUpdate
    ),
    {
      intensity: "Low" as const, training_intensity_cap: 50, volume_cap: "50%",
      focus_area: "Recovery", blocked_movements: [], message: "[FALLBACK] Engine internal error.",
      priority_focus: "Recovery" as const, trend_bias: 0, uncertainty_bias: 0,
      safety_overrides_triggered: ["orchestrator_fallback"], primary_action: "Recover" as const,
      structured_explanation: [], logs: []
    },
    "LegacyDecisionService"
  );

  // H. V5 CREEDA DECISION (FINAL AUTHORITY)
  const creedaDecision = await asyncSafeRun(
    async () => await generateCreedaDecision({
      readiness: readinessMetrics,
      risk: riskMetrics,
      confidence: confidenceMetrics,
      history: input.history,
      uncertainty: uncertaintyMetrics,
      painLevel,
      adaptation: adaptationUpdate,
      rehab: rehabOutput,
      visionFaults,
      sport: input.context.sport,
      position: input.context.position || '',
      profile: input.profile,
      adherence,
      userId: input.userId || 'guest',
    }),
    buildFallbackDecision(adherence),
    "CreedaDecisionService"
  );

  // ─── OUTPUT ASSEMBLY ───────────────────────────────────────────────────

  const trendPenalty = safeNum(Math.max(0, -legacyDecision.trend_bias * 2), 0);
  const priorityScore = (safeNum(riskMetrics.score) * 0.5) + (safeNum(uncertaintyMetrics.score) * 100 * 0.3) + (trendPenalty * 0.2);
  const projectedReadiness = safeNum(Math.max(0, Math.min(100, readinessMetrics.score + (legacyDecision.trend_bias / 2))), readinessMetrics.score);

  const subset = input.history.slice(0, 3).map(h => h.readinessScore || 70);
  const trend = subset.length >= 2 ? (subset[0] > subset[1] ? 1 : (subset[0] < subset[1] ? -1 : 0)) : 0;

  // Safety sanitize
  riskMetrics.score = safeNum(riskMetrics.score, 50);
  readinessMetrics.score = safeNum(readinessMetrics.score, 70);
  uncertaintyMetrics.score = safeNum(uncertaintyMetrics.score, 0.5);

  const logs: EngineLogs = {
    version: "v5",
    timestamp,
    input_snapshot: {
      wellness: { ...input.wellness },
      context: { ...input.context },
      health_metrics: input.health_metrics ? { ...input.health_metrics } : undefined,
    },
    intermediate_outputs: {
      load: loadMetrics,
      readiness: readinessMetrics,
      adaptation: adaptationUpdate,
      risk: riskMetrics,
      confidence: { ...confidenceMetrics },
    },
    final_decision: legacyDecision,
  };

  return {
    engine_version: "v5",
    decision: legacyDecision,
    metrics: {
      readiness: readinessMetrics,
      load: loadMetrics,
      risk: riskMetrics,
      confidence: confidenceMetrics,
      uncertainty: uncertaintyMetrics,
      trend,
      trend_signal: safeNum(legacyDecision.trend_bias, 0),
      projected_readiness: projectedReadiness,
      priority_score: Math.round(safeNum(priorityScore, 50)),
    },
    adaptation_update: adaptationUpdate,
    logs,
    // V5: THE UNIFIED DECISION
    creedaDecision,
  };
}

// ─── FALLBACK DECISION ───────────────────────────────────────────────────

function buildFallbackDecision(adherence: AdherenceData): CreedaDecision {
  return {
    decision: 'MODIFY',
    intensity: 40,
    sessionType: 'Baseline Calibration',
    duration: 45,
    decisionContext: {
      dominantFactor: 'DATA',
      priorityChain: ['FALLBACK: Engine error — defaulting to safe baseline session'],
    },
    components: {
      training: {
        focus: 'Light Full Body Movement & Assessment',
        plan: null,
        intensityCap: 50,
        athleteFocus: null,
        sessionProtocol: null,
      },
      rehab: null,
      recovery: { methods: ['Extended stretching', 'Hydration focus'], priority: 'Standard' },
      psychology: { mentalReadiness: 70, advice: 'Stay positive. System is calibrating your baseline.' },
      nutrition: {
        meals: null,
        hydrationPriority: false,
        totalPortionGrams: 0,
        fueling: {
          sport: null,
          position: null,
          summary: 'Fallback mode keeps nutrition simple and food-first.',
          preSession: [],
          duringSession: [],
          recoveryWindow: ['Do not introduce new ergogenic strategies while fallback mode is active.'],
          hydrationPriority: false,
        },
      },
    },
    constraints: { avoid: [], flags: ['SYSTEM CALIBRATING'] },
    explanation: {
      primaryDrivers: [{ factor: 'System Status', reason: 'Engine is calibrating your baseline. Follow guided session.' }],
      secondaryDrivers: [],
    },
    predictions: {
      injuryRiskTrend: 'stable',
      readinessForecast: [70, 70, 70, 70, 70],
      predictedInjuryType: null,
      riskLevel: 'low',
    },
    progression: { rehabStage: null, progressionReadiness: false },
    feedback: {
      yesterdayComparison: 'no_data',
      readinessDelta: 0,
      insight: 'Welcome to Creeda. Your personal sports scientist is initializing.',
    },
    adherence,
    dataCompleteness: 10,
    confidenceScore: 50,
    confidenceLevel: 'LOW',
    confidenceReasons: ['Fallback decision generated while the engine recovers from an internal error.'],
    visionFaults: [],
    scientificContext: {
      summary: 'Fallback mode is active, so CREEDA is withholding deeper sports-science overlays until the engine recovers.',
      antiDopingNote: 'Do not introduce new supplements while the engine is in fallback mode.',
      evidence: [],
      supplements: [],
      conditioning: {
        archetype: 'Baseline calibration',
        todayFit: 'Use simple low-risk movement while the engine rebuilds confidence.',
        priorities: ['Keep movement quality high.', 'Avoid load spikes.', 'Re-enter normal training only after a real check-in.'],
        loadWarnings: ['System is not confident enough for advanced progression.'],
        references: [],
      },
      injuryReturn: null,
      sportProfile: {
        sportKey: 'other',
        sportName: 'General Athlete',
        positionName: 'Baseline Mode',
        archetype: 'Fallback',
        summary: 'CREEDA is keeping sport guidance conservative until a stable server-side decision can be rebuilt.',
        demandKeys: [],
        demands: [],
        physiologyPriorities: ['Keep movement quality high and avoid guessing at maximal outputs.'],
        riskHotspots: [],
        generalRecommendations: ['Complete a fresh daily check-in to restore sport-specific guidance.'],
        positionRecommendations: ['Use only low-risk technical or mobility work in fallback mode.'],
        references: [],
      },
      psychology: {
        summary: 'Fallback mode should simplify the mental load rather than push for high-pressure execution.',
        skills: ['Use one simple cue and keep the session low-complexity until the engine recovers.'],
        monitoring: ['If confidence is low, reduce complexity rather than forcing intensity.'],
        references: [],
      },
      recovery: {
        summary: 'Fallback recovery guidance prioritizes sleep, hydration, and low-load movement.',
        priorities: ['Protect sleep opportunity and use easy movement to maintain circulation.'],
        monitoring: ['Log the next real day so the engine can leave fallback mode quickly.'],
        references: [],
      },
      nutrition: {
        summary: 'Fallback nutrition guidance is deliberately conservative and food-first.',
        priorities: ['Eat regular meals with adequate carbohydrate and protein instead of experimenting.'],
        timing: ['Do not introduce new ergogenic strategies while fallback mode is active.'],
        references: [],
      },
    },
    timestamp: new Date().toISOString(),
  };
}

// ─── LEGACY V4 ORCHESTRATOR (BACKWARD COMPAT) ────────────────────────────

export function orchestratePerformanceEngine(input: AthleteInput): OrchestratorOutput {
  const loadMetrics = calculateLoad(input);
  const readinessMetrics = calculateReadiness(input, loadMetrics);
  const confidenceMetrics = calculateConfidence(input);
  const uncertaintyMetrics = calculateUncertainty(input, confidenceMetrics);
  const riskMetrics = calculateRisk(input, loadMetrics, readinessMetrics);
  const adaptationUpdate = calculateAdaptation(input, readinessMetrics, loadMetrics);
  const painLevel = input.wellness.current_pain_level || 0;
  const legacyDecision = generateDecision(
    readinessMetrics,
    riskMetrics,
    confidenceMetrics,
    input.history,
    uncertaintyMetrics,
    painLevel,
    adaptationUpdate
  );

  const subset = input.history.slice(0, 3).map(h => h.readinessScore || 70);
  const trend = subset.length >= 2 ? (subset[0] > subset[1] ? 1 : (subset[0] < subset[1] ? -1 : 0)) : 0;
  const trendPenalty = Math.max(0, -(Number(legacyDecision.trend_bias) || 0) * 2);
  const priorityScore = (Number(riskMetrics.score || 0) * 0.5) + (Number(uncertaintyMetrics.score || 0) * 100 * 0.3) + (trendPenalty * 0.2);
  const projectedReadiness = Math.max(0, Math.min(100, readinessMetrics.score + ((Number(legacyDecision.trend_bias) || 0) / 2)));

  const logs: EngineLogs = {
    version: "v4",
    timestamp: new Date().toISOString(),
    input_snapshot: {
      wellness: { ...input.wellness },
      context: { ...input.context },
      health_metrics: input.health_metrics ? { ...input.health_metrics } : undefined,
    },
    intermediate_outputs: {
      load: loadMetrics,
      readiness: readinessMetrics,
      adaptation: adaptationUpdate,
      risk: riskMetrics,
      confidence: { ...confidenceMetrics },
    },
    final_decision: legacyDecision,
  };

  return {
    engine_version: "v4",
    decision: legacyDecision,
    metrics: {
      readiness: readinessMetrics,
      load: loadMetrics,
      risk: riskMetrics,
      confidence: confidenceMetrics,
      uncertainty: uncertaintyMetrics,
      trend,
      trend_signal: Number(legacyDecision.trend_bias) || 0,
      projected_readiness: projectedReadiness,
      priority_score: Math.round(priorityScore),
    },
    adaptation_update: adaptationUpdate,
    logs,
  };
}
