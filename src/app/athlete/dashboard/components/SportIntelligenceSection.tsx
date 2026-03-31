"use client";

import React from "react";
import { GamifiedCard } from "@/components/gamified/GamifiedCard";
import { HUDLabel } from "@/components/gamified/HUDLabel";
import { Brain, Target, Zap, Shield, TrendingUp } from "lucide-react";
import type { SportInsight } from "@/lib/sport_dashboard_engine";

interface Props {
  insights: SportInsight[];
  sportName: string;
}

const iconMap: Record<string, React.ReactNode> = {
  brain: <Brain className="w-4 h-4" />,
  target: <Target className="w-4 h-4" />,
  zap: <Zap className="w-4 h-4" />,
  shield: <Shield className="w-4 h-4" />,
  trending: <TrendingUp className="w-4 h-4" />,
};

const typeStyles: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  warning: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/15",
    text: "text-amber-400",
    iconBg: "bg-amber-500/10",
  },
  positive: {
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/15",
    text: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
  },
  neutral: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/15",
    text: "text-blue-400",
    iconBg: "bg-blue-500/10",
  },
};

export const SportIntelligenceSection: React.FC<Props> = ({ insights, sportName }) => {
  return (
    <GamifiedCard>
      <div className="flex items-center justify-between mb-6">
        <HUDLabel index="07" label="Sport Intelligence" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-orbitron">
          {sportName}
        </span>
      </div>

      <div className="space-y-3">
        {insights.map((insight, i) => {
          const styles = typeStyles[insight.type] || typeStyles.neutral;
          return (
            <div
              key={i}
              className={`p-4 rounded-xl border ${styles.bg} ${styles.border}`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${styles.iconBg} ${styles.text} flex-shrink-0`}>
                  {iconMap[insight.icon] || iconMap.brain}
                </div>
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-tight ${styles.text} mb-1`}>
                    {insight.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {insight.message}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </GamifiedCard>
  );
};
