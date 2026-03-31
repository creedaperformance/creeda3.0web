"use client";

import React from "react";
import { motion } from "framer-motion";
import { Dumbbell, Brain, Leaf, Apple, Heart, CheckCircle2 } from "lucide-react";
import type { CreedaDecision } from "@/lib/engine/types";
import { WorkoutPrescriptionView } from "./WorkoutPrescriptionView";
import { NutritionPrescriptionView } from "./NutritionPrescriptionView";

interface Props {
  components: CreedaDecision['components'];
  sessionType: string;
  duration: number;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const TodayPlan: React.FC<Props> = ({
  components,
  sessionType,
  duration,
  isPinned = false,
  onTogglePin,
}) => {
  const { training, rehab, recovery, psychology, nutrition } = components;
  const [showDetails, setShowDetails] = React.useState(isPinned);

  // Sync internal state with pin prop
  React.useEffect(() => {
    if (isPinned) setShowDetails(true);
  }, [isPinned]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-3xl bg-white/[0.02] border border-white/[0.06] p-5 sm:p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Today&apos;s Plan {isPinned && " (Pinned)"}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onTogglePin?.()}
            className={`text-[10px] font-bold uppercase tracking-widest transition-all ${isPinned ? 'text-blue-400' : 'text-slate-600 hover:text-slate-400'}`}
          >
            {isPinned ? "Unpin Plan" : "Pin Plan"}
          </button>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {duration} min
          </span>
        </div>
      </div>

      {/* Session Type */}
      <h3 className="text-lg sm:text-xl font-extrabold text-white mb-1 tracking-tight">
        {sessionType}
      </h3>
      <p className="text-xs text-slate-400 mb-5">
        {training.focus}
      </p>

      {/* 5-Domain Components */}
      <div className="space-y-3">
        {/* Training */}
        <DomainRow
          icon={<Dumbbell className="w-4 h-4 text-blue-400" />}
          label="Training"
          color="blue"
          customContent={showDetails ? (
            <WorkoutPrescriptionView
              plan={training.plan}
              athleteFocus={training.athleteFocus}
              sessionProtocol={training.sessionProtocol}
            />
          ) : null}
          items={!showDetails ? [training.focus] : []}
          meta={!showDetails ? `Cap: ${training.intensityCap}%` : ""}
          onClick={() => !isPinned && setShowDetails(!showDetails)}
        />

        {/* Rehab (if applicable) */}
        {rehab && (
          <DomainRow
            icon={<Heart className="w-4 h-4 text-purple-400" />}
            label={`Rehab — ${rehab.label}`}
            color="purple"
            items={[
              ...rehab.exercises.mobility.slice(0, 1),
              ...rehab.exercises.strength.slice(0, 1),
              ...rehab.exercises.control.slice(0, 1),
            ]}
            meta={`Phase ${rehab.phase}/5`}
          />
        )}

        {/* Recovery */}
        <DomainRow
          icon={<Leaf className="w-4 h-4 text-emerald-400" />}
          label="Recovery"
          color="emerald"
          items={recovery.methods.slice(0, 2)}
          meta={recovery.priority}
        />

        {/* Psychology */}
        <DomainRow
          icon={<Brain className="w-4 h-4 text-amber-400" />}
          label="Psychology"
          color="amber"
          items={[psychology.advice]}
          meta={`Mental: ${psychology.mentalReadiness}%`}
        />

        {/* Nutrition */}
        <DomainRow
          icon={<Apple className="w-4 h-4 text-orange-400" />}
          label="Nutrition"
          color="orange"
          customContent={showDetails ? (
            <NutritionPrescriptionView
              meals={nutrition.meals}
              fuelingGuidance={nutrition.fueling}
            />
          ) : null}
          items={!showDetails ? [nutrition.meals?.[0]?.name || "Balanced Nutrition"] : []}
          meta={!showDetails ? 'Tap for Meals' : ''}
          onClick={() => !isPinned && setShowDetails(!showDetails)}
        />
      </div>

      {!showDetails && !isPinned && (
        <button 
          onClick={() => setShowDetails(true)}
          className="w-full mt-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-white/[0.05] transition-all"
        >
          Expand Full Plan Details
        </button>
      )}
    </motion.div>
  );
};

// ─── Domain Row Component ────────────────────────────────────────────────

function DomainRow({
  icon,
  label,
  color,
  items,
  customContent,
  meta,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  items?: string[];
  customContent?: React.ReactNode;
  meta: string;
  onClick?: () => void;
}) {
  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-3xl border transition-all ${onClick ? 'cursor-pointer hover:bg-white/[0.04]' : ''}`}
      style={{
        backgroundColor: `color-mix(in srgb, var(--${color === 'blue' ? 'chakra-blue' : color === 'emerald' ? 'indian-green-light' : color === 'amber' ? 'saffron' : color === 'purple' ? 'purple' : 'saffron'}, transparent) 4%, transparent)`,
        borderColor: `color-mix(in srgb, var(--${color === 'blue' ? 'chakra-blue' : 'saffron'}, transparent) 10%, transparent)`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-bold text-white uppercase tracking-wider">{label}</span>
        </div>
        {meta && (
          <span className="text-[10px] font-semibold text-slate-500">{meta}</span>
        )}
      </div>
      {items && items.length > 0 && (
        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 className="w-3 h-3 text-slate-600 mt-0.5 flex-shrink-0" />
              <span className="text-[11px] text-slate-400 leading-relaxed">{item}</span>
            </div>
          ))}
        </div>
      )}
      
      {customContent && (
        <div className="mt-1">
          {customContent}
        </div>
      )}
    </div>
  );
}
