export const ATHLETE_TIERS = {
  FREE: 'Free',
} as const;

export const COACH_TIERS = {
  FREE: 'Free',
} as const;

export const TIER_LIMITS = {
  [ATHLETE_TIERS.FREE]: {
    SEATS: 10000,
    HISTORY_DAYS: 3650,
    LABEL: 'Standard',
    UPGRADE_MESSAGE: '',
  },
} as const;

export type AthleteTier = typeof ATHLETE_TIERS[keyof typeof ATHLETE_TIERS];
export type CoachTier = typeof COACH_TIERS[keyof typeof COACH_TIERS];
export type SubscriptionTier = 'Free';
