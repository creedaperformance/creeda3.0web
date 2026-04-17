import { readFile, writeFile } from 'node:fs/promises'

import { calculateConfidence } from '@/forms/engine/confidenceEngine'
import { athleteOnboardingFlow } from '@/forms/flows/athleteFlow'
import { coachOnboardingFlow } from '@/forms/flows/coachFlow'
import { individualOnboardingFlow } from '@/forms/flows/individualFlow'

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

type LegacyExport = {
  athleteOnboarding?: Array<Record<string, JsonValue>>
  athleteDaily?: Array<Record<string, JsonValue>>
  individualOnboarding?: Array<Record<string, JsonValue>>
  individualDaily?: Array<Record<string, JsonValue>>
  coachOnboarding?: Array<Record<string, JsonValue>>
}

function getObject(value: JsonValue | undefined) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, JsonValue>)
    : {}
}

function getString(value: JsonValue | undefined, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function getNumber(value: JsonValue | undefined, fallback = 0) {
  return typeof value === 'number' ? value : fallback
}

function completionBlock(flow: typeof athleteOnboardingFlow, answers: Record<string, unknown>) {
  const confidence = calculateConfidence({
    flow,
    answers,
    totalFieldCount: flow.fields.length,
  })

  return {
    completion_score: confidence.score,
    confidence_score: confidence.score,
    confidence_level: confidence.level,
    confidence_recommendations: confidence.recommendations,
  }
}

function migrateAthleteOnboardingRecord(record: Record<string, JsonValue>) {
  const profile = getObject(record.profile_data)
  const sportContext = getObject(record.sport_context)
  const recovery = getObject(record.recovery_baseline)
  const physical = getObject(record.physical_status)

  const answers = {
    fullName: getString(profile.fullName),
    username: getString(record.username),
    primarySport: getString(sportContext.primarySport),
    position: getString(sportContext.position, 'General'),
    age: getNumber(profile.age),
    biologicalSex: getString(profile.biologicalSex, 'Other'),
    playingLevel: getString(sportContext.playingLevel, 'Recreational'),
    heightCm: getNumber(profile.heightCm),
    weightKg: getNumber(profile.weightKg),
    primaryGoal: getString(record.primary_goal),
    currentIssue: getString(physical.currentIssue, 'No'),
    coachLockerCode: getString(record.coach_locker_code),
    platformConsent: true,
    medicalDisclaimerConsent: true,
  }

  return {
    user_id: record.athlete_id ?? record.user_id ?? record.id ?? null,
    schema_version: '2026.04.fast-start',
    core_fields: answers,
    optional_fields: {
      typicalSleep: recovery.typicalSleep ?? null,
      typicalEnergy: recovery.typicalEnergy ?? null,
      typicalSoreness: recovery.typicalSoreness ?? null,
      currentIssueDetails: physical.activeInjuries ?? [],
    },
    inferred_fields: {
      trainingFrequency: record.training_frequency ?? null,
      avgIntensity: record.avg_intensity ?? null,
    },
    ...completionBlock(athleteOnboardingFlow, answers),
  }
}

function migrateAthleteDailyRecord(record: Record<string, JsonValue>) {
  return {
    user_id: record.athlete_id ?? record.user_id ?? record.id ?? null,
    log_date: record.log_date ?? null,
    schema_version: '2026.04.quick-check',
    minimal_signals: {
      energy: record.energy_level ?? record.energy ?? null,
      soreness: record.muscle_soreness ?? record.soreness ?? null,
      stress: record.stress_level ?? record.stress ?? null,
    },
    inferred_signals: {
      readiness_score: record.readiness_score ?? null,
      status: record.status ?? null,
      action_instruction: record.action_instruction ?? null,
    },
    anomaly_flags: getObject(record.intelligence_meta).risk ?? null,
  }
}

function migrateIndividualOnboardingRecord(record: Record<string, JsonValue>) {
  const basic = getObject(record.basic_profile)
  const goals = getObject(record.goal_profile)
  const lifestyle = getObject(record.lifestyle_profile)
  const physiology = getObject(record.physiology_profile)

  const answers = {
    age: getNumber(basic.age),
    gender: getString(basic.gender, 'Prefer not to say'),
    heightCm: getNumber(basic.heightCm),
    weightKg: getNumber(basic.weightKg),
    occupation: getString(basic.occupation, 'mixed_day'),
    activityLevel: getString(basic.activityLevel, 'moderate'),
    primaryGoal: getString(goals.primaryGoal, 'general_fitness'),
    timeHorizon: getString(goals.timeHorizon, '12_weeks'),
    intensityPreference: getString(goals.intensityPreference, 'moderate'),
    equipmentAccess: (Array.isArray(lifestyle.equipmentAccess) ? lifestyle.equipmentAccess : []) as JsonValue[],
    injuryStatus: getString(physiology.injuryHistory, 'none'),
  }

  return {
    user_id: record.id ?? record.user_id ?? null,
    schema_version: '2026.04.fast-start',
    core_fields: answers,
    optional_fields: {
      sleepBaseline: physiology.sleepQuality ?? null,
      trainingExperience: physiology.trainingExperience ?? null,
      scheduleConstraints: lifestyle.scheduleConstraints ?? [],
    },
    inferred_fields: {
      selectedPathway: getObject(record.sport_profile).selectedSport ?? null,
    },
    ...completionBlock(individualOnboardingFlow, answers),
  }
}

function migrateIndividualDailyRecord(record: Record<string, JsonValue>) {
  return {
    user_id: record.user_id ?? record.id ?? null,
    log_date: record.log_date ?? null,
    schema_version: '2026.04.quick-check',
    minimal_signals: {
      energy: record.energy_level ?? null,
      stress: record.stress_level ?? null,
      soreness: record.soreness_level ?? null,
    },
    inferred_signals: {
      readiness_score: record.score ?? record.readiness_score ?? null,
      status: record.status ?? null,
    },
    anomaly_flags: record.adaptation_flags ?? null,
  }
}

function migrateCoachOnboardingRecord(record: Record<string, JsonValue>) {
  const answers = {
    fullName: getString(record.full_name),
    username: getString(record.username),
    mobileNumber: getString(record.mobile_number),
    teamName: getString(record.team_name),
    sportCoached: getString(record.sport),
    coachingLevel: getString(record.coaching_level),
    teamType: getString(record.team_type),
    numberOfAthletes: getString(record.squad_size_category),
    mainCoachingFocus: getString(record.main_coaching_focus),
  }

  return {
    user_id: record.coach_id ?? record.user_id ?? record.id ?? null,
    schema_version: '2026.04.fast-start',
    core_fields: answers,
    optional_fields: {
      trainingFrequency: record.training_frequency ?? null,
      criticalRisks: record.critical_risks ?? [],
    },
    inferred_fields: {},
    ...completionBlock(coachOnboardingFlow, answers),
  }
}

async function main() {
  const sourceIndex = process.argv.indexOf('--source')
  const outIndex = process.argv.indexOf('--out')

  if (sourceIndex === -1 || outIndex === -1) {
    console.error('Usage: npx tsx scripts/migrateOldForms.ts --source legacy.json --out adaptive.json')
    process.exit(1)
  }

  const sourcePath = process.argv[sourceIndex + 1]
  const outPath = process.argv[outIndex + 1]

  const raw = await readFile(sourcePath, 'utf8')
  const parsed = JSON.parse(raw) as LegacyExport

  const output = {
    schema_version: '2026.04',
    generated_at: new Date().toISOString(),
    user_profile: {
      athlete: (parsed.athleteOnboarding ?? []).map(migrateAthleteOnboardingRecord),
      individual: (parsed.individualOnboarding ?? []).map(migrateIndividualOnboardingRecord),
      coach: (parsed.coachOnboarding ?? []).map(migrateCoachOnboardingRecord),
    },
    daily_logs: {
      athlete: (parsed.athleteDaily ?? []).map(migrateAthleteDailyRecord),
      individual: (parsed.individualDaily ?? []).map(migrateIndividualDailyRecord),
    },
  }

  await writeFile(outPath, JSON.stringify(output, null, 2))
  console.log(`Migrated adaptive form data written to ${outPath}`)
}

void main()
