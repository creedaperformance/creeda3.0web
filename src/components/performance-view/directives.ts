import type { DailyAction, GoalPhase } from '@/lib/product/operating-system/types'

export type Persona = 'athlete' | 'individual' | 'coach'

export type SportContext =
  | 'cricket'
  | 'football'
  | 'badminton'
  | 'athletics'
  | 'strength'
  | 'general'

export interface DirectiveContext {
  persona: Persona
  action: DailyAction
  sport?: SportContext
  phase?: GoalPhase
  topReasonLabel?: string
  topReasonImpact?: number
  hasInjury?: boolean
  streakDays?: number
}

export interface Directive {
  headline: string
  whyLine: string
}

const ATHLETE_ACTION_HEADLINES: Record<DailyAction, string[]> = {
  train_hard: [
    'Body says go. Push the ceiling.',
    'Nervous system is primed. Take the hard reps.',
    'Green across the board. Build today.',
  ],
  train_light: [
    'Body says steady. Build, don\'t bury.',
    'Quality over volume today.',
    'Stay sharp. Skip the failure work.',
  ],
  mobility_only: [
    'Movement only. Save the load for tomorrow.',
    'Move well, finish fresh.',
    'Mobility is the work today.',
  ],
  recovery_focus: [
    'Recovery is the workout.',
    'Recover with intent. Tomorrow\'s ceiling depends on it.',
    'Easy walk, hydration, sleep — that\'s the plan.',
  ],
  deload: [
    'Deload day. Don\'t out-train the recovery debt.',
    'Pull the throttle. The body needs a step back.',
    'Deload locked. Protect the next cycle.',
  ],
  full_rest: [
    'Full rest. Training today costs more than it earns.',
    'Stand down. Eat, sleep, rebuild.',
    'No load today. Body comes first.',
  ],
}

const INDIVIDUAL_ACTION_HEADLINES: Record<DailyAction, string[]> = {
  train_hard: [
    'Great day for a session. Body is ready.',
    'Push a little today — you\'ve earned the green light.',
    'Energy is high. Make it count.',
  ],
  train_light: [
    'Move steady today. Light work is the win.',
    'Keep it moving. Don\'t force the intensity.',
    'A good day for a walk plus a short session.',
  ],
  mobility_only: [
    'Just stretch and move easy today.',
    'Mobility and breathing — that\'s the goal.',
    'Slow it down. Movement, not muscle.',
  ],
  recovery_focus: [
    'Recover today. That\'s the training.',
    'Easy walk, water, sleep — that\'s enough.',
    'Take the rest. Your body is asking for it.',
  ],
  deload: [
    'Step back today. Tomorrow will feel better.',
    'Lighter is smarter. The body needs a pause.',
    'Pulled back on purpose. Listen to it.',
  ],
  full_rest: [
    'Rest day. No guilt — this is the plan.',
    'Skip training. Eat well, sleep early.',
    'Body says off. Honor it.',
  ],
}

function pickStable(options: string[], seed: number): string {
  if (options.length === 0) return ''
  return options[seed % options.length]
}

function buildAthleteWhyLine(ctx: DirectiveContext): string {
  const reason = ctx.topReasonLabel?.toLowerCase() ?? ''
  if (ctx.hasInjury) return 'Pain or injury flag is active — the plan is built around protecting it.'
  if (reason === 'sleep') {
    return ctx.topReasonImpact && ctx.topReasonImpact < 0
      ? 'Sleep is the limiter today. Volume drops, quality stays.'
      : 'Sleep is in your favour. Plan reflects it.'
  }
  if (reason === 'training load') {
    return ctx.topReasonImpact && ctx.topReasonImpact < 0
      ? 'Recent load is high. Today eases the throttle to keep tomorrow available.'
      : 'Load is balanced. Plan trusts the trend.'
  }
  if (reason === 'body status') {
    return ctx.topReasonImpact && ctx.topReasonImpact < 0
      ? 'Soreness is the bigger signal today than your check-in score.'
      : 'Body status is clean. Trust the score.'
  }
  if (reason === 'stress') {
    return 'Stress is high enough that hard work won\'t stick today.'
  }
  if (ctx.phase === 'taper') return 'You\'re in taper — recovery is the priority over volume.'
  if (ctx.phase === 'peak') return 'Peak window — every session counts. Plan reflects that.'
  return 'Plan blends your check-in, sleep, load, and history.'
}

function buildIndividualWhyLine(ctx: DirectiveContext): string {
  if (ctx.hasInjury) return 'There\'s a pain flag — the plan keeps things gentle.'
  const reason = ctx.topReasonLabel?.toLowerCase() ?? ''
  if (reason === 'sleep') return 'Sleep affected the score more than anything else today.'
  if (reason === 'training load') return 'Recent activity is the main signal — easing back is smart.'
  if (reason === 'body status') return 'Body soreness drove this. Light is enough today.'
  if (reason === 'stress') return 'Stress was the biggest input — exercise should help, not add to it.'
  if (ctx.streakDays && ctx.streakDays >= 14) return 'Two-week streak. Don\'t blow it on a hard day you don\'t need.'
  return 'Plan listens to today\'s check-in and your recent week.'
}

function buildCoachHeadline(redCount: number, amberCount: number, totalCount: number): string {
  if (totalCount === 0) return 'No athletes linked yet.'
  if (redCount === 0 && amberCount === 0) return `All ${totalCount} green. Go full intensity.`
  if (redCount >= Math.ceil(totalCount * 0.4)) return `Squad is loaded. Pull intensity back today.`
  if (redCount > 0) return `${redCount} red ${redCount === 1 ? 'flag' : 'flags'} — bench or modify before practice.`
  return `${amberCount} amber. Watch them in warm-up, plan B ready.`
}

function buildCoachWhyLine(redCount: number, amberCount: number, lowDataCount: number): string {
  if (lowDataCount > 0 && lowDataCount >= redCount + amberCount) {
    return `${lowDataCount} athletes haven\'t checked in today — chase before warm-up.`
  }
  if (redCount > 0) return 'Red athletes have either pain, low readiness, or a load spike. Drill into each before assigning.'
  if (amberCount > 0) return 'Amber athletes are workable but the margin is thin. Avoid contact volume.'
  return 'Squad readiness is clean. Hold the plan you wrote.'
}

export function buildDirective(ctx: DirectiveContext): Directive {
  const seed = (ctx.streakDays ?? 0) + ctx.action.length
  if (ctx.persona === 'athlete') {
    return {
      headline: pickStable(ATHLETE_ACTION_HEADLINES[ctx.action], seed),
      whyLine: buildAthleteWhyLine(ctx),
    }
  }
  if (ctx.persona === 'individual') {
    return {
      headline: pickStable(INDIVIDUAL_ACTION_HEADLINES[ctx.action], seed),
      whyLine: buildIndividualWhyLine(ctx),
    }
  }
  return {
    headline: ctx.action ? ATHLETE_ACTION_HEADLINES[ctx.action]?.[0] ?? '' : '',
    whyLine: '',
  }
}

export function buildCoachDirective(args: {
  totalAthletes: number
  redCount: number
  amberCount: number
  lowDataCount: number
}): Directive {
  return {
    headline: buildCoachHeadline(args.redCount, args.amberCount, args.totalAthletes),
    whyLine: buildCoachWhyLine(args.redCount, args.amberCount, args.lowDataCount),
  }
}

export function actionTone(action: DailyAction): 'go' | 'steady' | 'slow' | 'stop' {
  if (action === 'train_hard') return 'go'
  if (action === 'train_light') return 'steady'
  if (action === 'mobility_only' || action === 'recovery_focus') return 'slow'
  return 'stop'
}
