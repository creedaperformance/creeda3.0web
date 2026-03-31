import { SPORTS_DATABASE, getSportData } from '@/lib/sport_intelligence'

export type VideoAnalysisFamily =
  | 'sprint_mechanics'
  | 'change_of_direction'
  | 'batting_stance'
  | 'bowling_delivery'
  | 'overhead_mechanics'
  | 'combat_stance'
  | 'strength_pattern'
  | 'rotational_swing'
  | 'precision_posture'
  | 'endurance_posture'
  | 'movement_screen'

export type VideoAnalysisRole = 'athlete' | 'individual'

export interface VideoAnalysisSportOption {
  sportId: string
  sportLabel: string
  emoji: string
  family: VideoAnalysisFamily
  captureView: string
  shortPrompt: string
}

export interface VideoAnalysisProfile {
  sportId: string
  sportLabel: string
  emoji: string
  family: VideoAnalysisFamily
  familyLabel: string
  captureView: string
  shortPrompt: string
  motionLabel: string
  positionLabel: string | null
  tips: string[]
}

type FamilyMeta = {
  familyLabel: string
  captureView: string
  motionLabel: string
  shortPrompt: string
  tips: string[]
}

const FAMILY_META: Record<VideoAnalysisFamily, FamilyMeta> = {
  sprint_mechanics: {
    familyLabel: 'Sprint Mechanics',
    captureView: 'Side view',
    motionLabel: 'Acceleration, stride timing, knee drive, and landing rhythm',
    shortPrompt: 'Check speed mechanics, landing stiffness, and stride efficiency.',
    tips: [
      'Capture 8-15 seconds from the side with the full body visible.',
      'Start from a natural run-up so the engine can see drive and top-speed positions.',
      'Keep the camera steady at hip height if possible.',
    ],
  },
  change_of_direction: {
    familyLabel: 'Court / Field Movement',
    captureView: 'Front or 45-degree view',
    motionLabel: 'Cutting, braking, reactive stance, and landing control',
    shortPrompt: 'Check knee tracking, stance control, and direction changes.',
    tips: [
      'Film from the front or 45 degrees so knee and hip alignment stay visible.',
      'Include one to three hard cuts, decelerations, or jump-landings.',
      'Use enough space so the whole movement stays in frame.',
    ],
  },
  batting_stance: {
    familyLabel: 'Batting / Strike Setup',
    captureView: 'Front-on or slight side view',
    motionLabel: 'Head stability, stance posture, and base control',
    shortPrompt: 'Check balance, shoulder level, and head position through setup.',
    tips: [
      'Show the full body from stance through the first movement.',
      'Keep the camera stable and aligned with the line of movement.',
      'Record a few repetitions instead of a single attempt.',
    ],
  },
  bowling_delivery: {
    familyLabel: 'Delivery / Throw Mechanics',
    captureView: 'Side view',
    motionLabel: 'Arm path, trunk control, stride timing, and release mechanics',
    shortPrompt: 'Check delivery posture, shoulder loading, and follow-through control.',
    tips: [
      'Use a side view so arm action and trunk angle are visible.',
      'Capture the approach plus the delivery stride, not just the release.',
      'Good lighting matters around the shoulder and hip lines.',
    ],
  },
  overhead_mechanics: {
    familyLabel: 'Overhead Mechanics',
    captureView: 'Side or rear-quarter view',
    motionLabel: 'Contact height, trunk alignment, shoulder path, and landing quality',
    shortPrompt: 'Check contact point, overhead alignment, and landing mechanics.',
    tips: [
      'Use a side or rear-quarter angle so arm elevation is visible.',
      'Include both takeoff and landing if the movement involves jumping.',
      'Avoid dark backgrounds that hide the arm and wrist path.',
    ],
  },
  combat_stance: {
    familyLabel: 'Combat Stance',
    captureView: 'Front or 45-degree view',
    motionLabel: 'Base width, guard position, trunk posture, and reactivity',
    shortPrompt: 'Check stance quality, guard integrity, and balance under movement.',
    tips: [
      'Film from the front or 45 degrees with the feet fully visible.',
      'Include stance resets, level changes, or light reactive steps.',
      'Keep the athlete centered in frame so posture shifts are easy to read.',
    ],
  },
  strength_pattern: {
    familyLabel: 'Strength Pattern',
    captureView: 'Side view',
    motionLabel: 'Squat depth, hinge shape, brace quality, and joint stacking',
    shortPrompt: 'Check squat, hinge, and bracing mechanics under load.',
    tips: [
      'Use a side view for squat, hinge, or pulling patterns.',
      'Capture a few controlled reps rather than a single max-effort rep.',
      'Keep the feet and bar or load fully visible in frame.',
    ],
  },
  rotational_swing: {
    familyLabel: 'Rotational Swing',
    captureView: 'Front or down-the-line view',
    motionLabel: 'Rotation, shoulder-hip sequencing, and balance through finish',
    shortPrompt: 'Check rotational sequencing, balance, and finish control.',
    tips: [
      'Film from the front or down-the-line angle depending on the sport.',
      'Keep the full body visible from setup to finish.',
      'Use enough distance so the club, stick, or implement path stays visible.',
    ],
  },
  precision_posture: {
    familyLabel: 'Precision Posture',
    captureView: 'Front view',
    motionLabel: 'Head position, shoulder level, stillness, and posture symmetry',
    shortPrompt: 'Check posture steadiness, symmetry, and shoulder control.',
    tips: [
      'Use a front view with the full upper body clearly visible.',
      'Record the setup plus the first execution phase.',
      'Avoid shaky handheld footage so subtle posture changes remain visible.',
    ],
  },
  endurance_posture: {
    familyLabel: 'Endurance Posture',
    captureView: 'Side view',
    motionLabel: 'Posture economy, trunk angle, and repeatable movement rhythm',
    shortPrompt: 'Check posture economy, alignment, and repeatable endurance rhythm.',
    tips: [
      'Use a side angle and capture several seconds of steady movement.',
      'Keep the whole body visible through the repeated action.',
      'If outdoors, avoid strong backlight so joint lines stay visible.',
    ],
  },
  movement_screen: {
    familyLabel: 'Movement Screen',
    captureView: 'Front or side view',
    motionLabel: 'General posture, balance, and movement quality',
    shortPrompt: 'Check general movement quality, posture, and control.',
    tips: [
      'Choose the clearest front or side angle for the movement you want reviewed.',
      'Keep head-to-feet visible in frame.',
      'Record a simple repeated action so the system sees a clean pattern.',
    ],
  },
}

const SPORT_EMOJI: Record<string, string> = {
  cricket: '🏏',
  football: '⚽',
  kabaddi: '🤼',
  badminton: '🏸',
  field_hockey: '🏑',
  wrestling: '🤼',
  boxing: '🥊',
  shooting: '🎯',
  archery: '🏹',
  table_tennis: '🏓',
  weightlifting: '🏋️',
  squash: '🎾',
  tennis: '🎾',
  volleyball: '🏐',
  judo: '🥋',
  rowing: '🚣',
  fencing: '🤺',
  basketball: '🏀',
  athletics_sprint: '🏃',
  athletics_distance: '🏃',
  athletics_jumps: '🦘',
  gymnastics: '🤸',
  cycling: '🚴',
  powerlifting: '🏋️',
  taekwondo: '🥋',
  golf: '⛳',
  swimming_sprint: '🏊',
  swimming_distance: '🏊',
  other: '🎽',
}

const LEGACY_SPORT_ALIASES: Record<string, string> = {
  running: 'athletics_sprint',
  athletics_jump: 'athletics_jumps',
  athletics_throw: 'athletics_jumps',
  cricket_batting: 'cricket',
  cricket_bowling: 'cricket',
  athletics_sprints: 'athletics_sprint',
  athletics_distance_run: 'athletics_distance',
  swimming: 'swimming_sprint',
}

function normalizeKey(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
}

export function canonicalizeSportId(value: string | null | undefined) {
  const normalized = normalizeKey(value)
  return LEGACY_SPORT_ALIASES[normalized] || normalized
}

function resolveFamilyFromSport(sportId: string, positionName?: string | null): VideoAnalysisFamily {
  const sport = canonicalizeSportId(sportId)
  const position = String(positionName || '').toLowerCase()

  if (sport === 'cricket') {
    if (position.includes('bowler') || position.includes('all-rounder')) return 'bowling_delivery'
    if (position.includes('wicket')) return 'change_of_direction'
    return 'batting_stance'
  }

  if (sport === 'athletics_jumps') {
    if (position.includes('throw')) return 'bowling_delivery'
    return 'sprint_mechanics'
  }

  if (sport === 'tennis') {
    if (position.includes('serve')) return 'overhead_mechanics'
    return 'change_of_direction'
  }

  if (sport === 'volleyball') {
    if (position.includes('libero')) return 'change_of_direction'
    return 'overhead_mechanics'
  }

  if (sport === 'basketball' || sport === 'football' || sport === 'field_hockey' || sport === 'kabaddi' || sport === 'squash' || sport === 'table_tennis' || sport === 'fencing') {
    return 'change_of_direction'
  }

  if (sport === 'badminton' || sport === 'swimming_sprint') return 'overhead_mechanics'
  if (sport === 'boxing' || sport === 'wrestling' || sport === 'judo' || sport === 'taekwondo') return 'combat_stance'
  if (sport === 'weightlifting' || sport === 'powerlifting' || sport === 'gymnastics') return 'strength_pattern'
  if (sport === 'golf') return 'rotational_swing'
  if (sport === 'shooting' || sport === 'archery') return 'precision_posture'
  if (sport === 'rowing' || sport === 'cycling' || sport === 'athletics_distance' || sport === 'swimming_distance') return 'endurance_posture'
  if (sport === 'athletics_sprint') return 'sprint_mechanics'

  return 'movement_screen'
}

function buildPromptForSport(sportId: string, family: VideoAnalysisFamily) {
  const sport = getSportData(sportId)
  if (!sport) return FAMILY_META[family].shortPrompt
  return `${FAMILY_META[family].shortPrompt} Focus on ${sport.dashboardFocus.toLowerCase()}.`
}

export function resolveVideoAnalysisProfile(
  rawSportId: string | null | undefined,
  positionName?: string | null
): VideoAnalysisProfile {
  const sportId = canonicalizeSportId(rawSportId || 'other') || 'other'
  const sport = getSportData(sportId) || getSportData('other')
  const family = resolveFamilyFromSport(sportId, positionName)
  const familyMeta = FAMILY_META[family]

  return {
    sportId: sport?.id || 'other',
    sportLabel: sport?.name || 'General Movement',
    emoji: SPORT_EMOJI[sport?.id || 'other'] || '🎽',
    family,
    familyLabel: familyMeta.familyLabel,
    captureView: familyMeta.captureView,
    shortPrompt: buildPromptForSport(sport?.id || 'other', family),
    motionLabel: familyMeta.motionLabel,
    positionLabel: positionName || null,
    tips: familyMeta.tips,
  }
}

export function listVideoAnalysisSports(preferredSport?: string | null): VideoAnalysisSportOption[] {
  const preferredId = canonicalizeSportId(preferredSport)

  return Object.values(SPORTS_DATABASE)
    .map((sport) => {
      const profile = resolveVideoAnalysisProfile(sport.id)
      return {
        sportId: sport.id,
        sportLabel: sport.name,
        emoji: profile.emoji,
        family: profile.family,
        captureView: profile.captureView,
        shortPrompt: profile.shortPrompt,
      }
    })
    .sort((a, b) => {
      if (a.sportId === preferredId) return -1
      if (b.sportId === preferredId) return 1
      if (a.sportId === 'other') return 1
      if (b.sportId === 'other') return -1
      return a.sportLabel.localeCompare(b.sportLabel)
    })
}

