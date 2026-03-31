"use client";

import React from "react";
import { motion } from "framer-motion";
import { Ban, Flag } from "lucide-react";
import type { CreedaDecision } from "@/lib/engine/types";

interface Props {
  constraints: CreedaDecision['constraints'];
  visionFaults?: CreedaDecision['visionFaults'];
}

export const ConstraintsCard: React.FC<Props> = ({ constraints, visionFaults = [] }) => {
  if (constraints.avoid.length === 0 && constraints.flags.length === 0 && visionFaults.length === 0) {
    return null; // No constraints or faults — no card
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="rounded-3xl bg-red-500/[0.03] border border-red-500/10 p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Ban className="w-4 h-4 text-red-400" />
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400/70">
          Constraints & Risks — Avoid Today
        </h2>
      </div>

      {/* Vision Faults / Biomechanical Risks (Fix #3 & #4) */}
      {visionFaults.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {visionFaults.map((fault, i) => {
            const isLowConfidence = (fault.confidence || 0.5) < 0.7;
            return (
              <span
                key={`vision-${i}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/8 border border-blue-500/15 text-[11px] font-semibold text-blue-300"
              >
                <div className={`h-1.5 w-1.5 rounded-full ${isLowConfidence ? 'bg-blue-400/40' : 'bg-blue-400 animate-pulse'}`} />
                {isLowConfidence ? 'Possible ' : ''}{fault.riskMapping}
              </span>
            );
          })}
        </div>
      )}

      {/* Avoid list */}
      {constraints.avoid.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {constraints.avoid.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/8 border border-red-500/15 text-[11px] font-semibold text-red-300"
            >
              <Ban className="w-3 h-3" />
              {item}
            </span>
          ))}
        </div>
      )}

      {/* Flags */}
      {constraints.flags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {constraints.flags.map((flag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/8 border border-amber-500/15 text-[10px] font-bold uppercase tracking-wider text-amber-400"
            >
              <Flag className="w-3 h-3" />
              {flag}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
};
