/**
 * Static catalog of corrective + warm-up drills the engine can prescribe.
 *
 * Each drill has:
 * - id (matches what `@creeda/engine/movement-quality.ts` emits in WeakLink)
 * - label (athlete-facing name)
 * - summary (one-liner shown on the Aha card)
 * - cues (the 3–4 things to focus on while doing it)
 * - duration_seconds (suggested per set)
 * - sets / reps
 * - video_url (when populated; null = "video coming soon")
 * - tags (for sport-specific surfacing)
 *
 * Phase 1 ships text + cues. Videos are a content commission — null until
 * recorded. Filling video_url here is non-breaking.
 */

export type DrillRegion =
  | 'knee'
  | 'ankle'
  | 'thoracic_spine'
  | 'core'
  | 'squat_pattern'
  | 'hip'
  | 'shoulder'
  | 'general'

export type Drill = {
  id: string
  label: string
  summary: string
  region: DrillRegion
  cues: string[]
  setup: string
  duration_seconds: number
  sets: number
  reps_or_hold: string
  why_it_works: string
  contraindications: string[]
  video_url: string | null
  tags: string[]
}

export const DRILLS: Drill[] = [
  {
    id: 'banded_clamshell',
    label: 'Banded clamshell',
    summary: 'Wakes up the glute medius so the knee stops drifting inward at the bottom of squats.',
    region: 'knee',
    cues: [
      'Knees stacked, hips stacked — no rolling backward',
      'Open from the glute, not the lower back',
      'Pause 1 second at the top',
    ],
    setup: 'Lie on your side. Loop a light resistance band just above your knees. Knees bent ~90°.',
    duration_seconds: 30,
    sets: 3,
    reps_or_hold: '15 reps each side',
    why_it_works:
      'Hip abduction strength is the single biggest predictor of knee valgus during dynamic tasks. Strengthening the glute medius reduces the inward knee track that flags ACL and PFP risk.',
    contraindications: [
      'Acute IT-band pain',
      'Recent hip-replacement surgery',
    ],
    video_url: null,
    tags: ['football', 'cricket', 'badminton', 'basketball', 'volleyball', 'general'],
  },
  {
    id: 'wall_ankle_mob',
    label: 'Wall ankle mobilisation',
    summary: 'Restores ankle dorsiflexion so the knee can travel forward in the squat without compensation.',
    region: 'ankle',
    cues: [
      'Big toe stays planted',
      'Knee tracks over middle toe',
      'Push knee toward wall, not down',
    ],
    setup: 'Stand facing a wall. Place your front foot 4 inches away. Drive the knee toward the wall.',
    duration_seconds: 60,
    sets: 3,
    reps_or_hold: '10 reps each side',
    why_it_works:
      'Limited ankle dorsiflexion (<30°) forces compensation up the chain — knees collapse, hips shift, low back overworks. Mobilising the talus restores clean squat mechanics.',
    contraindications: ['Recent ankle sprain (<2 weeks)', 'Plantar fascia in acute phase'],
    video_url: null,
    tags: ['running', 'football', 'cricket', 'general'],
  },
  {
    id: 'foam_roll_t_spine',
    label: 'Thoracic foam roll + extension',
    summary: 'Frees a stiff upper back so arms can travel overhead without the lower back compensating.',
    region: 'thoracic_spine',
    cues: [
      'Hands behind head, elbows soft',
      'Arch over the foam roller, exhale',
      'Move the roller 1 inch and repeat',
    ],
    setup: 'Lie on your back with a foam roller across your upper back, just below the shoulder blades.',
    duration_seconds: 90,
    sets: 1,
    reps_or_hold: '5 segments × 5 breaths',
    why_it_works:
      'A locked thoracic spine pulls the lumbar spine into compensation when arms go overhead. Restoring t-spine extension is the cheapest fix for low-back stress in overhead athletes.',
    contraindications: ['Acute disc herniation', 'Recent rib injury'],
    video_url: null,
    tags: ['cricket', 'tennis', 'badminton', 'volleyball', 'strength_sports', 'general'],
  },
  {
    id: 'pallof_press',
    label: 'Pallof press',
    summary: 'Anti-rotation core work that fixes the hip-shoulder asymmetry your scan flagged.',
    region: 'core',
    cues: [
      'Hips and shoulders square forward',
      'Resist the pull — never let the cable rotate you',
      'Slow the eccentric',
    ],
    setup: 'Stand sideways to a cable column at chest height. Hold the handle in both hands close to your chest.',
    duration_seconds: 45,
    sets: 3,
    reps_or_hold: '10 reps each side',
    why_it_works:
      'Hip-shoulder rotation mismatch is a dynamic-stability problem. Anti-rotation training under load teaches the core to brace the kinetic chain.',
    contraindications: ['Acute lumbar pain'],
    video_url: null,
    tags: ['cricket', 'tennis', 'football', 'basketball', 'badminton', 'general'],
  },
  {
    id: 'goblet_squat_pattern',
    label: 'Goblet squat pattern drill',
    summary: 'Re-grooves a deeper, cleaner squat so you can hit parallel without compensation.',
    region: 'squat_pattern',
    cues: [
      'Elbows inside the knees at the bottom',
      'Heels stay planted',
      'Pause 2 seconds at the bottom',
    ],
    setup: 'Hold a kettlebell or dumbbell at your chest. Feet shoulder-width, toes slightly out.',
    duration_seconds: 60,
    sets: 3,
    reps_or_hold: '8 reps with 2-second hold at bottom',
    why_it_works:
      'A loaded chest counterweight lets the body sit into deep squat positions it would otherwise avoid. Repeated exposure rebuilds the pattern.',
    contraindications: ['Acute knee or low-back pain'],
    video_url: null,
    tags: ['general', 'strength_sports', 'crossfit'],
  },
  {
    id: 'copenhagen_plank',
    label: 'Copenhagen plank',
    summary: 'Hip-adductor strength — the single biggest groin-strain prevention drill for change-of-direction athletes.',
    region: 'hip',
    cues: [
      'Top leg stacked over bottom — no twist',
      'Squeeze the bench from below',
      'Hold tall through the lats',
    ],
    setup: 'Side plank with top leg supported on a bench. Bottom leg unsupported, hovering.',
    duration_seconds: 30,
    sets: 3,
    reps_or_hold: '20-second hold each side',
    why_it_works:
      'The Copenhagen adduction protocol cuts groin injury rates by ~40% in football and ice-hockey RCTs. Hip-adductor eccentric strength is the rate-limiting factor.',
    contraindications: ['Active groin strain'],
    video_url: null,
    tags: ['football', 'cricket', 'kabaddi', 'wrestling', 'mma'],
  },
  {
    id: 'single_leg_rdl',
    label: 'Single-leg RDL',
    summary: 'Hip hinge + balance combined — repairs hamstring asymmetry and posterior chain coordination.',
    region: 'hip',
    cues: [
      'Hinge at the hip, not the lower back',
      'Loaded leg slightly bent — never locked',
      'Stop where you feel a stretch, not strain',
    ],
    setup: 'Hold a dumbbell in the opposite hand from the loaded leg. Stand tall.',
    duration_seconds: 60,
    sets: 3,
    reps_or_hold: '8 reps each side',
    why_it_works:
      'Hamstring asymmetry > 10% is a top predictor of hamstring strain. SL-RDLs build symmetrical hinge strength + proprioception simultaneously.',
    contraindications: ['Acute hamstring strain', 'Recent ankle injury'],
    video_url: null,
    tags: ['football', 'cricket', 'athletics', 'running'],
  },
  {
    id: 'shoulder_y_t_w',
    label: 'Y-T-W shoulder series',
    summary: 'Lower-trap activation — fixes the rounded-shoulder pattern desk-bound athletes default into.',
    region: 'shoulder',
    cues: [
      'Thumbs always up',
      'Pinch shoulder blades down and back',
      'Slow tempo — 3 seconds up, 3 seconds down',
    ],
    setup: 'Lie face-down on an incline bench. Light dumbbells (or none) in each hand.',
    duration_seconds: 90,
    sets: 2,
    reps_or_hold: '8 reps of each letter',
    why_it_works:
      'Modern athletes spend hours rounded-forward at desks. Lower-trap activation re-balances the shoulder girdle so overhead movement stops compensating through the neck.',
    contraindications: ['Acute shoulder impingement'],
    video_url: null,
    tags: ['cricket', 'tennis', 'badminton', 'volleyball', 'swimming', 'general'],
  },
]

const DRILLS_BY_ID: Record<string, Drill> = DRILLS.reduce(
  (acc, drill) => {
    acc[drill.id] = drill
    return acc
  },
  {} as Record<string, Drill>
)

export function drillForId(id: string | null | undefined): Drill | null {
  if (!id) return null
  return DRILLS_BY_ID[id] ?? null
}

export function drillsForRegion(region: DrillRegion): Drill[] {
  return DRILLS.filter((drill) => drill.region === region)
}

export function drillsForSport(sportId: string): Drill[] {
  return DRILLS.filter((drill) => drill.tags.includes(sportId) || drill.tags.includes('general'))
}
