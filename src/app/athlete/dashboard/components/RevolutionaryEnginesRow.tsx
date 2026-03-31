"use client";

import React from "react";
import { GamifiedCard } from "@/components/gamified/GamifiedCard";
import { HUDLabel } from "@/components/gamified/HUDLabel";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Activity, ArrowUp, ArrowDown, Gauge } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, YAxis
} from "recharts";
import type { PerformanceLimiter, AdaptationStatus, PerformanceTrajectory } from "@/lib/sport_dashboard_engine";

interface Props {
  limiter: PerformanceLimiter;
  adaptation: AdaptationStatus;
  trajectory: PerformanceTrajectory;
}

export const RevolutionaryEnginesRow: React.FC<Props> = ({ limiter, adaptation, trajectory }) => {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px] animate-pulse">
        <div className="bg-slate-900/50 rounded-3xl" />
        <div className="bg-slate-900/50 rounded-3xl" />
        <div className="bg-slate-900/50 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── Performance Limiter ─────────────────────────────────── */}
      <GamifiedCard glowColor="rgba(239,68,68,0.2)">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <HUDLabel index="L1" label="Performance Limiter" />
        </div>

        <p className="text-sm text-white font-semibold leading-relaxed mb-4">
          {limiter.statement}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {limiter.contributingFactors.map((f, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                f.severity === 'high'
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : f.severity === 'medium'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
              }`}
            >
              <div className={`h-1.5 w-1.5 rounded-full ${
                f.severity === 'high' ? 'bg-red-500' : f.severity === 'medium' ? 'bg-amber-500' : 'bg-slate-500'
              }`} />
              {f.label}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
          <Gauge className="w-4 h-4 text-red-400" />
          <span className="text-[11px] text-slate-400">
            Fixing this could improve performance by{" "}
            <span className="text-red-400 font-bold">{limiter.impactPct}%</span>
          </span>
        </div>
      </GamifiedCard>

      {/* ── Adaptation Status ──────────────────────────────────── */}
      <GamifiedCard glowColor={`${adaptation.color}30`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl border" style={{ backgroundColor: `${adaptation.color}15`, borderColor: `${adaptation.color}30` }}>
            <Activity className="w-4 h-4" style={{ color: adaptation.color }} />
          </div>
          <HUDLabel index="A1" label="Adaptation Status" />
        </div>

        <div className="flex items-center gap-3 mb-3">
          <span
            className="text-2xl font-black uppercase font-orbitron tracking-tight"
            style={{ color: adaptation.color }}
          >
            {adaptation.state}
          </span>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800/50 border border-slate-700/30">
            {adaptation.trend === 'improving' ? (
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            ) : adaptation.trend === 'declining' ? (
              <TrendingDown className="w-3 h-3 text-red-400" />
            ) : (
              <Minus className="w-3 h-3 text-amber-400" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              {adaptation.trend}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          {adaptation.description}
        </p>

        {/* Visual state indicator */}
        <div className="mt-4 flex gap-1">
          {['Building', 'Plateau', 'Overreaching', 'Peaking'].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                s === adaptation.state ? 'opacity-100' : 'opacity-20'
              }`}
              style={{ backgroundColor: s === adaptation.state ? adaptation.color : '#475569' }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          {['Building', 'Plateau', 'Overreach', 'Peaking'].map(s => (
            <span key={s} className="text-[8px] text-slate-600 uppercase tracking-wider">{s}</span>
          ))}
        </div>
      </GamifiedCard>

      {/* ── Performance Trajectory ─────────────────────────────── */}
      <GamifiedCard glowColor={trajectory.direction === 'Improving' ? 'rgba(16,185,129,0.2)' : trajectory.direction === 'Declining' ? 'rgba(239,68,68,0.2)' : 'rgba(234,179,8,0.2)'}>
        <div className="flex items-center gap-2 mb-4">
          <div className={`p-2 rounded-xl border ${
            trajectory.direction === 'Improving'
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : trajectory.direction === 'Declining'
              ? 'bg-red-500/10 border-red-500/20'
              : 'bg-amber-500/10 border-amber-500/20'
          }`}>
            {trajectory.direction === 'Improving' ? (
              <ArrowUp className="w-4 h-4 text-emerald-400" />
            ) : trajectory.direction === 'Declining' ? (
              <ArrowDown className="w-4 h-4 text-red-400" />
            ) : (
              <Minus className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <HUDLabel index="T1" label="Performance Trajectory" />
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className={`text-3xl font-black font-orbitron ${
            trajectory.projectedChange > 0 ? 'text-emerald-400' : trajectory.projectedChange < 0 ? 'text-red-400' : 'text-amber-400'
          }`}>
            {trajectory.projectedChange > 0 ? '+' : ''}{trajectory.projectedChange}%
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-orbitron">
            {trajectory.timeframe}
          </span>
        </div>

        {/* Sparkline */}
        <div className="h-16 mb-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trajectory.sparkline.map((v, i) => ({ v, i }))}>
              <defs>
                <linearGradient id="trajGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={
                    trajectory.projectedChange > 0 ? '#10b981' : trajectory.projectedChange < 0 ? '#ef4444' : '#eab308'
                  } stopOpacity={0.3} />
                  <stop offset="100%" stopColor="transparent" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={['auto', 'auto']} hide />
              <Area
                type="monotone"
                dataKey="v"
                stroke={trajectory.projectedChange > 0 ? '#10b981' : trajectory.projectedChange < 0 ? '#ef4444' : '#eab308'}
                strokeWidth={2}
                fill="url(#trajGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          {trajectory.interpretation}
        </p>
      </GamifiedCard>
    </div>
  );
};
