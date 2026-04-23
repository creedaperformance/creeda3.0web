"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ClipboardPenLine,
  MessageSquareText,
  ShieldAlert,
  Users,
} from "lucide-react";

import { Progress } from "@/components/ui/progress";
import type { CoachOperatingSnapshot } from "@/lib/product";

export function CoachOperatingCommandPanel({
  snapshot,
}: {
  snapshot: CoachOperatingSnapshot;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--chakra-neon)]">
            Command Queue
          </p>
          <h2 className="mt-2 text-xl font-black tracking-tight text-white">
            Athletes needing a coaching decision
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Prioritized by readiness, compliance, missed sessions, recovery debt, and pain reports.
          </p>
        </div>
        <Link
          href="/coach/execution"
          className="rounded-full border border-[var(--chakra-neon)]/20 bg-[var(--chakra-neon)]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--chakra-neon)]"
        >
          Open board
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Metric label="Avg readiness" value={`${snapshot.averageReadiness || 0}`} />
        <Metric label="Avg compliance" value={`${snapshot.averageCompliancePct || 0}%`} />
      </div>

      <div className="mt-5 space-y-3">
        {snapshot.interventionQueue.length > 0 ? (
          snapshot.interventionQueue.slice(0, 4).map((athlete) => (
            <div
              key={athlete.athleteId}
              className="rounded-[22px] border border-white/10 bg-black/20 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">{athlete.athleteName}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    Recovery debt {athlete.recoveryDebt} • Missed {athlete.missedSessions}
                  </p>
                </div>
                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-200">
                  Review
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <MiniBar
                  label="Readiness"
                  value={athlete.readinessScore ?? 0}
                  suffix={athlete.readinessScore === null ? "No data" : `${athlete.readinessScore}`}
                />
                <MiniBar
                  label="Compliance"
                  value={athlete.compliancePct ?? 0}
                  suffix={athlete.compliancePct === null ? "No log" : `${athlete.compliancePct}%`}
                />
              </div>
              {athlete.injuryRiskFlags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {athlete.injuryRiskFlags.map((flag) => (
                    <span
                      key={flag}
                      className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold text-amber-100"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-[var(--chakra-neon)]" />
              <p className="text-sm text-slate-300">
                No urgent coaching queue items yet. Assigned sessions and athlete logs will populate this view.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-3">
        {snapshot.lowDataAthletes.length > 0 && (
          <div className="rounded-[22px] border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              Low-data athletes
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              {snapshot.lowDataAthletes.map((athlete) => athlete.athleteName).join(", ")} need logs or synced data before strong recommendations.
            </p>
          </div>
        )}

        {snapshot.recentComments.length > 0 && (
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              <MessageSquareText className="h-4 w-4 text-[var(--chakra-neon)]" />
              Recent thread
            </div>
            <p className="mt-2 text-sm text-white">
              {snapshot.recentComments[0].athleteName}: {snapshot.recentComments[0].message}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label.includes("readiness") ? <ShieldAlert className="h-4 w-4 text-[var(--chakra-neon)]" /> : <ClipboardPenLine className="h-4 w-4 text-[var(--saffron)]" />}
        {label}
      </div>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function MiniBar({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </p>
        <p className="text-[10px] font-bold text-slate-300">{suffix}</p>
      </div>
      <Progress value={value} className="mt-2 h-1.5 bg-white/10" />
    </div>
  );
}
