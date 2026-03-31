"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Activity, ClipboardCheck, Smartphone, Zap } from "lucide-react";

import type { AthleteHealthSummary } from "@/lib/dashboard_decisions";
import type { CreedaDecision, OrchestratorOutputV5 } from "@/lib/engine/types";
import type { VideoAnalysisReportSummary } from "@/lib/video-analysis/reporting";

import { FeedbackBanner } from "./components/FeedbackBanner";
import { FullPlanSheet } from "./components/FullPlanSheet";
import { HeroDecision } from "./components/HeroDecision";
import { PredictionCard } from "./components/PredictionCard";
import { ScientificEvidencePanel } from "./components/ScientificEvidencePanel";
import { TodayPlan } from "./components/TodayPlan";
import { WhySection } from "./components/WhySection";
import { ConstraintsCard } from "./components/ConstraintsCard";
import { VideoAnalysisSummaryCard } from "@/components/video-analysis/VideoAnalysisSummaryCard";

interface DecisionHUDProps {
  result: OrchestratorOutputV5 | null;
  performanceProfile?: Record<string, unknown> | null;
  healthSummary?: AthleteHealthSummary | null;
  latestVideoReport?: VideoAnalysisReportSummary | null;
}

export const DecisionHUD: React.FC<DecisionHUDProps> = ({
  result,
  performanceProfile,
  healthSummary,
  latestVideoReport,
}) => {
  const router = useRouter();
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [isPlanPinned, setIsPlanPinned] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem("creeda_plan_pinned") === "true"
  );
  const [isPending, startTransition] = useTransition();

  const togglePin = () => {
    const nextValue = !isPlanPinned;
    setIsPlanPinned(nextValue);
    window.localStorage.setItem("creeda_plan_pinned", String(nextValue));
  };

  const handleRefresh = () => {
    startTransition(() => router.refresh());
  };

  const decision: CreedaDecision | null = result?.creedaDecision || null;
  const calibrationSessionCount = Number(performanceProfile?.session_count || 0);

  if (!decision) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-white p-4 md:p-6 md:pl-72 pb-24 md:pb-6">
        <div className="max-w-2xl mx-auto pt-12 text-center">
          <div className="text-5xl mb-6">🧠</div>
          <h1 className="text-2xl font-extrabold text-white mb-3 tracking-tight">
            Your Sports Scientist is Ready
          </h1>
          <p className="text-sm text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
            Complete today&apos;s check-in so CREEDA can make one authoritative training decision for you.
          </p>
          <Link
            href="/athlete/checkin"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--saffron)] text-black font-bold text-sm hover:brightness-110 transition-all shadow-[0_0_30px_var(--saffron-glow)]"
          >
            <ClipboardCheck className="w-4 h-4" />
            Start Check-In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-white p-4 md:p-6 md:pl-72 pb-24 md:pb-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <FeedbackBanner
          feedback={decision.feedback}
          calibrationSessionCount={calibrationSessionCount}
        />

        {healthSummary?.available && <HealthTrustCard summary={healthSummary} />}

        {decision.components.training.plan?.isCalibrationSession && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-1">
                  Calibration Phase
                </span>
                <span className="text-[11px] font-medium text-blue-100/80">
                  Scaling your performance model from real training responses.
                </span>
              </div>
            </div>
            <div className="px-2 py-1 rounded-md bg-blue-500/20 text-[10px] font-bold text-blue-400 uppercase">
              Exp: {calibrationSessionCount}/5
            </div>
          </motion.div>
        )}

        <HeroDecision decision={decision} />

        <VideoAnalysisSummaryCard
          role="athlete"
          latestReport={latestVideoReport || null}
          preferredSport={decision.scientificContext?.sportProfile?.sportKey || null}
        />

        <TodayPlan
          components={decision.components}
          sessionType={decision.sessionType}
          duration={decision.duration}
          isPinned={isPlanPinned}
          onTogglePin={togglePin}
        />

        <ScientificEvidencePanel context={decision.scientificContext} />

        <ConstraintsCard
          constraints={decision.constraints}
          visionFaults={decision.visionFaults}
        />

        <WhySection explanation={decision.explanation} />

        <PredictionCard predictions={decision.predictions} />

        {result && (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsInsightsOpen(true)}
            className="w-full flex items-center justify-between p-5 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:bg-blue-500/20 transition-all">
                <Activity className="w-4 h-4" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">
                  Scientific Insights
                </span>
                <span className="text-xs font-bold text-white">Why this decision?</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded-md">
              View Metrics
            </span>
          </motion.button>
        )}

        {result && (
          <FullPlanSheet
            isOpen={isInsightsOpen}
            onClose={() => setIsInsightsOpen(false)}
            result={result}
          />
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 gap-3 pt-2"
        >
          <Link
            href="/athlete/checkin"
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-all text-xs font-bold text-slate-400 uppercase tracking-wider"
          >
            <ClipboardCheck className="w-4 h-4" />
            Daily Check-In
          </Link>
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl border transition-all text-xs font-bold uppercase tracking-wider ${
              isPending
                ? "bg-blue-500/10 border-blue-500/20 text-blue-400 animate-pulse"
                : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:bg-white/[0.05]"
            }`}
          >
            <Zap className="w-4 h-4" />
            {isPending ? "Refreshing..." : "Refresh"}
          </button>
        </motion.div>

        {decision.adherence.adherenceScore < 0.5 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center py-3"
          >
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">
              Missing planned work reduces confidence. Log the real day so the engine can recover accuracy quickly.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

function HealthTrustCard({ summary }: { summary: AthleteHealthSummary }) {
  const sourceLabel =
    summary.source === "mixed"
      ? "Apple + Android"
      : summary.source === "apple"
        ? "Apple Health"
        : summary.source === "android"
          ? "Health Connect"
          : "Not connected";

  const statusTone =
    summary.connected && summary.sampleDays > 0
      ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
      : "text-slate-400 border-white/[0.08] bg-white/[0.03]";

  return (
    <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
              Device Trust Signal
            </p>
            <p className="text-sm font-bold text-white mt-1">{sourceLabel}</p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${statusTone}`}>
          {summary.connected && summary.sampleDays > 0 ? "Active" : "Not synced"}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Metric label="Days" value={String(summary.sampleDays)} />
        <Metric
          label="Sleep"
          value={summary.avgSleepHours !== null ? `${summary.avgSleepHours}h` : "--"}
        />
        <Metric
          label="Steps"
          value={summary.latestSteps !== null ? String(Math.round(summary.latestSteps)) : "--"}
        />
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        {summary.connected && summary.sampleDays > 0
          ? `Last sync ${summary.latestMetricDate || "recently"}. Device metrics are visible here so users can trust what the engine is reading.`
          : "Health sync is optional. Until device data is connected, athlete decisions are running from manual daily inputs only."}
      </p>

      {summary.lastError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300 leading-relaxed">
          Latest sync issue: {summary.lastError}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">{label}</p>
      <p className="text-lg font-black text-white">{value}</p>
    </div>
  );
}
