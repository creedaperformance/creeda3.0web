import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Brain, Coins, ShieldAlert, TrendingUp, Users } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { isAiEnabled } from '@/lib/env'
import { requireAdmin } from '@/lib/ai-coach/admin'
import { getQuotaConfig } from '@/lib/ai-coach/quotas'

export const dynamic = 'force-dynamic'

type DailyRow = {
  date: string
  user_id: string
  message_count: number
  input_tokens: number
  output_tokens: number
  cost_cents: number
  blocked_count: number
}

type ProfileRow = {
  id: string
  full_name: string | null
  role: string | null
  persona: string | null
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function todayDateIso() {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(
    now.getUTCDate()
  ).padStart(2, '0')}`
}

function isoDaysAgo(days: number) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate()
  ).padStart(2, '0')}`
}

export default async function AdminAiUsagePage() {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if (!auth.ok) {
    if (auth.reason === 'unauthenticated') redirect('/login')
    redirect('/')
  }

  const aiEnabled = isAiEnabled()
  const config = getQuotaConfig()
  const today = todayDateIso()
  const sevenDaysAgo = isoDaysAgo(6)
  const thirtyDaysAgo = isoDaysAgo(29)

  const [{ data: dailyRows }, { data: thirtyDayRows }] = await Promise.all([
    supabase
      .from('ai_usage_daily')
      .select('date, user_id, message_count, input_tokens, output_tokens, cost_cents, blocked_count')
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: false })
      .limit(2000),
    supabase
      .from('ai_usage_daily')
      .select('user_id, message_count, cost_cents')
      .gte('date', thirtyDaysAgo)
      .limit(5000),
  ])

  const rows = (dailyRows ?? []) as unknown as DailyRow[]
  const thirty = (thirtyDayRows ?? []) as unknown as Pick<DailyRow, 'user_id' | 'message_count' | 'cost_cents'>[]

  // Aggregate per-day totals across users.
  const perDay = new Map<
    string,
    { messages: number; cost: number; users: Set<string>; blocked: number; inputTokens: number; outputTokens: number }
  >()
  for (const row of rows) {
    const bucket = perDay.get(row.date) ?? {
      messages: 0,
      cost: 0,
      users: new Set<string>(),
      blocked: 0,
      inputTokens: 0,
      outputTokens: 0,
    }
    bucket.messages += Number(row.message_count ?? 0)
    bucket.cost += Number(row.cost_cents ?? 0)
    bucket.blocked += Number(row.blocked_count ?? 0)
    bucket.inputTokens += Number(row.input_tokens ?? 0)
    bucket.outputTokens += Number(row.output_tokens ?? 0)
    bucket.users.add(row.user_id)
    perDay.set(row.date, bucket)
  }
  const orderedDays = Array.from(perDay.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  const todayRow = perDay.get(today)
  const totalSevenDayCost = Array.from(perDay.values()).reduce((sum, v) => sum + v.cost, 0)
  const totalSevenDayMessages = Array.from(perDay.values()).reduce((sum, v) => sum + v.messages, 0)

  // Top spenders in last 30d.
  const userTotals = new Map<string, { messages: number; cost: number }>()
  for (const row of thirty) {
    const t = userTotals.get(row.user_id) ?? { messages: 0, cost: 0 }
    t.messages += Number(row.message_count ?? 0)
    t.cost += Number(row.cost_cents ?? 0)
    userTotals.set(row.user_id, t)
  }
  const topUsers = Array.from(userTotals.entries())
    .sort((a, b) => b[1].cost - a[1].cost)
    .slice(0, 12)

  let topProfiles: ProfileRow[] = []
  if (topUsers.length > 0) {
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, full_name, role, persona')
      .in(
        'id',
        topUsers.map(([id]) => id)
      )
    topProfiles = (profileRows ?? []) as unknown as ProfileRow[]
  }
  const profileById = new Map(topProfiles.map((p) => [p.id, p]))

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.10),transparent_30%),linear-gradient(180deg,#020617,#08111f)] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/45 hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-violet-300">
              Admin · AI usage
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Cost & rate-limit dashboard
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/55">
              Live spend across all Creeda users. Caps come from env vars: change
              <code className="mx-1 rounded bg-black/30 px-1 text-violet-200">AI_DAILY_MESSAGE_LIMIT</code>
              or
              <code className="mx-1 rounded bg-black/30 px-1 text-violet-200">AI_DAILY_COST_CAP_CENTS</code>
              in Hostinger and restart to update.
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
              Signed in as
            </p>
            <p className="mt-1 text-xs font-bold text-white">{auth.email ?? 'admin'}</p>
          </div>
        </div>

        {!aiEnabled ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/[0.06] p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-300" />
            <div className="text-sm leading-relaxed text-amber-100/80">
              <p className="font-bold text-amber-200">AI is currently disabled.</p>
              <p className="mt-1 text-amber-100/70">
                Set <code className="rounded bg-black/30 px-1">ANTHROPIC_API_KEY</code> in Hostinger and
                restart the app. The dashboard still works for historical data.
              </p>
            </div>
          </div>
        ) : null}

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatCard
            icon={<Coins className="h-4 w-4" />}
            label="Today's spend"
            value={todayRow ? formatCents(todayRow.cost) : '$0.00'}
            sublabel={`${todayRow?.messages ?? 0} messages · ${todayRow?.users.size ?? 0} users`}
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Last 7 days"
            value={formatCents(totalSevenDayCost)}
            sublabel={`${totalSevenDayMessages} messages`}
          />
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Active users (30d)"
            value={String(userTotals.size)}
            sublabel={topUsers.length > 0 ? `Top spend ${formatCents(topUsers[0][1].cost)}` : 'No usage yet'}
          />
        </section>

        <section className="mt-8 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="text-lg font-black tracking-tight">Daily totals — last 7 days</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Users</th>
                  <th className="py-2 pr-3">Messages</th>
                  <th className="py-2 pr-3">Tokens (in / out)</th>
                  <th className="py-2 pr-3">Spend</th>
                  <th className="py-2 pr-3">Blocked</th>
                </tr>
              </thead>
              <tbody>
                {orderedDays.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-sm text-white/45">
                      No AI usage recorded yet — once a user sends their first message it shows up here.
                    </td>
                  </tr>
                ) : (
                  orderedDays.map(([date, bucket]) => (
                    <tr key={date} className="border-t border-white/[0.04]">
                      <td className="py-2.5 pr-3 font-mono text-[12px] text-white/72">{date}</td>
                      <td className="py-2.5 pr-3 text-white/72">{bucket.users.size}</td>
                      <td className="py-2.5 pr-3 font-bold text-white">{bucket.messages}</td>
                      <td className="py-2.5 pr-3 text-[11px] text-white/55">
                        {bucket.inputTokens.toLocaleString()} / {bucket.outputTokens.toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-3 font-black text-emerald-300">
                        {formatCents(bucket.cost)}
                      </td>
                      <td className="py-2.5 pr-3 text-rose-300">{bucket.blocked}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="text-lg font-black tracking-tight">Top spenders — last 30 days</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Persona / role</th>
                  <th className="py-2 pr-3">Messages (30d)</th>
                  <th className="py-2 pr-3">Spend (30d)</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-sm text-white/45">
                      No users yet.
                    </td>
                  </tr>
                ) : (
                  topUsers.map(([userId, totals]) => {
                    const profile = profileById.get(userId)
                    return (
                      <tr key={userId} className="border-t border-white/[0.04]">
                        <td className="py-2.5 pr-3 text-[12px] text-white/72">
                          <span className="block truncate font-bold text-white">
                            {profile?.full_name ?? '—'}
                          </span>
                          <span className="block truncate font-mono text-[10px] text-white/35">
                            {userId.slice(0, 8)}…
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-white/55">
                          {profile?.persona ?? profile?.role ?? '—'}
                        </td>
                        <td className="py-2.5 pr-3 font-bold text-white">{totals.messages}</td>
                        <td className="py-2.5 pr-3 font-black text-emerald-300">
                          {formatCents(totals.cost)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-black tracking-tight">
            <Brain className="h-4 w-4 text-violet-300" />
            Active limits
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3 text-[12px] leading-relaxed text-white/65">
            <li>
              <span className="block font-bold text-white">
                {config.defaultDailyMessageLimit} messages / user / day
              </span>
              <code className="mt-1 inline-block rounded bg-black/30 px-1 text-[10px]">
                AI_DAILY_MESSAGE_LIMIT
              </code>
            </li>
            <li>
              <span className="block font-bold text-white">
                {formatCents(config.defaultDailyCostCapCents)} / user / day
              </span>
              <code className="mt-1 inline-block rounded bg-black/30 px-1 text-[10px]">
                AI_DAILY_COST_CAP_CENTS
              </code>
            </li>
            <li>
              <span className="block font-bold text-white">
                {formatCents(config.defaultMonthlyCostCapCents)} / user / month
              </span>
              <code className="mt-1 inline-block rounded bg-black/30 px-1 text-[10px]">
                AI_MONTHLY_COST_CAP_CENTS
              </code>
            </li>
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-white/45">
            Per-user overrides live in{' '}
            <code className="rounded bg-black/30 px-1">profiles.ai_daily_message_limit</code> and{' '}
            <code className="rounded bg-black/30 px-1">profiles.ai_monthly_cost_limit_cents</code>. Set
            either to NULL to fall back to the env defaults.
          </p>
        </section>
      </div>
    </main>
  )
}

function StatCard({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sublabel?: string
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.04] text-violet-300">
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-3 text-2xl font-black tracking-tight text-white">{value}</p>
      {sublabel ? <p className="mt-1 text-[11px] text-white/45">{sublabel}</p> : null}
    </div>
  )
}
