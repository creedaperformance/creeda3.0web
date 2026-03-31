"use client";

import React from "react";
import { motion } from "framer-motion";
import { Zap, Shield, HeartPulse, AlertTriangle } from "lucide-react";
import type { CreedaDecision } from "@/lib/engine/types";

interface Props {
  decision: CreedaDecision;
}

const DECISION_CONFIG = {
  TRAIN: {
    label: "TRAIN",
    sublabel: "Full Potential Unlocked",
    gradient: "from-[var(--indian-green-light)] to-[#22c55e]",
    bg: "bg-[var(--indian-green-light)]/10",
    border: "border-[var(--indian-green-light)]/30",
    glow: "shadow-[0_0_60px_rgba(19,136,8,0.15)]",
    textColor: "text-[var(--indian-green-light)]",
    icon: Zap,
    pulse: "bg-[var(--indian-green-light)]",
  },
  MODIFY: {
    label: "MODIFY",
    sublabel: "Strategic Adjustment Required",
    gradient: "from-[var(--saffron)] to-[#f97316]",
    bg: "bg-[var(--saffron)]/10",
    border: "border-[var(--saffron)]/30",
    glow: "shadow-[0_0_60px_rgba(255,153,51,0.15)]",
    textColor: "text-[var(--saffron)]",
    icon: Shield,
    pulse: "bg-[var(--saffron)]",
  },
  RECOVER: {
    label: "RECOVER",
    sublabel: "Critical Physiological Reset",
    gradient: "from-[#ef4444] to-[#f43f5e]",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    glow: "shadow-[0_0_60px_rgba(239,68,68,0.15)]",
    textColor: "text-red-400",
    icon: HeartPulse,
    pulse: "bg-red-500",
  },
};

export const HeroDecision: React.FC<Props> = ({ decision }) => {
  const config = DECISION_CONFIG[decision.decision];
  const Icon = config.icon;

  // Primary explanation (1 line)
  const primaryExplanation = decision.explanation.primaryDrivers[0]?.reason || decision.sessionType;
  const shortExplanation = primaryExplanation.length > 100
    ? primaryExplanation.substring(0, 97) + '...'
    : primaryExplanation;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden rounded-[2.5rem] ${config.bg} border ${config.border} ${config.glow} p-7 sm:p-10 backdrop-blur-md`}
    >
      {/* Background gradient pulse */}
      <div className="absolute inset-0 opacity-5">
        <div className={`absolute top-[-50%] right-[-30%] w-[400px] h-[400px] rounded-full bg-gradient-to-br ${config.gradient} blur-[100px]`} />
      </div>

      <div className="relative z-10">
        {/* Status indicator + Confidence Badge (Fix #1) */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${config.pulse} animate-pulse shadow-[0_0_10px_currentColor]`} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Your Sports Scientist Says
            </span>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <div className={`px-2 py-1 rounded-md text-[9px] font-black tracking-widest border transition-all ${
              decision.confidenceLevel === 'HIGH' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
              decision.confidenceLevel === 'MEDIUM' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
              'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse'
            }`}>
              CONFIDENCE: {decision.confidenceLevel}
            </div>
            {decision.confidenceReasons && decision.confidenceReasons.length > 0 && (
              <span className="text-[8px] text-slate-500 uppercase tracking-tighter max-w-[120px] text-right leading-tight">
                {decision.confidenceReasons.slice(0, 2).join(' • ')}
              </span>
            )}
          </div>
        </div>

        {/* BIG DECISION */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-2 mb-6">
          <h1
            className={`text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter bg-gradient-to-b ${config.gradient} bg-clip-text text-transparent`}
            style={{ lineHeight: 0.85 }}
          >
            {config.label}
          </h1>
          <div className="flex flex-col mb-1 sm:ml-2">
            <span className={`text-xs font-bold uppercase tracking-widest ${config.textColor} opacity-80 uppercase`}>
              {config.sublabel}
            </span>
          </div>
        </div>

        {/* 1-line explanation */}
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
          {shortExplanation}
        </p>

        {/* Dominant factor badge + intensity */}
        <div className="flex items-center gap-3 mt-5 flex-wrap">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${config.bg} border ${config.border}`}>
            <AlertTriangle className={`w-3 h-3 ${config.textColor}`} />
            <span className={`text-[10px] font-bold uppercase tracking-widest ${config.textColor}`}>
              {decision.decisionContext.dominantFactor}
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Intensity: {decision.intensity}%
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {decision.duration} min
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
