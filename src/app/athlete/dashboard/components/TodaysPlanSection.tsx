"use client";

import React from "react";
import { GamifiedCard } from "@/components/gamified/GamifiedCard";
import { HUDLabel } from "@/components/gamified/HUDLabel";
import { GamifiedButton } from "@/components/gamified/GamifiedButton";
import { Zap, CheckCircle } from "lucide-react";
import type { TodaysPlan } from "@/lib/sport_dashboard_engine";

interface Props {
  plan: TodaysPlan;
}

const intensityColors: Record<string, string> = {
  LOW: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  MODERATE: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  HIGH: "text-red-400 bg-red-500/10 border-red-500/20",
  MAX: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

export const TodaysPlanSection: React.FC<Props> = ({ plan }) => {
  return (
    <GamifiedCard>
      <div className="flex items-center justify-between mb-6">
        <HUDLabel index="02" label="Today's Plan" />
        <div className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${intensityColors[plan.intensity]}`}>
          {plan.intensity} Intensity
        </div>
      </div>

      <h3 className="text-xl font-black uppercase font-orbitron text-white mb-2 italic">
        {plan.title}
      </h3>

      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 font-orbitron mb-4">
        Focus: {plan.sportContext}
      </p>

      {/* What / How / Why */}
      <div className="space-y-3 mb-6">
        {[
          { label: "WHAT", text: plan.what, color: "text-blue-400" },
          { label: "HOW", text: plan.how, color: "text-emerald-400" },
          { label: "WHY", text: plan.why, color: "text-amber-400" },
        ].map((item) => (
          <div key={item.label} className="flex gap-3 items-start">
            <span className={`text-[10px] font-black uppercase tracking-widest ${item.color} font-orbitron min-w-[36px]`}>
              {item.label}
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>

      {/* Position-Specific Drills */}
      {plan.drills.length > 0 && (
        <div className="border-t border-slate-800/50 pt-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-orbitron mb-3">
            Position-Specific Drills
          </p>
          <div className="space-y-2">
            {plan.drills.map((drill, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/20 border border-slate-700/20">
                <CheckCircle className="w-4 h-4 text-blue-500/50 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-slate-300 leading-relaxed">{drill}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <GamifiedButton variant="PRIMARY" size="SM" className="w-full mt-6">
        <Zap className="w-4 h-4 mr-2" />
        Begin Session
      </GamifiedButton>
    </GamifiedCard>
  );
};
