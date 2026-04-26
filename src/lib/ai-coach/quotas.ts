import 'server-only'

import { z } from 'zod'

/**
 * Anthropic Messages API pricing in cents per 1,000,000 tokens.
 * Source: https://www.anthropic.com/pricing as of April 2026.
 *
 * If the actual model returned by the API is unknown to us we fall back to the
 * Sonnet rate, which slightly over-estimates rather than under-estimates cost.
 */
const PRICING_CENTS_PER_MTOK: Record<string, { input: number; output: number }> = {
  // Claude Sonnet 4 / 4.5 family
  'claude-sonnet-4-5-20250929': { input: 300, output: 1500 },
  'claude-sonnet-4-20250514': { input: 300, output: 1500 },
  'claude-3-5-sonnet-20241022': { input: 300, output: 1500 },
  // Claude Haiku family — cheaper
  'claude-3-5-haiku-20241022': { input: 80, output: 400 },
  'claude-haiku-4-5-20251001': { input: 80, output: 400 },
  // Claude Opus family — most expensive
  'claude-opus-4-7': { input: 1500, output: 7500 },
  'claude-3-opus-20240229': { input: 1500, output: 7500 },
}
const FALLBACK_RATE = { input: 300, output: 1500 }

export function estimateCostCents(
  model: string | null | undefined,
  inputTokens: number,
  outputTokens: number
): number {
  const rate = (model && PRICING_CENTS_PER_MTOK[model]) || FALLBACK_RATE
  const cents = (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000
  return Number(cents.toFixed(4))
}

// ── Configurable defaults from env, with safe fallbacks ─────────────
function readIntFromEnv(key: string, fallback: number, min: number, max: number) {
  const raw = process.env[key]
  if (!raw) return fallback
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, Math.round(parsed)))
}

export type QuotaConfig = {
  defaultDailyMessageLimit: number
  defaultDailyCostCapCents: number
  defaultMonthlyCostCapCents: number
}

export function getQuotaConfig(): QuotaConfig {
  return {
    defaultDailyMessageLimit: readIntFromEnv('AI_DAILY_MESSAGE_LIMIT', 30, 0, 5000),
    defaultDailyCostCapCents: readIntFromEnv('AI_DAILY_COST_CAP_CENTS', 50, 0, 100000),
    defaultMonthlyCostCapCents: readIntFromEnv('AI_MONTHLY_COST_CAP_CENTS', 500, 0, 1000000),
  }
}

const ADMIN_EMAILS_RAW = (process.env.ADMIN_EMAILS ?? '').split(',')
const ADMIN_EMAILS = new Set(
  ADMIN_EMAILS_RAW.map((email) => email.trim().toLowerCase()).filter(Boolean)
)

export function isEmailAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.has(email.trim().toLowerCase())
}

// ── Quota helpers ───────────────────────────────────────────────────
// Use a permissive type — Supabase's actual rpc() returns a thenable
// PostgrestFilterBuilder, not strictly a Promise. We await it like a Promise
// either way.
type SupabaseLike = {
  from: (table: string) => any
  rpc: (fn: string, args?: Record<string, unknown>) => any
}

const todayStartIso = () => {
  const now = new Date()
  const day = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(
    now.getUTCDate()
  ).padStart(2, '0')}`
  return day
}

const monthStartIso = () => {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
}

export type QuotaSnapshot = {
  ok: boolean
  reason: 'within_limits' | 'daily_message_limit' | 'daily_cost_cap' | 'monthly_cost_cap' | 'ai_disabled'
  dailyMessages: number
  dailyMessageLimit: number
  dailyMessagesRemaining: number
  dailyCostCents: number
  dailyCostCapCents: number
  monthlyCostCents: number
  monthlyCostCapCents: number
  /** Best-guess "human-friendly" reset time (next UTC midnight). */
  resetsAtIso: string
}

const ProfileLimitsSchema = z.object({
  ai_daily_message_limit: z.number().int().min(0).max(5000).nullable().optional(),
  ai_monthly_cost_limit_cents: z.number().int().min(0).nullable().optional(),
})

async function loadProfileLimits(supabase: SupabaseLike, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('ai_daily_message_limit, ai_monthly_cost_limit_cents')
    .eq('id', userId)
    .maybeSingle()
  const parsed = ProfileLimitsSchema.safeParse(data ?? {})
  return parsed.success ? parsed.data : { ai_daily_message_limit: null, ai_monthly_cost_limit_cents: null }
}

async function loadDailyUsage(supabase: SupabaseLike, userId: string) {
  const today = todayStartIso()
  const { data } = await supabase
    .from('ai_usage_daily')
    .select('message_count, input_tokens, output_tokens, cost_cents')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle()
  const record = (data ?? {}) as Record<string, unknown>
  return {
    messageCount: Number(record.message_count ?? 0),
    inputTokens: Number(record.input_tokens ?? 0),
    outputTokens: Number(record.output_tokens ?? 0),
    costCents: Number(record.cost_cents ?? 0),
  }
}

async function loadMonthlyCostCents(supabase: SupabaseLike, userId: string) {
  const monthStart = monthStartIso()
  const { data } = await supabase
    .from('ai_usage_daily')
    .select('cost_cents')
    .eq('user_id', userId)
    .gte('date', monthStart)
  if (!Array.isArray(data)) return 0
  return data.reduce((sum, row) => sum + Number((row as { cost_cents?: number }).cost_cents ?? 0), 0)
}

function nextUtcMidnightIso() {
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0))
  return next.toISOString()
}

export async function getQuotaSnapshot(
  supabase: SupabaseLike,
  userId: string
): Promise<QuotaSnapshot> {
  const config = getQuotaConfig()
  const [profileLimits, dailyUsage, monthlyCostCents] = await Promise.all([
    loadProfileLimits(supabase, userId),
    loadDailyUsage(supabase, userId),
    loadMonthlyCostCents(supabase, userId),
  ])

  const dailyMessageLimit =
    profileLimits.ai_daily_message_limit ?? config.defaultDailyMessageLimit
  const monthlyCostCap =
    profileLimits.ai_monthly_cost_limit_cents ?? config.defaultMonthlyCostCapCents
  const dailyCostCap = config.defaultDailyCostCapCents

  let ok = true
  let reason: QuotaSnapshot['reason'] = 'within_limits'

  if (dailyUsage.messageCount >= dailyMessageLimit) {
    ok = false
    reason = 'daily_message_limit'
  } else if (dailyUsage.costCents >= dailyCostCap) {
    ok = false
    reason = 'daily_cost_cap'
  } else if (monthlyCostCents >= monthlyCostCap) {
    ok = false
    reason = 'monthly_cost_cap'
  }

  return {
    ok,
    reason,
    dailyMessages: dailyUsage.messageCount,
    dailyMessageLimit,
    dailyMessagesRemaining: Math.max(0, dailyMessageLimit - dailyUsage.messageCount),
    dailyCostCents: dailyUsage.costCents,
    dailyCostCapCents: dailyCostCap,
    monthlyCostCents,
    monthlyCostCapCents: monthlyCostCap,
    resetsAtIso: nextUtcMidnightIso(),
  }
}

export async function recordAiUsage(
  supabase: SupabaseLike,
  args: {
    userId: string
    inputTokens: number
    outputTokens: number
    costCents: number
    blocked?: boolean
  }
) {
  const result = (await supabase.rpc('ai_usage_record', {
    p_user_id: args.userId,
    p_input_tokens: Math.max(0, Math.round(args.inputTokens)),
    p_output_tokens: Math.max(0, Math.round(args.outputTokens)),
    p_cost_cents: Math.max(0, args.costCents),
    p_blocked: Boolean(args.blocked),
  })) as { error?: unknown } | undefined
  if (result?.error) {
    console.warn('[ai-coach] usage record failed', result.error)
  }
}

export function quotaErrorMessage(reason: QuotaSnapshot['reason']): string {
  switch (reason) {
    case 'daily_message_limit':
      return "You've hit today's AI message cap. The counter resets at midnight UTC."
    case 'daily_cost_cap':
      return "Today's AI cost cap has been reached. The counter resets at midnight UTC."
    case 'monthly_cost_cap':
      return "This month's AI cost cap has been reached. Contact support to lift your limit."
    case 'ai_disabled':
      return 'AI is not configured on this Creeda instance.'
    default:
      return 'AI is available.'
  }
}
