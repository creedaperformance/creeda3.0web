export type CoachInterventionStatus = "new" | "acknowledged" | "resolved";
export type CoachQueueType = "intervention" | "low_data";
export type CoachQueuePriority = "Critical" | "Warning" | "Informational";

export interface CoachAthleteSignal {
  readiness_score: number;
  risk_score: number;
  last_logged?: string | null;
  vision_faults?: unknown[];
  action_instruction?: string | null;
  alert_priority?: "Critical" | "Warning" | "Informational" | null;
  confidence_level?: "LOW" | "MEDIUM" | "HIGH" | null;
  data_quality?: "COMPLETE" | "PARTIAL" | "WEAK" | null;
  objective_test?: {
    latestValidatedScoreMs: number | null;
    deltaVsPreviousMs: number | null;
    trend: "improving" | "stable" | "declining" | "missing";
    freshness: "fresh" | "stale" | "missing";
    classification: string | null;
    summary: string;
    nextAction: string;
  } | null;
}

export interface DerivedCoachQueueSignal {
  queueType: CoachQueueType;
  priority: CoachQueuePriority;
  reasonCodes: string[];
  recommendation: string;
  staleHours: number | null;
  sourceLogDate: string;
}

export function derivePerformanceQueueSignal(member: CoachAthleteSignal): DerivedCoachQueueSignal | null {
  const staleHours = getHoursSince(member.last_logged);
  const hasSignalWindow = Boolean(member.last_logged);
  const objectiveDecline =
    member.objective_test?.freshness === "fresh" &&
    member.objective_test?.trend === "declining" &&
    Math.abs(member.objective_test?.deltaVsPreviousMs || 0) >= 10;
  const reasonCodes: string[] = [];
  let priority: CoachQueuePriority = "Informational";

  if (
    !hasSignalWindow &&
    member.risk_score <= 0 &&
    member.readiness_score <= 0 &&
    (!Array.isArray(member.vision_faults) || member.vision_faults.length === 0) &&
    !objectiveDecline
  ) {
    return null;
  }

  if (member.alert_priority === "Critical" || member.risk_score >= 70) {
    reasonCodes.push("Critical injury-risk profile");
    priority = "Critical";
  } else if (member.risk_score >= 45) {
    reasonCodes.push("Elevated risk trend");
    priority = "Warning";
  }

  if (hasSignalWindow && member.readiness_score < 45) {
    reasonCodes.push("Low readiness");
    if (priority !== "Critical") priority = "Warning";
  }

  if (objectiveDecline) {
    reasonCodes.push("Objective sharpness drop");
    if (priority !== "Critical") priority = "Warning";
  }

  if (Array.isArray(member.vision_faults) && member.vision_faults.length > 0) {
    reasonCodes.push("Movement faults detected");
  }

  if (!reasonCodes.length) return null;

  return {
    queueType: "intervention",
    priority,
    reasonCodes,
    recommendation: member.action_instruction || buildFallbackAction(reasonCodes, "intervention"),
    staleHours,
    sourceLogDate: getSourceLogDate(member.last_logged),
  };
}

export function deriveLowDataQueueSignal(member: CoachAthleteSignal): DerivedCoachQueueSignal | null {
  const staleHours = getHoursSince(member.last_logged);
  const reasonCodes: string[] = [];
  let priority: CoachQueuePriority = "Informational";

  if (staleHours === null || staleHours > 36) {
    reasonCodes.push("Missing recent check-in");
    priority = "Warning";
  }

  if (member.confidence_level === "LOW" || member.data_quality === "WEAK") {
    reasonCodes.push("Low confidence decision");
    if (priority !== "Warning") priority = "Warning";
  } else if (member.data_quality === "PARTIAL") {
    reasonCodes.push("Partial data coverage");
  }

  if (!reasonCodes.length) return null;

  return {
    queueType: "low_data",
    priority,
    reasonCodes,
    recommendation: buildFallbackAction(reasonCodes, "low_data"),
    staleHours,
    sourceLogDate: getSourceLogDate(member.last_logged),
  };
}

export function buildCoachInterventionKey(args: {
  athleteId: string;
  teamId: string;
  queueType: CoachQueueType;
  sourceLogDate: string;
}) {
  return `${args.athleteId}::${args.teamId}::${args.queueType}::${args.sourceLogDate}`;
}

export function getHoursSince(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.round((Date.now() - timestamp) / (1000 * 60 * 60)));
}

export function formatStaleLabel(hours: number | null) {
  if (hours === null) return "No recent log";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function buildFallbackAction(reasonCodes: string[], queueType: CoachQueueType) {
  if (queueType === "low_data") {
    if (reasonCodes.some((reason) => reason.includes("Missing recent check-in"))) {
      return "Request a same-day check-in so the next coaching call is based on live data.";
    }
    if (reasonCodes.some((reason) => reason.includes("Low confidence"))) {
      return "Collect a fresh check-in before escalating load. Optional measured signals can help, but they are not required.";
    }
    return "Strengthen input quality before making a higher-stakes decision.";
  }

  if (reasonCodes.some((reason) => reason.includes("Critical injury-risk"))) {
    return "Reduce high-risk loading immediately and review the athlete before full training exposure.";
  }
  if (reasonCodes.some((reason) => reason.includes("Low readiness"))) {
    return "Modify today’s session and keep the athlete in technical or recovery-biased work.";
  }
  if (reasonCodes.some((reason) => reason.includes("Objective sharpness drop"))) {
    return "Hold explosive loading steady, review recovery context, and retest objective sharpness before pushing harder.";
  }
  if (reasonCodes.some((reason) => reason.includes("Movement faults"))) {
    return "Keep load controlled and pair today with a technique-focused correction block.";
  }
  return "Review the athlete context before increasing load today.";
}

function getSourceLogDate(value: string | null | undefined) {
  if (value) {
    const normalized = String(value).slice(0, 10);
    if (normalized) return normalized;
  }

  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}
