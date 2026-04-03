"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  buildCoachInterventionKey,
  deriveLowDataQueueSignal,
  derivePerformanceQueueSignal,
  type CoachInterventionStatus,
  type CoachQueuePriority,
  type CoachQueueType,
} from "@/lib/coach/interventions";
import {
  normalizeObjectiveTestSession,
  summarizeObjectiveSignals,
} from "@/lib/objective-tests/store";
import { computeObjectiveBaselines } from "@/lib/objective-tests/baselines";
import type { ObjectiveSignalSummary, ObjectiveTestSession, ObjectiveTestType } from "@/lib/objective-tests/types";
import {
  calculateAgeFromDateOfBirth,
  createAcademyTeamProfile,
  createGuardianProfileSummary,
  type AcademyTeamProfile,
  type GuardianProfileSummary,
} from "@/lib/academy/workflows";
import { initializeNotificationEngine } from "./notification_engine";

export type PerformanceMode = "PERFORMANCE" | "RECOVERY" | "GENERAL_FITNESS";

export interface CreedaState {
  userId: string | null;
  userType: "athlete" | "coach" | "individual" | null;
  performanceMode: PerformanceMode;
  readinessScore: number;
  readinessStatus: "OPTIMAL" | "MODERATE" | "RISK";
  lastSync: string | null;
  isOnline: boolean;
  alerts: Array<{
    id: string;
    type: "RISK" | "TREND" | "GOAL" | "SYSTEM";
    message: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
    timestamp: string;
  }>;
  goals: any[];
  trends: any[];
  benchmarks: any[];
  confidenceScore: number;
  // Sport-specific context
  sport: string;
  position: string;
  primaryGoal: string;
  diagnostic: any;
  latestDailyLog: any;
  historicalLogs: any[];
  performanceBaseline: any;
  // Deep Brain V5
  adaptationProfile: any;
  performanceProfile: any;
  visionFaults: any[];
  rehabHistory: any[];
  individualProfile: any;
  // Coach Squad Intelligence (V5)
  squadData: TeamData[];
  coachInterventions: CoachInterventionFeedItem[];
}

export interface SquadMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  date_of_birth?: string | null;
  age_years?: number | null;
  is_junior?: boolean;
  guardian_consent_confirmed?: boolean;
  guardian_profile?: GuardianProfileSummary | null;
  readiness_score: number;
  status: string;
  risk_score: number;
  last_logged: string;
  vision_faults: any[];
  action_instruction?: string | null;
  alert_priority?: "Critical" | "Warning" | "Informational" | null;
  confidence_level?: "LOW" | "MEDIUM" | "HIGH" | null;
  data_quality?: "COMPLETE" | "PARTIAL" | "WEAK" | null;
  objective_test?: CoachObjectiveTestSummary | null;
  rehab_summary?: CoachRehabSummary | null;
  stale_hours?: number | null;
  intervention_priority?: CoachQueuePriority | null;
  intervention_reasons?: string[];
  intervention_recommendation?: string | null;
  intervention_source_log_date?: string | null;
  intervention_record?: CoachInterventionRecord | null;
  low_data_priority?: CoachQueuePriority | null;
  low_data_reasons?: string[];
  low_data_recommendation?: string | null;
  low_data_source_log_date?: string | null;
  low_data_record?: CoachInterventionRecord | null;
}

export interface TeamData {
  id: string;
  team_name: string;
  invite_code: string;
  academy_profile: AcademyTeamProfile;
  members: SquadMember[];
}

interface TeamMemberProfileRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
  date_of_birth?: string | null;
  guardian_consent_confirmed?: boolean | null;
}

interface TeamMemberRow {
  athlete_id: string;
  profiles: TeamMemberProfileRow | TeamMemberProfileRow[] | null;
}

interface GuardianProfileRow {
  athlete_id: string;
  guardian_name?: string | null;
  guardian_relationship?: string | null;
  guardian_phone?: string | null;
  guardian_email?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  consent_status?: string | null;
  handoff_preference?: string | null;
  last_handoff_sent_at?: string | null;
  notes?: string | null;
}

export interface CoachObjectiveTestSummary {
  latestValidatedScoreMs: number | null;
  previousValidatedScoreMs: number | null;
  deltaVsPreviousMs: number | null;
  trend: "improving" | "stable" | "declining" | "missing";
  freshness: "fresh" | "stale" | "missing";
  classification: string | null;
  completedAt: string | null;
  recentSessionCount: number;
  weekSessionCount: number;
  summary: string;
  nextAction: string;
  primaryProtocolId: ObjectiveTestType | null;
  latestHeadlineMetricValue: number | null;
  latestHeadlineMetricUnit: string | null;
  latestHeadlineMetricLabel: string | null;
  primarySignal: ObjectiveSignalSummary | null;
  signals: ObjectiveSignalSummary[];
}

export interface CoachRehabSummary {
  active: boolean;
  injuryType: string;
  phase: 1 | 2 | 3 | 4 | 5;
  label: string;
  daysInPhase: number | null;
  progressionReadiness: boolean;
  progressionFlag: "progressed" | "regressed" | "held" | "started" | null;
  lastPainScore: number | null;
  loadTolerancePct: number | null;
  restrictions: string[];
  nextAction: string;
  updatedAt: string | null;
}

export interface CoachInterventionRecord {
  id: string;
  queue_type: CoachQueueType;
  status: CoachInterventionStatus;
  priority: CoachQueuePriority;
  reason_codes: string[];
  recommendation: string | null;
  source_log_date: string;
  updated_at: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  notes?: string | null;
}

export interface CoachInterventionFeedItem extends CoachInterventionRecord {
  athlete_id: string;
  athlete_name: string;
  athlete_avatar_url: string | null;
  team_id: string;
  team_name: string;
  readiness_score: number;
  risk_score: number;
  confidence_level?: SquadMember["confidence_level"];
  data_quality?: SquadMember["data_quality"];
  objective_test?: CoachObjectiveTestSummary | null;
  stale_hours?: number | null;
}

interface CreedaContextType {
  state: CreedaState;
  setMode: (mode: PerformanceMode) => void;
  sync: () => Promise<void>;
  updateCoachInterventionStatus: (id: string, status: CoachInterventionStatus) => Promise<void>;
  updateCoachInterventionNotes: (id: string, notes: string | null) => Promise<void>;
  addAlert: (alert: Omit<CreedaState["alerts"][0], "id" | "timestamp">) => void;
  clearAlert: (alertId: string) => void;
}

interface CreedaProviderProps {
  children: React.ReactNode;
  initialData?: Partial<CreedaState>;
}

const defaultState: CreedaState = {
  userId: null,
  userType: null,
  performanceMode: "PERFORMANCE",
  readinessScore: 0,
  readinessStatus: "MODERATE",
  lastSync: null,
  isOnline: true,
  alerts: [],
  goals: [],
  trends: [],
  benchmarks: [],
  confidenceScore: 0,
  // Sport-specific defaults
  sport: '',
  position: '',
  primaryGoal: '',
  diagnostic: null,
  latestDailyLog: null,
  historicalLogs: [],
  performanceBaseline: null,
  adaptationProfile: null,
  performanceProfile: null,
  visionFaults: [],
  rehabHistory: [],
  individualProfile: null,
  squadData: [],
  coachInterventions: [],
};

const CreedaContext = createContext<CreedaContextType | undefined>(undefined);

function parsePersistedTrustSummary(trace: unknown) {
  if (!trace || typeof trace !== "object") return { confidenceLevel: null, dataQuality: null };

  const record = trace as Record<string, unknown>;
  const decisionBundle =
    (record.decisionBundle as Record<string, unknown> | undefined) ||
    (record.engineResult as Record<string, unknown> | undefined) ||
    (record.result as Record<string, unknown> | undefined);
  const creedaDecision = decisionBundle?.creedaDecision as Record<string, unknown> | undefined;
  const trustSummary = creedaDecision?.trustSummary as Record<string, unknown> | undefined;

  const confidenceLevel =
    trustSummary?.confidenceLevel === "LOW" ||
    trustSummary?.confidenceLevel === "MEDIUM" ||
    trustSummary?.confidenceLevel === "HIGH"
      ? (trustSummary.confidenceLevel as SquadMember["confidence_level"])
      : creedaDecision?.confidenceLevel === "LOW" ||
          creedaDecision?.confidenceLevel === "MEDIUM" ||
          creedaDecision?.confidenceLevel === "HIGH"
        ? (creedaDecision.confidenceLevel as SquadMember["confidence_level"])
        : null;

  const dataQuality =
    trustSummary?.dataQuality === "COMPLETE" ||
    trustSummary?.dataQuality === "PARTIAL" ||
    trustSummary?.dataQuality === "WEAK"
      ? (trustSummary.dataQuality as SquadMember["data_quality"])
      : null;

  return { confidenceLevel, dataQuality };
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function parsePersistedDecision(trace: unknown) {
  if (!trace || typeof trace !== "object") return null;
  const record = trace as Record<string, unknown>;
  const candidate =
    (record.decisionBundle as Record<string, unknown> | undefined) ||
    (record.engineResult as Record<string, unknown> | undefined) ||
    (record.result as Record<string, unknown> | undefined);

  if (candidate?.creedaDecision && candidate?.metrics) return candidate;
  return null;
}

function normalizeCoachRehabPhase(value: unknown): 1 | 2 | 3 | 4 | 5 | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (numeric <= 1) return 1;
  if (numeric >= 5) return 5;
  return Math.round(numeric) as 1 | 2 | 3 | 4 | 5;
}

function getCoachRehabLabel(phase: 1 | 2 | 3 | 4 | 5) {
  if (phase === 1) return "Acute";
  if (phase === 2) return "Isometric";
  if (phase === 3) return "Strength";
  if (phase === 4) return "Dynamic";
  return "Return to Sport";
}

function normalizeCoachInjuryType(value: unknown) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === "LOWER_BACK") return "Lower Back";
  return normalized.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeLoadTolerancePct(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (numeric <= 1) return Math.max(0, Math.min(100, Math.round(numeric * 100)));
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function buildCoachRehabRestrictions(
  phase: 1 | 2 | 3 | 4 | 5,
  persisted: string[]
) {
  if (persisted.length > 0) return Array.from(new Set(persisted)).slice(0, 3);

  if (phase <= 2) {
    return [
      "Avoid uncontrolled speed and chaotic direction changes.",
      "Keep loading submaximal until pain and control stay stable.",
    ];
  }

  if (phase === 3) {
    return [
      "Progress strength only if tissue response stays calm for 24 hours.",
      "Do not jump back into full sport chaos yet.",
    ];
  }

  if (phase === 4) {
    return [
      "Add speed and reactive work gradually before full return exposure.",
      "Keep volume controlled while movement quality catches up.",
    ];
  }

  return [
    "Return to sport should still be staged, not all-or-nothing.",
    "Use controlled sport exposure before full competition demand.",
  ];
}

function buildCoachRehabNextAction(args: {
  phase: 1 | 2 | 3 | 4 | 5;
  progressionReadiness: boolean;
  lastPainScore: number | null;
}) {
  if (args.progressionReadiness) {
    return "Progression looks viable. Review tissue response and decide whether the athlete can move to the next rehab stage.";
  }

  if ((args.lastPainScore || 0) >= 5) {
    return "Pain is still high enough that the current stage should stay protected before any progression discussion.";
  }

  if (args.phase <= 2) {
    return "Protect tissue calm, keep the work controlled, and delay high-chaos loading.";
  }

  if (args.phase === 5) {
    return "Use staged sport exposure and monitor response before green-lighting full return-to-play demand.";
  }

  return "Keep building repeatable quality at the current stage before progressing the rehab load.";
}

function buildCoachRehabSummary(
  trace: unknown,
  latestHistory: Record<string, unknown> | null
): CoachRehabSummary | null {
  const persistedDecision = parsePersistedDecision(trace);
  const creedaDecision = persistedDecision?.creedaDecision as Record<string, unknown> | undefined;
  const progression = (creedaDecision?.progression as Record<string, unknown> | undefined) || {};
  const rehabStage = (progression.rehabStage as Record<string, unknown> | undefined) || {};
  const injuryContext = (rehabStage.injuryContext as Record<string, unknown> | undefined) || {};

  const phase =
    normalizeCoachRehabPhase(rehabStage.phase) ||
    normalizeCoachRehabPhase(latestHistory?.stage);
  const injuryType =
    normalizeCoachInjuryType(injuryContext.type) ||
    normalizeCoachInjuryType(latestHistory?.injury_type);

  if (!phase || !injuryType) return null;

  const label = String(rehabStage.label || getCoachRehabLabel(phase));
  const constraints = (creedaDecision?.constraints as Record<string, unknown> | undefined) || {};
  const restrictions = buildCoachRehabRestrictions(phase, readStringArray(constraints.avoid));
  const progressionReadiness = Boolean(
    rehabStage.progressionReadiness ??
      progression.progressionReadiness
  );
  const lastPainScore = Number.isFinite(Number(latestHistory?.pain_score))
    ? Number(latestHistory?.pain_score)
    : null;
  const loadTolerancePct = normalizeLoadTolerancePct(latestHistory?.load_tolerance);
  const progressionFlag =
    latestHistory?.progression_flag === "progressed" ||
    latestHistory?.progression_flag === "regressed" ||
    latestHistory?.progression_flag === "held" ||
    latestHistory?.progression_flag === "started"
      ? latestHistory.progression_flag
      : null;

  return {
    active: true,
    injuryType,
    phase,
    label,
    daysInPhase: Number.isFinite(Number(rehabStage.daysInPhase)) ? Number(rehabStage.daysInPhase) : null,
    progressionReadiness,
    progressionFlag,
    lastPainScore,
    loadTolerancePct,
    restrictions,
    nextAction: buildCoachRehabNextAction({ phase, progressionReadiness, lastPainScore }),
    updatedAt: latestHistory?.date ? String(latestHistory.date) : null,
  };
}

function parseReasonCodes(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function parseCoachInterventionRecord(row: unknown): CoachInterventionRecord | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;

  const queueType =
    record.queue_type === "intervention" || record.queue_type === "low_data"
      ? record.queue_type
      : null;
  const status =
    record.status === "new" || record.status === "acknowledged" || record.status === "resolved"
      ? record.status
      : null;
  const priority =
    record.priority === "Critical" || record.priority === "Warning" || record.priority === "Informational"
      ? record.priority
      : "Informational";

  if (!queueType || !status || typeof record.id !== "string") return null;

  return {
    id: record.id,
    queue_type: queueType,
    status,
    priority,
    reason_codes: parseReasonCodes(record.reason_codes),
    recommendation: record.recommendation ? String(record.recommendation) : null,
    source_log_date: String(record.source_log_date || ""),
    updated_at: String(record.updated_at || ""),
    acknowledged_at: record.acknowledged_at ? String(record.acknowledged_at) : null,
    resolved_at: record.resolved_at ? String(record.resolved_at) : null,
    notes: record.notes ? String(record.notes) : null,
  };
}

function updatePersistedCoachRecord(
  record: CoachInterventionRecord | null | undefined,
  id: string,
  updates: Partial<CoachInterventionRecord>
) {
  if (!record || record.id !== id) return record ?? null;
  return {
    ...record,
    ...updates,
  };
}

function getRecentDateIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);
}

function buildCoachObjectiveTestSummary(sessions: ObjectiveTestSession[]): CoachObjectiveTestSummary {
  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
    .slice(0, 24);
  const baselines = computeObjectiveBaselines(recentSessions);
  const signals = summarizeObjectiveSignals(recentSessions, baselines);
  const primarySignal = signals[0] || null;
  const primarySessions = primarySignal
    ? recentSessions.filter((session) => session.testType === primarySignal.protocolId)
    : [];
  const latestSession = primarySessions[0] || null;
  const previousSession = primarySessions[1] || null;
  const latestValidatedScoreMs =
    primarySignal?.headlineMetricUnit === "ms"
      ? Math.round(primarySignal.headlineMetricValue ?? latestSession?.validatedScoreMs ?? 0)
      : null;
  const previousValidatedScoreMs =
    previousSession?.headlineMetricUnit === "ms"
      ? Math.round(previousSession.headlineMetricValue ?? previousSession?.validatedScoreMs ?? 0)
      : null;
  const deltaVsPreviousMs =
    latestValidatedScoreMs !== null && previousValidatedScoreMs !== null
      ? latestValidatedScoreMs - previousValidatedScoreMs
      : null;
  const freshness: CoachObjectiveTestSummary["freshness"] = primarySignal?.freshness || "missing";
  const trend: CoachObjectiveTestSummary["trend"] = primarySignal?.trend || "missing";

  const weekSessionCount = recentSessions.filter((session) => {
    const date = session.completedAt?.slice(0, 10);
    return Boolean(date && date >= getRecentDateIso(7));
  }).length;

  const summary =
    primarySignal?.summary ||
    "Objective testing is optional. No saved measured session is attached yet.";

  const nextAction =
    primarySignal?.nextAction ||
    "Optional: invite the athlete to run a measured test if you want one extra objective anchor.";

  return {
    latestValidatedScoreMs,
    previousValidatedScoreMs,
    deltaVsPreviousMs,
    trend,
    freshness,
    classification: latestSession?.classification || null,
    completedAt: latestSession?.completedAt || null,
    recentSessionCount: recentSessions.length,
    weekSessionCount,
    summary,
    nextAction,
    primaryProtocolId: primarySignal?.protocolId || null,
    latestHeadlineMetricValue: primarySignal?.headlineMetricValue ?? null,
    latestHeadlineMetricUnit: primarySignal?.headlineMetricUnit || null,
    latestHeadlineMetricLabel: primarySignal?.headlineMetricLabel || null,
    primarySignal,
    signals,
  };
}

export const CreedaProvider: React.FC<CreedaProviderProps> = ({ children, initialData }) => {
  const [state, setState] = useState<CreedaState>({
    ...defaultState,
    ...initialData,
  });
  const supabase = createClient();
  const hasHydratedDashboardData = Boolean(initialData?.readinessScore || initialData?.latestDailyLog);

  const syncData = useCallback(async (userId: string) => {
    try {
      // Fetch latest intelligence
      const { data: intel } = await supabase
        .from("computed_intelligence")
        .select("readiness_score")
        .eq("user_id", userId)
        .order("log_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch diagnostic (baselines, goal)
      const { data: diagnostic } = await supabase
        .from("diagnostics")
        .select("primary_goal, physiology_profile, reaction_profile, performance_baseline, profile_data, training_reality")
        .eq("athlete_id", userId)
        .maybeSingle();

      // Fetch latest daily log
      const { data: latestLog } = await supabase
        .from("daily_load_logs")
        .select("*")
        .eq("athlete_id", userId)
        .order("log_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch historical logs (last 28 days)
      const { data: historicalLogs } = await supabase
        .from("daily_load_logs")
        .select("*")
        .eq("athlete_id", userId)
        .order("log_date", { ascending: false })
        .limit(28);

      // Fetch Adaptation Profile
      const { data: adaptation } = await supabase
        .from("adaptation_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      // Fetch Performance Profile
      const { data: performance } = await supabase
        .from("performance_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      // Fetch Vision Faults
      const { data: vision } = await supabase
        .from("vision_faults")
        .select("*")
        .eq("athlete_id", userId);
        
      let readinessScore = 0;
      
      if (intel) {
        readinessScore = intel.readiness_score || 0;
      }

      // If user is an individual, fetch their specialized profile
      let individualProfile = null;
      if (state.userType === 'individual') {
        const { data: ind } = await supabase
          .from("individual_profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        individualProfile = ind;
      }

        setState(prev => ({
          ...prev,
          readinessScore,
          confidenceScore: 0, 
        lastSync: new Date().toISOString(),
        primaryGoal: diagnostic?.primary_goal || individualProfile?.goal_profile?.primaryGoal || '',
        diagnostic: diagnostic || null,
        individualProfile: individualProfile || null,
        latestDailyLog: latestLog || null,
        historicalLogs: historicalLogs || [],
        performanceBaseline: diagnostic?.performance_baseline || null,
        adaptationProfile: adaptation || null,
        performanceProfile: performance || null,
        visionFaults: vision || [],
        rehabHistory: [],
      }));
    } catch (e) {
      console.error("Error syncing data:", e);
    }
  }, [supabase, state.userType]);

  const syncSquadData = useCallback(async (coachId: string) => {
    try {
      // 1. Fetch all teams owned by the coach
      const { data: teams, error: teamError } = await supabase
        .from("teams")
        .select("id, team_name, invite_code, academy_name, academy_type, academy_city, age_band_focus, parent_handoff_enabled, low_cost_mode")
        .eq("coach_id", coachId);

      if (teamError) throw teamError;

      const baseSquadData: TeamData[] = [];
      const athleteIds: string[] = [];
      const pendingInterventions = new Map<string, Record<string, unknown>>();
      const intelligenceTraceByAthlete = new Map<string, unknown>();

      for (const team of (teams || [])) {
        // 2. Fetch members for each team
        const { data: members, error: memberError } = await supabase
          .from("team_members")
          .select(`
            athlete_id,
            profiles:athlete_id (id, full_name, avatar_url, date_of_birth, guardian_consent_confirmed)
          `)
          .eq("team_id", team.id)
          .eq("status", "Active");

        if (memberError) continue;

        const squadMembers: SquadMember[] = [];

        for (const m of ((members || []) as TeamMemberRow[])) {
          const athlete = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          if (!athlete) continue;
          athleteIds.push(athlete.id);
          const ageYears = calculateAgeFromDateOfBirth(athlete.date_of_birth || null);
          const isJunior = typeof ageYears === "number" ? ageYears < 18 : false;

          // 3. Fetch latest intelligence & vision faults for each athlete
          const { data: intel } = await supabase
            .from("computed_intelligence")
            .select("readiness_score, status, risk_score, created_at, log_date, action_instruction, alert_priority, intelligence_trace")
            .eq("user_id", athlete.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const { data: vision } = await supabase
            .from("daily_load_logs")
            .select("vision_faults")
            .eq("athlete_id", athlete.id)
            .order("log_date", { ascending: false })
            .limit(1)
            .maybeSingle();

          const persistedTrust = parsePersistedTrustSummary(intel?.intelligence_trace);
          intelligenceTraceByAthlete.set(athlete.id, intel?.intelligence_trace || null);
          const baseMember: SquadMember = {
            id: athlete.id,
            full_name: athlete.full_name,
            avatar_url: athlete.avatar_url,
            date_of_birth: athlete.date_of_birth || null,
            age_years: ageYears,
            is_junior: isJunior,
            guardian_consent_confirmed: Boolean(athlete.guardian_consent_confirmed),
            guardian_profile: null,
            readiness_score: intel?.readiness_score || 0,
            status: intel?.status || 'UNKNOWN',
            risk_score: Number(intel?.risk_score) || 0,
            last_logged: String(intel?.log_date || intel?.created_at || ''),
            vision_faults: vision?.vision_faults || [],
            action_instruction: intel?.action_instruction || null,
            alert_priority: intel?.alert_priority || null,
            confidence_level: persistedTrust.confidenceLevel,
            data_quality: persistedTrust.dataQuality,
            objective_test: null,
            rehab_summary: null,
            stale_hours: null,
            intervention_priority: null,
            intervention_reasons: [],
            intervention_recommendation: null,
            intervention_source_log_date: null,
            intervention_record: null,
            low_data_priority: null,
            low_data_reasons: [],
            low_data_recommendation: null,
            low_data_source_log_date: null,
            low_data_record: null,
          };

          squadMembers.push(baseMember);
        }

        baseSquadData.push({
          id: team.id,
          team_name: team.team_name,
          invite_code: team.invite_code,
          academy_profile: createAcademyTeamProfile(team as Record<string, unknown>),
          members: squadMembers
        });
      }

      const objectiveSummaryByAthlete = new Map<string, CoachObjectiveTestSummary>();
      const rehabSummaryByAthlete = new Map<string, CoachRehabSummary | null>();
      const guardianProfileByAthlete = new Map<string, GuardianProfileSummary>();
      let objectiveSummaryAvailable = true;
      if (athleteIds.length > 0) {
        const uniqueAthleteIds = Array.from(new Set(athleteIds));
        const { data: guardianRows, error: guardianRowsError } = await supabase
          .from("athlete_guardian_profiles")
          .select("athlete_id, guardian_name, guardian_relationship, guardian_phone, guardian_email, emergency_contact_name, emergency_contact_phone, consent_status, handoff_preference, last_handoff_sent_at, notes")
          .in("athlete_id", uniqueAthleteIds);

        if (guardianRowsError) {
          console.error("[SquadSync] Guardian profile fetch error:", guardianRowsError);
        } else {
          (guardianRows || []).forEach((row) => {
            const record = row as GuardianProfileRow;
            if (!record.athlete_id) return;
            const baseMember = baseSquadData
              .flatMap((team) => team.members)
              .find((member) => member.id === record.athlete_id);

            guardianProfileByAthlete.set(
              record.athlete_id,
              createGuardianProfileSummary({
                athleteId: record.athlete_id,
                record: row as Record<string, unknown>,
                guardianConsentConfirmed: baseMember?.guardian_consent_confirmed,
              })
            );
          });
        }

        const { data: objectiveSessions, error: objectiveSessionsError } = await supabase
          .from("objective_test_sessions")
          .select("*")
          .in("user_id", uniqueAthleteIds)
          .order("completed_at", { ascending: false });

        if (objectiveSessionsError) {
          objectiveSummaryAvailable = false;
          console.error("[SquadSync] Objective test fetch error:", objectiveSessionsError);
        } else {
          const groupedSessions = new Map<string, ObjectiveTestSession[]>();

          (objectiveSessions || [])
            .map(normalizeObjectiveTestSession)
            .filter((session): session is ObjectiveTestSession => Boolean(session))
            .forEach((session) => {
              const existing = groupedSessions.get(session.userId) || [];
              existing.push(session);
              groupedSessions.set(session.userId, existing);
            });

          uniqueAthleteIds.forEach((athleteId) => {
            objectiveSummaryByAthlete.set(
              athleteId,
              buildCoachObjectiveTestSummary(groupedSessions.get(athleteId) || [])
            );
          });
        }

        const { data: rehabRows, error: rehabRowsError } = await supabase
          .from("rehab_history")
          .select("user_id, date, injury_type, stage, pain_score, load_tolerance, progression_flag")
          .in("user_id", uniqueAthleteIds)
          .order("date", { ascending: false });

        if (rehabRowsError) {
          console.error("[SquadSync] Rehab history fetch error:", rehabRowsError);
        } else {
          const latestRehabByAthlete = new Map<string, Record<string, unknown>>();
          (rehabRows || []).forEach((row) => {
            const record = row as Record<string, unknown>;
            const athleteId = String(record.user_id || "");
            if (!athleteId || latestRehabByAthlete.has(athleteId)) return;
            latestRehabByAthlete.set(athleteId, record);
          });

          uniqueAthleteIds.forEach((athleteId) => {
            rehabSummaryByAthlete.set(
              athleteId,
              buildCoachRehabSummary(
                intelligenceTraceByAthlete.get(athleteId),
                latestRehabByAthlete.get(athleteId) || null
              )
            );
          });
        }
      }

      const fullSquadData = baseSquadData.map((team) => ({
        ...team,
        members: team.members.map((member) => {
          const objectiveTest =
            objectiveSummaryByAthlete.get(member.id) ||
            (objectiveSummaryAvailable ? buildCoachObjectiveTestSummary([]) : null);
          const rehabSummary = rehabSummaryByAthlete.get(member.id) || null;
          const enrichedMember: SquadMember = {
            ...member,
            guardian_profile:
              guardianProfileByAthlete.get(member.id) ||
              createGuardianProfileSummary({
                athleteId: member.id,
                record: null,
                guardianConsentConfirmed: member.guardian_consent_confirmed,
              }),
            objective_test: objectiveTest,
            rehab_summary: rehabSummary,
          };
          const interventionSignal = derivePerformanceQueueSignal(enrichedMember);
          const lowDataSignal = deriveLowDataQueueSignal(enrichedMember);

          if (interventionSignal) {
            const key = buildCoachInterventionKey({
              athleteId: member.id,
              teamId: team.id,
              queueType: interventionSignal.queueType,
              sourceLogDate: interventionSignal.sourceLogDate,
            });
            pendingInterventions.set(key, {
              coach_id: coachId,
              athlete_id: member.id,
              team_id: team.id,
              queue_type: interventionSignal.queueType,
              source_log_date: interventionSignal.sourceLogDate,
              reason_codes: interventionSignal.reasonCodes,
              recommendation: interventionSignal.recommendation,
              priority: interventionSignal.priority,
              last_seen_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }

          if (lowDataSignal) {
            const key = buildCoachInterventionKey({
              athleteId: member.id,
              teamId: team.id,
              queueType: lowDataSignal.queueType,
              sourceLogDate: lowDataSignal.sourceLogDate,
            });
            pendingInterventions.set(key, {
              coach_id: coachId,
              athlete_id: member.id,
              team_id: team.id,
              queue_type: lowDataSignal.queueType,
              source_log_date: lowDataSignal.sourceLogDate,
              reason_codes: lowDataSignal.reasonCodes,
              recommendation: lowDataSignal.recommendation,
              priority: lowDataSignal.priority,
              last_seen_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }

          return {
            ...enrichedMember,
            stale_hours: lowDataSignal?.staleHours ?? interventionSignal?.staleHours ?? null,
            intervention_priority: interventionSignal?.priority || null,
            intervention_reasons: interventionSignal?.reasonCodes || [],
            intervention_recommendation: interventionSignal?.recommendation || null,
            intervention_source_log_date: interventionSignal?.sourceLogDate || null,
            intervention_record: null,
            low_data_priority: lowDataSignal?.priority || null,
            low_data_reasons: lowDataSignal?.reasonCodes || [],
            low_data_recommendation: lowDataSignal?.recommendation || null,
            low_data_source_log_date: lowDataSignal?.sourceLogDate || null,
            low_data_record: null,
          };
        }),
      }));

      if (pendingInterventions.size > 0) {
        const { error: queueUpsertError } = await supabase
          .from("coach_interventions")
          .upsert(Array.from(pendingInterventions.values()), {
            onConflict: "coach_id,athlete_id,team_id,queue_type,source_log_date",
          });

        if (queueUpsertError) {
          console.error("[CoachQueue] Upsert error:", queueUpsertError);
        }
      }

      const interventionMap = new Map<string, CoachInterventionRecord>();
      const rosterLookup = new Map<string, {
        athlete_name: string;
        athlete_avatar_url: string | null;
        team_name: string;
        readiness_score: number;
        risk_score: number;
        confidence_level?: SquadMember["confidence_level"];
        data_quality?: SquadMember["data_quality"];
        objective_test?: CoachObjectiveTestSummary | null;
        stale_hours?: number | null;
      }>();
      fullSquadData.forEach((team) => {
        team.members.forEach((member) => {
          rosterLookup.set(`${team.id}:${member.id}`, {
            athlete_name: member.full_name,
            athlete_avatar_url: member.avatar_url,
            team_name: team.team_name,
            readiness_score: member.readiness_score,
            risk_score: member.risk_score,
            confidence_level: member.confidence_level,
            data_quality: member.data_quality,
            objective_test: member.objective_test || null,
            stale_hours: member.stale_hours ?? null,
          });
        });
      });

      const coachInterventionFeed: CoachInterventionFeedItem[] = [];
      if (athleteIds.length > 0) {
        const uniqueAthleteIds = Array.from(new Set(athleteIds));
        const { data: persistedInterventions, error: persistedInterventionsError } = await supabase
          .from("coach_interventions")
          .select("id, athlete_id, team_id, queue_type, status, priority, reason_codes, recommendation, source_log_date, acknowledged_at, resolved_at, updated_at, notes")
          .eq("coach_id", coachId)
          .in("athlete_id", uniqueAthleteIds)
          .order("updated_at", { ascending: false });

        if (persistedInterventionsError) {
          console.error("[CoachQueue] Fetch error:", persistedInterventionsError);
        } else {
          (persistedInterventions || []).forEach((row) => {
            const parsed = parseCoachInterventionRecord(row);
            if (!parsed) return;
            const record = row as Record<string, unknown>;
            const athleteId = String(record.athlete_id || "");
            const teamId = String(record.team_id || "");
            const rosterContext = rosterLookup.get(`${teamId}:${athleteId}`);
            const key = buildCoachInterventionKey({
              athleteId,
              teamId,
              queueType: parsed.queue_type,
              sourceLogDate: parsed.source_log_date,
            });

            if (!interventionMap.has(key)) {
              interventionMap.set(key, parsed);
            }

            coachInterventionFeed.push({
              ...parsed,
              athlete_id: athleteId,
              athlete_name: rosterContext?.athlete_name || "Athlete",
              athlete_avatar_url: rosterContext?.athlete_avatar_url || null,
              team_id: teamId,
              team_name: rosterContext?.team_name || "Team",
              readiness_score: rosterContext?.readiness_score || 0,
              risk_score: rosterContext?.risk_score || 0,
              confidence_level: rosterContext?.confidence_level || null,
              data_quality: rosterContext?.data_quality || null,
              objective_test: rosterContext?.objective_test || null,
              stale_hours: rosterContext?.stale_hours ?? null,
            });
          });
        }
      }

      coachInterventionFeed.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      const hydratedSquadData = fullSquadData.map((team) => ({
        ...team,
        members: team.members.map((member) => {
          const interventionKey =
            member.intervention_source_log_date
              ? buildCoachInterventionKey({
                  athleteId: member.id,
                  teamId: team.id,
                  queueType: "intervention",
                  sourceLogDate: member.intervention_source_log_date,
                })
              : null;
          const lowDataKey =
            member.low_data_source_log_date
              ? buildCoachInterventionKey({
                  athleteId: member.id,
                  teamId: team.id,
                  queueType: "low_data",
                  sourceLogDate: member.low_data_source_log_date,
                })
              : null;

          return {
            ...member,
            intervention_record: interventionKey ? interventionMap.get(interventionKey) || null : null,
            low_data_record: lowDataKey ? interventionMap.get(lowDataKey) || null : null,
          };
        }),
      }));
      setState((prev) => ({
        ...prev,
        squadData: hydratedSquadData,
        coachInterventions: coachInterventionFeed,
        lastSync: new Date().toISOString(),
      }));
    } catch (e) {
      console.error("[SquadSync] Error:", e);
    }
  }, [supabase]);

  // Initialize State from Auth & Profile
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role, primary_sport, position")
          .eq("id", user.id)
          .single();

        if (error) console.error("Error fetching profile roles:", error);

        setState(prev => ({
          ...prev,
          userId: user.id,
          userType: profile?.role || null,
          sport: profile?.primary_sport || '',
          position: profile?.position || '',
        }));
        
        // --- OPTIMIZATION (Fix #2) ---
        // Only trigger initial sync if we don't have hydrated readiness data or historical logs.
        // This prevents the redundant 'double-fetch' on dashboard load.
        if (profile?.role === 'coach') {
          await syncSquadData(user.id);
        } else if (!hasHydratedDashboardData) {
          await syncData(user.id);
        } else {
           setState(prev => ({ ...prev, lastSync: new Date().toISOString() }));
        }
      }
    };

    init();

    // Listen for connectivity
    const handleOnline = () => setState(s => ({ ...s, isOnline: true }));
    const handleOffline = () => setState(s => ({ ...s, isOnline: false }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [hasHydratedDashboardData, syncData, syncSquadData, supabase]);

  const setMode = useCallback((mode: PerformanceMode) => {
    setState(prev => ({ ...prev, performanceMode: mode }));
  }, []);

  const sync = useCallback(async () => {
    if (!state.userId) return;
    if (state.userType === "coach") {
      await syncSquadData(state.userId);
      return;
    }
    await syncData(state.userId);
  }, [state.userId, state.userType, syncData, syncSquadData]);

  const updateCoachInterventionStatus = useCallback(async (id: string, status: CoachInterventionStatus) => {
    const nowIso = new Date().toISOString();
    const payload: Record<string, string> = {
      status,
      updated_at: nowIso,
    };

    if (status === "acknowledged") {
      payload.acknowledged_at = nowIso;
    }

    if (status === "resolved") {
      payload.resolved_at = nowIso;
      payload.acknowledged_at = nowIso;
    }

    const { error } = await supabase
      .from("coach_interventions")
      .update(payload)
      .eq("id", id);

    if (error) throw error;

    setState((prev) => ({
      ...prev,
      squadData: prev.squadData.map((team) => ({
        ...team,
        members: team.members.map((member) => ({
          ...member,
          intervention_record:
            member.intervention_record?.id === id
              ? { ...member.intervention_record, status, updated_at: nowIso, acknowledged_at: payload.acknowledged_at || member.intervention_record.acknowledged_at, resolved_at: payload.resolved_at || member.intervention_record.resolved_at }
              : member.intervention_record,
          low_data_record:
            member.low_data_record?.id === id
              ? { ...member.low_data_record, status, updated_at: nowIso, acknowledged_at: payload.acknowledged_at || member.low_data_record.acknowledged_at, resolved_at: payload.resolved_at || member.low_data_record.resolved_at }
              : member.low_data_record,
        })),
      })),
      coachInterventions: prev.coachInterventions.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              updated_at: nowIso,
              acknowledged_at: payload.acknowledged_at || item.acknowledged_at,
              resolved_at: payload.resolved_at || item.resolved_at,
            }
          : item
      ),
    }));

    if (state.userId) {
      await syncSquadData(state.userId);
    }
  }, [state.userId, supabase, syncSquadData]);

  const updateCoachInterventionNotes = useCallback(async (id: string, notes: string | null) => {
    const nowIso = new Date().toISOString();
    const payload = {
      notes,
      updated_at: nowIso,
    };

    const { error } = await supabase
      .from("coach_interventions")
      .update(payload)
      .eq("id", id);

    if (error) throw error;

    setState((prev) => ({
      ...prev,
      squadData: prev.squadData.map((team) => ({
        ...team,
        members: team.members.map((member) => ({
          ...member,
          intervention_record: updatePersistedCoachRecord(member.intervention_record, id, { notes, updated_at: nowIso }),
          low_data_record: updatePersistedCoachRecord(member.low_data_record, id, { notes, updated_at: nowIso }),
        })),
      })),
      coachInterventions: prev.coachInterventions.map((item) =>
        item.id === id
          ? {
              ...item,
              notes,
              updated_at: nowIso,
            }
          : item
      ),
    }));
  }, [supabase]);

  const addAlert = useCallback((alert: Omit<CreedaState["alerts"][0], "id" | "timestamp">) => {
    const newAlert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      alerts: [newAlert, ...prev.alerts].slice(0, 10), // Keep last 10
    }));
  }, []);

  const clearAlert = useCallback((alertId: string) => {
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.filter(a => a.id !== alertId),
    }));
  }, []);

  // Initialize Notification Engine
  useEffect(() => {
    initializeNotificationEngine(addAlert);
  }, [addAlert]);

  const value = useMemo(() => ({
    state,
    setMode,
    sync,
    updateCoachInterventionStatus,
    updateCoachInterventionNotes,
    addAlert,
    clearAlert,
  }), [state, sync, updateCoachInterventionNotes, updateCoachInterventionStatus, setMode, addAlert, clearAlert]);

  return <CreedaContext.Provider value={value}>{children}</CreedaContext.Provider>;
};

export const useCreedaState = () => {
  const context = useContext(CreedaContext);
  if (!context) {
    throw new Error("useCreedaState must be used within a CreedaProvider");
  }
  return context;
};
