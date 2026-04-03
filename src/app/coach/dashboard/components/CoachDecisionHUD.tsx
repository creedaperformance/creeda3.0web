"use client";

import Image from "next/image";
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Archive,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Database,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Timer,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  formatStaleLabel,
  type CoachInterventionStatus,
  type CoachQueuePriority,
  type CoachQueueType,
} from "@/lib/coach/interventions";
import {
  CoachInterventionFeedItem,
  CoachInterventionRecord,
  type CoachObjectiveTestSummary,
  type CoachRehabSummary,
  SquadMember,
  useCreedaState,
} from "@/lib/state_engine";

type QueueItem = SquadMember & {
  teamName: string;
  queueType: CoachQueueType;
  priority: CoachQueuePriority;
  reasons: string[];
  recommendation: string;
  staleHours: number | null;
  record: CoachInterventionRecord | null;
};

type RehabLaneItem = SquadMember & {
  teamName: string;
  rehab: CoachRehabSummary;
};

type JuniorLaneItem = SquadMember & {
  teamName: string;
  parentHandoffEnabled: boolean;
};

type QueueFilterValue = "all" | CoachQueueType;
type StatusFilterValue = "all" | CoachInterventionStatus;
type PriorityFilterValue = "all" | CoachQueuePriority;

interface CoachDecisionHUDProps {
  query?: string;
}

export const CoachDecisionHUD: React.FC<CoachDecisionHUDProps> = ({ query = "" }) => {
  const { state, updateCoachInterventionStatus, updateCoachInterventionNotes } = useCreedaState();
  const { squadData, coachInterventions } = state;
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [pendingNoteId, setPendingNoteId] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<QueueFilterValue>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilterValue>("all");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const normalizedQuery = query.trim().toLowerCase();

  const metrics = useMemo(() => {
    let total = 0;
    let optimal = 0;
    let moderate = 0;
    let critical = 0;
    let lowConfidence = 0;
    let stale = 0;
    let acknowledged = 0;
    let objectiveDeclining = 0;
    let freshObjective = 0;
    const interventionQueue: QueueItem[] = [];
    const lowDataQueue: QueueItem[] = [];
    const rehabLane: RehabLaneItem[] = [];
    const juniorLane: JuniorLaneItem[] = [];

    squadData.forEach((team) => {
      team.members.forEach((member) => {
        total++;

        if (member.readiness_score >= 75) optimal++;
        else if (member.readiness_score >= 40) moderate++;
        else critical++;

        if (member.confidence_level === "LOW" || member.data_quality === "WEAK") {
          lowConfidence++;
        }

        if (member.stale_hours === null || (member.stale_hours ?? 0) > 36) {
          stale++;
        }

        if (member.objective_test?.freshness === "fresh") {
          freshObjective++;
        }

        if (member.rehab_summary?.active) {
          rehabLane.push({
            ...member,
            teamName: team.team_name,
            rehab: member.rehab_summary,
          });
        }

        if (member.is_junior) {
          juniorLane.push({
            ...member,
            teamName: team.team_name,
            parentHandoffEnabled: team.academy_profile.parentHandoffEnabled,
          });
        }

        if (
          member.objective_test?.trend === "declining" &&
          member.objective_test?.primarySignal
        ) {
          objectiveDeclining++;
        }

        if (member.intervention_record?.status === "acknowledged") acknowledged++;
        if (member.low_data_record?.status === "acknowledged") acknowledged++;

        if (member.intervention_reasons?.length && member.intervention_record?.status !== "resolved") {
          interventionQueue.push({
            ...member,
            teamName: team.team_name,
            queueType: "intervention",
            priority: member.intervention_record?.priority || member.intervention_priority || "Informational",
            reasons: member.intervention_reasons,
            recommendation: member.intervention_recommendation || member.action_instruction || "Review athlete context.",
            staleHours: member.stale_hours ?? null,
            record: member.intervention_record || null,
          });
        }

        if (member.low_data_reasons?.length && member.low_data_record?.status !== "resolved") {
          lowDataQueue.push({
            ...member,
            teamName: team.team_name,
            queueType: "low_data",
            priority: member.low_data_record?.priority || member.low_data_priority || "Informational",
            reasons: member.low_data_reasons,
            recommendation: member.low_data_recommendation || "Strengthen input quality before changing load.",
            staleHours: member.stale_hours ?? null,
            record: member.low_data_record || null,
          });
        }
      });
    });

    const sortByPriority = (a: QueueItem, b: QueueItem) => {
      const diff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
      if (diff !== 0) return diff;
      if ((a.staleHours ?? -1) !== (b.staleHours ?? -1)) {
        return (b.staleHours ?? -1) - (a.staleHours ?? -1);
      }
      if (a.readiness_score !== b.readiness_score) {
        return a.readiness_score - b.readiness_score;
      }
      return (b.risk_score || 0) - (a.risk_score || 0);
    };

    interventionQueue.sort(sortByPriority);
    lowDataQueue.sort(sortByPriority);
    rehabLane.sort((left, right) => {
      if (left.rehab.progressionReadiness !== right.rehab.progressionReadiness) {
        return left.rehab.progressionReadiness ? -1 : 1;
      }
      if (left.rehab.phase !== right.rehab.phase) {
        return left.rehab.phase - right.rehab.phase;
      }
      if ((right.rehab.lastPainScore ?? -1) !== (left.rehab.lastPainScore ?? -1)) {
        return (right.rehab.lastPainScore ?? -1) - (left.rehab.lastPainScore ?? -1);
      }
      return new Date(right.rehab.updatedAt || 0).getTime() - new Date(left.rehab.updatedAt || 0).getTime();
    });
    juniorLane.sort((left, right) => {
      const leftReady = left.guardian_profile?.handoffReady ? 1 : 0;
      const rightReady = right.guardian_profile?.handoffReady ? 1 : 0;
      if (leftReady !== rightReady) return leftReady - rightReady;
      const leftConsent = left.guardian_consent_confirmed ? 1 : 0;
      const rightConsent = right.guardian_consent_confirmed ? 1 : 0;
      if (leftConsent !== rightConsent) return leftConsent - rightConsent;
      return left.full_name.localeCompare(right.full_name);
    });

    const resolvedHistory = coachInterventions
      .filter((item) => item.status === "resolved")
      .map(mapFeedItemToQueueItem)
      .sort((a, b) => new Date(b.record?.updated_at || 0).getTime() - new Date(a.record?.updated_at || 0).getTime());

    return {
      total,
      optimal,
      moderate,
      critical,
      stale,
      lowConfidence,
      acknowledged,
      interventionQueue,
      lowDataQueue,
      rehabLane,
      juniorLane,
      resolvedHistory,
      criticalCount: interventionQueue.filter((item) => item.priority === "Critical").length,
      objectiveDeclining,
      freshObjective,
      rehabReadyCount: rehabLane.filter((item) => item.rehab.progressionReadiness).length,
      returnBuildCount: rehabLane.filter((item) => item.rehab.phase === 5).length,
      juniorCount: juniorLane.length,
      guardianReadyCount: juniorLane.filter((item) => item.guardian_profile?.handoffReady).length,
      guardianFollowUpCount: juniorLane.filter(
        (item) =>
          !item.guardian_profile?.isComplete ||
          item.guardian_profile?.consentStatus === "pending" ||
          item.guardian_profile?.consentStatus === "unknown"
      ).length,
    };
  }, [coachInterventions, squadData]);

  const hasActiveFilters =
    normalizedQuery.length > 0 ||
    queueFilter !== "all" ||
    statusFilter !== "all" ||
    priorityFilter !== "all";

  const matchesFilters = (item: QueueItem) => {
    if (queueFilter !== "all" && item.queueType !== queueFilter) return false;
    if (statusFilter !== "all" && item.record?.status !== statusFilter) return false;
    if (priorityFilter !== "all" && item.priority !== priorityFilter) return false;

    if (!normalizedQuery) return true;

    const haystack = [
      item.full_name,
      item.teamName,
      item.priority,
      item.record?.status,
      item.reasons.join(" "),
      item.recommendation,
      item.record?.notes,
      item.confidence_level,
      item.data_quality,
      item.objective_test?.classification,
      item.objective_test?.trend,
      item.objective_test?.freshness,
      item.objective_test?.summary,
      item.objective_test?.primarySignal?.formattedHeadline || "",
      item.objective_test?.primarySignal?.deltaVsPrevious ? String(item.objective_test.primarySignal.deltaVsPrevious) : "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  };

  const filteredInterventionQueue = metrics.interventionQueue.filter(matchesFilters);
  const filteredLowDataQueue = metrics.lowDataQueue.filter(matchesFilters);
  const filteredResolvedHistory = metrics.resolvedHistory.filter(matchesFilters);
  const filteredRehabLane = metrics.rehabLane.filter((item) => {
    if (!normalizedQuery) return true;

    const haystack = [
      item.full_name,
      item.teamName,
      item.rehab.injuryType,
      item.rehab.label,
      item.rehab.progressionFlag,
      item.rehab.restrictions.join(" "),
      item.rehab.nextAction,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
  const filteredJuniorLane = metrics.juniorLane.filter((item) => {
    if (!normalizedQuery) return true;

    const haystack = [
      item.full_name,
      item.teamName,
      item.guardian_profile?.guardianName,
      item.guardian_profile?.guardianRelationship,
      item.guardian_profile?.statusLabel,
      item.guardian_profile?.nextAction,
      item.guardian_profile?.guardianPhone,
      item.guardian_profile?.guardianEmail,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });

  const handleStatusChange = async (record: CoachInterventionRecord | null, status: CoachInterventionStatus) => {
    if (!record?.id) return;

    const actionKey = `${record.id}:${status}`;
    setPendingAction(actionKey);
    try {
      await updateCoachInterventionStatus(record.id, status);
      toast.success(status === "resolved" ? "Queue item resolved" : "Queue item acknowledged");
    } catch (error) {
      console.error("[CoachQueue] Status update failed:", error);
      toast.error("Could not update the queue item");
    } finally {
      setPendingAction(null);
    }
  };

  const handleNoteSave = async (record: CoachInterventionRecord | null) => {
    if (!record?.id) return;

    const nextValue = (noteDrafts[record.id] ?? record.notes ?? "").trim();
    const normalizedNotes = nextValue.length > 0 ? nextValue : null;
    const existingNotes = (record.notes || "").trim() || null;

    if (normalizedNotes === existingNotes) return;

    setPendingNoteId(record.id);
    try {
      await updateCoachInterventionNotes(record.id, normalizedNotes);
      toast.success(normalizedNotes ? "Coach note saved" : "Coach note cleared");
    } catch (error) {
      console.error("[CoachQueue] Note update failed:", error);
      toast.error("Could not save the coach note");
    } finally {
      setPendingNoteId(null);
    }
  };

  const getNoteValue = (record: CoachInterventionRecord | null) => {
    if (!record?.id) return "";
    return noteDrafts[record.id] ?? record.notes ?? "";
  };

  const visibleCount =
    filteredInterventionQueue.length +
    filteredLowDataQueue.length +
    filteredResolvedHistory.length +
    (queueFilter === "all" ? filteredRehabLane.length + filteredJuniorLane.length : 0);

  if (metrics.total === 0) {
    return (
      <div className="p-8 rounded-[2rem] bg-slate-900/50 border border-slate-800 text-center">
        <Users className="h-12 w-12 text-slate-700 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white uppercase tracking-tight">No Active Squad Detected</h3>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">
          Invite athletes using your locker code to begin intelligence tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-4">
        <MetricCard label="Active roster" value={String(metrics.total)} sublabel="Squad sync active" accent="text-white" />
        <MetricCard
          label="Interventions"
          value={String(metrics.interventionQueue.length)}
          sublabel={`${metrics.criticalCount} critical now`}
          accent="text-red-400"
        />
        <MetricCard
          label="Low-data queue"
          value={String(metrics.lowDataQueue.length)}
          sublabel="Follow-up needed"
          accent="text-amber-400"
        />
        <MetricCard
          label="Acknowledged"
          value={String(metrics.acknowledged)}
          sublabel="In coach follow-up"
          accent="text-blue-400"
        />
        <MetricCard
          label="Resolved history"
          value={String(metrics.resolvedHistory.length)}
          sublabel="Persisted interventions"
          accent="text-emerald-400"
        />
        <MetricCard
          label="Rehab lane"
          value={String(metrics.rehabLane.length)}
          sublabel={`${metrics.rehabReadyCount} ready to review`}
          accent="text-cyan-300"
        />
        <MetricCard
          label="Junior lane"
          value={String(metrics.juniorCount)}
          sublabel={`${metrics.guardianReadyCount} handoff ready`}
          accent="text-violet-300"
        />
      </div>

      <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-blue-400" />
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Coach Filters</p>
              </div>
              <h3 className="mt-3 text-lg font-black italic uppercase tracking-tight text-white font-orbitron">
                Find the right coaching queue fast
              </h3>
              <p className="mt-2 text-sm text-slate-400 max-w-2xl">
                Filter by queue, workflow state, and priority. The top-bar search now works across athlete names, teams, reasons, notes, and objective signals.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 min-w-[220px]">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Visible items</p>
              <p className="mt-2 text-3xl font-black italic font-orbitron text-white">{visibleCount}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mt-2">
                {normalizedQuery ? `Search: ${query.trim()}` : hasActiveFilters ? "Filtered queue state" : "All open and resolved items"}
              </p>
            </div>
          </div>

          <FilterRow
            label="Queue"
            value={queueFilter}
            options={[
              { value: "all", label: "All queues" },
              { value: "intervention", label: "Interventions" },
              { value: "low_data", label: "Low-data" },
            ]}
            onChange={(value) => setQueueFilter(value as QueueFilterValue)}
          />

          <FilterRow
            label="Status"
            value={statusFilter}
            options={[
              { value: "all", label: "All states" },
              { value: "new", label: "New" },
              { value: "acknowledged", label: "Acknowledged" },
              { value: "resolved", label: "Resolved" },
            ]}
            onChange={(value) => setStatusFilter(value as StatusFilterValue)}
          />

          <FilterRow
            label="Priority"
            value={priorityFilter}
            options={[
              { value: "all", label: "All priorities" },
              { value: "Critical", label: "Critical" },
              { value: "Warning", label: "Warning" },
              { value: "Informational", label: "Watch" },
            ]}
            onChange={(value) => setPriorityFilter(value as PriorityFilterValue)}
          />

          {hasActiveFilters && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setQueueFilter("all");
                  setStatusFilter("all");
                  setPriorityFilter("all");
                }}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {(queueFilter === "all" || queueFilter === "intervention") && (
        <QueueSection
          title="Intervention Queue"
          eyebrow={`${filteredInterventionQueue.length} athletes need a coaching decision`}
          icon={ClipboardList}
          items={filteredInterventionQueue}
          emptyTitle={hasActiveFilters ? "No intervention items match the current filters" : "No active interventions right now"}
          emptyIcon={ShieldCheck}
          pendingAction={pendingAction}
          pendingNoteId={pendingNoteId}
          getNoteValue={getNoteValue}
          onNoteChange={(id, value) => setNoteDrafts((prev) => ({ ...prev, [id]: value }))}
          onNoteSave={handleNoteSave}
          onStatusChange={handleStatusChange}
        />
      )}

      {(queueFilter === "all" || queueFilter === "low_data") && (
        <QueueSection
          title="Low-Data Queue"
          eyebrow={`${filteredLowDataQueue.length} athletes need stronger signal quality`}
          icon={Database}
          items={filteredLowDataQueue}
          emptyTitle={hasActiveFilters ? "No low-data items match the current filters" : "No low-data follow-ups right now"}
          emptyIcon={CheckCircle2}
          pendingAction={pendingAction}
          pendingNoteId={pendingNoteId}
          getNoteValue={getNoteValue}
          onNoteChange={(id, value) => setNoteDrafts((prev) => ({ ...prev, [id]: value }))}
          onNoteSave={handleNoteSave}
          onStatusChange={handleStatusChange}
        />
      )}

      {queueFilter === "all" && (
        <RehabLaneSection
          items={filteredRehabLane}
          emptyTitle={normalizedQuery ? "No rehab athletes match the current search" : "No active rehab or return-to-play cases right now"}
        />
      )}

      {queueFilter === "all" && (
        <JuniorLaneSection
          items={filteredJuniorLane}
          emptyTitle={normalizedQuery ? "No junior athletes match the current search" : "No junior-athlete guardian workflows are active right now"}
        />
      )}

      <QueueSection
        title="Resolved History"
        eyebrow={`${filteredResolvedHistory.length} completed interventions remain searchable`}
        icon={Archive}
        items={filteredResolvedHistory}
        emptyTitle={hasActiveFilters ? "No resolved items match the current filters" : "No resolved interventions yet"}
        emptyIcon={Archive}
        pendingAction={pendingAction}
        pendingNoteId={pendingNoteId}
        getNoteValue={getNoteValue}
        onNoteChange={(id, value) => setNoteDrafts((prev) => ({ ...prev, [id]: value }))}
        onNoteSave={handleNoteSave}
        onStatusChange={handleStatusChange}
        historyMode
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <WatchCard
          icon={ShieldCheck}
          label="Readiness distribution"
          value={`${metrics.optimal}/${metrics.moderate}/${metrics.critical}`}
          detail="Optimal / Moderate / Critical"
        />
        <WatchCard
          icon={Activity}
          label="Low-confidence queue"
          value={String(metrics.lowConfidence)}
          detail="Athletes needing stronger trust before harder calls"
        />
        <WatchCard
          icon={Clock3}
          label="Missing logs"
          value={String(metrics.stale)}
          detail="Athletes missing a recent trusted check-in"
        />
        <WatchCard
          icon={Timer}
          label="Objective shifts"
          value={String(metrics.objectiveDeclining)}
          detail={`${metrics.freshObjective} athletes currently have a fresh measured anchor`}
        />
        <WatchCard
          icon={ShieldCheck}
          label="Return lane"
          value={String(metrics.returnBuildCount)}
          detail={`${metrics.rehabReadyCount} rehab cases look ready for progression review`}
        />
        <WatchCard
          icon={Users}
          label="Guardian follow-up"
          value={String(metrics.guardianFollowUpCount)}
          detail={`${metrics.guardianReadyCount} junior athletes are handoff-ready`}
        />
      </div>
    </div>
  );
};

function QueueSection({
  title,
  eyebrow,
  icon: Icon,
  items,
  emptyTitle,
  emptyIcon: EmptyIcon,
  pendingAction,
  pendingNoteId,
  getNoteValue,
  onNoteChange,
  onNoteSave,
  onStatusChange,
  historyMode = false,
}: {
  title: string;
  eyebrow: string;
  icon: typeof ClipboardList;
  items: QueueItem[];
  emptyTitle: string;
  emptyIcon: typeof ShieldCheck;
  pendingAction: string | null;
  pendingNoteId: string | null;
  getNoteValue: (record: CoachInterventionRecord | null) => string;
  onNoteChange: (id: string, value: string) => void;
  onNoteSave: (record: CoachInterventionRecord | null) => Promise<void>;
  onStatusChange: (record: CoachInterventionRecord | null, status: CoachInterventionStatus) => Promise<void>;
  historyMode?: boolean;
}) {
  return (
    <div className="p-8 rounded-[2rem] bg-slate-900 border border-slate-800 shadow-2xl">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-black italic uppercase tracking-tight text-white font-orbitron">{title}</h3>
        </div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{eyebrow}</div>
      </div>

      <div className="space-y-3 max-h-[540px] overflow-y-auto pr-2 custom-scrollbar">
        {items.length > 0 ? (
          items.map((item) => {
            const acknowledgePending = item.record ? pendingAction === `${item.record.id}:acknowledged` : false;
            const resolvePending = item.record ? pendingAction === `${item.record.id}:resolved` : false;
            const noteValue = getNoteValue(item.record);
            const noteDirty = noteValue.trim() !== ((item.record?.notes || "").trim());
            const notePending = item.record ? pendingNoteId === item.record.id : false;

            return (
              <motion.div
                key={item.record?.id || `${item.queueType}-${item.id}-${item.recommendation}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-2xl bg-slate-950/50 border border-slate-800 hover:border-blue-500/30 transition-all p-5"
              >
                <div className="flex items-start justify-between gap-5">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 border-2 border-slate-700 shrink-0">
                      {item.avatar_url ? (
                        <Image
                          src={item.avatar_url}
                          alt={item.full_name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold uppercase text-[10px]">
                          {item.full_name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-black italic uppercase tracking-tight text-white font-orbitron">
                          {item.full_name}
                        </h4>
                        <PriorityPill priority={item.priority} />
                        <StatusPill status={item.record?.status || "new"} />
                      </div>

                      <p className="mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {item.teamName}
                      </p>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {item.reasons.map((reason) => (
                          <span
                            key={`${item.record?.id || item.id}-${reason}`}
                            className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-300"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>

                      <p className="mt-3 text-xs text-slate-300 leading-relaxed">{item.recommendation}</p>

                      {item.objective_test && (
                        <div className="mt-4 rounded-2xl border border-sky-500/15 bg-sky-500/[0.05] p-3.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-sky-200/75">
                              Objective Signal
                            </p>
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${getObjectiveFreshnessClasses(item.objective_test.freshness)}`}
                            >
                              {formatObjectiveFreshness(item.objective_test.freshness)}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <ObjectiveSignalPill
                              label={item.objective_test.primarySignal?.displayName || "Signal"}
                              value={
                                item.objective_test.primarySignal?.formattedHeadline || "No test"
                              }
                            />
                            <ObjectiveSignalPill
                              label="Trend"
                              value={formatObjectiveTrend(item.objective_test.trend)}
                            />
                            <ObjectiveSignalPill
                              label="Change"
                              value={formatObjectiveDelta(
                                item.objective_test.primarySignal?.deltaVsPrevious ?? item.objective_test.deltaVsPreviousMs,
                                item.objective_test.primarySignal?.headlineMetricUnit || null,
                                item.objective_test.primarySignal?.trend || item.objective_test.trend
                              )}
                            />
                            <ObjectiveSignalPill
                              label="Class"
                              value={item.objective_test.classification || "Missing"}
                            />
                          </div>

                          <p className="mt-3 text-[11px] leading-relaxed text-slate-300">
                            {item.objective_test.summary}
                          </p>

                          {item.objective_test.freshness !== "fresh" && (
                            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-200/70">
                              {item.objective_test.nextAction}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Coach Notes</p>
                          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">
                            {historyMode && item.record?.resolved_at
                              ? `Resolved ${formatTimestamp(item.record.resolved_at)}`
                              : item.record?.updated_at
                                ? `Updated ${formatTimestamp(item.record.updated_at)}`
                                : "Unsaved"}
                          </p>
                        </div>
                        <textarea
                          value={noteValue}
                          onChange={(event) => item.record && onNoteChange(item.record.id, event.target.value)}
                          rows={3}
                          placeholder="Add coaching context, follow-up actions, or why this was resolved."
                          className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500/40 resize-none"
                        />
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void onNoteSave(item.record)}
                            disabled={!item.record || !noteDirty || notePending}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-200 disabled:opacity-50"
                          >
                            <Save className="h-3 w-3" />
                            {notePending ? "Saving..." : noteDirty ? "Save note" : "Saved"}
                          </button>
                          {item.record?.notes && !noteDirty && (
                            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                              Persisted to history
                            </span>
                          )}
                        </div>
                      </div>

                      {!historyMode && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.record?.status !== "acknowledged" && item.record?.status !== "resolved" && (
                            <button
                              type="button"
                              onClick={() => void onStatusChange(item.record, "acknowledged")}
                              disabled={!item.record || acknowledgePending || Boolean(pendingAction)}
                              className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200 disabled:opacity-50"
                            >
                              {acknowledgePending ? "Saving..." : "Acknowledge"}
                            </button>
                          )}
                          {item.record?.status !== "resolved" && (
                            <button
                              type="button"
                              onClick={() => void onStatusChange(item.record, "resolved")}
                              disabled={!item.record || resolvePending || Boolean(pendingAction)}
                              className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200 disabled:opacity-50"
                            >
                              {resolvePending ? "Saving..." : "Resolve"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-3">
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">Readiness</p>
                      <p
                        className={`text-xl font-black italic font-orbitron ${
                          item.readiness_score < 40
                            ? "text-red-500"
                            : item.readiness_score < 60
                              ? "text-amber-500"
                              : "text-emerald-500"
                        }`}
                      >
                        {item.readiness_score}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">Risk</p>
                      <p className="text-sm font-black text-white">{Math.round(item.risk_score || 0)}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">Trust</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                        {item.confidence_level || "N/A"} / {item.data_quality || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                        {historyMode ? "Logged from" : "Last log"}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                        {formatStaleLabel(item.staleHours)}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="py-12 text-center">
            <EmptyIcon className="h-10 w-10 text-emerald-500 mx-auto mb-4 opacity-20" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{emptyTitle}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
      <p className="min-w-[88px] text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={`${label}-${option.value}`}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] transition-all ${
                active
                  ? "border-blue-500/30 bg-blue-500/12 text-blue-200"
                  : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.05]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function mapFeedItemToQueueItem(item: CoachInterventionFeedItem): QueueItem {
  return {
    id: item.athlete_id,
    full_name: item.athlete_name,
    avatar_url: item.athlete_avatar_url,
    readiness_score: item.readiness_score,
    status: item.status,
    risk_score: item.risk_score,
    last_logged: item.source_log_date,
    vision_faults: [],
    confidence_level: item.confidence_level || null,
    data_quality: item.data_quality || null,
    objective_test: item.objective_test || null,
    teamName: item.team_name,
    queueType: item.queue_type,
    priority: item.priority,
    reasons: item.reason_codes,
    recommendation:
      item.recommendation ||
      (item.queue_type === "low_data"
        ? "Strengthen signal quality before changing load."
        : "Review athlete context."),
    staleHours: item.stale_hours ?? null,
    record: item,
  };
}

function RehabLaneSection({
  items,
  emptyTitle,
}: {
  items: RehabLaneItem[];
  emptyTitle: string;
}) {
  return (
    <div className="p-8 rounded-[2rem] bg-slate-900 border border-slate-800 shadow-2xl">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-cyan-300" />
          <h3 className="text-lg font-black italic uppercase tracking-tight text-white font-orbitron">
            Rehab And Return Lane
          </h3>
        </div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          {items.length} staged rehab cases
        </div>
      </div>

      <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2 custom-scrollbar">
        {items.length > 0 ? (
          items.map((item) => (
            <motion.div
              key={`rehab-${item.id}-${item.rehab.phase}-${item.rehab.updatedAt || "current"}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-2xl bg-slate-950/50 border border-slate-800 hover:border-cyan-500/30 transition-all p-5"
            >
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-black italic uppercase tracking-tight text-white font-orbitron">
                      {item.full_name}
                    </h4>
                    <RehabStagePill label={item.rehab.label} />
                    {item.rehab.progressionReadiness && (
                      <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-200">
                        Ready To Review
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {item.teamName} • {item.rehab.injuryType}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <ObjectiveSignalPill label="Phase" value={String(item.rehab.phase)} />
                    <ObjectiveSignalPill
                      label="Pain"
                      value={item.rehab.lastPainScore !== null ? `${item.rehab.lastPainScore}/10` : "N/A"}
                    />
                    <ObjectiveSignalPill
                      label="Load"
                      value={item.rehab.loadTolerancePct !== null ? `${item.rehab.loadTolerancePct}%` : "N/A"}
                    />
                    <ObjectiveSignalPill
                      label="Flag"
                      value={formatRehabProgressionFlag(item.rehab.progressionFlag)}
                    />
                    <ObjectiveSignalPill
                      label="Days"
                      value={item.rehab.daysInPhase !== null ? String(item.rehab.daysInPhase) : "N/A"}
                    />
                  </div>

                  <p className="mt-4 text-xs text-slate-300 leading-relaxed">{item.rehab.nextAction}</p>

                  <div className="mt-4 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.05] p-3.5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200/75">
                      Current restrictions
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.rehab.restrictions.slice(0, 3).map((restriction) => (
                        <span
                          key={`${item.id}-${restriction}`}
                          className="inline-flex items-center rounded-full border border-white/10 bg-slate-950/50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-200"
                        >
                          {restriction}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-3">
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">Stage</p>
                    <p className="text-xl font-black italic font-orbitron text-cyan-200">{item.rehab.phase}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">Updated</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                      {item.rehab.updatedAt ? formatTimestamp(item.rehab.updatedAt) : "recent"}
                    </p>
                  </div>
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">Last log</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                      {formatStaleLabel(item.stale_hours ?? null)}
                      </p>
                    </div>
                  </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-12 text-center">
            <ShieldCheck className="h-10 w-10 text-cyan-300 mx-auto mb-4 opacity-20" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{emptyTitle}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function JuniorLaneSection({
  items,
  emptyTitle,
}: {
  items: JuniorLaneItem[];
  emptyTitle: string;
}) {
  return (
    <div className="p-8 rounded-[2rem] bg-slate-900 border border-slate-800 shadow-2xl">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-violet-300" />
          <h3 className="text-lg font-black italic uppercase tracking-tight text-white font-orbitron">
            Junior And Parent Handoff Lane
          </h3>
        </div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          {items.length} junior athletes
        </div>
      </div>

      <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2 custom-scrollbar">
        {items.length > 0 ? (
          items.map((item) => (
            <motion.div
              key={`junior-${item.id}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-2xl bg-slate-950/50 border border-slate-800 hover:border-violet-500/30 transition-all p-5"
            >
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-black italic uppercase tracking-tight text-white font-orbitron">
                      {item.full_name}
                    </h4>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${item.guardian_profile?.handoffReady ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200" : "border-amber-500/20 bg-amber-500/10 text-amber-100"}`}>
                      {item.guardian_profile?.statusLabel || "Guardian context missing"}
                    </span>
                    {!item.parentHandoffEnabled && (
                      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-300">
                        Team handoff off
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {item.teamName} • age {item.age_years ?? "N/A"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <ObjectiveSignalPill
                      label="Consent"
                      value={formatGuardianConsent(item.guardian_profile?.consentStatus)}
                    />
                    <ObjectiveSignalPill
                      label="Guardian"
                      value={item.guardian_profile?.guardianName || "Missing"}
                    />
                    <ObjectiveSignalPill
                      label="Contact"
                      value={
                        item.guardian_profile?.guardianPhone ||
                        item.guardian_profile?.guardianEmail ||
                        "Missing"
                      }
                    />
                  </div>

                  <p className="mt-4 text-xs text-slate-300 leading-relaxed">
                    {item.guardian_profile?.nextAction ||
                      "Add guardian and emergency contact context before parent handoff can be used."}
                  </p>
                </div>

                <div className="text-right shrink-0 space-y-3">
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">Consent</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                      {formatGuardianConsent(item.guardian_profile?.consentStatus)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">Handoff</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                      {item.guardian_profile?.handoffReady ? "Ready" : "Not ready"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">Last log</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                      {formatStaleLabel(item.stale_hours ?? null)}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-12 text-center">
            <Users className="h-10 w-10 text-violet-300 mx-auto mb-4 opacity-20" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{emptyTitle}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ObjectiveSignalPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-slate-950/50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-200">
      {label}: {value}
    </span>
  );
}

function RehabStagePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200">
      {label}
    </span>
  );
}

function formatObjectiveTrend(trend: CoachObjectiveTestSummary["trend"]) {
  if (trend === "improving") return "Improving";
  if (trend === "declining") return "Declining";
  if (trend === "stable") return "Stable";
  return "Missing";
}

function formatObjectiveFreshness(freshness: CoachObjectiveTestSummary["freshness"]) {
  if (freshness === "fresh") return "Fresh";
  if (freshness === "stale") return "Stale";
  return "Missing";
}

function formatObjectiveDelta(
  delta: number | null | undefined,
  unit: string | null = "ms",
  trend: CoachObjectiveTestSummary["trend"] = "stable"
) {
  if (delta === null || delta === undefined || !Number.isFinite(delta)) return "No baseline";
  if (unit === "ms") {
    if (delta <= -10) return `Faster ${Math.abs(delta)}ms`;
    if (delta >= 10) return `Slower ${Math.abs(delta)}ms`;
  }
  if (trend === "improving") return "Improving";
  if (trend === "declining") return "Declining";
  return "Flat";
}

function formatRehabProgressionFlag(flag: CoachRehabSummary["progressionFlag"]) {
  if (flag === "progressed") return "Progressed";
  if (flag === "regressed") return "Regressed";
  if (flag === "held") return "Held";
  if (flag === "started") return "Started";
  return "Monitoring";
}

function formatGuardianConsent(status: string | null | undefined) {
  if (status === "confirmed") return "Confirmed";
  if (status === "coach_confirmed") return "Coach confirmed";
  if (status === "pending") return "Pending";
  if (status === "declined") return "Declined";
  return "Unknown";
}

function getObjectiveFreshnessClasses(freshness: CoachObjectiveTestSummary["freshness"]) {
  if (freshness === "fresh") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
  }

  if (freshness === "stale") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-200";
  }

  return "border-slate-500/20 bg-slate-500/10 text-slate-300";
}

function formatTimestamp(value: string) {
  if (!value) return "recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";

  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function getPriorityWeight(priority: CoachQueuePriority) {
  if (priority === "Critical") return 3;
  if (priority === "Warning") return 2;
  return 1;
}

function MetricCard({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string;
  value: string;
  sublabel: string;
  accent: string;
}) {
  return (
    <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      <div className="mt-4">
        <span className={`text-4xl font-black italic font-orbitron ${accent}`}>{value}</span>
        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2">{sublabel}</p>
      </div>
    </div>
  );
}

function PriorityPill({ priority }: { priority: CoachQueuePriority }) {
  const styles =
    priority === "Critical"
      ? "border-red-500/20 bg-red-500/10 text-red-300"
      : priority === "Warning"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
        : "border-blue-500/20 bg-blue-500/10 text-blue-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${styles}`}>
      {priority === "Informational" ? "Watch" : priority}
    </span>
  );
}

function StatusPill({ status }: { status: CoachInterventionStatus }) {
  const styles =
    status === "resolved"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
      : status === "acknowledged"
        ? "border-blue-500/20 bg-blue-500/10 text-blue-200"
        : "border-white/10 bg-white/[0.03] text-slate-300";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${styles}`}>
      {status}
    </span>
  );
}

function WatchCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black italic font-orbitron text-white">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{detail}</p>
    </div>
  );
}
