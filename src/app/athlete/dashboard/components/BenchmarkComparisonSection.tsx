"use client";

import React from "react";
import { GamifiedCard } from "@/components/gamified/GamifiedCard";
import { HUDLabel } from "@/components/gamified/HUDLabel";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { BenchmarkComparison } from "@/lib/sport_dashboard_engine";

interface Props {
  benchmarks: BenchmarkComparison[];
}

export const BenchmarkComparisonSection: React.FC<Props> = ({ benchmarks }) => {
  return (
    <GamifiedCard>
      <HUDLabel index="04" label="Sport-Specific Benchmarks" />
      <div className="mt-4 space-y-3">
        {benchmarks.map((b, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700/20"
          >
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-lg ${
                b.direction === 'above' ? 'bg-emerald-500/10' : 'bg-red-500/10'
              }`}>
                {b.direction === 'above' ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                ) : b.direction === 'below' ? (
                  <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
              <div>
                <span className="text-[11px] font-bold text-white uppercase tracking-tight block">
                  {b.metric}
                </span>
                <span className={`text-[10px] italic ${
                  b.direction === 'above' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {b.comparison}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {b.positionLabel}
            </span>
          </div>
        ))}
      </div>
    </GamifiedCard>
  );
};
