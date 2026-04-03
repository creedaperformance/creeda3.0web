import { redirect } from 'next/navigation'

import { CoachAcademyCenter } from '@/components/academy/CoachAcademyCenter'
import { DashboardLayout } from '@/components/DashboardLayout'
import { getRoleHomeRoute, isAppRole } from '@/lib/auth_utils'
import {
  calculateAgeFromDateOfBirth,
  createAcademyTeamProfile,
  createGuardianProfileSummary,
} from '@/lib/academy/workflows'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function CoachAcademyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, email, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.onboarding_completed === false) {
    redirect('/coach/onboarding')
  }

  if (isAppRole(profile.role) && profile.role !== 'coach') {
    redirect(getRoleHomeRoute(profile.role))
  }

  const { data: teamRows } = await supabase
    .from('teams')
    .select('id, team_name, sport, academy_name, academy_type, academy_city, age_band_focus, parent_handoff_enabled, low_cost_mode')
    .eq('coach_id', user.id)
    .order('created_at', { ascending: true })

  const teams = Array.isArray(teamRows) ? teamRows : []
  const teamIds = teams.map((team) => String((team as Record<string, unknown>).id || ''))

  const memberRowsResult = teamIds.length > 0
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
    ? memberRows.map((row) => String((row as Record<string, unknown>).athlete_id || '')).filter(Boolean)
    : []

  const guardianRowsResult = athleteIds.length > 0
    ? await supabase
        .from('athlete_guardian_profiles')
        .select('athlete_id, guardian_name, guardian_relationship, guardian_phone, guardian_email, emergency_contact_name, emergency_contact_phone, consent_status, handoff_preference, last_handoff_sent_at, notes')
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
        ? (record.profiles[0] as Record<string, unknown> | undefined)
        : (record.profiles as Record<string, unknown> | null)
      const athleteId = String(record.athlete_id || '')
      const teamContext = teamById.get(String(record.team_id || ''))
      if (!profileRecord || !athleteId || !teamContext) return null

      const ageYears = calculateAgeFromDateOfBirth(String(profileRecord.date_of_birth || ''))
      const isJunior = typeof ageYears === 'number' ? ageYears < 18 : false
      if (!isJunior) return null

      const guardianProfile = createGuardianProfileSummary({
        athleteId,
        record: guardianByAthlete.get(athleteId) || null,
        guardianConsentConfirmed: Boolean(profileRecord.guardian_consent_confirmed),
      })

      return {
        athleteId,
        athleteName: String(profileRecord.full_name || 'Athlete'),
        avatarUrl: profileRecord.avatar_url ? String(profileRecord.avatar_url) : null,
        teamId: teamContext.id,
        teamName: teamContext.teamName,
        academyProfile: teamContext.academyProfile,
        sport: profileRecord.primary_sport ? String(profileRecord.primary_sport) : teamContext.sport || null,
        ageYears,
        isJunior,
        guardianConsentConfirmed: Boolean(profileRecord.guardian_consent_confirmed),
        guardianProfile,
        readinessLabel: null,
        nextAction: guardianProfile.nextAction,
        restrictions: [] as string[],
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
      guardianReadyCount: teamJuniorAthletes.filter((athlete) => athlete.guardianProfile.handoffReady).length,
      academyProfile,
    }
  })

  return (
    <DashboardLayout type="coach" user={profile}>
      <CoachAcademyCenter teams={teamsWithCounts} juniorAthletes={juniorAthletes} />
    </DashboardLayout>
  )
}
