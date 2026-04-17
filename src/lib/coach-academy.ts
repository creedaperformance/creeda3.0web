import {
  buildParentHandoffMessage,
  calculateAgeFromDateOfBirth,
  createAcademyTeamProfile,
  createGuardianProfileSummary,
  type AcademyAgeBand,
  type AcademyTeamProfile,
  type AcademyType,
  type GuardianProfileSummary,
} from '@/lib/academy/workflows'

type SupabaseLike = any

export interface CoachAcademyAthleteRow {
  athleteId: string
  athleteName: string
  avatarUrl: string | null
  teamId: string
  teamName: string
  academyProfile: AcademyTeamProfile
  sport: string | null
  ageYears: number | null
  isJunior: true
  guardianConsentConfirmed: boolean
  guardianProfile: GuardianProfileSummary
  readinessLabel: string | null
  nextAction: string | null
  restrictions: string[]
  parentMessage: string
}

export interface CoachAcademyTeamRow {
  id: string
  teamName: string
  memberCount: number
  juniorCount: number
  guardianReadyCount: number
  academyProfile: AcademyTeamProfile
}

export interface CoachAcademySnapshot {
  teams: CoachAcademyTeamRow[]
  juniorAthletes: CoachAcademyAthleteRow[]
}

export type UpdateCoachAcademyTeamPayload = {
  teamId: string
  academyName: string
  academyType: AcademyType | ''
  academyCity: string
  ageBandFocus: AcademyAgeBand
  parentHandoffEnabled: boolean
  lowCostMode: boolean
}

export type CoachAcademyMutationResult =
  | { success: true }
  | { success: false; error: string; status: number }

function normalizeText(value: string) {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function isValidAcademyType(value: AcademyType | '') {
  return (
    value === '' ||
    value === 'independent' ||
    value === 'school' ||
    value === 'college' ||
    value === 'academy' ||
    value === 'club' ||
    value === 'federation'
  )
}

function isValidAgeBand(value: AcademyAgeBand) {
  return (
    value === 'mixed' ||
    value === 'u12' ||
    value === 'u14' ||
    value === 'u16' ||
    value === 'u18' ||
    value === 'senior'
  )
}

export async function getCoachAcademySnapshot(
  supabase: SupabaseLike,
  coachId: string
): Promise<CoachAcademySnapshot> {
  const { data: teamRows } = await supabase
    .from('teams')
    .select(
      'id, team_name, sport, academy_name, academy_type, academy_city, age_band_focus, parent_handoff_enabled, low_cost_mode'
    )
    .eq('coach_id', coachId)
    .order('created_at', { ascending: true })

  const teams = Array.isArray(teamRows) ? teamRows : []
  const teamIds = teams
    .map((team) => String((team as Record<string, unknown>).id || ''))
    .filter(Boolean)

  const memberRowsResult =
    teamIds.length > 0
      ? await supabase
          .from('team_members')
          .select(`
            team_id,
            athlete_id,
            profiles:athlete_id (
              id,
              full_name,
              avatar_url,
              primary_sport,
              date_of_birth,
              guardian_consent_confirmed
            )
          `)
          .in('team_id', teamIds)
          .eq('status', 'Active')
      : { data: [] as unknown[] }
  const memberRows = memberRowsResult.data

  const athleteIds = Array.isArray(memberRows)
    ? memberRows
        .map((row) => String((row as Record<string, unknown>).athlete_id || ''))
        .filter(Boolean)
    : []

  const guardianRowsResult =
    athleteIds.length > 0
      ? await supabase
          .from('athlete_guardian_profiles')
          .select(
            'athlete_id, guardian_name, guardian_relationship, guardian_phone, guardian_email, emergency_contact_name, emergency_contact_phone, consent_status, handoff_preference, last_handoff_sent_at, notes'
          )
          .in('athlete_id', athleteIds)
      : { data: [] as unknown[] }
  const guardianRows = guardianRowsResult.data

  const guardianByAthlete = new Map(
    (Array.isArray(guardianRows) ? guardianRows : []).map((row) => [
      String((row as Record<string, unknown>).athlete_id || ''),
      row as Record<string, unknown>,
    ])
  )

  const teamById = new Map(
    teams.map((team) => {
      const record = team as Record<string, unknown>
      return [
        String(record.id || ''),
        {
          id: String(record.id || ''),
          teamName: String(record.team_name || 'Team'),
          sport: String(record.sport || ''),
          academyProfile: createAcademyTeamProfile(record),
        },
      ]
    })
  )

  const juniorAthletes = (Array.isArray(memberRows) ? memberRows : [])
    .map((row) => {
      const record = row as Record<string, unknown>
      const profileRecord = Array.isArray(record.profiles)
        ? ((record.profiles[0] as Record<string, unknown> | undefined) ?? null)
        : ((record.profiles as Record<string, unknown> | null) ?? null)
      const athleteId = String(record.athlete_id || '')
      const teamContext = teamById.get(String(record.team_id || ''))
      if (!profileRecord || !athleteId || !teamContext) return null

      const ageYears = calculateAgeFromDateOfBirth(
        String(profileRecord.date_of_birth || '')
      )
      const isJunior = typeof ageYears === 'number' ? ageYears < 18 : false
      if (!isJunior) return null

      const guardianProfile = createGuardianProfileSummary({
        athleteId,
        record: guardianByAthlete.get(athleteId) || null,
        guardianConsentConfirmed: Boolean(profileRecord.guardian_consent_confirmed),
      })

      const nextAction = guardianProfile.nextAction
      const restrictions: string[] = []

      return {
        athleteId,
        athleteName: String(profileRecord.full_name || 'Athlete'),
        avatarUrl: profileRecord.avatar_url ? String(profileRecord.avatar_url) : null,
        teamId: teamContext.id,
        teamName: teamContext.teamName,
        academyProfile: teamContext.academyProfile,
        sport: profileRecord.primary_sport
          ? String(profileRecord.primary_sport)
          : teamContext.sport || null,
        ageYears,
        isJunior,
        guardianConsentConfirmed: Boolean(profileRecord.guardian_consent_confirmed),
        guardianProfile,
        readinessLabel: null,
        nextAction,
        restrictions,
        parentMessage: buildParentHandoffMessage({
          athleteName: String(profileRecord.full_name || 'Athlete'),
          teamName: teamContext.teamName,
          academyName: teamContext.academyProfile.academyName,
          sport: profileRecord.primary_sport
            ? String(profileRecord.primary_sport)
            : teamContext.sport || null,
          readinessLabel: null,
          nextAction,
          restrictions,
        }),
      }
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((left, right) => {
      if (left.guardianProfile.handoffReady !== right.guardianProfile.handoffReady) {
        return left.guardianProfile.handoffReady ? 1 : -1
      }
      return left.athleteName.localeCompare(right.athleteName)
    })

  const teamsWithCounts = teams.map((team) => {
    const record = team as Record<string, unknown>
    const teamId = String(record.id || '')
    const academyProfile = createAcademyTeamProfile(record)
    const teamJuniorAthletes = juniorAthletes.filter((athlete) => athlete.teamId === teamId)
    const teamMemberCount = (Array.isArray(memberRows) ? memberRows : []).filter(
      (row) => String((row as Record<string, unknown>).team_id || '') === teamId
    ).length

    return {
      id: teamId,
      teamName: String(record.team_name || 'Team'),
      memberCount: teamMemberCount,
      juniorCount: teamJuniorAthletes.length,
      guardianReadyCount: teamJuniorAthletes.filter(
        (athlete) => athlete.guardianProfile.handoffReady
      ).length,
      academyProfile,
    }
  })

  return {
    teams: teamsWithCounts,
    juniorAthletes,
  }
}

export async function updateCoachAcademyTeamSettingsForCoach(
  supabase: SupabaseLike,
  coachId: string,
  payload: UpdateCoachAcademyTeamPayload
): Promise<CoachAcademyMutationResult> {
  const { data: team } = await supabase
    .from('teams')
    .select('id, coach_id')
    .eq('id', payload.teamId)
    .maybeSingle()

  if (!team || team.coach_id !== coachId) {
    return {
      success: false,
      error: 'You do not have access to update this academy team.',
      status: 403,
    }
  }

  if (!isValidAcademyType(payload.academyType)) {
    return {
      success: false,
      error: 'Please choose a valid academy type.',
      status: 400,
    }
  }

  if (!isValidAgeBand(payload.ageBandFocus)) {
    return {
      success: false,
      error: 'Please choose a valid age-band focus.',
      status: 400,
    }
  }

  const { error } = await supabase
    .from('teams')
    .update({
      academy_name: normalizeText(payload.academyName),
      academy_type: payload.academyType || null,
      academy_city: normalizeText(payload.academyCity),
      age_band_focus: payload.ageBandFocus,
      parent_handoff_enabled: payload.parentHandoffEnabled,
      low_cost_mode: payload.lowCostMode,
    })
    .eq('id', payload.teamId)
    .eq('coach_id', coachId)

  if (error) {
    console.error('[coach-academy] team update failed', error)
    return {
      success: false,
      error: 'Could not save academy settings right now. Please try again.',
      status: 500,
    }
  }

  return { success: true }
}

export async function markGuardianHandoffSentForCoach(
  supabase: SupabaseLike,
  coachId: string,
  athleteId: string
): Promise<CoachAcademyMutationResult> {
  const { data: membership } = await supabase
    .from('team_members')
    .select('athlete_id, team_id, teams!inner(coach_id)')
    .eq('athlete_id', athleteId)
    .eq('status', 'Active')
    .eq('teams.coach_id', coachId)
    .limit(1)
    .maybeSingle()

  if (!membership) {
    return {
      success: false,
      error: 'You do not have access to update handoff status for this athlete.',
      status: 403,
    }
  }

  const { error } = await supabase
    .from('athlete_guardian_profiles')
    .update({
      last_handoff_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('athlete_id', athleteId)

  if (error) {
    console.error('[coach-academy] handoff mark failed', error)
    return {
      success: false,
      error: 'Could not mark the handoff as sent right now.',
      status: 500,
    }
  }

  return { success: true }
}
