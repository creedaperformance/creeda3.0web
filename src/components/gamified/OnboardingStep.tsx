"use client";

import React from "react";
import { GamifiedCard } from "./GamifiedCard";
import { GamifiedProgressBar } from "./GamifiedProgressBar";
import { HUDLabel } from "./HUDLabel";
import { motion } from "framer-motion";

interface OnboardingStepProps {
  stepIndex: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const OnboardingStep: React.FC<OnboardingStepProps> = ({
  stepIndex,
  totalSteps,
  title,
  subtitle,
  children,
}) => {
  const progress = Math.round(((stepIndex + 1) / totalSteps) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-lg mx-auto"
    >
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <HUDLabel index={String(stepIndex + 1).padStart(2, "0")} label="Intelligence Intake" />
          <span className="text-[10px] font-bold text-slate-500 font-orbitron uppercase tracking-widest">
            PHASE {stepIndex + 1}/{totalSteps}
          </span>
        </div>
        <GamifiedProgressBar progress={progress} showGlow />
      </div>

      <GamifiedCard className="bg-slate-900/40 border-slate-800/50">
        <div className="mb-8">
          <h2 className="text-3xl font-black italic text-white font-orbitron uppercase tracking-tighter mb-2">
            {title}
          </h2>
          {subtitle && (
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        <div className="space-y-6">
          {children}
        </div>
      </GamifiedCard>
    </motion.div>
  );
};
