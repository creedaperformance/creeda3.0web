"use client";

import React from "react";
import { GamifiedCard } from "./GamifiedCard";
import { GamifiedButton } from "./GamifiedButton";
import { HUDLabel } from "./HUDLabel";
import { Plus, Activity, RefreshCw } from "lucide-react";

interface EmptyStateCardProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: "PLUS" | "SYNC" | "ACTIVITY";
}

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon = "PLUS",
}) => {
  const IconComponent = icon === "PLUS" ? Plus : icon === "SYNC" ? RefreshCw : Activity;

  return (
    <GamifiedCard className="flex flex-col items-center text-center py-12 px-8 border-dashed border-slate-700/50 hover:border-slate-600/50 bg-slate-900/30">
      <div className="mb-6">
        <HUDLabel index="00" label="Empty Data State" className="justify-center" />
      </div>

      <div className="relative mb-8">
        <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
        <div className="relative w-20 h-20 rounded-full border border-blue-500/30 flex items-center justify-center bg-slate-900 shadow-2xl">
          <IconComponent className="w-10 h-10 text-blue-500" />
        </div>
      </div>

      <h3 className="text-2xl font-black text-white italic font-orbitron uppercase tracking-tighter mb-4">
        {title}
      </h3>
      <p className="text-slate-400 text-sm max-w-[280px] leading-relaxed mb-8">
        {description}
      </p>

      {actionLabel && (
        <GamifiedButton 
          variant="PRIMARY" 
          size="MD" 
          onClick={onAction}
          className="w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          {actionLabel}
        </GamifiedButton>
      )}
    </GamifiedCard>
  );
};
