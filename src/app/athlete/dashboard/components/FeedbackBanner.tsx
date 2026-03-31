"use client";

import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, ArrowRight, Zap, Activity } from "lucide-react";
import type { CreedaDecision } from "@/lib/engine/types";

interface Props {
  feedback: CreedaDecision['feedback'];
  calibrationSessionCount?: number;
}

export const FeedbackBanner: React.FC<Props> = ({ feedback, calibrationSessionCount }) => {
  const config = {
    improved: {
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/[0.06]',
      border: 'border-emerald-500/15',
      deltaPrefix: '+',
    },
    declined: {
      icon: TrendingUp, // TrendingUp with -ve delta is fine, or keep Down
      color: 'text-red-400',
      bg: 'bg-red-500/[0.06]',
      border: 'border-red-500/15',
      deltaPrefix: '',
    },
    stable: {
      icon: Minus,
      color: 'text-slate-400',
      bg: 'bg-white/[0.02]',
      border: 'border-white/[0.06]',
      deltaPrefix: '',
    },
    no_data: {
      icon: ArrowRight,
      color: 'text-blue-400',
      bg: 'bg-blue-500/[0.04]',
      border: 'border-blue-500/10',
      deltaPrefix: '',
    },
  };

  const isCalibration = feedback.insight.toLowerCase().includes('calibration');
  const c = isCalibration 
    ? { ...config.no_data, color: 'text-blue-300', bg: 'bg-blue-500/[0.1]', border: 'border-blue-400/20' }
    : config[feedback.yesterdayComparison === 'declined' ? 'declined' : feedback.yesterdayComparison === 'stable' ? 'stable' : feedback.yesterdayComparison === 'no_data' ? 'no_data' : 'improved'];
  
  const Icon = isCalibration ? Zap : (c.icon || ArrowRight);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className={`rounded-2xl ${c.bg} border ${c.border} px-4 py-3 flex items-center gap-3 relative overflow-hidden`}
    >
      {isCalibration && (
        <motion.div 
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/5 to-transparent skew-x-[-20deg]"
        />
      )}

      <div className={`p-1.5 rounded-lg ${c.bg} relative z-10`}>
        <Activity className={`w-4 h-4 ${c.color}`} />
      </div>
      <div className="flex-1 min-w-0 relative z-10">
        <p className={`text-xs font-bold leading-tight ${isCalibration ? 'text-blue-100' : 'text-slate-300'} truncate`}>
          {feedback.insight}
          {isCalibration && calibrationSessionCount !== undefined && (
            <span className="ml-2 text-[10px] opacity-60 font-medium">({calibrationSessionCount}/5)</span>
          )}
        </p>
      </div>
      {!isCalibration && feedback.yesterdayComparison !== 'no_data' && (
        <span className={`text-sm font-bold ${c.color} flex-shrink-0 relative z-10`}>
          {c.deltaPrefix}{feedback.readinessDelta > 0 ? '+' : ''}{feedback.readinessDelta}
        </span>
      )}
    </motion.div>
  );
};
