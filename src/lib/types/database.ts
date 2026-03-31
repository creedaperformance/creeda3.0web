export interface DailyLoadLog {
  id: string;
  athlete_id: string;
  log_date: string; // ISO Date YYYY-MM-DD
  
  // Normalized Wellness (1-10)
  sleep: number;
  energy: number;
  soreness: number;
  stress: number;
  
  // Load Metrics
  session_rpe: number;
  duration_minutes: number;
  load_score: number;
  
  // Computed Intelligence (Trigger-based)
  acute_load_7d: number;
  chronic_load_28d: number;
  acwr_ratio: number;
  base_readiness: number;
  trust_factor: number;
  final_readiness: number;
  
  // Context & Metadata
  day_type?: string;
  session_importance?: string;
  sleep_hours?: string;
  sleep_quality?: string; // Legacy support
  energy_level?: string;  // Legacy support
  muscle_soreness?: string; // Legacy support
  stress_level?: string;  // Legacy support
  
  // Health & Pain
  current_pain_level: number;
  pain_location: string[];
  health_status?: string;
  
  // Flags
  competition_today: boolean;
  competition_tomorrow: boolean;
  competition_yesterday: boolean;
  
  // Intelligence Meta (Jsonb)
  intelligence_meta?: {
    readinessScore: number;
    recoveryRisk: string;
    heroJudgement: string;
    athleteJudgement: string;
    coachJudgement: string;
    risks: string[];
    reasons: string[];
    generatedAt: string;
  };
  
  created_at: string;
}
