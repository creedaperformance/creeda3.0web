"use client";

import React from "react";
import { GamifiedCard } from "@/components/gamified/GamifiedCard";
import { HUDLabel } from "@/components/gamified/HUDLabel";
import { GamifiedProgressBar } from "@/components/gamified/GamifiedProgressBar";
import { GamifiedButton } from "@/components/gamified/GamifiedButton";
import { useCreedaState } from "@/lib/state_engine";
import { Search, Video, Database } from "lucide-react";
import { CoachDecisionHUD } from "./components/CoachDecisionHUD";
import { CoachVideoTerminal } from "./components/CoachVideoTerminal";
import type { VideoAnalysisReportSummary } from "@/lib/video-analysis/reporting";

interface Props {
  videoReports: Array<VideoAnalysisReportSummary & { athleteName: string; athleteAvatarUrl: string | null }>
}

export const GamifiedCoachDashboard: React.FC<Props> = ({ videoReports }) => {
  const { state } = useCreedaState();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:pl-72 pb-24 md:pb-6">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <HUDLabel index="01" label="Command Center Active" />
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black italic font-orbitron uppercase tracking-tighter">
            Coach<span className="text-blue-500">INTEL</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search Squad..." 
                className="bg-slate-900/50 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs font-bold font-orbitron uppercase tracking-widest focus:outline-none focus:border-blue-500/50 transition-all w-64"
              />
           </div>
           <GamifiedButton variant="PRIMARY" size="SM">
             New Invite
           </GamifiedButton>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* LEFT COLUMN: HUD & AGGREGATE INTEL */}
        <div className="lg:col-span-3 space-y-8">
          <CoachDecisionHUD />
          
          <div className="pt-4 border-t border-slate-800/50">
             <div className="flex items-center gap-3 mb-6 px-2">
                <Video className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-black italic uppercase tracking-widest text-white font-orbitron">Squad Technical Repository</h3>
             </div>
             <CoachVideoTerminal reports={videoReports} />
          </div>
        </div>

        {/* RIGHT COLUMN: COACHING UTILS & ANALYTICS */}
        <div className="space-y-8">
          <GamifiedCard glowColor="rgba(59,130,246,0.3)">
            <HUDLabel index="04" label="Operator Locker Code" />
            <div className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center">
              <div className="text-3xl font-black font-orbitron italic tracking-[0.2em] text-blue-500">
                {state.squadData[0]?.invite_code || "N/A"}
              </div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-2">
                Share this code with athletes to link profiles
              </p>
            </div>
          </GamifiedCard>

          <GamifiedCard className="bg-slate-900/40">
            <HUDLabel index="05" label="Operational Compliance" />
            <div className="mt-4 space-y-4">
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase font-orbitron">Daily Log Participation</span>
                  <span className="text-xs font-black text-white font-orbitron">
                    {state.squadData[0]?.members.length > 0 ? '92%' : '0%'}
                  </span>
               </div>
               <GamifiedProgressBar progress={state.squadData[0]?.members.length > 0 ? 92 : 0} showGlow />
               <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase font-orbitron">Avg Team Readiness</span>
                  <span className="text-xs font-black text-emerald-500 font-orbitron">
                    {state.squadData[0]?.members.reduce((acc, m) => acc + m.readiness_score, 0) / (state.squadData[0]?.members.length || 1) | 0}
                  </span>
               </div>
            </div>
          </GamifiedCard>

          <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-4">
             <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-blue-500" />
                    <span className="text-[10px] font-black uppercase text-white font-orbitron">V5 Engine Node</span>
                 </div>
                 <div className="px-2 py-0.5 rounded-full bg-blue-500 text-[8px] font-black text-white uppercase">Active</div>
             </div>
             <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed">
                Centralizing multi-athlete adaptation cycles into a unified coaching stream.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
