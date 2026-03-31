import { IntelligenceResult, CreedaStatus } from './core_engine';

export type UIStatus = 'TRAIN' | 'RECOVER' | 'REST';
export type UIColor = 'emerald' | 'amber' | 'rose' | 'blue';
export type ReadinessLabel = 'Peak' | 'Ready' | 'Moderate' | 'Fatigued' | 'High Risk';

export interface ActionStripItem {
  score: number | string;
  status: 'Good' | 'Low' | 'High' | 'Normal' | 'Critical';
}

export interface AthleteUIState {
  readinessScore: number;
  readinessLabel: ReadinessLabel;
  todayDecision: string;
  microInsight: string;
  
  actionStrip: {
    sleep: ActionStripItem;
    load: ActionStripItem;
    recovery: ActionStripItem;
  };

  plan: {
    intensity: 'Low' | 'Moderate' | 'High';
    instructions: string[];
  };

  riskAlert: string | null;
  
  color: UIColor;
  
  // Legacy fields for backward compatibility during transition
  status: UIStatus;
  intensity: 'Low' | 'Moderate' | 'High';
  focus: string;
  message: string;
  triggers: {
    showPhysio: boolean;
    showRecoveryExpert: boolean;
    showCoach: boolean;
  };
  habitMessage: string | null;
  urgencyHook: string | null;
  referral?: {
    type: 'Physio' | 'Nutritionist' | 'Psychologist' | 'Ortho';
    reason: string;
    urgency: 'High' | 'Medium' | 'Low';
  };
}

/**
 * Goal-specific focus labels for dashboard context.
 */
const GOAL_FOCUS_MAP: Record<string, string> = {
  'performance': 'Peak Performance',
  'injury': 'Injury Prevention',
  'recovery': 'Recovery Optimisation',
  'return': 'Return to Play',
  'competition': 'Competition Readiness',
};

function resolveGoalFocus(goal?: string): string {
  if (!goal) return 'Performance';
  const lower = goal.toLowerCase();
  for (const [key, label] of Object.entries(GOAL_FOCUS_MAP)) {
    if (lower.includes(key)) return label;
  }
  return 'Performance';
}

/**
 * Transforms Core Intelligence Engine output into simple, actionable UI States.
 * Now accepts sport, position, and goal context for fully personalised output.
 */
export function translateEngineToUI(
  intel: IntelligenceResult | null, 
  lastLoggedDateISO: string | null,
  todayLog: any | null,
  streakCount: number = 0,
  activePrep: { eventName: string, focus: string, date?: string } | null = null,
  athleteContext?: { sport?: string, position?: string, goal?: string }
): AthleteUIState {
  
  const sport = athleteContext?.sport || 'General';
  const position = athleteContext?.position || 'General';
  const goalFocus = resolveGoalFocus(athleteContext?.goal);

  // 1. Habit Recovery Logic
  let habitMessage = null;
  if (!todayLog) {
    if (lastLoggedDateISO) {
      const hoursSinceLog = (Date.now() - new Date(lastLoggedDateISO).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLog > 24) {
        habitMessage = "Let's get back on track today";
      }
    } else {
      habitMessage = "Your first day! Let's build the habit.";
    }
  }

  // Fallback state
  if (!intel || typeof intel.score !== 'number') {
    return {
      readinessScore: 70,
      readinessLabel: 'Ready',
      todayDecision: `Train smart for ${sport}. Maintain your routine.`,
      microInsight: habitMessage || "Ready to log your first session?",
      actionStrip: {
        sleep: { score: todayLog?.sleep_quality || 'N/A', status: 'Good' },
        load: { score: '1.00', status: 'Normal' },
        recovery: { score: 70, status: 'Good' }
      },
      plan: {
        intensity: 'Moderate',
        instructions: ["Maintain standard volume"]
      },
      riskAlert: null,
      status: 'TRAIN',
      intensity: 'Moderate',
      focus: goalFocus,
      message: habitMessage || "Ready to log your first session?",
      color: 'blue',
      triggers: { showPhysio: false, showRecoveryExpert: false, showCoach: false },
      habitMessage,
      urgencyHook: null,
      referral: undefined
    };
  }

  const readinessScore = intel.score;
  let readinessLabel: ReadinessLabel = 'Ready';
  if (readinessScore >= 85) readinessLabel = 'Peak';
  else if (readinessScore >= 60) readinessLabel = 'Ready';
  else if (readinessScore >= 40) readinessLabel = 'Moderate';
  else if (intel.status === 'REST') readinessLabel = 'High Risk';
  else readinessLabel = 'Fatigued';

  const painLevel = todayLog?.current_pain_level || 0;
  
  let color: UIColor = 'blue';
  if (readinessScore >= 80) color = 'emerald';
  else if (readinessScore >= 60) color = 'blue';
  else if (readinessScore >= 40) color = 'amber';
  else color = 'rose';

  // Map intensity from status
  const intensityMap: Record<CreedaStatus, 'Low' | 'Moderate' | 'High'> = {
    'TRAIN': readinessScore > 85 ? 'High' : 'Moderate',
    'MODIFY': 'Low',
    'REST': 'Low'
  };

  const status: UIStatus = intel.status === 'REST' ? 'REST' : (intel.status === 'TRAIN' ? 'TRAIN' : 'RECOVER');
  const intensity = intensityMap[intel.status];
  let message = intel.reason;

  // Today's Decision — sport-contextualised
  const todayDecision = intel.action;

  // Action Strip Data
  const sleepValue = todayLog?.sleep_quality || 'N/A';
  const sleepStatus = (sleepValue === 'Excellent' || sleepValue === 'Good') ? 'Good' : 'Low';
  
  const loadVal = intel.trace.acwr.toFixed(2); 
  const loadStatus = intel.trace.acwr > 1.5 ? 'Critical' : 'Normal';

  const recoveryScore = intel.trace.recoveryCapacity;
  const recoveryStatus = recoveryScore > 70 ? 'Good' : recoveryScore > 40 ? 'Low' : 'Critical';

  // Instructions
  const instructions = [intel.action];

  // Risk Alert
  let riskAlert = null;
  if (intel.priority === 'Critical' || intel.status === 'REST') {
    riskAlert = intel.reason || "Critical fatigue detected.";
  }

  // Goal-Driven Micro-Insight Layer
  const goalLower = (athleteContext?.goal || '').toLowerCase();
  if (goalLower.includes('competition') && readinessScore > 80) {
    message = `Peak readiness detected. You're primed for ${sport} competition.`;
  } else if (goalLower.includes('return') && painLevel > 0) {
    message = `Pain detected during return-to-play. Reducing ${sport} load is critical.`;
  } else if (goalLower.includes('recovery') && readinessScore < 60) {
    message = `Recovery markers are low. Prioritise restoration over ${sport} intensity.`;
  }

  // Time-Bound Context Memory Layer
  if (activePrep && activePrep.date) {
    const daysOut = Math.max(1, Math.ceil((new Date(activePrep.date).getTime() - Date.now()) / (1000 * 3600 * 24)));
    if (daysOut <= 14) {
      message = `You're ${daysOut} days away from ${activePrep.eventName} — this week matters.`;
    } else {
      message = `You're building endurance for ${activePrep.eventName}. Stay consistent.`;
    }
  } else if (streakCount >= 3) {
    if (readinessScore > 80) message = `You've been consistent for ${streakCount} days and your body is responding. Push today.`;
    else message = `You've been consistent for ${streakCount} days — don't break the streak now.`;
  }

  // Triggers
  const showPhysio = painLevel >= 5 || intel.referral?.type === 'Physio';
  const showRecoveryExpert = readinessScore < 40;
  const showCoach = readinessScore > 50 && readinessScore < 70;

  return {
    readinessScore,
    readinessLabel,
    todayDecision,
    microInsight: message,
    actionStrip: {
      sleep: { score: sleepValue, status: sleepStatus },
      load: { score: loadVal, status: loadStatus },
      recovery: { score: recoveryScore, status: recoveryStatus }
    },
    plan: {
      intensity,
      instructions
    },
    riskAlert,
    status,
    intensity,
    focus: goalFocus,
    message,
    color,
    triggers: {
      showPhysio,
      showRecoveryExpert,
      showCoach
    },
    habitMessage,
    urgencyHook: null,
    referral: intel.referral ? {
        type: intel.referral.type,
        reason: intel.referral.reason,
        urgency: intel.referral.urgency
    } : undefined
  };
}
