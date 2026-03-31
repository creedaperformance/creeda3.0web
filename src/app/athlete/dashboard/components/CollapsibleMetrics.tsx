"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Activity, Shield, Brain, Gauge } from "lucide-react";
import type { ReadinessOutput, LoadOutput, RiskOutput } from "@/lib/engine/types";

interface Props {
  readiness: ReadinessOutput;
  load: LoadOutput;
  risk: RiskOutput;
  dataCompleteness: number;
}

export const CollapsibleMetrics: React.FC<Props> = ({ readiness, load, risk, dataCompleteness }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-3xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
      {/* Toggle Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-500" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Detailed Metrics
          </span>
          <span className="text-[9px] text-slate-600 bg-white/[0.04] px-2 py-0.5 rounded-full">
            {dataCompleteness}% data
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {/* Collapsible Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-5 space-y-4 border-t border-white/[0.04] pt-4">
              {/* Readiness Domains */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Gauge className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Readiness — {readiness.score}/100
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <MetricBar label="Neuromuscular" value={readiness.domains.neuromuscular} />
                  <MetricBar label="Metabolic" value={readiness.domains.metabolic} />
                  <MetricBar label="Mental" value={readiness.domains.mental} />
                </div>
              </div>

              {/* Wellness Factors */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2 block">
                  Wellness Inputs
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  <WellnessChip label="Sleep" value={readiness.factors.sleep} />
                  <WellnessChip label="Energy" value={readiness.factors.energy} />
                  <WellnessChip label="Sore" value={readiness.factors.soreness} />
                  <WellnessChip label="Stress" value={readiness.factors.stress} />
                  <WellnessChip label="Pain" value={readiness.factors.pain} invert />
                </div>
              </div>

              {/* Load & Risk */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Activity className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Load</span>
                  </div>
                  <div className="text-xl font-black text-white">{load.total}</div>
                  <div className="text-[9px] text-slate-600 mt-1">
                    ACWR: {load.acwr} · Monotony: {load.monotony.toFixed(1)}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Shield className="w-3 h-3 text-red-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Risk</span>
                  </div>
                  <div className={`text-xl font-black ${
                    risk.score >= 70 ? 'text-red-400' : risk.score >= 40 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {risk.score}
                  </div>
                  <div className="text-[9px] text-slate-600 mt-1">
                    {risk.label} · {risk.trajectory}
                  </div>
                </div>
              </div>

              {/* Risk Interactions */}
              {risk.interactions.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2 block">
                    Risk Interactions
                  </span>
                  <div className="space-y-1">
                    {risk.interactions.slice(0, 4).map((i, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">{i.name}</span>
                        <span className={`font-bold ${i.impact > 15 ? 'text-red-400' : i.impact > 8 ? 'text-amber-400' : 'text-slate-500'}`}>
                          +{i.impact}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────

function MetricBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</span>
        <span className="text-[9px] font-bold text-slate-400">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.max(value, 5)}%` }} />
      </div>
    </div>
  );
}

function WellnessChip({ label, value, invert }: { label: string; value: number; invert?: boolean }) {
  const displayVal = Math.round(value);
  const isGood = invert ? displayVal <= 30 : displayVal >= 60;
  const isOk = invert ? displayVal <= 50 : displayVal >= 40;

  return (
    <div className="text-center p-1.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
      <div className={`text-xs font-bold ${isGood ? 'text-emerald-400' : isOk ? 'text-amber-400' : 'text-red-400'}`}>
        {displayVal}
      </div>
      <div className="text-[8px] text-slate-600 uppercase">{label}</div>
    </div>
  );
}
