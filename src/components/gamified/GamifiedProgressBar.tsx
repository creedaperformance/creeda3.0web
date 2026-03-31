"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface GamifiedProgressBarProps {
  current?: number;
  total?: number;
  progress?: number;
  showGlow?: boolean;
  className?: string;
  showLabels?: boolean;
}

export const GamifiedProgressBar: React.FC<GamifiedProgressBarProps> = ({
  current,
  total,
  progress: manualProgress,
  showGlow = false,
  className,
  showLabels = false,
}) => {
  const progressValue = manualProgress !== undefined 
    ? manualProgress 
    : (current && total ? Math.round((current / total) * 100) : 0);

  return (
    <div className={cn("w-full flex flex-col gap-4", className)}>
      {showLabels && (
        <div className="flex justify-between items-end mb-2">
          <span className="text-[10px] uppercase font-black tracking-widest text-blue-500/80 font-orbitron italic">
            Module Sync Status
          </span>
          <span className="text-sm font-black text-white font-orbitron italic">
            {progressValue}%
          </span>
        </div>
      )}
      
      <div className="relative h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressValue}%` }}
          className={cn(
            "h-full bg-blue-500 transition-all duration-700",
            showGlow && "shadow-[0_0_15px_rgba(59,130,246,0.6)] glow-blue"
          )}
        />
      </div>
    </div>
  );
};
