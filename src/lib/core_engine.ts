/**
 * Creeda V4: Core Intelligence Engine
 * Focus: High-impact decision making across 4 pathways.
 * Hierarchy: Injury Risk (ACWR) > Recovery Capacity > Readiness.
 */

import { SPORTS_DATABASE } from './sport_intelligence'

export type CreedaStatus = 'TRAIN' | 'MODIFY' | 'REST';
export type AlertPriority = 'Critical' | 'Warning' | 'Informational';

export interface IntelligenceResult {
  score: number; // Normalized Readiness (0-100)
  status: CreedaStatus;
  priority: AlertPriority;
  reason: string;
  action: string;
  trace: {
    acwr: number;
    recoveryCapacity: number;
    loadTolerance: number;
    isCalibration: boolean;
  };
  referral?: {
    type: 'Physio' | 'Nutritionist' | 'Psychologist' | 'Ortho';
    reason: string;
    urgency: 'High' | 'Medium' | 'Low';
  };
}

/**
 * Main entrance point for Creeda V4 Intelligence.
 */
export function calculateV4Intelligence(
  dailyLog: any,
  diagnostic: any,
  historicalLogs: any[],
  context: { sport: string; position?: string; role: 'athlete' | 'individual' }
): IntelligenceResult {
  // 1. Normalize Inputs (mixed scales -> 0-100)
  const normalize = (val: unknown, metric: 'sleep' | 'energy' | 'soreness' | 'stress') => {
    const normalizedFivePoint = normalizeToFivePointScale(val, metric)
    return ((normalizedFivePoint - 1) / 4) * 100
  }

  const sleep = normalize(dailyLog.sleep_quality, 'sleep')
  const energy = normalize(dailyLog.energy_level, 'energy')
  const soreness = normalize(dailyLog.muscle_soreness, 'soreness')
  const stress = normalize(dailyLog.stress_level, 'stress')

  // 2. Baseline Capacity & Sport Context
  const sportData = SPORTS_DATABASE[context.sport?.toLowerCase()] || SPORTS_DATABASE['cricket']
  const positionData =
    sportData.positions.find(p => p.name.toLowerCase() === String(context.position || '').toLowerCase()) ||
    sportData.positions[0]

  const recoveryEfficiency = normalizeToPercent(diagnostic?.physiology_profile?.recovery_efficiency, 50)
  const loadTolerance = normalizeToPercent(diagnostic?.physiology_profile?.load_tolerance, 50)
  
  // 3. Normalized Readiness (Weighted by Sport/Position)
  // Default: Sleep (30%), Energy (30%), Soreness (20%), Stress (20%)
  const weights = extractReadinessWeights(positionData?.weights)
  const readinessRaw =
    sleep * (weights.sleep / 100) +
    energy * (weights.energy / 100) +
    (100 - soreness) * (weights.soreness / 100) +
    (100 - stress) * (weights.stress / 100)
  const readinessScore = Number.isFinite(readinessRaw)
    ? Math.round(Math.max(0, Math.min(100, readinessRaw)))
    : 50

  // 4. Load & Risk (ACWR)
  const acwr = calculateACWR(dailyLog, historicalLogs)
  const isCalibration = historicalLogs.length < 14

  // 5. Decision Hierarchy (Safety First)
  let status: CreedaStatus = 'TRAIN'
  let priority: AlertPriority = 'Informational'
  let reason = "All systems green. Maintain standard load."
  let action = "Continue with your planned training volume."

  // Hierarchy 1: Injury Risk (ACWR)
  if (acwr > 1.5) {
    status = 'REST'
    priority = 'Critical'
    reason = "High ACWR detected (Sudden spike in load)."
    action = "MANDATORY REST: High injury risk window active."
  } 
  // Hierarchy 2: Recovery Capacity
  else if (readinessScore < 40 || recoveryEfficiency < 30) {
    status = 'MODIFY'
    priority = 'Warning'
    reason = readinessScore < 40 ? "Low readiness markers." : "Low structural recovery capacity."
    action = "RECOVER: Keep intensity below 60%. Focus on technical precision."
  }
  // Hierarchy 3: Performance Peak
  else if (readinessScore > 85 && acwr >= 0.8 && acwr <= 1.3) {
    status = 'TRAIN'
    priority = 'Informational'
    reason = "Primed for peak performance."
    action = "PUSH: Excellent day for high-intensity work or testing."
  }

  // 6. Referral Logic
  let referral: IntelligenceResult['referral'] | undefined
  if (dailyLog.current_pain_level >= 6 || (acwr > 1.7 && soreness > 80)) {
    referral = {
      type: 'Physio',
      reason: dailyLog.current_pain_level >= 6 ? 'Significant pain reported.' : 'Critical overload with high muscle soreness.',
      urgency: dailyLog.current_pain_level >= 8 ? 'High' : 'Medium'
    }
  }

  return {
    score: readinessScore,
    status,
    priority,
    reason,
    action,
    trace: {
      acwr,
      recoveryCapacity: recoveryEfficiency,
      loadTolerance,
      isCalibration
    },
    referral
  }
}

/**
 * Helper: Calculate Acute:Chronic Workload Ratio
 */
function calculateACWR(currentLog: any, history: any[]): number {
  const recentLoads = [extractSessionLoad(currentLog), ...history.map(extractSessionLoad)]
    .filter((val): val is number => Number.isFinite(val))

  if (recentLoads.length === 0) return 1.0

  const acuteWindow = recentLoads.slice(0, Math.min(7, recentLoads.length))
  const chronicWindow = recentLoads.slice(0, Math.min(28, recentLoads.length))

  const acuteLoad = average(acuteWindow)
  const chronicLoad = average(chronicWindow)

  if (chronicLoad <= 0) return 1.0
  return Number((acuteLoad / chronicLoad).toFixed(2))
}

/**
 * Helper: Map Enums to 1-5 Scale
 */
function mapEnumToScore(val: string): number {
  const map: Record<string, number> = {
    'Excellent': 5, 'Peak': 5, 'Locked In': 5, 'Optimal': 5, 'Fresh': 5, 'None': 5,
    'Good': 4, 'High': 4, 'Normal': 4, 'Focused': 4, 'Okay': 3,
    'Moderate': 3, 'Average': 3, 'Stable': 3,
    'Poor': 2, 'Low': 2, 'Stiff/Sore': 2, 'Heavy': 2, 'Distracted': 2, 'Minor symptoms': 2,
    'Drained': 1, 'Very High': 1, 'Critical': 1, 'Not ready': 1, 'Ill / Injury restricted': 1
  };
  return map[val] || 3;
}

function normalizeToFivePointScale(
  val: unknown,
  metric: 'sleep' | 'energy' | 'soreness' | 'stress'
): number {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return clampToFivePoint(val)
  }

  if (typeof val === 'string') {
    if (metric === 'soreness' || metric === 'stress') {
      const mappedSeverity = mapSeverityToScore(val)
      if (mappedSeverity !== null) {
        return clampToFivePoint(mappedSeverity)
      }
    }

    const parsed = Number(val)
    if (!Number.isNaN(parsed)) {
      return clampToFivePoint(parsed)
    }
    return clampToFivePoint(mapEnumToScore(val))
  }

  return 3
}

function clampToFivePoint(value: number): number {
  if (value <= 5) return Math.max(1, Math.min(5, value))
  if (value <= 10) return Math.max(1, Math.min(5, value / 2))
  return Math.max(1, Math.min(5, ((value / 100) * 4) + 1))
}

function normalizeToPercent(value: unknown, fallback: number): number {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  if (num >= 0 && num <= 1) return Math.round(num * 100)
  return Math.round(Math.max(0, Math.min(100, num)))
}

function extractReadinessWeights(rawWeights: Record<string, number> | undefined) {
  const fallback = { sleep: 30, energy: 30, soreness: 20, stress: 20 }
  if (!rawWeights) return fallback

  const hasCanonical = ['sleep', 'energy', 'soreness', 'stress'].some(
    key => typeof rawWeights[key] === 'number' && rawWeights[key] > 0
  )

  if (!hasCanonical) return fallback

  const sleep = Math.max(0, Number(rawWeights.sleep || 0))
  const energy = Math.max(0, Number(rawWeights.energy || 0))
  const soreness = Math.max(0, Number(rawWeights.soreness || 0))
  const stress = Math.max(0, Number(rawWeights.stress || 0))
  const total = sleep + energy + soreness + stress

  if (total <= 0) return fallback

  return {
    sleep: (sleep / total) * 100,
    energy: (energy / total) * 100,
    soreness: (soreness / total) * 100,
    stress: (stress / total) * 100
  }
}

function extractSessionLoad(log: any): number {
  const directLoad = Number(log?.load_score ?? log?.load)
  if (Number.isFinite(directLoad) && directLoad > 0) return directLoad

  const rawDemand = log?.session_rpe ?? log?.rpe ?? log?.yesterday_load_demand
  const demand = normalizeDemand(rawDemand)
  const duration = Number(log?.duration_minutes ?? log?.session_duration ?? log?.yesterday_duration ?? 0)

  if (demand > 0 && Number.isFinite(duration) && duration > 0) return demand * duration
  if (demand > 0) return demand * 60
  return 0
}

function normalizeDemand(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value)
  if (typeof value === 'string') {
    const map: Record<string, number> = { Low: 3, Moderate: 5, High: 8, 'Very High': 10, Rest: 0 }
    if (map[value] !== undefined) return map[value]
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return Math.max(0, parsed)
  }
  return 0
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function mapSeverityToScore(value: string): number | null {
  const severityMap: Record<string, number> = {
    None: 1,
    Low: 2,
    Moderate: 3,
    High: 4,
    'Very High': 5,
    'Extremely High': 5,
    Critical: 5,
    'Stiff/Sore': 4
  }

  if (severityMap[value] !== undefined) return severityMap[value]
  return null
}
