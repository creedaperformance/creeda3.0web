import { createClient } from "@/lib/supabase/client";

export interface AdherenceScore {
  completionRate: number; // 0-100
  followedPlan: boolean;
  message: string;
}

export class AdherenceEngine {
  private supabase = createClient();

  /**
   * Evaluates if a user completed their prescribed load the day before.
   */
  async evaluateAdherence(userId: string): Promise<AdherenceScore> {
    // 1. Fetch the last daily log
    const { data: latestLog } = await this.supabase
      .from('daily_load_logs')
      .select('session_rpe, duration_minutes, target_rpe, target_duration')
      .eq('athlete_id', userId)
      .order('log_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestLog) {
      return { completionRate: 0, followedPlan: false, message: 'NO_DATA' };
    }

    // 2. Compute adherence delta
    const actualRPE = latestLog.session_rpe || 0;
    const targetRPE = latestLog.target_rpe || actualRPE; 
    
    // Safety check: if there is no target, we assume 100% since they just logged something standalone
    if (!latestLog.target_rpe) {
      return { completionRate: 100, followedPlan: true, message: 'UNTRACKED_BUT_LOGGED' };
    }

    const rpeDelta = Math.abs(targetRPE - actualRPE);
    let score = 100 - (rpeDelta * 10); // Each unit off RPE drops score by 10%
    
    score = Math.max(0, Math.min(100, score));

    return {
      completionRate: score,
      followedPlan: score >= 50,
      message: score >= 50 ? 'ADHERENT' : 'NON_ADHERENT'
    };
  }
}

export const adherenceEngine = new AdherenceEngine();
