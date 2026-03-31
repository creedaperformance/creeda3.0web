"use client";

import React from "react";
import { GamifiedCard } from "@/components/gamified/GamifiedCard";
import { HUDLabel } from "@/components/gamified/HUDLabel";
import { ShieldAlert, MapPin } from "lucide-react";
import type { InjuryRisk } from "@/lib/sport_dashboard_engine";

interface Props {
  risk: InjuryRisk;
}

const riskColors: Record<string, { bg: string; text: string; glow: string; border: string }> = {
  Low: { bg: "bg-emerald-500/10", text: "text-emerald-400", glow: "rgba(16,185,129,0.2)", border: "border-emerald-500/20" },
  Moderate: { bg: "bg-amber-500/10", text: "text-amber-400", glow: "rgba(245,158,11,0.2)", border: "border-amber-500/20" },
  High: { bg: "bg-orange-500/10", text: "text-orange-400", glow: "rgba(249,115,22,0.2)", border: "border-orange-500/20" },
  Critical: { bg: "bg-red-500/10", text: "text-red-400", glow: "rgba(239,68,68,0.2)", border: "border-red-500/20" },
};

export const InjuryRiskSection: React.FC<Props> = ({ risk }) => {
  const colors = riskColors[risk.level] || riskColors.Low;

  return (
    <GamifiedCard glowColor={colors.glow}>
      <div className="flex items-center justify-between mb-4">
        <HUDLabel index="05" label="Injury Risk" />
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${colors.bg} ${colors.border}`}>
          <ShieldAlert className={`w-3 h-3 ${colors.text}`} />
          <span className={`text-[10px] font-black uppercase tracking-widest font-orbitron ${colors.text}`}>
            {risk.level}
          </span>
        </div>
      </div>

      {/* Risk Regions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {risk.regions.map((region, i) => (
          <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/30 border border-slate-700/20">
            <MapPin className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
              {region}
            </span>
          </div>
        ))}
      </div>

      {/* Risk Insight */}
      <div className={`p-3 rounded-xl border ${colors.bg} ${colors.border}`}>
        <p className="text-xs text-slate-300 leading-relaxed">
          {risk.insight}
        </p>
      </div>

      <p className="mt-3 text-[10px] text-slate-600 italic">
        Context: {risk.positionContext}
      </p>
    </GamifiedCard>
  );
};
