import 'server-only'

import { getSiteUrl } from '@/lib/env'

type SupabaseLike = {
  from: (table: string) => any
}

export type SquadSummary = {
  id: string
  name: string
  sport: string
  level: string
  size_estimate: number | null
  invite_code: string
  primary_focus: string | null
  alert_threshold_acwr: number | null
  load_target_au: number | null
  created_at: string
  member_count: number
  invite_url: string
}

export type SquadMember = {
  athlete_id: string
  full_name: string | null
  position: string | null
  status: 'active' | 'injured' | 'paused' | 'left'
  share_level: 'full' | 'training_only' | 'limited'
  joined_at: string
  latest_readiness_score: number | null
  latest_readiness_tier: string | null
  latest_readiness_date: string | null
  modified_mode_active: boolean
  last_check_in_date: string | null
}

export function buildInviteUrl(inviteCode: string) {
  const base = getSiteUrl().replace(/\/+$/, '')
  return `${base}/squad/${inviteCode}`
}

export async function listCoachSquads(
  supabase: SupabaseLike,
  coachId: string
): Promise<SquadSummary[]> {
  const { data: squadRows } = await supabase
    .from('squads')
    .select(
      'id, name, sport, level, size_estimate, invite_code, primary_focus, alert_threshold_acwr, load_target_au, created_at'
    )
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })

  if (!Array.isArray(squadRows) || squadRows.length === 0) return []

  const ids = squadRows.map((row) => String((row as { id: string }).id))
  const { data: memberCountRows } = await supabase
    .from('squad_memberships')
    .select('squad_id, status')
    .in('squad_id', ids)
    .neq('status', 'left')

  const counts = new Map<string, number>()
  if (Array.isArray(memberCountRows)) {
    for (const row of memberCountRows) {
      const sid = String((row as { squad_id: string }).squad_id)
      counts.set(sid, (counts.get(sid) ?? 0) + 1)
    }
  }

  return squadRows.map((row) => {
    const record = row as Record<string, unknown>
    const inviteCode = String(record.invite_code ?? '')
    return {
      id: String(record.id ?? ''),
      name: String(record.name ?? 'Squad'),
      sport: String(record.sport ?? '—'),
      level: String(record.level ?? ''),
      size_estimate: typeof record.size_estimate === 'number' ? record.size_estimate : null,
      invite_code: inviteCode,
      primary_focus: typeof record.primary_focus === 'string' ? record.primary_focus : null,
      alert_threshold_acwr:
        typeof record.alert_threshold_acwr === 'number' ? record.alert_threshold_acwr : null,
      load_target_au: typeof record.load_target_au === 'number' ? record.load_target_au : null,
      created_at: String(record.created_at ?? ''),
      member_count: counts.get(String(record.id ?? '')) ?? 0,
      invite_url: buildInviteUrl(inviteCode),
    }
  })
}

export async function getSquadDetail(
  supabase: SupabaseLike,
  squadId: string,
  coachId: string
): Promise<SquadSummary | null> {
  const { data } = await supabase
    .from('squads')
    .select(
      'id, name, sport, level, size_estimate, invite_code, primary_focus, alert_threshold_acwr, load_target_au, created_at'
    )
    .eq('id', squadId)
    .eq('coach_id', coachId)
    .maybeSingle()

  if (!data) return null
  const record = data as Record<string, unknown>
  const inviteCode = String(record.invite_code ?? '')

  const { count } = await supabase
    .from('squad_memberships')
    .select('athlete_id', { count: 'exact', head: true })
    .eq('squad_id', squadId)
    .neq('status', 'left')

  return {
    id: String(record.id ?? ''),
    name: String(record.name ?? 'Squad'),
    sport: String(record.sport ?? '—'),
    level: String(record.level ?? ''),
    size_estimate: typeof record.size_estimate === 'number' ? record.size_estimate : null,
    invite_code: inviteCode,
    primary_focus: typeof record.primary_focus === 'string' ? record.primary_focus : null,
    alert_threshold_acwr:
      typeof record.alert_threshold_acwr === 'number' ? record.alert_threshold_acwr : null,
    load_target_au: typeof record.load_target_au === 'number' ? record.load_target_au : null,
    created_at: String(record.created_at ?? ''),
    member_count: count ?? 0,
    invite_url: buildInviteUrl(inviteCode),
  }
}

export async function listSquadMembers(
  supabase: SupabaseLike,
  squadId: string
): Promise<SquadMember[]> {
  const { data: memberships } = await supabase
    .from('squad_memberships')
    .select('athlete_id, position, status, share_level, joined_at')
    .eq('squad_id', squadId)
    .neq('status', 'left')
    .order('joined_at', { ascending: true })

  if (!Array.isArray(memberships) || memberships.length === 0) return []

  const athleteIds = memberships.map((m) => String((m as { athlete_id: string }).athlete_id))

  const [{ data: profileRows }, { data: medicalRows }, { data: readinessRows }, { data: checkInRows }] =
    await Promise.all([
      supabase.from('profiles').select('id, full_name').in('id', athleteIds),
      supabase
        .from('medical_screenings')
        .select('user_id, modified_mode_active, medical_clearance_provided')
        .in('user_id', athleteIds),
      supabase
        .from('readiness_scores')
        .select('user_id, score, confidence_tier, date')
        .in('user_id', athleteIds)
        .order('date', { ascending: false }),
      supabase
        .from('daily_check_ins')
        .select('user_id, date')
        .in('user_id', athleteIds)
        .order('date', { ascending: false }),
    ])

  const profileById = new Map<string, string | null>()
  if (Array.isArray(profileRows)) {
    for (const row of profileRows) {
      const r = row as { id: string; full_name?: string | null }
      profileById.set(r.id, r.full_name ?? null)
    }
  }

  const modifiedById = new Map<string, boolean>()
  if (Array.isArray(medicalRows)) {
    for (const row of medicalRows) {
      const r = row as {
        user_id: string
        modified_mode_active?: boolean
        medical_clearance_provided?: boolean
      }
      modifiedById.set(
        r.user_id,
        Boolean(r.modified_mode_active) && !Boolean(r.medical_clearance_provided)
      )
    }
  }

  const latestReadinessById = new Map<
    string,
    { score: number; tier: string; date: string }
  >()
  if (Array.isArray(readinessRows)) {
    for (const row of readinessRows) {
      const r = row as {
        user_id: string
        score?: number
        confidence_tier?: string
        date?: string
      }
      if (latestReadinessById.has(r.user_id)) continue
      latestReadinessById.set(r.user_id, {
        score: Number(r.score ?? 0),
        tier: String(r.confidence_tier ?? 'low'),
        date: String(r.date ?? ''),
      })
    }
  }

  const lastCheckInById = new Map<string, string>()
  if (Array.isArray(checkInRows)) {
    for (const row of checkInRows) {
      const r = row as { user_id: string; date?: string }
      if (lastCheckInById.has(r.user_id)) continue
      lastCheckInById.set(r.user_id, String(r.date ?? ''))
    }
  }

  return memberships.map((m) => {
    const record = m as Record<string, unknown>
    const athleteId = String(record.athlete_id ?? '')
    const readiness = latestReadinessById.get(athleteId)
    return {
      athlete_id: athleteId,
      full_name: profileById.get(athleteId) ?? null,
      position: typeof record.position === 'string' ? record.position : null,
      status: (record.status as SquadMember['status']) ?? 'active',
      share_level: (record.share_level as SquadMember['share_level']) ?? 'full',
      joined_at: String(record.joined_at ?? ''),
      latest_readiness_score: readiness?.score ?? null,
      latest_readiness_tier: readiness?.tier ?? null,
      latest_readiness_date: readiness?.date ?? null,
      modified_mode_active: modifiedById.get(athleteId) ?? false,
      last_check_in_date: lastCheckInById.get(athleteId) ?? null,
    }
  })
}

export async function getSquadByInviteCode(
  supabase: SupabaseLike,
  inviteCode: string
): Promise<{
  id: string
  name: string
  sport: string
  level: string
  primary_focus: string | null
  member_count: number
  coach_name: string | null
} | null> {
  const { data } = await supabase
    .from('squads')
    .select('id, name, sport, level, primary_focus, coach_id')
    .eq('invite_code', inviteCode)
    .maybeSingle()
  if (!data) return null
  const record = data as Record<string, unknown>

  const [{ data: coachRow }, { count }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', String(record.coach_id))
      .maybeSingle(),
    supabase
      .from('squad_memberships')
      .select('athlete_id', { count: 'exact', head: true })
      .eq('squad_id', String(record.id))
      .neq('status', 'left'),
  ])

  return {
    id: String(record.id ?? ''),
    name: String(record.name ?? 'Squad'),
    sport: String(record.sport ?? '—'),
    level: String(record.level ?? ''),
    primary_focus: typeof record.primary_focus === 'string' ? record.primary_focus : null,
    member_count: count ?? 0,
    coach_name: (coachRow as { full_name?: string } | null)?.full_name ?? null,
  }
}
