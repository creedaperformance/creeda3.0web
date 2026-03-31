"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
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
}

export interface SquadMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  readiness_score: number;
  status: string;
  risk_score: number;
  last_logged: string;
  vision_faults: any[];
}

export interface TeamData {
  id: string;
  team_name: string;
  invite_code: string;
  members: SquadMember[];
}

interface CreedaContextType {
  state: CreedaState;
  setMode: (mode: PerformanceMode) => void;
  sync: () => Promise<void>;
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
};

const CreedaContext = createContext<CreedaContextType | undefined>(undefined);

export const CreedaProvider: React.FC<CreedaProviderProps> = ({ children, initialData }) => {
  const [state, setState] = useState<CreedaState>({
    ...defaultState,
    ...initialData,
  });
  const supabase = createClient();

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
      let confidenceScore = 0;
      
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
        .select("id, team_name, invite_code")
        .eq("coach_id", coachId);

      if (teamError) throw teamError;

      const fullSquadData: TeamData[] = [];

      for (const team of (teams || [])) {
        // 2. Fetch members for each team
        const { data: members, error: memberError } = await supabase
          .from("team_members")
          .select(`
            athlete_id,
            profiles:athlete_id (id, full_name, avatar_url)
          `)
          .eq("team_id", team.id)
          .eq("status", "Active");

        if (memberError) continue;

        const squadMembers: SquadMember[] = [];

        for (const m of (members || [])) {
          const athlete = m.profiles as any;
          if (!athlete) continue;

          // 3. Fetch latest intelligence & vision faults for each athlete
          const { data: intel } = await supabase
            .from("computed_intelligence")
            .select("readiness_score, status, risk_score, created_at")
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

          squadMembers.push({
            id: athlete.id,
            full_name: athlete.full_name,
            avatar_url: athlete.avatar_url,
            readiness_score: intel?.readiness_score || 0,
            status: intel?.status || 'UNKNOWN',
            risk_score: Number(intel?.risk_score) || 0,
            last_logged: intel?.created_at || '',
            vision_faults: vision?.vision_faults || []
          });
        }

        fullSquadData.push({
          id: team.id,
          team_name: team.team_name,
          invite_code: team.invite_code,
          members: squadMembers
        });
      }

      setState(prev => ({ ...prev, squadData: fullSquadData, lastSync: new Date().toISOString() }));
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
        const isHydrated = !!(initialData?.readinessScore || initialData?.latestDailyLog);
        
        if (profile?.role === 'coach') {
          await syncSquadData(user.id);
        } else if (!isHydrated) {
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
  }, [syncData, supabase]);

  const setMode = useCallback((mode: PerformanceMode) => {
    setState(prev => ({ ...prev, performanceMode: mode }));
  }, []);

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
    sync: () => syncData(state.userId || ""),
    addAlert,
    clearAlert,
  }), [state, syncData, setMode, addAlert, clearAlert]);

  return <CreedaContext.Provider value={value}>{children}</CreedaContext.Provider>;
};

export const useCreedaState = () => {
  const context = useContext(CreedaContext);
  if (!context) {
    throw new Error("useCreedaState must be used within a CreedaProvider");
  }
  return context;
};
