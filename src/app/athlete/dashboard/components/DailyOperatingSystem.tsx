"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  CircleDot,
  DatabaseZap,
  Dumbbell,
  Flame,
  HeartPulse,
  ShieldCheck,
  Trophy,
} from "lucide-react";

import { Progress } from "@/components/ui/progress";
import type { DailyOperatingSnapshot } from "@/lib/product";

export function DailyOperatingSystem({
  snapshot,
}: {
  snapshot: DailyOperatingSnapshot;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const readinessTone =
    snapshot.readiness.score >= 75
      ? "text-emerald-200 border-emerald-500/20 bg-emerald-500/10"
      : snapshot.readiness.score >= 55
        ? "text-amber-200 border-amber-500/20 bg-amber-500/10"
        : "text-red-200 border-red-500/20 bg-red-500/10";

  return (
    <section className="rounded-[30px] border border-white/[0.06] bg-white/[0.025] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--chakra-neon)]">
            Daily Operating System
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
            What happened, why, and what to do next
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Creeda combines check-ins, wearable-ready signals, training execution, and goal context before it recommends the day.
          </p>
        </div>

        <div className={`min-w-[190px] rounded-[26px] border p-4 ${readinessTone}`}>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]">
            <HeartPulse className="h-4 w-4" />
            Readiness
          </div>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-5xl font-black leading-none text-white">
              {snapshot.readiness.score}
            </span>
            <span className="pb-1 text-xs font-bold uppercase tracking-[0.18em] opacity-80">
              {snapshot.readiness.confidenceLabel} confidence
            </span>
          </div>
          <Progress
            value={snapshot.readiness.confidencePct}
            className="mt-4 h-2 bg-black/20"
          />
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-5">
        <LoopStage
          label="Sense"
          value={`${snapshot.integrations.connectedCount} source${snapshot.integrations.connectedCount === 1 ? "" : "s"}`}
          detail={snapshot.integrations.latestSample?.date || "manual signals"}
        />
        <LoopStage
          label="Understand"
          value={`${snapshot.readiness.reasons.length} drivers`}
          detail={`${snapshot.readiness.confidencePct}% confidence`}
        />
        <LoopStage
          label="Decide"
          value={snapshot.readiness.actionLabel}
          detail={snapshot.readiness.action.replace(/_/g, " ")}
        />
        <LoopStage
          label="Execute"
          value={`${snapshot.today.expectedDurationMinutes} min`}
          detail={snapshot.today.mode.replace(/_/g, " ")}
        />
        <LoopStage
          label="Improve"
          value={`${snapshot.retention.streakDays} day streak`}
          detail={`${snapshot.retention.weeklyCompliancePct}% weekly compliance`}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[26px] border border-[var(--saffron)]/20 bg-[var(--saffron)]/10 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--saffron-light)]">
                What should I do today?
              </p>
              <h3 className="mt-2 text-2xl font-black text-white">
                {snapshot.readiness.actionLabel}
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-200">
                {snapshot.readiness.actionDetail}
              </p>
            </div>
            <Link
              href={snapshot.today.href}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--saffron)] px-5 text-sm font-black text-black transition hover:brightness-110"
            >
              <Dumbbell className="h-4 w-4" />
              Start
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setShowWhy((current) => !current)}
            className="mt-5 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:bg-black/30"
          >
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Why this recommendation?
              </span>
              <span className="mt-1 block text-sm font-semibold text-white">
                {snapshot.readiness.reasons[0]?.detail || "Open the reasoning behind today."}
              </span>
            </span>
            {showWhy ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>

          {showWhy && (
            <div className="mt-4 grid gap-3">
              {snapshot.readiness.reasons.map((reason) => (
                <div
                  key={`${reason.label}-${reason.detail}`}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-white">{reason.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        {reason.detail}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      reason.impact >= 0 ? "bg-emerald-500/10 text-emerald-200" : "bg-red-500/10 text-red-200"
                    }`}>
                      {reason.impact > 0 ? "+" : ""}{reason.impact}
                    </span>
                  </div>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Provenance: {reason.provenance.replace("_", " ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <OperatingPanel
            icon={DatabaseZap}
            eyebrow="Data Sources"
            title={`${snapshot.integrations.connectedCount} connected`}
            detail={`${snapshot.integrations.measuredSampleDays} measured sample days available. Latest sample ${snapshot.integrations.latestSample?.date || "not found"}.`}
            href="/athlete/integrations"
            cta="Manage"
          />
          <OperatingPanel
            icon={CalendarClock}
            eyebrow="Goal + Season"
            title={snapshot.goal.goalType.replace(/_/g, " ")}
            detail={`${snapshot.goal.phase} phase. ${snapshot.goal.statusReason}`}
            href="/athlete/plans"
            cta="Plan"
          />
          <OperatingPanel
            icon={Flame}
            eyebrow="Retention"
            title={snapshot.retention.milestoneTitle}
            detail={snapshot.retention.milestoneDetail}
            href="/athlete/review"
            cta="Recap"
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-[24px] border border-white/10 bg-black/15 p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            <ShieldCheck className="h-4 w-4 text-[var(--chakra-neon)]" />
            Provenance
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {snapshot.readiness.provenance.map((item) => (
              <span
                key={item.label}
                className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ${
                  item.status === "active"
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                    : item.status === "estimated"
                      ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                      : "border-white/10 bg-white/[0.03] text-slate-500"
                }`}
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/15 p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            Missing Data
          </div>
          <div className="mt-3 space-y-2">
            {snapshot.readiness.missingDataWarnings.length > 0 ? (
              snapshot.readiness.missingDataWarnings.slice(0, 3).map((warning) => (
                <p key={warning.signal} className="text-xs leading-relaxed text-slate-400">
                  <span className="font-bold text-slate-200">{warning.signal}:</span> {warning.detail}
                </p>
              ))
            ) : (
              <p className="text-xs leading-relaxed text-slate-400">
                Enough signals are present for a confident daily recommendation.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/15 p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            <Trophy className="h-4 w-4 text-[var(--saffron)]" />
            Challenge Loop
          </div>
          <div className="mt-3 space-y-3">
            {snapshot.retention.challenges.slice(0, 2).map((challenge) => (
              <div key={challenge.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-white">{challenge.title}</p>
                  <p className="text-[10px] font-bold text-slate-400">{challenge.progressPct}%</p>
                </div>
                <Progress value={challenge.progressPct} className="mt-2 h-1.5 bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LoopStage({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/15 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 line-clamp-2 text-sm font-black text-white">{value}</p>
      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-400">
        {detail}
      </p>
    </div>
  );
}

function OperatingPanel({
  icon: Icon,
  eyebrow,
  title,
  detail,
  href,
  cta,
}: {
  icon: typeof Activity;
  eyebrow: string;
  title: string;
  detail: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            <Icon className="h-4 w-4 text-[var(--chakra-neon)]" />
            {eyebrow}
          </div>
          <h3 className="mt-2 text-base font-black capitalize text-white">
            {title}
          </h3>
        </div>
        <CircleDot className="mt-1 h-4 w-4 text-slate-600" />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{detail}</p>
      <Link
        href={href}
        className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-200 transition hover:bg-white/[0.06]"
      >
        {cta}
      </Link>
    </div>
  );
}
