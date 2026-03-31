"use client";

import React from "react";
import { Beef, Coffee, Cookie, Droplets, Gauge, Sparkles, UtensilsCrossed } from "lucide-react";

import type { RecommendedMeal } from "@/lib/engine/Prescription/NutritionGenerator";
import type { CreedaDecision } from "@/lib/engine/types";

interface Props {
  meals: RecommendedMeal[] | null;
  fuelingGuidance?: CreedaDecision["components"]["nutrition"]["fueling"];
}

export const NutritionPrescriptionView: React.FC<Props> = ({ meals, fuelingGuidance }) => {
  if (!meals) return <div className="text-slate-500 text-xs italic">No nutrition plan generated.</div>;

  return (
    <div className="space-y-5">
      {fuelingGuidance && (
        <div className="rounded-2xl border border-orange-500/15 bg-orange-500/8 p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-orange-200 bg-orange-500/10 border border-orange-500/20 rounded-full px-2.5 py-1">
              {fuelingGuidance.sport || "Athlete"}
            </span>
            {fuelingGuidance.position && (
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-200 bg-white/[0.04] border border-white/[0.06] rounded-full px-2.5 py-1">
                {fuelingGuidance.position}
              </span>
            )}
            {fuelingGuidance.hydrationPriority && (
              <span className="text-[9px] font-bold uppercase tracking-widest text-sky-200 bg-sky-500/10 border border-sky-500/20 rounded-full px-2.5 py-1">
                Hydration Priority
              </span>
            )}
          </div>

          {fuelingGuidance.summary && (
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {fuelingGuidance.summary}
            </p>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <FuelCard
              title="Pre-Session"
              icon={<Gauge className="w-4 h-4 text-orange-300" />}
              items={fuelingGuidance.preSession}
            />
            <FuelCard
              title="During Session"
              icon={<Droplets className="w-4 h-4 text-sky-300" />}
              items={fuelingGuidance.duringSession}
            />
            <FuelCard
              title="Recovery Window"
              icon={<Sparkles className="w-4 h-4 text-emerald-300" />}
              items={fuelingGuidance.recoveryWindow}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {meals.map((meal, idx) => (
          <MealCard key={idx} meal={meal} />
        ))}
      </div>
    </div>
  );
};

function FuelCard({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">{title}</span>
      </div>
      <div className="space-y-2">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item} className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/60 flex-shrink-0" />
              <p className="text-[11px] text-slate-300 leading-relaxed">{item}</p>
            </div>
          ))
        ) : (
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Keep fueling simple and consistent today.
          </p>
        )}
      </div>
    </div>
  );
}

function MealCard({ meal }: { meal: RecommendedMeal }) {
  return (
    <div className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/[0.05] hover:bg-white/[0.03] transition-all group">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 group-hover:bg-orange-500/20 transition-all">
          <MealIcon type={meal.mealType} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
            {meal.mealType}
          </span>
          <span className="text-[13px] font-bold text-white mt-0.5">
            {meal.name}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {meal.mealWindow && (
          <p className="text-[10px] uppercase tracking-widest text-slate-500">{meal.mealWindow}</p>
        )}
        <div className="flex items-center flex-wrap gap-1.5">
          {meal.foods.map((food, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-slate-400">
              {food}
            </span>
          ))}
        </div>
        {meal.coachingNote && (
          <p className="text-[11px] leading-relaxed text-slate-400">{meal.coachingNote}</p>
        )}

        <div className="grid grid-cols-4 gap-1 pt-1.5 border-t border-white/[0.03]">
          <MacroPill value={meal.macros.calories} label="CAL" />
          <MacroPill value={meal.macros.protein} label="PRO" />
          <MacroPill value={meal.macros.carbs} label="CHO" />
          <MacroPill value={meal.macros.fats} label="FAT" />
        </div>
      </div>
    </div>
  );
}

function MacroPill({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[9px] font-bold text-slate-600 tracking-tighter">{label}</span>
      <span className="text-[10px] font-mono font-bold text-white leading-none">{Math.round(value)}</span>
    </div>
  );
}

function MealIcon({ type }: { type: string }) {
  const t = type.toLowerCase();
  if (t.includes("breakfast")) return <Coffee className="w-4 h-4" />;
  if (t.includes("snack")) return <Cookie className="w-4 h-4" />;
  if (t.includes("lunch")) return <UtensilsCrossed className="w-4 h-4" />;
  if (t.includes("dinner")) return <UtensilsCrossed className="w-4 h-4" />;
  return <Beef className="w-4 h-4" />;
}
