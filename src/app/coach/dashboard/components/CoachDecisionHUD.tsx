"use client";

import React, { useMemo } from "react";
import { useCreedaState, TeamData, SquadMember } from "@/lib/state_engine";
import { motion } from "framer-motion";
import { Users, AlertTriangle, ShieldCheck, Zap, ArrowUpRight, Search } from "lucide-react";

export const CoachDecisionHUD: React.FC = () => {
  const { state } = useCreedaState();
  const { squadData } = state;

  // Aggregate Metrics Across All Teams
  const metrics = useMemo(() => {
    let total = 0;
    let optimal = 0;
    let moderate = 0;
    let critical = 0;
    const highRiskAthletes: (SquadMember & { teamName: string })[] = [];

    squadData.forEach((team) => {
      team.members.forEach((member) => {
        total++;
        if (member.readiness_score >= 75) optimal++;
        else if (member.readiness_score >= 40) moderate++;
        else critical++;

        // Add to high-risk trace if readiness < 50 or risk_score > 1.5
        if (member.readiness_score < 50 || member.risk_score > 1.5) {
          highRiskAthletes.push({ ...member, teamName: team.team_name });
        }
      });
    });

    // Sort high risk by severity
    highRiskAthletes.sort((a, b) => a.readiness_score - b.readiness_score);

    return { total, optimal, moderate, critical, highRiskAthletes };
  }, [squadData]);

  if (metrics.total === 0) {
    return (
      <div className="p-8 rounded-[2rem] bg-slate-900/50 border border-slate-800 text-center">
        <Users className="h-12 w-12 text-slate-700 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white uppercase tracking-tight">No Active Squad Detected</h3>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">
          Invite athletes using your locker code to begin intelligence tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. SQUAD PULSE HERO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="md:col-span-1 p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Roster</span>
            <div className="mt-4">
              <span className="text-5xl font-black italic text-white font-orbitron">{metrics.total}</span>
              <p className="text-[8px] font-bold text-primary uppercase tracking-[0.2em] mt-1">Sync Active</p>
            </div>
         </div>

         <div className="md:col-span-3 p-8 rounded-3xl bg-slate-900 border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
               <ShieldCheck className="h-24 w-24 text-primary" />
            </div>
            <div className="relative z-10">
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Collective Readiness Distribution</span>
               <div className="grid grid-cols-3 gap-6 mt-6">
                  <div className="space-y-2">
                    <span className="text-2xl font-black italic text-emerald-500 font-orbitron">{metrics.optimal}</span>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500" style={{ width: `${(metrics.optimal / metrics.total) * 100}%` }} />
                    </div>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Optimal</p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-2xl font-black italic text-amber-500 font-orbitron">{metrics.moderate}</span>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-amber-500" style={{ width: `${(metrics.moderate / metrics.total) * 100}%` }} />
                    </div>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Moderate</p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-2xl font-black italic text-red-500 font-orbitron">{metrics.critical}</span>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-red-500" style={{ width: `${(metrics.critical / metrics.total) * 100}%` }} />
                    </div>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Critical</p>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* 2. HIGH-RISK SQUAD TRACE (Scrollable List) */}
      <div className="p-8 rounded-[2rem] bg-slate-900 border border-slate-800 shadow-2xl">
         <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
               <AlertTriangle className="h-5 w-5 text-red-500" />
               <h3 className="text-lg font-black italic uppercase tracking-tight text-white font-orbitron">High-Risk Squad Trace</h3>
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
               Showing {metrics.highRiskAthletes.length} Athletes Below Threshold
            </div>
         </div>

         <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {metrics.highRiskAthletes.length > 0 ? (
              metrics.highRiskAthletes.map((athlete) => (
                <motion.div 
                  key={athlete.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-5 rounded-2xl bg-slate-950/50 border border-slate-800 hover:border-red-500/30 transition-all group"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 border-2 border-slate-700">
                       {athlete.avatar_url ? (
                         <img src={athlete.avatar_url} alt={athlete.full_name} className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold uppercase text-[10px]">
                            {athlete.full_name.charAt(0)}
                         </div>
                       )}
                    </div>
                    <div>
                       <h4 className="text-sm font-black italic uppercase tracking-tight text-white font-orbitron">{athlete.full_name}</h4>
                       <div className="flex items-center gap-3 mt-1">
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{athlete.teamName}</span>
                          <span className="text-[8px] font-bold text-red-400 uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-400/10 border border-red-400/20">
                             {athlete.risk_score > 1.5 ? 'ACWR Volatility' : 'Low Readiness'}
                          </span>
                       </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-10">
                     <div className="text-right">
                        <span className={`text-xl font-black italic font-orbitron ${athlete.readiness_score < 40 ? 'text-red-500' : 'text-amber-500'}`}>
                           {athlete.readiness_score}
                        </span>
                        <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Score</p>
                     </div>
                     <button className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 transition-all">
                        <ArrowUpRight className="h-4 w-4" />
                     </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-12 text-center">
                 <ShieldCheck className="h-10 w-10 text-emerald-500 mx-auto mb-4 opacity-20" />
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Zero Critical Violations Detected</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};
