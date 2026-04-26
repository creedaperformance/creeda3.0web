import 'server-only'

import { getOnboardingV2Snapshot } from '@/lib/onboarding-v2/queries'
import type { OnboardingV2Snapshot } from '@/lib/onboarding-v2/types'
import { SPORT_BY_ID } from '@/lib/onboarding-v2/sports'

/**
 * Builds the per-user context block that gets prepended to every AI Sports
 * Scientist conversation. Compact, structured, factual — no marketing copy.
 *
 * Format is a fenced JSON block so the model can reference fields explicitly
 * without confusing them with the user's own prose.
 */

export type AiCoachContext = {
  snapshot: OnboardingV2Snapshot
  profile: {
    fullName: string | null
    primarySport: string | null
    primarySportId: string | null
    position: string | null
    competitiveLevel: string | null
    yearsInSport: number | null
    role: string | null
    biologicalSex: string | null
    age: number | null
    heightCm: number | null
    weightKg: number | null
    timezone: string | null
  }
  lifestyle: {
    profession: string | null
    workPattern: string | null
    weeklyWorkHours: number | null
    primaryStressors: string[]
    primaryMotivator: string | null
    availableDaysPerWeek: number | null
    availableMinutesPerSession: number | null
    hasGymAccess: boolean
    hasHomeEquipment: boolean
  } | null
  recentMedicalReports: Array<{
    id: string
    title: string
    reportType: string
    summary: string | null
    redFlags: string[]
    uploadedAt: string | null
  }>
}

type SupabaseLike = {
  from: (table: string) => any
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> }
}

function ageFromIsoDate(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const dob = new Date(value)
  if (Number.isNaN(dob.valueOf())) return null
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1
  return age >= 0 && age < 130 ? age : null
}

function safeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function safeNumber(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

export async function buildAiCoachContext(
  supabase: SupabaseLike,
  userId: string
): Promise<AiCoachContext> {
  const snapshot = await getOnboardingV2Snapshot(supabase, userId)

  const [{ data: profileRow }, { data: lifestyleRow }, { data: reportRows }] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'full_name, primary_sport, primary_sport_id, position, position_id, competitive_level, years_in_sport, role, biological_sex, date_of_birth, height, weight, timezone'
      )
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('lifestyle_profile')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('medical_reports')
      .select('id, title, report_type, ai_layman_explanation, ai_red_flags, uploaded_at')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false })
      .limit(3),
  ])

  const profile: AiCoachContext['profile'] = {
    fullName: safeString(profileRow?.full_name),
    primarySport:
      safeString(profileRow?.primary_sport) ??
      (safeString(profileRow?.primary_sport_id) &&
        SPORT_BY_ID[String(profileRow?.primary_sport_id)]?.label) ??
      null,
    primarySportId: safeString(profileRow?.primary_sport_id),
    position: safeString(profileRow?.position),
    competitiveLevel: safeString(profileRow?.competitive_level),
    yearsInSport: safeNumber(profileRow?.years_in_sport),
    role: safeString(profileRow?.role),
    biologicalSex: safeString(profileRow?.biological_sex),
    age: ageFromIsoDate(profileRow?.date_of_birth),
    heightCm: safeNumber(profileRow?.height),
    weightKg: safeNumber(profileRow?.weight),
    timezone: safeString(profileRow?.timezone),
  }

  const lifestyle: AiCoachContext['lifestyle'] = lifestyleRow
    ? {
        profession: safeString((lifestyleRow as Record<string, unknown>).profession),
        workPattern: safeString((lifestyleRow as Record<string, unknown>).work_pattern),
        weeklyWorkHours: safeNumber((lifestyleRow as Record<string, unknown>).weekly_work_hours),
        primaryStressors: safeStringArray(
          (lifestyleRow as Record<string, unknown>).primary_stressors
        ),
        primaryMotivator: safeString(
          (lifestyleRow as Record<string, unknown>).primary_motivator
        ),
        availableDaysPerWeek: safeNumber(
          (lifestyleRow as Record<string, unknown>).available_days_per_week
        ),
        availableMinutesPerSession: safeNumber(
          (lifestyleRow as Record<string, unknown>).available_minutes_per_session
        ),
        hasGymAccess: Boolean((lifestyleRow as Record<string, unknown>).has_gym_access),
        hasHomeEquipment: Boolean((lifestyleRow as Record<string, unknown>).has_home_equipment),
      }
    : null

  const recentMedicalReports = (Array.isArray(reportRows) ? reportRows : []).map((row) => {
    const record = row as Record<string, unknown>
    return {
      id: String(record.id ?? ''),
      title: safeString(record.title) ?? 'Untitled report',
      reportType: safeString(record.report_type) ?? 'general',
      summary: safeString(record.ai_layman_explanation),
      redFlags: Array.isArray(record.ai_red_flags)
        ? (record.ai_red_flags as unknown[]).filter((v): v is string => typeof v === 'string')
        : [],
      uploadedAt: safeString(record.uploaded_at),
    }
  })

  return { snapshot, profile, lifestyle, recentMedicalReports }
}

export function formatContextForPrompt(context: AiCoachContext): string {
  const { snapshot, profile, lifestyle, recentMedicalReports } = context

  const compact: Record<string, unknown> = {
    persona: snapshot.persona ?? profile.role ?? 'unknown',
    name: profile.fullName,
    age: profile.age,
    biological_sex: profile.biologicalSex,
    height_cm: profile.heightCm,
    weight_kg: profile.weightKg,
    sport: profile.primarySport,
    sport_id: profile.primarySportId,
    position: profile.position,
    competitive_level: profile.competitiveLevel,
    years_in_sport: profile.yearsInSport,
    onboarding_phase: snapshot.onboardingPhase,
    calibration_pct: snapshot.calibrationPct,
    modified_mode_active: snapshot.modifiedMode,
    parq_any_yes: snapshot.parqAnyYes,
    latest_readiness: snapshot.latestReadiness
      ? {
          score: snapshot.latestReadiness.score,
          tier: snapshot.latestReadiness.tier,
          confidence_pct: snapshot.latestReadiness.confidencePct,
          directive: snapshot.latestReadiness.directive,
          drivers: snapshot.latestReadiness.drivers
            .slice(0, 4)
            .map((d) => ({ name: d.name, contribution: Math.round(d.contribution) })),
          missing: snapshot.latestReadiness.missing.slice(0, 4),
          date: snapshot.latestReadiness.date,
        }
      : null,
    latest_movement_baseline: snapshot.latestMovementBaseline
      ? {
          score: snapshot.latestMovementBaseline.score,
          weak_links: snapshot.latestMovementBaseline.weakLinks.slice(0, 4).map((w) => ({
            region: w.region,
            finding: w.finding,
            severity: w.severity,
          })),
          performed_at: snapshot.latestMovementBaseline.performedAt,
        }
      : null,
    daily_check_in: {
      streak_days: snapshot.dailyCheckIn.streakDays,
      logged_today: snapshot.dailyCheckIn.hasToday,
      last_date: snapshot.dailyCheckIn.lastDate,
    },
    phase2_progress: snapshot.phase2,
    lifestyle: lifestyle
      ? {
          profession: lifestyle.profession,
          work_pattern: lifestyle.workPattern,
          weekly_work_hours: lifestyle.weeklyWorkHours,
          primary_stressors: lifestyle.primaryStressors,
          primary_motivator: lifestyle.primaryMotivator,
          available_days_per_week: lifestyle.availableDaysPerWeek,
          available_minutes_per_session: lifestyle.availableMinutesPerSession,
          has_gym_access: lifestyle.hasGymAccess,
          has_home_equipment: lifestyle.hasHomeEquipment,
        }
      : null,
    recent_medical_reports: recentMedicalReports,
  }

  return [
    'Here is the user\'s current Creeda profile context. Reference it naturally — never quote the JSON back at them.',
    '```json',
    JSON.stringify(compact, null, 2),
    '```',
  ].join('\n')
}
