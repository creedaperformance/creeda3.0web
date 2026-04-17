import type { AthleteOnboardingFastStart } from '@/forms/schemas/athleteOnboarding'
import type { AthleteDailyQuickInput } from '@/forms/schemas/athleteDaily'

type LegacyAthleteOnboardingPayload = import('@/lib/athlete-onboarding').AthleteOnboardingPayload
type LegacyAthleteDailyPayload = import('@/lib/athlete-checkin').AthleteDailyCheckInInput

function clampDomain(value: number) {
  return Math.max(1, Math.min(4, Math.round(value)))
}

function levelToDomainSeed(level: AthleteOnboardingFastStart['playingLevel']) {
  switch (level) {
    case 'National':
    case 'Professional':
      return 4
    case 'District':
    case 'State':
      return 3
    case 'School':
    case 'Recreational':
    default:
      return 2
  }
}

function inferTrainingFrequency(level: AthleteOnboardingFastStart['playingLevel']): LegacyAthleteOnboardingPayload['trainingFrequency'] {
  if (level === 'National' || level === 'Professional') return 'Daily'
  if (level === 'District' || level === 'State') return '4-6 days'
  return '1-3 days'
}

function inferIntensity(level: AthleteOnboardingFastStart['playingLevel']): LegacyAthleteOnboardingPayload['avgIntensity'] {
  if (level === 'National' || level === 'Professional') return 'High'
  if (level === 'District' || level === 'State') return 'Moderate'
  return 'Low'
}

function inferTypicalWeeklyHours(level: AthleteOnboardingFastStart['playingLevel']) {
  switch (level) {
    case 'Professional':
      return 14
    case 'National':
      return 12
    case 'State':
      return 8
    case 'District':
      return 6
    case 'School':
      return 4
    case 'Recreational':
    default:
      return 3
  }
}

function inferTypicalRPE(level: AthleteOnboardingFastStart['playingLevel']) {
  switch (level) {
    case 'National':
    case 'Professional':
      return 8
    case 'District':
    case 'State':
      return 7
    default:
      return 6
  }
}

function inferEnergyBaseline(goal: AthleteOnboardingFastStart['primaryGoal']) {
  return goal === 'Competition Prep' || goal === 'Performance Enhancement' ? 'High' : 'Moderate'
}

function inferSorenessBaseline(currentIssue: AthleteOnboardingFastStart['currentIssue']) {
  return currentIssue === 'Yes' ? 'Moderate' : 'Low'
}

function mapActiveInjuries(input: AthleteOnboardingFastStart) {
  if (input.currentIssue === 'No' || input.injuryLocations.length === 0) return []

  return input.injuryLocations.map((region) => ({
    region,
    type: input.injurySeverity === 'high' ? 'Joint' : input.injurySeverity === 'moderate' ? 'Tendon' : 'Muscle',
    side: 'N/A',
    recurring: input.injurySeverity === 'high',
  }))
}

export function mapAdaptiveAthleteOnboardingToLegacy(
  input: AthleteOnboardingFastStart
): LegacyAthleteOnboardingPayload {
  const domainSeed = levelToDomainSeed(input.playingLevel)
  const injuryPenalty = input.currentIssue === 'Yes' ? 1 : 0

  return {
    fullName: input.fullName.trim(),
    username: input.username.trim().toLowerCase(),
    primarySport: input.primarySport,
    position: input.position.trim() || 'General',
    coachId: null,
    coachLockerCode: input.coachLockerCode.trim(),
    inviteToken: '',
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    avatar_url: null,
    minorGuardianConsent: Boolean(input.minorGuardianConsent),
    typicalWeeklyHours: inferTypicalWeeklyHours(input.playingLevel),
    typicalRPE: inferTypicalRPE(input.playingLevel),
    age: input.age,
    biologicalSex: input.biologicalSex,
    dominantSide: 'Both',
    playingLevel: input.playingLevel,
    seasonPhase: 'In-season',
    trainingFrequency: inferTrainingFrequency(input.playingLevel),
    avgIntensity: inferIntensity(input.playingLevel),
    typicalSleep: '7-8 hours',
    usualWakeUpTime: '06:30',
    typicalSoreness: inferSorenessBaseline(input.currentIssue),
    typicalEnergy: inferEnergyBaseline(input.primaryGoal),
    currentIssue: input.currentIssue,
    activeInjuries: mapActiveInjuries(input),
    pastMajorInjury: input.currentIssue === 'Yes' && input.injurySeverity === 'high' ? 'Yes' : 'No',
    pastInjuries: [],
    hasIllness: 'No',
    illnesses: [],
    endurance_capacity: clampDomain(domainSeed),
    strength_capacity: clampDomain(domainSeed + (input.primaryGoal === 'Performance Enhancement' ? 1 : 0)),
    explosive_power: clampDomain(domainSeed + (input.primaryGoal === 'Competition Prep' ? 1 : 0)),
    agility_control: clampDomain(domainSeed - injuryPenalty),
    reaction_self_perception: clampDomain(domainSeed),
    recovery_efficiency: clampDomain(domainSeed - injuryPenalty),
    fatigue_resistance: clampDomain(domainSeed),
    load_tolerance: clampDomain(domainSeed - injuryPenalty),
    movement_robustness: clampDomain(domainSeed - injuryPenalty),
    coordination_control: clampDomain(domainSeed),
    reaction_time_ms: undefined,
    primaryGoal: input.primaryGoal,
    health_connection_preference: 'later',
    legalConsent: input.platformConsent,
    medicalDisclaimerConsent: input.medicalDisclaimerConsent,
    dataProcessingConsent: input.platformConsent,
    aiAcknowledgementConsent: input.platformConsent,
    marketingConsent: Boolean(input.marketingConsent),
  }
}

function mapEnergyLevel(value: number): LegacyAthleteDailyPayload['energyLevel'] {
  if (value <= 1) return 'Drained'
  if (value === 2) return 'Low'
  if (value === 3) return 'Moderate'
  if (value === 4) return 'High'
  return 'Peak'
}

function mapSorenessLevel(value: number): LegacyAthleteDailyPayload['muscleSoreness'] {
  if (value <= 1) return 'None'
  if (value === 2) return 'Low'
  if (value === 3) return 'Moderate'
  return 'High'
}

function mapStressLevel(value: number): LegacyAthleteDailyPayload['lifeStress'] {
  if (value <= 2) return 'Low'
  if (value === 3) return 'Moderate'
  if (value === 4) return 'High'
  return 'Very High'
}

function mapSleepQuality(value?: number): LegacyAthleteDailyPayload['sleepQuality'] {
  if (!value || value <= 1) return 'Poor'
  if (value <= 3) return 'Okay'
  if (value === 4) return 'Good'
  return 'Excellent'
}

function inferSleepDuration(input: AthleteDailyQuickInput): LegacyAthleteDailyPayload['sleepDuration'] {
  if (input.sleepDuration) return input.sleepDuration
  if (input.energy <= 2 || input.stress >= 4) return '6-7'
  if (input.energy >= 4 && input.stress <= 2) return '8-9'
  return '7-8'
}

function inferSleepLatency(input: AthleteDailyQuickInput): LegacyAthleteDailyPayload['sleepLatency'] {
  if ((input.sleepQuality ?? 0) <= 1 || input.stress >= 5) return '>60 min'
  if ((input.sleepQuality ?? 0) === 2 || input.stress >= 4) return '30-60 min'
  if ((input.sleepQuality ?? 0) === 3) return '15-30 min'
  return '<15 min'
}

function inferPainStatus(input: AthleteDailyQuickInput): LegacyAthleteDailyPayload['painStatus'] {
  if (input.painLocation.length > 0 && input.soreness >= 5) return 'severe'
  if (input.painLocation.length > 0 || input.soreness >= 4) return 'moderate'
  if (input.soreness === 3) return 'mild'
  return 'none'
}

export function mapAdaptiveAthleteDailyToLegacy(input: AthleteDailyQuickInput): LegacyAthleteDailyPayload {
  const sessionCompletion = input.sessionCompletion ?? 'rest'
  const sessionOccurred = sessionCompletion === 'completed' || sessionCompletion === 'competition'

  return {
    sleepQuality: mapSleepQuality(input.sleepQuality),
    sleepDuration: inferSleepDuration(input),
    sleepLatency: inferSleepLatency(input),
    energyLevel: mapEnergyLevel(input.energy),
    muscleSoreness: mapSorenessLevel(input.soreness),
    lifeStress: mapStressLevel(input.stress),
    motivation: input.energy >= 4 ? 'High' : input.energy <= 2 ? 'Low' : 'Moderate',
    sessionCompletion,
    sessionType: '',
    yesterdayDemand: sessionOccurred ? input.sessionRPE ?? 6 : 0,
    yesterdayDuration: sessionOccurred ? input.sessionDuration ?? 45 : 0,
    painStatus: inferPainStatus(input),
    painLocation: input.painLocation,
    competitionToday: false,
    competitionTomorrow: false,
    competitionYesterday: sessionCompletion === 'competition',
    heatLevel: input.heatLevel ?? '',
    humidityLevel: input.humidityLevel ?? '',
    aqiBand: input.aqiBand ?? '',
    commuteMinutes: 0,
    examStressScore: input.stress >= 4 ? 2 : 0,
    fastingState: '',
    shiftWork: false,
    sessionNotes: input.sessionNotes ?? '',
  }
}
