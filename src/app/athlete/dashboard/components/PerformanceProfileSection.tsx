"use client";

import React from "react";
import { GamifiedCard } from "@/components/gamified/GamifiedCard";
import { HUDLabel } from "@/components/gamified/HUDLabel";
import { Star } from "lucide-react";
import type { PerformanceMetric } from "@/lib/sport_dashboard_engine";

interface Props {
  metrics: PerformanceMetric[];
  positionName: string;
}

export const PerformanceProfileSection: React.FC<Props> = ({ metrics, positionName }) => {
  return (
    <GamifiedCard>
      <div className="flex items-center justify-between mb-6">
        <HUDLabel index="03" label="Performance Profile" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-orbitron">
          {positionName}-Weighted
        </span>
      </div>

      <div className="space-y-4">
        {metrics.map((metric) => (
          <div key={metric.name} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-tight ${
                  metric.isPriority ? 'text-white' : 'text-slate-500'
                }`}>
                  {metric.name}
                </span>
                {metric.isPriority && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                    <Star className="w-2.5 h-2.5 text-blue-400 fill-blue-400" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-blue-400 font-orbitron">
                      Key
                    </span>
                  </span>
                )}
              </div>
              <span className={`text-xs font-black font-orbitron ${
                metric.isPriority ? 'text-white' : 'text-slate-500'
              }`}>
                {metric.value}
              </span>
            </div>
            <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                  metric.isPriority
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                    : 'bg-slate-600'
                }`}
                style={{ width: `${metric.value}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-600 leading-tight">{metric.description}</p>
          </div>
        ))}
      </div>
    </GamifiedCard>
  );
};
