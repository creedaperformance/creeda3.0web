"use client";

import React from "react";
import { GamifiedCard } from "@/components/gamified/GamifiedCard";
import { HUDLabel } from "@/components/gamified/HUDLabel";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { WorkloadData } from "@/lib/sport_dashboard_engine";

interface Props {
  workload: WorkloadData;
}

export const WorkloadPanel: React.FC<Props> = ({ workload }) => {
  const acwrColors: Record<string, string> = {
    Safe: "text-emerald-400",
    Caution: "text-amber-400",
    Danger: "text-red-400",
  };

  const trendIcon = workload.trend === 'up'
    ? <TrendingUp className="w-3 h-3 text-amber-400" />
    : workload.trend === 'down'
    ? <TrendingDown className="w-3 h-3 text-emerald-400" />
    : <Minus className="w-3 h-3 text-slate-400" />;

  return (
    <GamifiedCard>
      <div className="flex items-center justify-between mb-4">
        <HUDLabel index="06" label={workload.label} />
        <div className="flex items-center gap-1.5">
          {trendIcon}
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            {workload.trend}
          </span>
        </div>
      </div>

      {/* ACWR Display */}
      <div className="flex items-center gap-4 mb-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-orbitron">
            ACWR
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className={`text-3xl font-black font-orbitron ${acwrColors[workload.acwrStatus]}`}>
              {workload.acwr}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${acwrColors[workload.acwrStatus]}`}>
              {workload.acwrStatus}
            </span>
          </div>
        </div>
        <div className="flex-1 h-3 bg-slate-800/50 rounded-full overflow-hidden">
          <div className="h-full flex">
            <div className="bg-emerald-500/40 h-full" style={{ width: '53%' }} />
            <div className="bg-amber-500/40 h-full" style={{ width: '27%' }} />
            <div className="bg-red-500/40 h-full" style={{ width: '20%' }} />
          </div>
          <div
            className="h-3 w-1 bg-white rounded-full -mt-3 relative shadow-lg"
            style={{ marginLeft: `${Math.min(95, Math.max(5, (workload.acwr / 2) * 100))}%` }}
          />
        </div>
      </div>

      {/* Sport-Specific Metrics */}
      <div className="space-y-2">
        {workload.sportMetrics.map((m, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-800/20 border border-slate-700/20"
          >
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
              {m.label}
            </span>
            <span className="text-xs font-black text-white font-orbitron">
              {m.value}
            </span>
          </div>
        ))}
      </div>
    </GamifiedCard>
  );
};
