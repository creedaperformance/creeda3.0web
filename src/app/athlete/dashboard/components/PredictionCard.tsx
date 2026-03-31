"use client";

import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import type { CreedaDecision } from "@/lib/engine/types";

interface Props {
  predictions: CreedaDecision['predictions'];
}

export const PredictionCard: React.FC<Props> = ({ predictions }) => {
  const trendConfig = {
    rising: { icon: TrendingUp, color: 'text-red-400', bg: 'bg-red-500/8', border: 'border-red-500/15', label: 'Risk Rising' },
    stable: { icon: Minus, color: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/15', label: 'Risk Stable' },
    falling: { icon: TrendingDown, color: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/15', label: 'Risk Falling' },
  };

  const trend = trendConfig[predictions.injuryRiskTrend];
  const TrendIcon = trend.icon;

  // Readiness forecast sparkline (simple bars)
  const maxForecast = Math.max(...predictions.readinessForecast, 100);
  const forecasts = predictions.readinessForecast.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="rounded-3xl bg-white/[0.02] border border-white/[0.06] p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          3-5 Day Forecast
        </h2>
      </div>

      {/* Injury Risk Trend */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${trend.bg} border ${trend.border}`}>
            <TrendIcon className={`w-4 h-4 ${trend.color}`} />
          </div>
          <div>
            <span className={`text-xs font-bold ${trend.color}`}>{trend.label}</span>
            {predictions.predictedInjuryType && (
              <p className="text-[10px] text-slate-500">
                Watch: {predictions.predictedInjuryType.toLowerCase().replace('_', ' ')}
              </p>
            )}
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          predictions.riskLevel === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20'
            : predictions.riskLevel === 'moderate' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        }`}>
          {predictions.riskLevel}
        </div>
      </div>

      {/* Readiness Forecast Bars */}
      <div className="mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2 block">
          Readiness Trajectory
        </span>
        <div className="flex items-end gap-1.5 h-12">
          {forecasts.map((val, i) => {
            const height = (val / maxForecast) * 100;
            const isGood = val >= 70;
            const isMid = val >= 50 && val < 70;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-lg transition-all ${
                    isGood ? 'bg-emerald-500/50' : isMid ? 'bg-amber-500/50' : 'bg-red-500/50'
                  }`}
                  style={{ height: `${Math.max(height, 10)}%` }}
                />
                <span className="text-[8px] text-slate-600 font-semibold">D{i + 1}</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
