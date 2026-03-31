"use client";

import Link from "next/link";
import React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Brain,
  CheckCircle2,
  Heart,
  Moon,
  Smartphone,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

import type { IndividualDashboardDecision } from "@/lib/dashboard_decisions";

interface IndividualDecisionHUDProps {
  decision: IndividualDashboardDecision | null;
}

function getPathwayFocusText(pathway: NonNullable<IndividualDashboardDecision>["pathway"]) {
  if (pathway.type === "sport") return `${pathway.title} for ${pathway.mappedSport}`;
  if (pathway.type === "training") return `${pathway.title} focused on ${pathway.mappedSport}`;
  return `${pathway.title} focused on healthier daily living`;
}

export const IndividualDecisionHUD: React.FC<IndividualDecisionHUDProps> = ({ decision }) => {
  if (!decision) {
    return (
      <div className="min-h-[280px] rounded-[2rem] border border-white/[0.06] bg-white/[0.02] flex items-center justify-center px-6 text-center">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500 mb-4">
            Guidance Pending
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Complete today&apos;s wellness check-in so CREEDA can turn your physiology into one clear next step.
          </p>
        </div>
      </div>
    );
  }

  const healthSummary = decision.health.summary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <section className="rounded-[2.25rem] border border-primary/20 bg-gradient-to-br from-primary/12 via-white/[0.03] to-white/[0.02] p-7 sm:p-8 shadow-[0_0_50px_rgba(245,124,0,0.08)]">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] font-bold uppercase tracking-[0.25em] text-slate-300">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Daily Direction
            </div>
            <div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                {decision.directionLabel}
              </h2>
              <p className="text-lg text-slate-200/90 mt-3 leading-relaxed">
                {decision.directionSummary}
              </p>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">{decision.explanation}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 shrink-0 min-w-[260px]">
            <MetricCard label="Readiness" value={`${Math.round(decision.readinessScore)}%`} icon={Zap} />
            <MetricCard label="Movement" value={`${decision.today.sessionDurationMinutes} min`} icon={Activity} />
            <MetricCard label="Week" value={`${decision.journeyState.currentWeek}/${decision.journeyState.totalWeeks}`} icon={Target} />
            <MetricCard label="Peak ETA" value={`${decision.peak.weeksRemaining} wk`} icon={Brain} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <section className="rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
              What To Do Today
            </h3>
          </div>

            <div className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-5 mb-5">
              <p className="text-xl font-bold text-white">{decision.today.todayFocus}</p>
              <p className="text-sm text-slate-400 mt-2">
                {getPathwayFocusText(decision.pathway)}
              </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Tag>{decision.today.intensity} intensity</Tag>
              <Tag>{decision.plan.trainingPlan.trainingDaysPerWeek} movement days/week</Tag>
              <Tag>{Math.round(decision.journeyState.progressToPeakPct)}% to peak</Tag>
            </div>
          </div>

          <div className="space-y-3">
            {decision.today.whatToDo.map((item) => (
              <ListRow key={item} icon={<Zap className="h-3.5 w-3.5 text-primary" />} text={item} />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
            <TargetBlock
              label="Steps"
              value={decision.plan.lifestylePlan.stepTarget.toLocaleString()}
              icon={Activity}
            />
            <TargetBlock
              label="Hydration"
              value={`${decision.plan.lifestylePlan.hydrationLiters}L`}
              icon={Heart}
            />
            <TargetBlock
              label="Sleep"
              value={`${decision.plan.recoveryPlan.sleepTargetHours}h`}
              icon={Moon}
            />
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-6 sm:p-7 space-y-5">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
              Recovery And Trend
            </h3>
          </div>

          <div className="space-y-3">
            {decision.today.recoveryActions.map((item) => (
              <ListRow key={item} icon={<Heart className="h-3.5 w-3.5 text-emerald-400" />} text={item} />
            ))}
          </div>

          <div className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">Weekly trend</p>
                <p className="text-lg font-bold text-white mt-2 capitalize">{decision.weekly.trend}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">Adherence</p>
                <p className="text-lg font-bold text-white mt-2">{Math.round(decision.weekly.adherencePct)}%</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">{decision.today.adaptationNote}</p>
            {decision.weekly.adjustments.slice(0, 2).map((item) => (
              <ListRow key={item} icon={<Brain className="h-3.5 w-3.5 text-blue-400" />} text={item} />
            ))}
          </div>

          <HealthTrustPanel
            connected={Boolean(healthSummary?.connected)}
            latestMetricDate={decision.health.latestMetricDate}
            sampleDays={healthSummary?.sampleDays || 0}
            influencePct={decision.health.influencePct}
            usedInDecision={decision.health.usedInDecision}
          />
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-5">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
              Why This Path
            </h3>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-5">
              <p className="text-sm text-slate-500 uppercase tracking-[0.2em] font-bold">Selected path</p>
              <p className="text-xl font-bold text-white mt-2">{decision.pathway.title}</p>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">{decision.pathway.rationale}</p>
            </div>

            <div className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-5">
              <p className="text-sm text-slate-500 uppercase tracking-[0.2em] font-bold">Primary gap</p>
              <p className="text-lg font-bold text-white mt-2">
                {decision.gapAnalysis.primaryGap.pillar} gap of {Math.round(decision.gapAnalysis.primaryGap.gap)} points
              </p>
              <p className="text-sm text-slate-400 mt-2">
                Current {Math.round(decision.gapAnalysis.primaryGap.current)} vs target {Math.round(decision.gapAnalysis.primaryGap.target)}
              </p>
            </div>

            <div className="space-y-3">
              {decision.gapAnalysis.riskAreas.map((item) => (
                <ListRow key={item} icon={<Brain className="h-3.5 w-3.5 text-amber-400" />} text={item} />
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-5">
            <Smartphone className="h-4 w-4 text-primary" />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
              Keep The Engine Accurate
            </h3>
          </div>

          <div className="space-y-4">
            {decision.recommendations.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className={`rounded-[1.5rem] border p-4 ${
                  item.title === decision.pathway.title
                    ? "border-primary/25 bg-primary/10"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white">{item.title}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {item.type === 'sport'
                        ? `Matched sport: ${item.mappedSport}`
                        : item.type === 'training'
                          ? `Matched training focus: ${item.mappedSport}`
                          : 'Matched focus: healthy living'}
                    </p>
                  </div>
                  <Tag>{item.score} match</Tag>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            <Link
              href="/individual/logging"
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              Daily Check-In
            </Link>
            <div className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-xs font-bold uppercase tracking-wider text-slate-400">
              <Brain className="w-4 h-4" />
              Server logic active
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
};

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Zap;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      </div>
      <p className="text-2xl font-black text-white tracking-tight">{value}</p>
    </div>
  );
}

function TargetBlock({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      </div>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function ListRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <p className="text-sm text-slate-300 leading-relaxed">{text}</p>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
      {children}
    </span>
  );
}

function HealthTrustPanel({
  connected,
  latestMetricDate,
  sampleDays,
  influencePct,
  usedInDecision,
}: {
  connected: boolean;
  latestMetricDate: string | null;
  sampleDays: number;
  influencePct: number;
  usedInDecision: boolean;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Device trust</p>
          <p className="text-lg font-bold text-white mt-2">
            {connected ? "Connected" : "Manual check-ins only"}
          </p>
        </div>
        <Tag>{sampleDays} days</Tag>
      </div>
      <p className="text-sm text-slate-400 mt-3 leading-relaxed">
        {usedInDecision
          ? `Latest device metrics influenced today's guidance by ${influencePct}%.`
          : "Device sync is optional. Until it is active, CREEDA relies on your FitStart profile and daily check-ins."}
      </p>
      {latestMetricDate && (
        <p className="text-xs text-slate-500 mt-3">Latest device day: {latestMetricDate}</p>
      )}
    </div>
  );
}
