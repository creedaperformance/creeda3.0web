"use client";

import React from "react";
import { GamifiedCard } from "@/components/gamified/GamifiedCard";
import { HUDLabel } from "@/components/gamified/HUDLabel";
import { GamifiedProgressBar } from "@/components/gamified/GamifiedProgressBar";
import { TrendingUp, Shield, Zap } from "lucide-react";
import type { HeroInsight } from "@/lib/sport_dashboard_engine";

interface Props {
  hero: HeroInsight;
  sportName: string;
  positionName: string;
}

export const SportHeroSection: React.FC<Props> = ({ hero, sportName, positionName }) => {
  const statusColors: Record<string, string> = {
    TRAIN: "bg-emerald-500",
    MODIFY: "bg-amber-500",
    REST: "bg-red-500",
  };

  const statusGlow: Record<string, string> = {
    TRAIN: "rgba(16,185,129,0.4)",
    MODIFY: "rgba(245,158,11,0.4)",
    REST: "rgba(239,68,68,0.4)",
  };

  const statusIcons: Record<string, React.ReactNode> = {
    TRAIN: <Zap className="w-5 h-5" />,
    MODIFY: <Shield className="w-5 h-5" />,
    REST: <TrendingUp className="w-5 h-5" />,
  };

  return (
    <GamifiedCard className="lg:col-span-2 relative overflow-hidden" glowColor={statusGlow[hero.status]}>
      <div className="absolute top-0 right-0 p-6 opacity-10">
        <TrendingUp className="w-16 h-16 text-blue-400" />
      </div>

      {/* Sport/Position Badge */}
      <div className="flex items-center gap-3 mb-6">
        <HUDLabel index="01" label="Readiness Core" />
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-orbitron">
            {sportName}
          </span>
          <span className="text-[10px] text-slate-600">·</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 font-orbitron">
            {positionName}
          </span>
        </div>
      </div>

      {/* Score + Status */}
      <div className="flex items-end gap-6 mb-6">
        <div>
          <span className="text-7xl font-black italic font-orbitron text-white leading-none">
            {hero.readinessScore}
          </span>
          <span className="text-blue-500 font-bold uppercase tracking-widest text-sm ml-3">
            / 100
          </span>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusColors[hero.status]} bg-opacity-20 border border-current/20`}>
          {statusIcons[hero.status]}
          <span className="text-xs font-black uppercase tracking-widest font-orbitron">
            {hero.status}
          </span>
        </div>
      </div>

      <GamifiedProgressBar progress={hero.readinessScore} showGlow />

      {/* Sport-Specific Insight */}
      <div className="mt-6 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-2 w-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 font-orbitron mb-1">
              Sport-Specific Insight
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              {hero.sportInsight}
            </p>
          </div>
        </div>
      </div>

      {/* Daily Decision */}
      <div className="mt-4 flex items-center gap-2">
        <Zap className="w-3 h-3 text-slate-500" />
        <p className="text-xs text-slate-500 italic">{hero.dailyDecision}</p>
      </div>
    </GamifiedCard>
  );
};
