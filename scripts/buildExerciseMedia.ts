import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { allExerciseLibraryItems } from '@/lib/product/exercises/catalog'
import type { ExerciseCategory, ExerciseMedia } from '@/lib/product/types'

type SourceExercise = {
  name: string
  images?: string[]
  category?: string
  equipment?: string
  primaryMuscles?: string[]
}

type ManualImageAlias =
  | string
  | {
      sourceName: string
      techniqueNote?: string
    }

type MotionOverride = {
  sourceUrl: string
  sourcePageUrl: string
  label: string
  license: string
  demoMode: 'video' | 'animated_image'
  slugs: string[]
  techniqueNote?: string
}

type StaticImageOverride = {
  imageUrls: string[]
  sourcePageUrl: string
  label: string
  license: string
  slugs: string[]
  techniqueNote?: string
  sourceKind?: 'generated' | 'open_source'
}

const ROOT = process.cwd()
const PUBLIC_MEDIA_DIR = path.join(ROOT, 'public', 'media', 'exercises')
const FALLBACK_DIR = path.join(PUBLIC_MEDIA_DIR, 'fallback')
const MANIFEST_PATH = path.join(ROOT, 'src', 'lib', 'product', 'exercises', 'media-overrides.generated.ts')
const ATTRIBUTIONS_PATH = path.join(PUBLIC_MEDIA_DIR, 'ATTRIBUTIONS.json')
const SOURCE_DATASET_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const SOURCE_IMAGE_PREFIXES = [
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/',
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/master/exercises/',
]
const WIKIMEDIA_REDIRECT_BASE = 'https://commons.wikimedia.org/wiki/Special:Redirect/file/'
const WIKIMEDIA_FILE_BASE = 'https://commons.wikimedia.org/wiki/File:'

const CATEGORY_STYLES: Record<ExerciseCategory, { accent: string; glow: string; edge: string }> = {
  strength: { accent: '#f59e0b', glow: '#fb923c', edge: '#7c2d12' },
  mobility: { accent: '#38bdf8', glow: '#67e8f9', edge: '#164e63' },
  conditioning: { accent: '#22c55e', glow: '#86efac', edge: '#14532d' },
  recovery: { accent: '#a78bfa', glow: '#c4b5fd', edge: '#4c1d95' },
  rehab: { accent: '#ef4444', glow: '#fca5a5', edge: '#7f1d1d' },
  warmup: { accent: '#f97316', glow: '#fdba74', edge: '#7c2d12' },
  cooldown: { accent: '#06b6d4', glow: '#67e8f9', edge: '#155e75' },
}

const IMAGE_ALIASES: Record<string, ManualImageAlias> = {
  'bw-counterbalance-squat': {
    sourceName: 'Bodyweight Squat',
    techniqueNote:
      'Media shows the unloaded squat pattern. Use the counterbalance load prescribed above to stay tall and control the bottom position.',
  },
  'db-goblet-squat': 'Goblet Squat',
  'db-tempo-goblet-squat': 'Goblet Squat',
  'bb-front-squat': 'Front Barbell Squat',
  'bb-paused-front-squat': 'Front Barbell Squat',
  'bb-back-squat': 'Barbell Squat',
  'hip-hinge-dowel': {
    sourceName: 'Romanian Deadlift',
    techniqueNote:
      'Media shows the hinge shape under load. Perform the drill with a dowel to own spine position and hip depth.',
  },
  'kb-deadlift': {
    sourceName: 'Barbell Deadlift',
    techniqueNote:
      'Media shows the deadlift pattern. Your version uses a kettlebell held between the feet or just outside the shins.',
  },
  'db-rdl': 'Romanian Deadlift',
  'bb-rdl': 'Romanian Deadlift',
  'trap-bar-deadlift': 'Trap Bar Deadlift',
  'single-leg-rdl': 'Kettlebell One-Legged Deadlift',
  'split-squat-iso-hold': 'Split Squats',
  'assisted-split-squat': 'Split Squats',
  'db-reverse-lunge': 'Dumbbell Rear Lunge',
  'db-rear-foot-elevated-split-squat': 'Split Squat with Dumbbells',
  'db-walking-lunge': 'Bodyweight Walking Lunge',
  'glute-bridge': {
    sourceName: 'Barbell Glute Bridge',
    techniqueNote:
      'Media shows the bridge family. Perform the bodyweight version prescribed above.',
  },
  'glute-bridge-march': {
    sourceName: 'Single Leg Glute Bridge',
    techniqueNote:
      'Media shows the bridge setup. Alternate the marching reps while keeping the pelvis level.',
  },
  'db-hip-thrust': 'Barbell Hip Thrust',
  'bb-hip-thrust': 'Barbell Hip Thrust',
  'single-leg-hip-thrust': {
    sourceName: 'Single Leg Glute Bridge',
    techniqueNote:
      'Media shows the single-leg bridge pattern. Set up at the bench or floor height prescribed in the session.',
  },
  'band-hip-thrust-pulse': {
    sourceName: 'Barbell Glute Bridge',
    techniqueNote:
      'Media shows the base bridge pattern. Add the band and pulse in the top range as prescribed.',
  },
  'incline-push-up': 'Incline Push-Up',
  'db-floor-press': 'Dumbbell Floor Press',
  'db-bench-press': 'Dumbbell Bench Press',
  'bb-bench-press': 'Barbell Bench Press - Medium Grip',
  'half-kneeling-band-press': {
    sourceName: 'Landmine Linear Jammer',
    techniqueNote:
      'Media shows the pressing line. Your version uses a band and half-kneeling stance.',
  },
  'half-kneeling-landmine-press': {
    sourceName: 'Landmine Linear Jammer',
    techniqueNote:
      'Media shows the landmine press line. Use the half-kneeling setup prescribed above.',
  },
  'standing-landmine-press': 'Landmine Linear Jammer',
  'single-arm-db-shoulder-press': 'Dumbbell One-Arm Shoulder Press',
  'push-press': 'Push Press',
  'ring-row': 'Inverted Row',
  'single-arm-db-row': 'One-Arm Dumbbell Row',
  'chest-supported-db-row': 'Dumbbell Incline Row',
  'seal-row': {
    sourceName: 'Dumbbell Incline Row',
    techniqueNote:
      'Media shows a chest-supported row. Use the bench height and seal-row setup prescribed above.',
  },
  'face-pull': 'Face Pull',
  'lat-pull-down': 'Wide-Grip Lat Pulldown',
  'band-assisted-pull-up': 'Band Assisted Pull-Up',
  'chin-up': 'Chin-Up',
  'pull-up': 'Pullups',
  'weighted-pull-up': 'Weighted Pull Ups',
  'dead-bug': 'Dead Bug',
  'dead-bug-band-pulldown': {
    sourceName: 'Dead Bug',
    techniqueNote:
      'Media shows the dead-bug shape. Maintain the pulldown tension while completing the reps.',
  },
  'ab-wheel-rollout': 'Ab Roller',
  'pallof-press': 'Pallof Press',
  'tall-kneeling-pallof-press': {
    sourceName: 'Pallof Press',
    techniqueNote:
      'Media shows the standing press-out pattern. Perform the tall-kneeling variation prescribed above and keep the ribs stacked over the pelvis.',
  },
  'hamstring-bridge': {
    sourceName: 'Single Leg Glute Bridge',
    techniqueNote:
      'Media shows the bridge setup. Drive through the heels and keep the hamstrings loaded throughout the set.',
  },
  'slider-leg-curl': 'Platform Hamstring Slides',
  'single-leg-slider-leg-curl': {
    sourceName: 'Platform Hamstring Slides',
    techniqueNote:
      'Media shows the bilateral slider curl. Perform the single-leg version within your available range.',
  },
  'double-leg-calf-raise': 'Standing Calf Raises',
  'single-leg-calf-raise': 'Standing Dumbbell Calf Raise',
  'seated-soleus-raise': 'Seated Calf Raise',
  'weighted-calf-raise': 'Standing Calf Raises',
  'standing-cable-external-rotation': 'External Rotation with Cable',
  'band-no-money': {
    sourceName: 'External Rotation with Band',
    techniqueNote:
      'Media shows the external-rotation action. Keep the elbows pinned and stop before the ribs flare.',
  },
  'band-external-rotation': 'External Rotation with Band',
  'isometric-external-rotation': {
    sourceName: 'External Rotation with Band',
    techniqueNote:
      'Media shows the rotation line. Your version is an isometric hold rather than full reps.',
  },
  'sidelying-external-rotation': {
    sourceName: 'External Rotation',
    techniqueNote:
      'Media shows the rotation action. Perform the sidelying setup prescribed above.',
  },
  'supine-band-hamstring-stretch': 'Leg-Up Hamstring Stretch',
  'doorway-hamstring-floss': {
    sourceName: 'Hamstring Stretch',
    techniqueNote:
      'Media shows the hamstring stretch line. Use the doorway setup and gentle flossing reps prescribed above.',
  },
  'standing-hamstring-sweep': 'Standing Hamstring and Calf Stretch',
  'worlds-greatest-stretch': "World's Greatest Stretch",
  'band-press-out': {
    sourceName: 'Pallof Press',
    techniqueNote:
      'Media shows the anti-rotation press-out pattern. Use the band setup prescribed above and hold the ribs stacked over the pelvis.',
  },
  'band-row': {
    sourceName: 'Seated Cable Rows',
    techniqueNote:
      'Media shows the horizontal row line. Your version uses a band, so keep the same tall posture and pull path.',
  },
  'body-saw': {
    sourceName: 'Plank',
    techniqueNote:
      'Media shows the base plank shape. Add the prescribed controlled body-saw motion without losing rib or pelvis position.',
  },
  'farmer-carry': "Farmer's Walk",
  'march-carry': {
    sourceName: "Farmer's Walk",
    techniqueNote:
      'Media shows the loaded carry posture. Add the slow marching cadence prescribed above without leaning or shrugging.',
  },
  'suitcase-carry': {
    sourceName: "Farmer's Walk",
    techniqueNote:
      'Media shows the carry posture with load. Your version uses one-sided suitcase loading, so resist side-bending throughout.',
  },
  'front-rack-carry': {
    sourceName: "Farmer's Walk",
    techniqueNote:
      'Media shows the loaded walking pattern. Hold the kettlebell or dumbbell in the front-rack position prescribed above.',
  },
  'cross-body-carry': {
    sourceName: "Farmer's Walk",
    techniqueNote:
      'Media shows the loaded carry pattern. Use the cross-body loading setup prescribed above and keep the trunk quiet.',
  },
  'nordic-lower': {
    sourceName: 'Natural Glute Ham Raise',
    techniqueNote:
      'Media shows the hamstring-dominant Nordic/GHR family. Perform only the controlled lowering range prescribed above.',
  },
  'nordic-catch': {
    sourceName: 'Natural Glute Ham Raise',
    techniqueNote:
      'Media shows the Nordic/GHR family. Catch with the hands at the prescribed depth and avoid forcing the return phase.',
  },
  'razor-curl': {
    sourceName: 'Glute Ham Raise',
    techniqueNote:
      'Media shows the glute-ham raise family. Follow the razor-curl hip angle and range prescribed above.',
  },
  'ankle-cars': {
    sourceName: 'Ankle Circles',
    techniqueNote:
      'Media shows the ankle circle action. Move slowly through the controlled articular range prescribed above.',
  },
  'badminton-scaption-pulse': {
    sourceName: 'Dumbbell Scaption',
    techniqueNote:
      'Media shows the scaption line. Use the lighter pulsing range and badminton shoulder-endurance intent prescribed above.',
  },
  'half-kneeling-med-ball-rotation': {
    sourceName: 'Medicine Ball Full Twist',
    techniqueNote:
      'Media shows the rotational med-ball action. Your version is half-kneeling, so keep the pelvis stable while rotating through the trunk.',
  },
  'standing-med-ball-rotation': 'Medicine Ball Full Twist',
  'spinner-medball-twist': {
    sourceName: 'Medicine Ball Full Twist',
    techniqueNote:
      'Media shows the rotational med-ball action. Use the spinner-specific coil and controlled release rhythm prescribed above.',
  },
  'rotational-med-ball-shot-put': {
    sourceName: 'Medicine Ball Scoop Throw',
    techniqueNote:
      'Media shows the rotational med-ball power family. Use the shot-put release path and stance prescribed above.',
  },
  'cricket-medball-shot': {
    sourceName: 'Medicine Ball Scoop Throw',
    techniqueNote:
      'Media shows the rotational med-ball power family. Use the cricket batting hip-shoulder separation cues prescribed above.',
  },
  'med-ball-scoop-toss': 'Medicine Ball Scoop Throw',
  'step-behind-med-ball-scoop': {
    sourceName: 'Medicine Ball Scoop Throw',
    techniqueNote:
      'Media shows the scoop throw pattern. Add the step-behind entry prescribed above before releasing.',
  },
  'medball-scoop-repeat': 'Medicine Ball Scoop Throw',
  'medball-lateral-heave': {
    sourceName: 'Medicine Ball Scoop Throw',
    techniqueNote:
      'Media shows the med-ball heave family. Use the lateral release angle and reset rhythm prescribed above.',
  },
  'medball-shotput-step': {
    sourceName: 'Medicine Ball Scoop Throw',
    techniqueNote:
      'Media shows the rotational power family. Use the shot-put step and chest-level release prescribed above.',
  },
  'medball-overhead-slam': 'Overhead Slam',
  'medball-chest-pass': 'Medicine Ball Chest Pass',
  'medball-pop-to-stick': {
    sourceName: 'Medicine Ball Chest Pass',
    techniqueNote:
      'Media shows the chest-pass power action. Add the stick landing or position hold prescribed above.',
  },
  'fielding-medball-pickup-throw': {
    sourceName: 'Standing Two-Arm Overhead Throw',
    techniqueNote:
      'Media shows the overhead throw family. Add the fielding pickup and footwork sequence prescribed above.',
  },
  'cricket-release-rhythm-medball': {
    sourceName: 'Standing Two-Arm Overhead Throw',
    techniqueNote:
      'Media shows the overhead throw family. Use the cricket release rhythm and low-volume power intent prescribed above.',
  },
  'thrower-medball-step-and-throw': {
    sourceName: 'Standing Two-Arm Overhead Throw',
    techniqueNote:
      'Media shows the overhead throw family. Add the step-and-block sequence prescribed above.',
  },
  'thrower-rotational-release': {
    sourceName: 'Medicine Ball Scoop Throw',
    techniqueNote:
      'Media shows the rotational med-ball power family. Use the thrower-specific hip block and release cues prescribed above.',
  },
  'squat-jump': 'Freehand Jump Squat',
  'countermovement-jump': {
    sourceName: 'Freehand Jump Squat',
    techniqueNote:
      'Media shows the unloaded vertical jump family. Use the countermovement depth and landing cues prescribed above.',
  },
  'tuck-jump': {
    sourceName: 'Freehand Jump Squat',
    techniqueNote:
      'Media shows the vertical jump family. Add the tuck action only if you can land quietly and maintain alignment.',
  },
  'box-jump': 'Box Jump (Multiple Response)',
  'drop-jump': {
    sourceName: 'Depth Jump Leap',
    techniqueNote:
      'Media shows an advanced depth-jump family movement. Use the lower-intensity drop-jump prescription and stop if landing quality drops.',
  },
  'depth-drop': {
    sourceName: 'Depth Jump Leap',
    techniqueNote:
      'Media shows the depth-jump family. Your version is a controlled drop and stick, not a maximal rebound.',
  },
  'jumper-depth-pop': {
    sourceName: 'Depth Jump Leap',
    techniqueNote:
      'Media shows the depth-jump family. Use the jumper-specific pop and landing quality cues prescribed above.',
  },
  'lateral-bound-stick-drill': {
    sourceName: 'Lateral Bound',
    techniqueNote:
      'Media shows the lateral bound family. Stick the landing on each rep as prescribed instead of rebounding.',
  },
  'lateral-bound-stick': {
    sourceName: 'Lateral Bound',
    techniqueNote:
      'Media shows the lateral bound family. Hold the landing and keep hip, knee, and foot stacked.',
  },
  'skater-bound': 'Lateral Bound',
  'single-leg-bound': 'Single-Leg Hop Progression',
  'double-leg-bound': 'Standing Long Jump',
  'alternate-bound': 'Alternate Leg Diagonal Bound',
  'continuous-bound': {
    sourceName: 'Alternate Leg Diagonal Bound',
    techniqueNote:
      'Media shows the alternating bound pattern. Keep the continuous rhythm and ground contacts prescribed above.',
  },
  'jumper-bounding-approach': {
    sourceName: 'Alternate Leg Diagonal Bound',
    techniqueNote:
      'Media shows the bounding family. Use the approach rhythm and takeoff posture prescribed above.',
  },
  'jumper-takeoff-stick': {
    sourceName: 'Single-Leg Hop Progression',
    techniqueNote:
      'Media shows the single-leg hop family. Your version emphasizes takeoff shape and a controlled stick landing.',
  },
  'line-hops': {
    sourceName: 'Lateral Cone Hops',
    techniqueNote:
      'Media shows the lateral hop family. Use the lower-amplitude line-hop rhythm prescribed above.',
  },
  'mini-hurdle-pogos': {
    sourceName: 'Hurdle Hops',
    techniqueNote:
      'Media shows the hurdle-hop family. Keep contacts quick and low like the prescribed pogo variation.',
  },
  'pogos-forward': {
    sourceName: 'Hurdle Hops',
    techniqueNote:
      'Media shows the elastic hop family. Use the forward pogo amplitude and stiffness cues prescribed above.',
  },
  'pogos-lateral': {
    sourceName: 'Lateral Cone Hops',
    techniqueNote:
      'Media shows the lateral hop family. Keep the pogo contacts quick and low as prescribed.',
  },
  'single-leg-pogo': {
    sourceName: 'Single-Leg Hop Progression',
    techniqueNote:
      'Media shows the single-leg hop family. Use the low-amplitude pogo dosage prescribed above.',
  },
  'ankle-pogo-progress': {
    sourceName: 'Hurdle Hops',
    techniqueNote:
      'Media shows the elastic hop family. Use the ankle-focused progression and stop if symptoms increase.',
  },
  'sled-push-light': 'Sled Push',
  'sled-push-heavy': 'Sled Push',
  'prowler-drive-step': {
    sourceName: 'Sled Push',
    techniqueNote:
      'Media shows the sled push pattern. Use the shorter drive-step intent and distance prescribed above.',
  },
  'sled-march': {
    sourceName: 'Sled Push',
    techniqueNote:
      'Media shows the sled push setup. Slow it into the march rhythm prescribed above.',
  },
  'sled-march-flush': {
    sourceName: 'Sled Push',
    techniqueNote:
      'Media shows the sled push setup. Keep the flush version light and conversational as prescribed.',
  },
  'sprint-sled-combo': {
    sourceName: 'Sled Push',
    techniqueNote:
      'Media shows the sled push pattern. Follow the sprint-combo distances and rest exactly as prescribed.',
  },
  'lateral-sled-drag': {
    sourceName: 'Sled Drag - Harness',
    techniqueNote:
      'Media shows resisted sled work. Use the lateral drag direction and posture cues prescribed above.',
  },
  'backward-sled-drag': {
    sourceName: 'Sled Overhead Backward Walk',
    techniqueNote:
      'Media shows a backward sled-walk family movement. Use the lower-body rehab drag setup prescribed above, not the overhead emphasis.',
  },
  'light-sled-10m': 'Sled Drag - Harness',
  'moderate-sled-15m': 'Sled Drag - Harness',
  'bike-easy-spin': 'Bicycling, Stationary',
  'bike-high-cadence-flush': {
    sourceName: 'Bicycling, Stationary',
    techniqueNote:
      'Media shows stationary cycling. Keep the cadence high and resistance low as prescribed for recovery.',
  },
  'bike-30-30': 'Bicycling, Stationary',
  'bike-45-15': 'Bicycling, Stationary',
  'bike-threshold-wave': 'Bicycling, Stationary',
  'bike-sprint-cluster': 'Bicycling, Stationary',
  'nasal-breath-jog': {
    sourceName: 'Trail Running/Walking',
    techniqueNote:
      'Media shows easy running or walking. Keep the intensity nasal-breathing controlled as prescribed.',
  },
  'walk-run-interval': {
    sourceName: 'Trail Running/Walking',
    techniqueNote:
      'Media shows easy running or walking. Follow the prescribed walk-run intervals rather than a continuous run.',
  },
  'mid-distance-recovery-jog-reset': {
    sourceName: 'Jogging, Treadmill',
    techniqueNote:
      'Media shows easy jogging. Keep the recovery reset light and technique-focused as prescribed.',
  },
}

function buildWikimediaRedirect(fileName: string) {
  return `${WIKIMEDIA_REDIRECT_BASE}${encodeURIComponent(fileName)}`
}

function buildWikimediaFilePage(fileName: string) {
  return `${WIKIMEDIA_FILE_BASE}${encodeURIComponent(fileName.replace(/ /g, '_'))}`
}

function makeWikimediaMotionOverride(args: {
  fileName: string
  label: string
  license: string
  demoMode: 'video' | 'animated_image'
  slugs: string[]
  techniqueNote?: string
}) {
  return {
    sourceUrl: buildWikimediaRedirect(args.fileName),
    sourcePageUrl: buildWikimediaFilePage(args.fileName),
    label: args.label,
    license: args.license,
    demoMode: args.demoMode,
    slugs: args.slugs,
    techniqueNote: args.techniqueNote,
  } satisfies MotionOverride
}

function makeWikimediaImageOverride(args: {
  fileName: string
  label: string
  license: string
  slugs: string[]
  techniqueNote?: string
}) {
  return {
    imageUrls: [buildWikimediaRedirect(args.fileName)],
    sourcePageUrl: buildWikimediaFilePage(args.fileName),
    label: args.label,
    license: args.license,
    slugs: args.slugs,
    techniqueNote: args.techniqueNote,
    sourceKind: 'open_source',
  } satisfies StaticImageOverride
}

function makeLocalGeneratedImageOverride(args: {
  relativePath: string
  slugs: string[]
  techniqueNote?: string
}) {
  return {
    imageUrls: [fileExistsUrl(args.relativePath)],
    sourcePageUrl: '',
    label: 'Creeda AI-generated reference',
    license: 'Creeda AI-generated image (reviewed)',
    slugs: args.slugs,
    techniqueNote: args.techniqueNote,
    sourceKind: 'generated',
  } satisfies StaticImageOverride
}

const MOTION_OVERRIDES: MotionOverride[] = [
  makeWikimediaMotionOverride({
    fileName: 'Muscle Strengthening at Home - Half squat.webm',
    label: 'CDC via Wikimedia Commons',
    license: 'Public domain via Wikimedia Commons file page',
    demoMode: 'video',
    slugs: [
      'bw-counterbalance-squat',
      'db-goblet-squat',
      'db-tempo-goblet-squat',
      'bb-front-squat',
      'bb-paused-front-squat',
      'bb-back-squat',
    ],
  }),
  makeWikimediaMotionOverride({
    fileName: 'Muscle Strengthening at Home - Push-ups.webm',
    label: 'CDC via Wikimedia Commons',
    license: 'Public domain via Wikimedia Commons file page',
    demoMode: 'video',
    slugs: ['push-up', 'incline-push-up'],
  }),
  makeWikimediaMotionOverride({
    fileName: 'Muscle Strengthening at Home - Overhead Press.webm',
    label: 'CDC via Wikimedia Commons',
    license: 'Public domain via Wikimedia Commons file page',
    demoMode: 'video',
    slugs: ['single-arm-db-shoulder-press', 'push-press'],
  }),
  makeWikimediaMotionOverride({
    fileName: 'Muscle Strengthening at Home - Toe Lift.webm',
    label: 'CDC via Wikimedia Commons',
    license: 'Public domain via Wikimedia Commons file page',
    demoMode: 'video',
    slugs: [
      'double-leg-calf-raise',
      'single-leg-calf-raise',
      'seated-soleus-raise',
      'weighted-calf-raise',
      'tibialis-raise',
    ],
  }),
  makeWikimediaMotionOverride({
    fileName: 'Wallpushup-CDC strength training for older adults.gif',
    label: 'CDC older adults via Wikimedia Commons',
    license: 'Public domain via Wikimedia Commons file page',
    demoMode: 'animated_image',
    slugs: ['wall-push-up'],
  }),
  makeWikimediaMotionOverride({
    fileName: 'Lunge-CDC strength training for older adults.gif',
    label: 'CDC older adults via Wikimedia Commons',
    license: 'Public domain via Wikimedia Commons file page',
    demoMode: 'animated_image',
    slugs: [
      'bw-reverse-lunge',
      'db-reverse-lunge',
      'split-squat-iso-hold',
      'assisted-split-squat',
      'db-rear-foot-elevated-split-squat',
      'db-walking-lunge',
    ],
    techniqueNote:
      'Animated demo shows the base lunge pattern. Match the variation above for load, support, or front-foot elevation.',
  }),
  makeWikimediaMotionOverride({
    fileName: 'Hamstring stretch-CDC strength training for older adults.gif',
    label: 'CDC older adults via Wikimedia Commons',
    license: 'Public domain via Wikimedia Commons file page',
    demoMode: 'animated_image',
    slugs: [
      'supine-band-hamstring-stretch',
      'doorway-hamstring-floss',
      'standing-hamstring-sweep',
      'hamstrings-and-calf-reset',
    ],
    techniqueNote:
      'Animated demo shows the hamstring stretch line. Use the exact setup and breathing cadence prescribed above.',
  }),
  makeWikimediaMotionOverride({
    fileName: 'Pelvic tilt-CDC strength training for older adults.gif',
    label: 'CDC older adults via Wikimedia Commons',
    license: 'Public domain via Wikimedia Commons file page',
    demoMode: 'animated_image',
    slugs: ['hips-and-ribs-reset'],
    techniqueNote:
      'Animated demo shows the pelvic reset. Pair it with the breathing cadence prescribed above.',
  }),
  makeWikimediaMotionOverride({
    fileName: 'Chest stretch-CDC strength training for older adults.gif',
    label: 'CDC older adults via Wikimedia Commons',
    license: 'Public domain via Wikimedia Commons file page',
    demoMode: 'animated_image',
    slugs: ['shoulders-and-t-spine-reset'],
    techniqueNote:
      'Animated demo shows the chest-opening piece of the cooldown. Follow the written sequence for the full shoulder and t-spine reset.',
  }),
  makeWikimediaMotionOverride({
    fileName: 'Backstretch-CDC strength training for older adults.gif',
    label: 'CDC older adults via Wikimedia Commons',
    license: 'Public domain via Wikimedia Commons file page',
    demoMode: 'animated_image',
    slugs: ['mobility-flow-cooldown'],
    techniqueNote:
      'Animated demo shows one anchor position from the cooldown flow. Follow the written sequence and breathing pace prescribed above.',
  }),
]

const STATIC_IMAGE_OVERRIDES: StaticImageOverride[] = [
  makeLocalGeneratedImageOverride({
    relativePath: '/media/exercises/wall-sit/generated.png',
    slugs: ['wall-sit'],
  }),
  makeLocalGeneratedImageOverride({
    relativePath: '/media/exercises/wall-slide/generated.png',
    slugs: ['wall-slide'],
    techniqueNote:
      'AI image shows the setup and shoulder position. Follow the written instructions for the full upward slide and controlled return.',
  }),
  makeLocalGeneratedImageOverride({
    relativePath: '/media/exercises/wall-slide-lift-off/generated.png',
    slugs: ['wall-slide-lift-off'],
    techniqueNote:
      'AI image shows the wall-slide setup. Add the prescribed lift-off at the top without losing ribs, head, or wrist alignment.',
  }),
  makeLocalGeneratedImageOverride({
    relativePath: '/media/exercises/seated-breathing-reset/generated.png',
    slugs: ['seated-breathing-reset'],
    techniqueNote:
      'AI image shows the calm seated setup. Follow the written breathing cadence and recovery cues prescribed above.',
  }),
  makeLocalGeneratedImageOverride({
    relativePath: '/media/exercises/single-leg-balance-support/generated.png',
    slugs: ['single-leg-balance-support'],
  }),
  makeLocalGeneratedImageOverride({
    relativePath: '/media/exercises/single-leg-balance-support/generated.png',
    slugs: ['single-leg-balance-reach'],
    techniqueNote:
      'AI image shows the supported single-leg balance base. Add the controlled reach pattern prescribed above without losing hip level or foot pressure.',
  }),
  makeWikimediaImageOverride({
    fileName: 'Side Plank.jpg',
    label: 'Jaykayfit via Wikimedia Commons',
    license: 'CC BY-SA 3.0 via Wikimedia Commons file page',
    slugs: ['side-plank'],
  }),
  makeWikimediaImageOverride({
    fileName: 'Side Plank.jpg',
    label: 'Jaykayfit via Wikimedia Commons',
    license: 'CC BY-SA 3.0 via Wikimedia Commons file page',
    slugs: ['side-plank-knees'],
    techniqueNote:
      'Image shows the full side plank. Your version uses the knee-supported setup prescribed above.',
  }),
  makeWikimediaImageOverride({
    fileName: 'Step exercise.JPG',
    label: 'Kengucjun via Wikimedia Commons',
    license: 'CC BY-SA 3.0 via Wikimedia Commons file page',
    slugs: ['step-down'],
  }),
]

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(db|bb|kb|bw|tempo|paused|supported)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function fileExistsUrl(relativePath: string) {
  return relativePath.startsWith('/') ? relativePath : `/${relativePath}`
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildFallbackSvg(category: ExerciseCategory, alt = false) {
  const style = CATEGORY_STYLES[category]
  const title = alt ? `${category.toUpperCase()} ALT` : category.toUpperCase()
  const copy = alt
    ? 'CREEDA movement preview'
    : 'CREEDA exercise media'
  const gradientA = alt ? style.edge : '#09090f'
  const gradientB = alt ? '#101826' : style.edge

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1280" height="720" viewBox="0 0 1280 720" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1280" y2="720" gradientUnits="userSpaceOnUse">
      <stop stop-color="${gradientA}" />
      <stop offset="1" stop-color="${gradientB}" />
    </linearGradient>
    <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1020 120) rotate(140) scale(580 420)">
      <stop stop-color="${style.glow}" stop-opacity="0.45" />
      <stop offset="1" stop-color="${style.glow}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1280" height="720" rx="40" fill="url(#bg)"/>
  <rect width="1280" height="720" rx="40" fill="url(#glow)"/>
  <rect x="52" y="52" width="1176" height="616" rx="28" stroke="rgba(255,255,255,0.16)" />
  <circle cx="${alt ? 1060 : 220}" cy="${alt ? 560 : 176}" r="116" fill="${style.accent}" fill-opacity="0.12" />
  <path d="M236 242C282 242 319 204 319 158C319 112 282 75 236 75C190 75 153 112 153 158C153 204 190 242 236 242Z" fill="${style.accent}" fill-opacity="0.92"/>
  <path d="M315 336C315 292.608 279.392 257 236 257C192.608 257 157 292.608 157 336V384H315V336Z" fill="${style.accent}" fill-opacity="0.82"/>
  <rect x="377" y="148" width="430" height="64" rx="20" fill="${style.accent}" fill-opacity="0.14" />
  <text x="413" y="192" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" letter-spacing="4">${escapeXml(title)}</text>
  <text x="148" y="492" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="800">Creeda</text>
  <text x="148" y="556" fill="#E5E7EB" font-family="Arial, Helvetica, sans-serif" font-size="28">${escapeXml(copy)}</text>
  <text x="148" y="602" fill="#A1A1AA" font-family="Arial, Helvetica, sans-serif" font-size="20">Open-source and first-party media pipeline</text>
</svg>`
}

async function ensureDir(filePath: string) {
  await mkdir(path.dirname(filePath), { recursive: true })
}

async function downloadFirstAvailableFile(sourceUrls: string[], outputPath: string) {
  const failures: string[] = []

  for (const sourceUrl of sourceUrls) {
    const response = await fetch(sourceUrl)
    if (!response.ok) {
      failures.push(`${sourceUrl}: ${response.status}`)
      continue
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    await ensureDir(outputPath)
    await writeFile(outputPath, buffer)
    return sourceUrl
  }

  console.warn(
    `[buildExerciseMedia] skipped missing source image for ${path.relative(ROOT, outputPath)} (${failures.join('; ')})`
  )
  return null
}

async function writeFallbacks() {
  await mkdir(FALLBACK_DIR, { recursive: true })
  const categories = Object.keys(CATEGORY_STYLES) as ExerciseCategory[]
  for (const category of categories) {
    await writeFile(
      path.join(FALLBACK_DIR, `${category}.svg`),
      buildFallbackSvg(category, false),
      'utf8'
    )
    await writeFile(
      path.join(FALLBACK_DIR, `${category}-alt.svg`),
      buildFallbackSvg(category, true),
      'utf8'
    )
  }
}

async function fetchSourceDataset() {
  const response = await fetch(SOURCE_DATASET_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch exercise source dataset: ${response.status}`)
  }
  return (await response.json()) as SourceExercise[]
}

function buildSourceMap(items: SourceExercise[]) {
  const byName = new Map<string, SourceExercise>()
  const byNormalized = new Map<string, SourceExercise[]>()

  for (const item of items) {
    byName.set(item.name, item)
    const normalized = normalizeName(item.name)
    const list = byNormalized.get(normalized) || []
    list.push(item)
    byNormalized.set(normalized, list)
  }

  return { byName, byNormalized }
}

function resolveSourceExercise(
  slug: string,
  name: string,
  maps: ReturnType<typeof buildSourceMap>
) {
  const manualAlias = IMAGE_ALIASES[slug]
  if (manualAlias) {
    const sourceName = typeof manualAlias === 'string' ? manualAlias : manualAlias.sourceName
    return {
      source: maps.byName.get(sourceName) || null,
      techniqueNote: typeof manualAlias === 'string' ? null : manualAlias.techniqueNote || null,
    }
  }

  const normalized = normalizeName(name)
  const matches = maps.byNormalized.get(normalized) || []
  if (matches.length === 1) {
    return {
      source: matches[0],
      techniqueNote: null,
    }
  }

  return {
    source: null,
    techniqueNote: null,
  }
}

function findMotionOverride(slug: string) {
  return MOTION_OVERRIDES.find((item) => item.slugs.includes(slug)) || null
}

function findStaticImageOverride(slug: string) {
  return STATIC_IMAGE_OVERRIDES.find((item) => item.slugs.includes(slug)) || null
}

function toRelativeMediaPath(...parts: string[]) {
  return fileExistsUrl(path.posix.join('/media/exercises', ...parts))
}

function mergeNotes(...notes: Array<string | null | undefined>) {
  const uniqueNotes = [...new Set(notes.filter((note): note is string => Boolean(note?.trim())).map((note) => note.trim()))]
  return uniqueNotes.length ? uniqueNotes.join(' ') : null
}

async function main() {
  await writeFallbacks()
  const sourceDataset = await fetchSourceDataset()
  const sourceMaps = buildSourceMap(sourceDataset)
  const overrides: Record<string, Partial<ExerciseMedia>> = {}
  const attributions: Array<Record<string, string | string[]>> = []

  for (const item of allExerciseLibraryItems) {
    const resolvedSource = resolveSourceExercise(item.slug, item.name, sourceMaps)
    const motionOverride = findMotionOverride(item.slug)
    const staticImageOverride = findStaticImageOverride(item.slug)
    const relativeDir = path.posix.join(item.slug)

    let sourceImageUrls: string[] | undefined
    if (resolvedSource.source?.images?.length) {
      const localImageUrls: string[] = []

      for (let index = 0; index < Math.min(2, resolvedSource.source.images.length); index += 1) {
        const sourceImagePath = resolvedSource.source.images[index]
        const sourceImageUrlsToTry = SOURCE_IMAGE_PREFIXES.map((prefix) => `${prefix}${sourceImagePath}`)
        const extension = path.extname(sourceImagePath) || '.jpg'
        const localPath = path.join(PUBLIC_MEDIA_DIR, item.slug, index === 0 ? `front${extension}` : `side${extension}`)
        const downloadedUrl = await downloadFirstAvailableFile(sourceImageUrlsToTry, localPath)
        if (!downloadedUrl) {
          continue
        }
        localImageUrls.push(
          toRelativeMediaPath(relativeDir, index === 0 ? `front${extension}` : `side${extension}`)
        )
      }

      sourceImageUrls = localImageUrls
      attributions.push({
        slug: item.slug,
        name: item.name,
        source: 'yuhonas/free-exercise-db',
        sourceName: resolvedSource.source.name,
        license: 'Unlicense',
        sourceUrl: `https://github.com/yuhonas/free-exercise-db`,
      })
    }

    if (staticImageOverride && staticImageOverride.sourceKind !== 'generated') {
      attributions.push({
        slug: item.slug,
        name: item.name,
        source: staticImageOverride.label,
        license: staticImageOverride.license,
        sourceUrl: staticImageOverride.sourcePageUrl,
      })
    }

    const baseImageUrls = staticImageOverride?.imageUrls || sourceImageUrls
    const baseImageLabel = staticImageOverride?.label || (sourceImageUrls ? 'Free Exercise DB' : null)
    const baseImageLicense = staticImageOverride?.license || (sourceImageUrls ? 'Unlicense' : null)
    const baseImageAttributionUrl =
      staticImageOverride?.sourcePageUrl || (sourceImageUrls ? 'https://github.com/yuhonas/free-exercise-db' : null)
    const baseImageSourceKind = staticImageOverride?.sourceKind || (sourceImageUrls ? 'open_source' : null)

    const imageUrls =
      motionOverride?.demoMode === 'animated_image'
        ? [motionOverride.sourceUrl, ...(baseImageUrls || [])].slice(0, 2)
        : baseImageUrls

    if (imageUrls?.length || motionOverride) {
      const mixedSource = Boolean(motionOverride && baseImageUrls?.length)
      const license =
        motionOverride
          ? baseImageLicense
            ? motionOverride.demoMode === 'animated_image'
              ? `Images: ${baseImageLicense}; Animated demo: ${motionOverride.license}`
              : `Images: ${baseImageLicense}; Video: ${motionOverride.license}`
            : motionOverride.license
          : baseImageLicense

      overrides[item.slug] = {
        imageUrls,
        videoUrl: motionOverride
          ? motionOverride.sourceUrl
          : imageUrls?.[0],
        slowMotionUrl: motionOverride?.demoMode === 'video'
          ? motionOverride.sourceUrl
          : null,
        demoMode: motionOverride?.demoMode || 'image_sequence',
        source: mixedSource ? 'mixed' : (baseImageSourceKind || 'open_source'),
        license,
        attributionLabel: motionOverride
          ? `${motionOverride.label}${baseImageLabel ? ` + ${baseImageLabel}` : ''}`
          : baseImageLabel,
        attributionUrl: motionOverride?.sourcePageUrl || (baseImageSourceKind === 'generated' ? null : baseImageAttributionUrl),
        techniqueNote: mergeNotes(resolvedSource.techniqueNote, staticImageOverride?.techniqueNote, motionOverride?.techniqueNote),
      }

      if (motionOverride) {
        attributions.push({
          slug: item.slug,
          name: item.name,
          source: motionOverride.label,
          license: motionOverride.license,
          sourceUrl: motionOverride.sourcePageUrl,
        })
      }
    }
  }

  const manifest = `import type { ExerciseMedia } from '@/lib/product/types'\n\nexport const exerciseMediaOverrides: Record<string, Partial<ExerciseMedia>> = ${JSON.stringify(
    overrides,
    null,
    2
  )}\n`

  await writeFile(MANIFEST_PATH, manifest, 'utf8')
  await writeFile(ATTRIBUTIONS_PATH, JSON.stringify(attributions, null, 2), 'utf8')

  const matchedCount = Object.keys(overrides).length
  console.log(
    JSON.stringify(
      {
        totalExercises: allExerciseLibraryItems.length,
        matchedWithOpenSourceMedia: matchedCount,
        imagesOnly: Object.values(overrides).filter((item) => item.demoMode === 'image_sequence').length,
        withAnimatedImages: Object.values(overrides).filter((item) => item.demoMode === 'animated_image').length,
        withVideo: Object.values(overrides).filter((item) => item.demoMode === 'video').length,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error('[buildExerciseMedia] failed', error)
  process.exit(1)
})
