import 'server-only'

import { z } from 'zod'

import { runAiChatCompletion } from '@/lib/ai-coach/client'
import { buildAiCoachContext, formatContextForPrompt } from '@/lib/ai-coach/context-builder'
import { estimateCostCents, recordAiUsage } from '@/lib/ai-coach/quotas'

type SupabaseLike = {
  from: (table: string) => any
  rpc: (fn: string, args?: Record<string, unknown>) => any
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string; email?: string | null } | null }
    }>
  }
}

export type NewspaperNumber = {
  label: string
  value: string
  delta?: string
}

export type WeeklyNewspaperPayload = {
  headline: string
  hero_metric: string
  hero_value: string
  numbers: NewspaperNumber[]
  one_win: string
  one_focus: string
  next_week_actions: string[]
}

const NUMBER_SCHEMA = z.object({
  label: z.string().trim().min(1).max(40),
  value: z.string().trim().min(1).max(40),
  delta: z.string().trim().max(40).optional(),
})

const PAYLOAD_SCHEMA = z.object({
  headline: z.string().trim().min(4).max(120),
  hero_metric: z.string().trim().min(1).max(60),
  hero_value: z.string().trim().min(1).max(40),
  numbers: z.array(NUMBER_SCHEMA).min(2).max(8),
  one_win: z.string().trim().min(8).max(280),
  one_focus: z.string().trim().min(8).max(280),
  next_week_actions: z.array(z.string().trim().min(4).max(160)).max(5),
})

const SYSTEM_PROMPT = `You are an editor writing a weekly performance newspaper for a Creeda user. Output strict JSON in the exact shape requested.

Your job:
- Read the user's last 7 days of training, readiness, sleep, check-ins, and any flags.
- Write a 1-line headline that captures the week's story.
- Pick a hero metric that matters for THIS user this week (readiness average, ACWR, streak days, sleep, 1RM, sprint time, weight loss, mood, etc.). Don't always pick the same metric.
- Surface 4–6 numbers with optional week-over-week deltas.
- Write a single-sentence "one win" — something they should feel good about.
- Write a single-sentence "one focus" — the highest-leverage thing for next week.
- Write 2–4 specific next-week actions.

Hard rules:
- No diagnosis. No specific medical or training prescriptions ("do 5 sets of 5 squats Tuesday at 8am" is too specific). Talk in directional terms ("add a movement-quality session," "one extra recovery walk midweek").
- If modified mode is active, lean conservative everywhere.
- Calm, evidence-led tone. Never use "amazing", "crushed it", or marketing fluff. Read like a thoughtful coach writing a Monday email.
- Indian context where relevant (cricket, kabaddi, monsoon heat) but only if the user's profile suggests it.
- Output ONLY the JSON. No markdown, no commentary, no fences.

JSON schema:
{
  "headline": "string, 4-120 chars",
  "hero_metric": "short label",
  "hero_value": "what to display",
  "numbers": [{"label": "string", "value": "string", "delta": "optional string"}, ...],
  "one_win": "1-2 sentences max",
  "one_focus": "1-2 sentences max",
  "next_week_actions": ["string", ...]
}`

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function getCurrentWeekStartIso(today = new Date()): string {
  const d = new Date(today)
  d.setUTCHours(0, 0, 0, 0)
  const day = d.getUTCDay() // 0 Sun, 1 Mon, ...
  const diff = (day + 6) % 7 // distance back to Monday
  d.setUTCDate(d.getUTCDate() - diff)
  return isoDate(d)
}

function isoDaysAgo(days: number, today = new Date()): string {
  const d = new Date(today)
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - days)
  return isoDate(d)
}

async function loadWeeklyTelemetry(supabase: SupabaseLike, userId: string) {
  const sevenDaysAgo = isoDaysAgo(7)
  const fourteenDaysAgo = isoDaysAgo(14)

  const [{ data: readinessRows }, { data: checkInRows }, { data: capacityRows }, { data: medicalRow }] =
    await Promise.all([
      supabase
        .from('readiness_scores')
        .select('date, score, confidence_tier, confidence_pct, directive')
        .eq('user_id', userId)
        .gte('date', fourteenDaysAgo)
        .order('date', { ascending: false }),
      supabase
        .from('daily_check_ins')
        .select('date, energy, body_feel, mental_load, sleep_hours_self, sleep_quality_self, pain_locations')
        .eq('user_id', userId)
        .gte('date', fourteenDaysAgo)
        .order('date', { ascending: false }),
      supabase
        .from('capacity_tests')
        .select('test_type, raw_value, unit, performed_at')
        .eq('user_id', userId)
        .gte('performed_at', sevenDaysAgo)
        .order('performed_at', { ascending: false }),
      supabase
        .from('medical_screenings')
        .select('modified_mode_active, medical_clearance_provided')
        .eq('user_id', userId)
        .maybeSingle(),
    ])

  return {
    readiness: Array.isArray(readinessRows) ? readinessRows : [],
    check_ins: Array.isArray(checkInRows) ? checkInRows : [],
    capacity_tests: Array.isArray(capacityRows) ? capacityRows : [],
    modified_mode:
      Boolean((medicalRow as { modified_mode_active?: boolean } | null)?.modified_mode_active) &&
      !Boolean(
        (medicalRow as { medical_clearance_provided?: boolean } | null)?.medical_clearance_provided
      ),
  }
}

export async function buildWeeklyNewspaper(args: {
  supabase: SupabaseLike
  userId: string
  weekStartIso?: string
}): Promise<{
  payload: WeeklyNewspaperPayload
  costCents: number
  inputTokens: number
  outputTokens: number
  model: string
  weekStartIso: string
}> {
  const weekStartIso = args.weekStartIso ?? getCurrentWeekStartIso()
  const telemetry = await loadWeeklyTelemetry(args.supabase, args.userId)
  const context = await buildAiCoachContext(args.supabase, args.userId)
  const contextBlock = formatContextForPrompt(context)

  const userMessage = [
    `Write the weekly performance newspaper for the week starting ${weekStartIso}.`,
    'Last 7–14 days of telemetry follows. Use it to fill the JSON.',
    '```json',
    JSON.stringify(telemetry, null, 2),
    '```',
    '',
    'Return ONLY the JSON object — no fences, no commentary.',
  ].join('\n')

  const completion = await runAiChatCompletion({
    systemPrompt: SYSTEM_PROMPT,
    contextBlock,
    history: [],
    userMessage,
  })

  const parsed = parsePayload(completion.content)
  const costCents = estimateCostCents(completion.model, completion.inputTokens, completion.outputTokens)

  await recordAiUsage(args.supabase, {
    userId: args.userId,
    inputTokens: completion.inputTokens,
    outputTokens: completion.outputTokens,
    costCents,
  })

  return {
    payload: parsed,
    costCents,
    inputTokens: completion.inputTokens,
    outputTokens: completion.outputTokens,
    model: completion.model,
    weekStartIso,
  }
}

function parsePayload(raw: string): WeeklyNewspaperPayload {
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) {
      return fallbackPayload('AI returned an unparsable response.')
    }
    try {
      parsed = JSON.parse(match[0])
    } catch {
      return fallbackPayload('AI returned an unparsable response.')
    }
  }

  const validation = PAYLOAD_SCHEMA.safeParse(parsed)
  if (!validation.success) {
    console.warn('[newspaper] payload validation failed', validation.error.flatten())
    return fallbackPayload('AI response failed schema validation.')
  }
  return validation.data
}

function fallbackPayload(headline: string): WeeklyNewspaperPayload {
  return {
    headline,
    hero_metric: 'Note',
    hero_value: '—',
    numbers: [
      { label: 'Days logged', value: '—' },
      { label: 'Average readiness', value: '—' },
    ],
    one_win:
      'Logging is the win this week. The engine sharpens fastest when daily check-ins continue.',
    one_focus:
      'Try the daily ritual every morning this coming week. Three taps, no excuse.',
    next_week_actions: [
      'Open Creeda first thing every morning.',
      'Run one re-test (sprint, jump, or movement scan) this week.',
    ],
  }
}

export async function persistNewspaper(
  supabase: SupabaseLike,
  args: {
    userId: string
    weekStartIso: string
    payload: WeeklyNewspaperPayload
    model: string
    inputTokens: number
    outputTokens: number
    costCents: number
  }
) {
  const { error } = await supabase.from('weekly_newspapers').upsert(
    {
      user_id: args.userId,
      week_start_date: args.weekStartIso,
      headline: args.payload.headline,
      hero_metric: args.payload.hero_metric,
      hero_value: args.payload.hero_value,
      numbers: args.payload.numbers,
      one_win: args.payload.one_win,
      one_focus: args.payload.one_focus,
      next_week_actions: args.payload.next_week_actions,
      ai_model: args.model,
      ai_input_tokens: args.inputTokens,
      ai_output_tokens: args.outputTokens,
      ai_cost_cents: args.costCents,
    },
    { onConflict: 'user_id,week_start_date' }
  )
  if (error) throw new Error(error.message)
}
