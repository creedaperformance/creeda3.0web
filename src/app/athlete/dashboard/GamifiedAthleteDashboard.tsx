"use client";

import React, { useMemo, useState, useEffect } from "react";
import { HUDLabel } from "@/components/gamified/HUDLabel";
import { PerformanceModeSwitch } from "@/components/gamified/PerformanceModeSwitch";
import { useCreedaState } from "@/lib/state_engine";
import { getDashboardIntelligence } from "@/lib/sport_dashboard_engine";
import { SportHeroSection } from "./components/SportHeroSection";
import { RevolutionaryEnginesRow } from "./components/RevolutionaryEnginesRow";
import { TodaysPlanSection } from "./components/TodaysPlanSection";
import { PerformanceProfileSection } from "./components/PerformanceProfileSection";
import { BenchmarkComparisonSection } from "./components/BenchmarkComparisonSection";
import { InjuryRiskSection } from "./components/InjuryRiskSection";
import { WorkloadPanel } from "./components/WorkloadPanel";
import { SportIntelligenceSection } from "./components/SportIntelligenceSection";
import { GamifiedCard } from "@/components/gamified/GamifiedCard";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const GamifiedAthleteDashboard: React.FC = () => {
  const { state, sync } = useCreedaState();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    await sync();
    setTimeout(() => setIsSyncing(false), 1500); // Visual duration
  };

  // Compute all dashboard intelligence from sport context
  const intelligence = useMemo(() => {
    return getDashboardIntelligence({
      sport: state.sport || 'football',
      position: state.position || 'Midfielder',
      readinessScore: state.readinessScore || 72,
      goal: state.primaryGoal || 'Performance Enhancement',
      dailyLog: state.latestDailyLog || {},
      diagnostic: state.diagnostic || {},
      historicalLogs: state.historicalLogs || [],
    });
  }, [state.sport, state.position, state.readinessScore, state.primaryGoal, state.latestDailyLog, state.diagnostic, state.historicalLogs]);

  // Goal-based section ordering
  const goalLower = (state.primaryGoal || '').toLowerCase();
  const isInjuryFocus = goalLower.includes('injury') && goalLower.includes('prevention');
  const isReturnToPlay = goalLower.includes('return');

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 },
  };

  if (!isMounted) {
    return <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6 md:pl-72 pb-24 md:pb-6 flex items-center justify-center">
      <div className="animate-pulse text-sm font-bold tracking-widest uppercase text-slate-500 font-orbitron">Initializing Core HUD...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6 md:pl-72 pb-24 md:pb-6">
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <HUDLabel index="00" label="System Active" />
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 font-orbitron">
              {intelligence.sportName} · {intelligence.positionName}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black italic font-orbitron uppercase tracking-tighter">
            Athlete<span className="text-blue-500">HUD</span>
          </h1>
        </div>
        <PerformanceModeSwitch />
      </header>

      <div className="space-y-6">
        {/* ─── SECTION 1: Hero + Confidence ────────────────────────── */}
        <motion.div {...fadeIn} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SportHeroSection
            hero={intelligence.hero}
            sportName={intelligence.sportName}
            positionName={intelligence.positionName}
          />
          {/* Sidebar: Confidence + Goal */}
          <div className="space-y-4">
            <GamifiedCard glowColor="rgba(16,185,129,0.3)">
              <HUDLabel index="S1" label="System Confidence" />
              <div className="mt-3 flex items-center justify-between">
                <div className="text-3xl font-black font-orbitron italic">
                  {state.confidenceScore || 87}%
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest font-orbitron">
                    High Reliability
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase">
                    Data Freshness: 100%
                  </span>
                </div>
              </div>
            </GamifiedCard>

            <GamifiedCard className="bg-slate-900/40">
              <HUDLabel index="S2" label="Active Goal" />
              <div className="mt-3">
                <span className="text-sm font-bold text-blue-400 uppercase tracking-tight font-orbitron">
                  {state.primaryGoal || 'Performance Enhancement'}
                </span>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  Dashboard adapted to prioritize metrics aligned with your goal.
                </p>
              </div>
            </GamifiedCard>

            <button
              onClick={handleSync}
              disabled={isSyncing}
              className={cn(
                "w-full py-4 rounded-2xl border transition-all duration-300 font-orbitron text-xs font-bold uppercase tracking-widest",
                isSyncing 
                  ? "bg-blue-500/20 border-blue-500/40 text-blue-400 animate-pulse" 
                  : "border-slate-700/30 bg-slate-900/30 text-slate-500 hover:text-blue-400 hover:border-blue-500/30"
              )}
            >
              {isSyncing ? "◌ Syncing..." : "↻ Force Sync"}
            </button>
          </div>
        </motion.div>

        {/* ─── SECTION 2: Revolutionary Engines (Top 50%) ──────────── */}
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <RevolutionaryEnginesRow
            limiter={intelligence.limiter}
            adaptation={intelligence.adaptation}
            trajectory={intelligence.trajectory}
          />
        </motion.div>

        {/* ─── SECTION 3: Today's Plan + Performance Profile ──────── */}
        <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TodaysPlanSection plan={intelligence.todaysPlan} />
          <PerformanceProfileSection
            metrics={intelligence.performanceProfile}
            positionName={intelligence.positionName}
          />
        </motion.div>

        {/* ─── SECTION 4: Sport Intelligence + Workload ───────────── */}
        <motion.div {...fadeIn} transition={{ delay: 0.3 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isInjuryFocus ? (
            <>
              <InjuryRiskSection risk={intelligence.injuryRisk} />
              <SportIntelligenceSection
                insights={intelligence.sportIntelligence}
                sportName={intelligence.sportName}
              />
            </>
          ) : (
            <>
              <SportIntelligenceSection
                insights={intelligence.sportIntelligence}
                sportName={intelligence.sportName}
              />
              <WorkloadPanel workload={intelligence.workload} />
            </>
          )}
        </motion.div>

        {/* ─── SECTION 5: Benchmarks + Injury Risk ────────────────── */}
        <motion.div {...fadeIn} transition={{ delay: 0.4 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BenchmarkComparisonSection benchmarks={intelligence.benchmarks} />
          {isInjuryFocus ? (
            <WorkloadPanel workload={intelligence.workload} />
          ) : (
            <InjuryRiskSection risk={intelligence.injuryRisk} />
          )}
        </motion.div>

        {/* ─── Return to Play (Conditional) ───────────────────────── */}
        {isReturnToPlay && (
          <motion.div {...fadeIn} transition={{ delay: 0.5 }}>
            <GamifiedCard glowColor="rgba(139,92,246,0.2)">
              <HUDLabel index="RTP" label="Return to Play" />
              <div className="mt-4">
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-2xl font-black font-orbitron text-purple-400">
                    Rehab Phase
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-orbitron">
                    Active Progression
                  </span>
                </div>
                <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden mb-3">
                  <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-400" style={{ width: '65%' }} />
                </div>
                <p className="text-xs text-slate-400">
                  Progressive return protocol in effect. Focus on controlled load increase and movement quality.
                </p>
              </div>
            </GamifiedCard>
          </motion.div>
        )}
      </div>
    </div>
  );
};
