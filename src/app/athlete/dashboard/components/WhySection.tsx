"use client";

import React from "react";
import { motion } from "framer-motion";
import { Info, AlertTriangle, TrendingUp, Shield, Zap } from "lucide-react";
import type { CreedaDecision } from "@/lib/engine/types";

interface Props {
  explanation: CreedaDecision['explanation'];
}

const FACTOR_ICONS: Record<string, React.ReactNode> = {
  'Injury Risk': <Shield className="w-4 h-4 text-red-400" />,
  'Pain': <AlertTriangle className="w-4 h-4 text-orange-400" />,
  'Pain Level': <AlertTriangle className="w-4 h-4 text-orange-400" />,
  'Readiness': <Zap className="w-4 h-4 text-blue-400" />,
  'Training Load': <TrendingUp className="w-4 h-4 text-emerald-400" />,
  'Data Building': <Info className="w-4 h-4 text-slate-400" />,
};

export const WhySection: React.FC<Props> = ({ explanation }) => {
  const allDrivers = [
    ...explanation.primaryDrivers.map(d => ({ ...d, isPrimary: true })),
    ...explanation.secondaryDrivers.map(d => ({ ...d, isPrimary: false })),
  ].slice(0, 3); // Top 3 max

  if (allDrivers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-3xl bg-white/[0.02] border border-white/[0.06] p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-4 h-4 text-blue-400" />
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Why This Decision
        </h2>
      </div>

      <div className="space-y-3">
        {allDrivers.map((driver, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 rounded-2xl ${
              driver.isPrimary
                ? 'bg-blue-500/[0.04] border border-blue-500/10'
                : 'bg-white/[0.02] border border-white/[0.04]'
            }`}
          >
            <div className="mt-0.5 flex-shrink-0">
              {FACTOR_ICONS[driver.factor] || <Info className="w-4 h-4 text-slate-500" />}
            </div>
            <div>
              <span className={`text-xs font-bold ${driver.isPrimary ? 'text-white' : 'text-slate-400'}`}>
                {driver.factor}
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                {driver.reason}
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
