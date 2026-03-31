"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface HUDLabelProps {
  index: string | number;
  label: string;
  className?: string;
  accent?: "blue" | "emerald" | "orange" | "red";
}

export const HUDLabel: React.FC<HUDLabelProps> = ({
  index,
  label,
  className,
  accent = "blue",
}) => {
  const accentStyles = {
    blue: "text-blue-500",
    emerald: "text-emerald-500",
    orange: "text-orange-500",
    red: "text-red-500",
  };

  const formattedIndex = typeof index === "number" ? index.toString().padStart(2, '0') : index;

  return (
    <div className={cn("flex items-center gap-3 group", className)}>
      <span className={cn(
        "text-[10px] font-black tracking-[0.3em] font-orbitron",
        accentStyles[accent],
        "opacity-80 group-hover:opacity-100 transition-opacity"
      )}>
        {formattedIndex}
      </span>
      <span className="h-[1px] w-6 bg-slate-800 group-hover:w-10 transition-all" />
      <span className="text-[11px] uppercase font-bold text-white/50 tracking-widest group-hover:text-white/80 transition-colors">
        {label}
      </span>
    </div>
  );
};
