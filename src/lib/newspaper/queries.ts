import 'server-only'

type SupabaseLike = {
  from: (table: string) => any
}

export type WeeklyNewspaperRow = {
  id: string
  week_start_date: string
  headline: string
  hero_metric: string | null
  hero_value: string | null
  numbers: Array<{ label: string; value: string; delta?: string }>
  one_win: string | null
  one_focus: string | null
  next_week_actions: string[]
  read_at: string | null
  created_at: string
}

function safeArray<T>(value: unknown, validator?: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return []
  if (!validator) return value as T[]
  return value.flatMap((item) => {
    const parsed = validator(item)
    return parsed === null ? [] : [parsed]
  })
}

function normaliseRow(raw: unknown): WeeklyNewspaperRow | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.week_start_date !== 'string' || typeof r.headline !== 'string') {
    return null
  }
  return {
    id: r.id,
    week_start_date: r.week_start_date,
    headline: r.headline,
    hero_metric: typeof r.hero_metric === 'string' ? r.hero_metric : null,
    hero_value: typeof r.hero_value === 'string' ? r.hero_value : null,
    numbers: safeArray(r.numbers, (item) => {
      if (!item || typeof item !== 'object') return null
      const it = item as Record<string, unknown>
      const label = typeof it.label === 'string' ? it.label : null
      const value = typeof it.value === 'string' ? it.value : null
      if (!label || !value) return null
      const delta = typeof it.delta === 'string' ? it.delta : undefined
      return { label, value, delta }
    }),
    one_win: typeof r.one_win === 'string' ? r.one_win : null,
    one_focus: typeof r.one_focus === 'string' ? r.one_focus : null,
    next_week_actions: safeArray(r.next_week_actions, (item) =>
      typeof item === 'string' ? item : null
    ),
    read_at: typeof r.read_at === 'string' ? r.read_at : null,
    created_at: typeof r.created_at === 'string' ? r.created_at : '',
  }
}

export async function getLatestNewspaper(
  supabase: SupabaseLike,
  userId: string
): Promise<WeeklyNewspaperRow | null> {
  const { data } = await supabase
    .from('weekly_newspapers')
    .select(
      'id, week_start_date, headline, hero_metric, hero_value, numbers, one_win, one_focus, next_week_actions, read_at, created_at'
    )
    .eq('user_id', userId)
    .order('week_start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  return normaliseRow(data)
}

export async function listNewspapers(
  supabase: SupabaseLike,
  userId: string,
  limit = 12
): Promise<WeeklyNewspaperRow[]> {
  const { data } = await supabase
    .from('weekly_newspapers')
    .select(
      'id, week_start_date, headline, hero_metric, hero_value, numbers, one_win, one_focus, next_week_actions, read_at, created_at'
    )
    .eq('user_id', userId)
    .order('week_start_date', { ascending: false })
    .limit(limit)

  return Array.isArray(data) ? data.flatMap((row) => {
    const n = normaliseRow(row)
    return n ? [n] : []
  }) : []
}

export async function markNewspaperRead(
  supabase: SupabaseLike,
  userId: string,
  newspaperId: string
) {
  await supabase
    .from('weekly_newspapers')
    .update({ read_at: new Date().toISOString() })
    .eq('id', newspaperId)
    .eq('user_id', userId)
}
