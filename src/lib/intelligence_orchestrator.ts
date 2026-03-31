/**
 * Creeda V4: Intelligence Orchestrator
 * The "Pulse" of the system. Coordinates data between the Engine and the DB.
 */

import { calculateV4Intelligence, IntelligenceResult } from './core_engine';

/**
 * Main orchestration function triggered after a daily log is submitted.
 */
export async function orchestratePulse(
  userId: string,
  dailyLog: any,
  supabase: any
): Promise<IntelligenceResult> {
  
  // 1. Fetch Context: Diagnostics + Profile + History
  const [diagnosticRes, profileRes, historyRes] = await Promise.all([
    supabase.from('diagnostics').select('*').eq('athlete_id', userId).maybeSingle(),
    supabase.from('profiles').select('primary_sport, position, role').eq('id', userId).single(),
    supabase.from('daily_load_logs')
      .select('*')
      .eq('athlete_id', userId)
      .lt('log_date', dailyLog.log_date)
      .order('log_date', { ascending: false })
      .limit(28)
  ]);

  if (profileRes.error || !profileRes.data) throw new Error("Profile not found");

  // 2. Run Engine
  const result = calculateV4Intelligence(
    dailyLog,
    diagnosticRes.data,
    historyRes.data || [],
    { 
      sport: profileRes.data.primary_sport, 
      position: profileRes.data.position,
      role: profileRes.data.role
    }
  );

  // 3. Persistent Storage (Computed Intelligence)
  const { error: intelError } = await supabase
    .from('computed_intelligence')
    .upsert({
      user_id: userId,
      log_date: dailyLog.log_date,
      readiness_score: result.score,
      risk_score: result.trace.acwr,
      recovery_capacity: result.trace.recoveryCapacity,
      load_tolerance: result.trace.loadTolerance,
      status: result.status,
      reason: result.reason,
      action_instruction: result.action,
      alert_priority: result.priority,
      intelligence_trace: result.trace
    }, { onConflict: 'user_id,log_date' });

  if (intelError) console.error("Error persisting intelligence:", intelError);

  // 4. Wow Moment Check (Is this the first log?)
  const isFirstLog = historyRes.data?.length === 0;
  if (isFirstLog) {
    // Add specialized 'Wow' metadata to the result for the frontend to trigger animations
    (result as any).wowMoment = {
      type: 'FirstLogInsight',
      insightBody: `Your recovery capacity is ${result.trace.recoveryCapacity}% - ${result.trace.recoveryCapacity > 70 ? 'Superior' : 'Building'}.`,
      prediction: `You are primed for ${result.status === 'TRAIN' ? 'Growth' : 'Recovery'} today.`
    };
  }

  // 5. Handle Catch-up Mode for missing logs
  // (In a real app, this might trigger a background job to fill gaps if desired)
  
  return result;
}

/**
 * Edge cases: Missing data fallback logic.
 */
export function handleMissingDataFallback(
  daysMissing: number,
  lastKnownIntelligence: any
): IntelligenceResult {
  // Decay readiness over time if no logs
  const decayedScore = Math.max(30, (lastKnownIntelligence?.readiness_score || 50) - (daysMissing * 10));
  
  return {
    score: decayedScore,
    status: 'MODIFY',
    priority: 'Warning',
    reason: `Missing logs for ${daysMissing} days. Data confidence is low.`,
    action: "Please log your wellness to restore intelligence accuracy.",
    trace: {
      acwr: 1.0,
      recoveryCapacity: 50,
      loadTolerance: 50,
      isCalibration: true
    }
  };
}
