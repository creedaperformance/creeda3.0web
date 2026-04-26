/**
 * Onboarding v2 sport catalog — Indian sports prioritised.
 * Each sport has an id (used in DB / URLs), a display label, and an optional
 * list of positions/disciplines. Position lists are deliberately concise — the
 * user can also free-text a position if their role isn't listed.
 */

export type SportPosition = {
  id: string
  label: string
  /** Hint shown in the picker — keep under 40 chars. */
  hint?: string
}

export type SportEntry = {
  id: string
  label: string
  /** Aliases users may search for ("soccer" → football). Lowercase. */
  aliases?: string[]
  /** Optional sub-discipline / position list. */
  positions?: SportPosition[]
  /** Engine hint: which physiology archetype dominates this sport. */
  archetype: 'team_sport' | 'endurance' | 'strength' | 'racquet' | 'combat' | 'general'
  /** Default protein target g/kg used by Phase 2 nutrition engine. */
  defaultProteinTargetGPerKg: number
}

export const SPORT_CATALOG: SportEntry[] = [
  {
    id: 'cricket',
    label: 'Cricket',
    archetype: 'team_sport',
    defaultProteinTargetGPerKg: 1.6,
    positions: [
      { id: 'batter_top', label: 'Top-order batter' },
      { id: 'batter_middle', label: 'Middle-order batter' },
      { id: 'batter_finisher', label: 'Finisher / power hitter' },
      { id: 'pace_bowler', label: 'Pace bowler', hint: 'Repeat-sprint demand' },
      { id: 'spinner', label: 'Spin bowler' },
      { id: 'all_rounder', label: 'All-rounder' },
      { id: 'wicket_keeper', label: 'Wicket-keeper' },
      { id: 'fielder', label: 'Specialist fielder' },
    ],
  },
  {
    id: 'football',
    label: 'Football',
    aliases: ['soccer'],
    archetype: 'team_sport',
    defaultProteinTargetGPerKg: 1.6,
    positions: [
      { id: 'gk', label: 'Goalkeeper' },
      { id: 'cb', label: 'Centre-back' },
      { id: 'fb', label: 'Full-back / Wing-back' },
      { id: 'cdm', label: 'Defensive midfielder' },
      { id: 'cm', label: 'Central midfielder' },
      { id: 'cam', label: 'Attacking midfielder' },
      { id: 'winger', label: 'Winger' },
      { id: 'st', label: 'Striker / Forward' },
    ],
  },
  {
    id: 'badminton',
    label: 'Badminton',
    archetype: 'racquet',
    defaultProteinTargetGPerKg: 1.4,
    positions: [
      { id: 'singles', label: 'Singles' },
      { id: 'doubles', label: 'Doubles' },
      { id: 'mixed', label: 'Mixed doubles' },
    ],
  },
  {
    id: 'athletics',
    label: 'Athletics (Track & Field)',
    aliases: ['running', 'sprint', 'distance', 'middle distance'],
    archetype: 'endurance',
    defaultProteinTargetGPerKg: 1.4,
    positions: [
      { id: 'sprints', label: '100m / 200m sprint' },
      { id: '400m', label: '400m / 4x100' },
      { id: '800m_1500m', label: '800m / 1500m' },
      { id: '5k_10k', label: '5,000m / 10,000m' },
      { id: 'marathon', label: 'Marathon / road race' },
      { id: 'hurdles', label: 'Hurdles' },
      { id: 'jumps', label: 'Jumps (long / triple / high)' },
      { id: 'throws', label: 'Throws (shot / discus / javelin)' },
    ],
  },
  {
    id: 'kabaddi',
    label: 'Kabaddi',
    archetype: 'team_sport',
    defaultProteinTargetGPerKg: 1.7,
    positions: [
      { id: 'raider', label: 'Raider' },
      { id: 'defender_corner', label: 'Corner defender' },
      { id: 'defender_cover', label: 'Cover defender' },
      { id: 'all_rounder', label: 'All-rounder' },
    ],
  },
  {
    id: 'hockey',
    label: 'Field hockey',
    archetype: 'team_sport',
    defaultProteinTargetGPerKg: 1.6,
    positions: [
      { id: 'gk', label: 'Goalkeeper' },
      { id: 'defender', label: 'Defender' },
      { id: 'midfielder', label: 'Midfielder' },
      { id: 'forward', label: 'Forward / Striker' },
    ],
  },
  {
    id: 'tennis',
    label: 'Tennis',
    archetype: 'racquet',
    defaultProteinTargetGPerKg: 1.5,
    positions: [
      { id: 'singles', label: 'Singles' },
      { id: 'doubles', label: 'Doubles' },
    ],
  },
  {
    id: 'volleyball',
    label: 'Volleyball',
    archetype: 'team_sport',
    defaultProteinTargetGPerKg: 1.6,
    positions: [
      { id: 'setter', label: 'Setter' },
      { id: 'outside', label: 'Outside hitter' },
      { id: 'opposite', label: 'Opposite hitter' },
      { id: 'middle', label: 'Middle blocker' },
      { id: 'libero', label: 'Libero' },
    ],
  },
  {
    id: 'basketball',
    label: 'Basketball',
    archetype: 'team_sport',
    defaultProteinTargetGPerKg: 1.6,
    positions: [
      { id: 'pg', label: 'Point guard' },
      { id: 'sg', label: 'Shooting guard' },
      { id: 'sf', label: 'Small forward' },
      { id: 'pf', label: 'Power forward' },
      { id: 'c', label: 'Centre' },
    ],
  },
  {
    id: 'wrestling',
    label: 'Wrestling',
    archetype: 'combat',
    defaultProteinTargetGPerKg: 1.8,
  },
  {
    id: 'boxing',
    label: 'Boxing',
    archetype: 'combat',
    defaultProteinTargetGPerKg: 1.7,
  },
  {
    id: 'mma',
    label: 'MMA / Combat sports',
    aliases: ['jiu jitsu', 'judo', 'karate', 'taekwondo'],
    archetype: 'combat',
    defaultProteinTargetGPerKg: 1.8,
  },
  {
    id: 'strength_sports',
    label: 'Strength sports (powerlifting / weightlifting)',
    aliases: ['powerlifting', 'weightlifting', 'olympic lifting'],
    archetype: 'strength',
    defaultProteinTargetGPerKg: 1.8,
    positions: [
      { id: 'powerlifting', label: 'Powerlifting' },
      { id: 'weightlifting', label: 'Olympic weightlifting' },
      { id: 'strongman', label: 'Strongman / Strongwoman' },
    ],
  },
  {
    id: 'crossfit',
    label: 'CrossFit / Functional fitness',
    archetype: 'strength',
    defaultProteinTargetGPerKg: 1.8,
  },
  {
    id: 'cycling',
    label: 'Cycling',
    archetype: 'endurance',
    defaultProteinTargetGPerKg: 1.4,
    positions: [
      { id: 'road', label: 'Road / Endurance' },
      { id: 'crit', label: 'Criterium / Sprint' },
      { id: 'mtb', label: 'Mountain bike' },
      { id: 'track', label: 'Track / Velodrome' },
    ],
  },
  {
    id: 'running',
    label: 'Running (recreational / amateur)',
    archetype: 'endurance',
    defaultProteinTargetGPerKg: 1.4,
    positions: [
      { id: '5k', label: '5K / Park run' },
      { id: '10k', label: '10K' },
      { id: 'half_marathon', label: 'Half marathon' },
      { id: 'marathon', label: 'Marathon' },
      { id: 'ultra', label: 'Ultra distance' },
      { id: 'trail', label: 'Trail running' },
    ],
  },
  {
    id: 'swimming',
    label: 'Swimming',
    archetype: 'endurance',
    defaultProteinTargetGPerKg: 1.4,
    positions: [
      { id: 'sprint', label: 'Sprint (50–100)' },
      { id: 'middle', label: 'Middle distance' },
      { id: 'long', label: 'Long distance / Open water' },
    ],
  },
  {
    id: 'rowing',
    label: 'Rowing',
    archetype: 'endurance',
    defaultProteinTargetGPerKg: 1.5,
  },
  {
    id: 'yoga',
    label: 'Yoga / Mobility practice',
    archetype: 'general',
    defaultProteinTargetGPerKg: 1.2,
  },
  {
    id: 'general_fitness',
    label: 'General fitness / Gym',
    aliases: ['gym', 'workout', 'lifting'],
    archetype: 'general',
    defaultProteinTargetGPerKg: 1.4,
  },
  {
    id: 'other',
    label: 'Other / Not listed',
    archetype: 'general',
    defaultProteinTargetGPerKg: 1.4,
  },
]

export const SPORT_BY_ID: Record<string, SportEntry> = SPORT_CATALOG.reduce(
  (acc, entry) => {
    acc[entry.id] = entry
    return acc
  },
  {} as Record<string, SportEntry>
)

export const SPORT_LABELS: Record<string, string> = SPORT_CATALOG.reduce(
  (acc, entry) => {
    acc[entry.id] = entry.label
    return acc
  },
  {} as Record<string, string>
)

export function findSport(query: string): SportEntry | null {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return null
  for (const entry of SPORT_CATALOG) {
    if (entry.id === normalized) return entry
    if (entry.label.toLowerCase() === normalized) return entry
    if (entry.aliases?.some((alias) => alias === normalized)) return entry
  }
  return null
}

export function searchSports(query: string): SportEntry[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return SPORT_CATALOG
  return SPORT_CATALOG.filter((entry) => {
    if (entry.label.toLowerCase().includes(normalized)) return true
    if (entry.aliases?.some((alias) => alias.includes(normalized))) return true
    return false
  })
}

export function getPositionsForSport(sportId: string): SportPosition[] {
  const sport = SPORT_BY_ID[sportId]
  return sport?.positions ?? []
}

export const COMPETITIVE_LEVELS = [
  { id: 'casual', label: 'Casual', detail: 'Friendly play, no formal training.' },
  { id: 'school', label: 'School', detail: 'School / college team.' },
  { id: 'club', label: 'Club', detail: 'Local club / amateur league.' },
  { id: 'district', label: 'District', detail: 'District-level competition.' },
  { id: 'state', label: 'State', detail: 'State-level competition.' },
  { id: 'national', label: 'National', detail: 'National-level competition.' },
  { id: 'pro', label: 'Professional', detail: 'Paid / professional contract.' },
] as const

export type CompetitiveLevelId = (typeof COMPETITIVE_LEVELS)[number]['id']

/** Map our v2 enum (starter|recreational|competitive|academy|elite) to the
 * spec's broader competitive ladder for backward compat. */
export function levelV2ToCompetitiveLevel(
  level: 'starter' | 'recreational' | 'competitive' | 'academy' | 'elite'
): CompetitiveLevelId {
  switch (level) {
    case 'starter':
      return 'casual'
    case 'recreational':
      return 'club'
    case 'competitive':
      return 'district'
    case 'academy':
      return 'state'
    case 'elite':
      return 'national'
  }
}

export function competitiveLevelToV2(
  level: CompetitiveLevelId
): 'starter' | 'recreational' | 'competitive' | 'academy' | 'elite' {
  switch (level) {
    case 'casual':
      return 'starter'
    case 'school':
      return 'recreational'
    case 'club':
      return 'recreational'
    case 'district':
      return 'competitive'
    case 'state':
      return 'academy'
    case 'national':
      return 'elite'
    case 'pro':
      return 'elite'
  }
}
