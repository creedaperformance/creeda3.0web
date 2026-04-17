import type { CoachOnboardingPayload } from '@/lib/coach-onboarding'

import type { CoachOnboardingFastStart } from '@/forms/schemas/coachOnboarding'

function inferCriticalRisks(
  mainFocus: CoachOnboardingFastStart['mainCoachingFocus']
): CoachOnboardingPayload['criticalRisks'] {
  switch (mainFocus) {
    case 'Injury Risk Reduction':
      return ['General Fatigue', 'Hamstring Strains', 'Chronic Overload']
    case 'Peak Performance Optimization':
      return ['General Fatigue', 'Fatigue-Related Error']
    case 'Player Compliance':
      return ['Mental Burnout', 'General Fatigue']
    case 'Scouting / Talent ID':
    default:
      return ['General Fatigue']
  }
}

export function mapAdaptiveCoachOnboardingToLegacy(input: CoachOnboardingFastStart): CoachOnboardingPayload {
  return {
    fullName: input.fullName.trim(),
    username: input.username.trim().toLowerCase(),
    mobileNumber: input.mobileNumber.trim(),
    teamName: input.teamName.trim(),
    sportCoached: input.sportCoached,
    coachingLevel: input.coachingLevel,
    teamType: input.teamType,
    mainCoachingFocus: input.mainCoachingFocus,
    numberOfAthletes: input.numberOfAthletes,
    trainingFrequency: input.trainingFrequency ?? '3-4x Weekly',
    criticalRisks: inferCriticalRisks(input.mainCoachingFocus),
    avatarUrl: '',
  }
}
