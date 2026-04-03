import {
  type ObjectiveTestRole,
  type ObjectiveTestSession,
} from '@/lib/objective-tests/types'
import { normalizeObjectiveTestSession } from '@/lib/objective-tests/store'

export const REACTION_TAP_TEST_TYPE = "reaction_tap" as const;
export const REACTION_TAP_PROTOCOL_VERSION = "reaction_tap_v1";
export const REACTION_TAP_ACCEPTED_TRIALS = 5;
export type { ObjectiveTestRole, ObjectiveTestSession };

export interface ReactionTapClassification {
  label: string;
  description: string;
  tone: "emerald" | "blue" | "amber" | "rose";
}

export interface ReactionTapSummary {
  averageScoreMs: number;
  validatedScoreMs: number;
  bestScoreMs: number;
  consistencyMs: number;
  classification: ReactionTapClassification;
}

export function classifyReactionTapScore(scoreMs: number): ReactionTapClassification {
  if (scoreMs < 210) {
    return {
      label: "Elite",
      description: "Fast visual reaction with strong nervous-system sharpness.",
      tone: "emerald",
    };
  }

  if (scoreMs < 250) {
    return {
      label: "Sharp",
      description: "Above-average response speed for a phone-based tap test.",
      tone: "blue",
    };
  }

  if (scoreMs < 310) {
    return {
      label: "Stable",
      description: "Within a normal range. Track this over time for trend direction.",
      tone: "amber",
    };
  }

  return {
    label: "Fatigued",
    description: "Slower than ideal. Re-check after better sleep, recovery, or hydration.",
    tone: "rose",
  };
}

export function calculateReactionTapSummary(trials: number[]): ReactionTapSummary {
  if (!trials.length) {
    throw new Error("Reaction summary requires at least one accepted trial.");
  }

  const averageScoreMs = Math.round(trials.reduce((sum, trial) => sum + trial, 0) / trials.length);
  const sortedTrials = [...trials].sort((a, b) => a - b);
  const middleIndex = Math.floor(sortedTrials.length / 2);
  const validatedScoreMs = sortedTrials[middleIndex];
  const bestScoreMs = sortedTrials[0];
  const variance =
    trials.reduce((sum, trial) => sum + (trial - averageScoreMs) ** 2, 0) / trials.length;
  const consistencyMs = Math.round(Math.sqrt(variance));

  return {
    averageScoreMs,
    validatedScoreMs,
    bestScoreMs,
    consistencyMs,
    classification: classifyReactionTapScore(validatedScoreMs),
  };
}

export { normalizeObjectiveTestSession };
