"use client";

import React from "react";
import { Zap, Heart, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreedaState, PerformanceMode } from "@/lib/state_engine";

const MODES: Array<{ id: PerformanceMode; label: string; icon: any; color: string }> = [
  { id: "PERFORMANCE", label: "Performance", icon: Zap, color: "text-blue-500" },
  { id: "RECOVERY", label: "Recovery", icon: Heart, color: "text-red-500" },
  { id: "GENERAL_FITNESS", label: "General", icon: Activity, color: "text-emerald-500" },
];

export const PerformanceModeSwitch: React.FC = () => {
  const { state, setMode } = useCreedaState();

  return (
    <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800/50 w-full max-w-sm">
      {MODES.map((mode) => {
        const isActive = state.performanceMode === mode.id;
        const Icon = mode.icon;

        return (
          <button
            key={mode.id}
            onClick={() => setMode(mode.id)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-2.5 px-3 rounded-xl transition-all duration-300 relative overflow-hidden",
              isActive 
                ? "bg-slate-800 text-white shadow-2xl border border-slate-700/50 animate-glow" 
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            {isActive && (
              <div className={cn("absolute inset-x-0 bottom-0 h-0.5 glow-blue", mode.color.replace("text-", "bg-"))} />
            )}
            <Icon className={cn("w-5 h-5 mb-1.5 transition-transform", isActive ? "scale-110" : "scale-100")} />
            <span className="text-[10px] font-black uppercase tracking-widest font-orbitron">
              {mode.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
