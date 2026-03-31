import { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { calculateAngle2D } from './geometry'
import { VisionFault } from '../engine/types'
import { resolveVideoAnalysisProfile } from '@/lib/video-analysis/catalog'

// Standard MediaPipe Pose Landmark Indices (0-32)
export const LA = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
}

export interface FeedbackEvent {
  message: string
  isError: boolean
  timestampMs?: number
}

export interface AnalysisState {
  sport: string
  frameCount: number
  warnings: number
  positive: number
  issuesDetected: Set<string>
  feedbackLog: FeedbackEvent[]
  visionFaults: VisionFault[]  // V5: Structured fault output
}

// ─── V5: FAULT → RISK → DRILL MAPPING ───────────────────────────────────

/**
 * Maps a detected movement fault to an injury risk and corrective drills.
 * This is the core of the vision-to-decision pipeline.
 */
function createVisionFault(
  fault: string,
  riskMapping: string,
  correctiveDrills: string[],
  severity: VisionFault['severity']
): VisionFault {
  return {
    fault,
    riskMapping,
    correctiveDrills,
    severity,
    confidence: severity === 'high' ? 0.9 : severity === 'moderate' ? 0.75 : 0.6,
    timestamp: new Date().toISOString(),
  }
}

function registerFault(
  state: AnalysisState,
  issueKey: string,
  fault: string,
  riskMapping: string,
  correctiveDrills: string[],
  severity: VisionFault['severity'],
  message: string
): FeedbackEvent | null {
  if (state.issuesDetected.has(issueKey)) return null
  state.issuesDetected.add(issueKey)
  state.visionFaults.push(createVisionFault(fault, riskMapping, correctiveDrills, severity))
  return { message, isError: true }
}

// ─── SPORT ANALYZERS (V5: Now return VisionFault[] alongside FeedbackEvent) ──

export function analyzeSprint(landmarks: NormalizedLandmark[], state: AnalysisState): FeedbackEvent | null {
  if (landmarks[LA.LEFT_KNEE].visibility && landmarks[LA.LEFT_KNEE].visibility < 0.6) return null

  const leftKneeAngle = calculateAngle2D(landmarks[LA.LEFT_HIP], landmarks[LA.LEFT_KNEE], landmarks[LA.LEFT_ANKLE])
  const rightKneeAngle = calculateAngle2D(landmarks[LA.RIGHT_HIP], landmarks[LA.RIGHT_KNEE], landmarks[LA.RIGHT_ANKLE])

  // V5: Knee valgus detection → ACL risk
  if (state.frameCount > 20) {
    const leftKneeX = landmarks[LA.LEFT_KNEE].x
    const leftAnkleX = landmarks[LA.LEFT_ANKLE].x
    const leftHipX = landmarks[LA.LEFT_HIP].x
    
    // Knee is medial to ankle line = valgus
    const kneeDeflection = Math.abs(leftKneeX - ((leftHipX + leftAnkleX) / 2))
    if (kneeDeflection > 0.06 && !state.issuesDetected.has('knee_valgus')) {
      state.issuesDetected.add('knee_valgus')
      state.visionFaults.push(createVisionFault(
        'Knee valgus detected during sprint mechanics',
        'ACL risk ↑ — medial knee collapse under load',
        ['Single-leg glute bridge', 'Clamshells with band', 'Lateral band walks', 'Single-leg squat to box'],
        'high'
      ))
      return { message: "Knee valgus detected — risk of ACL injury. Focus on knee tracking over toes.", isError: true }
    }
  }

  // Low knee drive detection → Hamstring risk
  if (rightKneeAngle > 160 && leftKneeAngle > 110 && !state.issuesDetected.has('low_knee_drive_left')) {
    state.issuesDetected.add('low_knee_drive_left')
    state.visionFaults.push(createVisionFault(
      'Low knee drive during stride phase',
      'Hamstring strain risk ↑ — compensatory rear-chain overload',
      ['A-skip drills', 'Wall knee drives', 'High-knee marching'],
      'moderate'
    ))
    return { message: "Drive your left knee higher during the stride phase", isError: true }
  }

  // V5: Over-striding detection → Tibial stress
  if (state.frameCount > 30) {
    const footStrike = landmarks[LA.LEFT_FOOT_INDEX].x - landmarks[LA.LEFT_HIP].x
    if (Math.abs(footStrike) > 0.15 && !state.issuesDetected.has('overstriding')) {
      state.issuesDetected.add('overstriding')
      state.visionFaults.push(createVisionFault(
        'Over-striding — foot striking ahead of center of mass',
        'Shin splint / tibial stress risk ↑',
        ['Cadence drills (180 BPM)', 'Short cue sprints', 'Barefoot jogging on grass'],
        'moderate'
      ))
      return { message: "Foot landing too far ahead. Shorten stride and increase cadence.", isError: true }
    }
  }

  return null
}

export function analyzeCricketBatting(landmarks: NormalizedLandmark[], state: AnalysisState): FeedbackEvent | null {
  const headPos = landmarks[LA.NOSE]
  const leftHip = landmarks[LA.LEFT_HIP]
  const rightHip = landmarks[LA.RIGHT_HIP]
  
  const cogX = (leftHip.x + rightHip.x) / 2
  const headOffset = Math.abs(headPos.x - cogX)
  
  if (state.frameCount > 30 && headOffset > 0.15 && !state.issuesDetected.has('head_falling_over')) {
    state.issuesDetected.add('head_falling_over')
    state.visionFaults.push(createVisionFault(
      'Head falling outside base during batting stance',
      'Lower back strain risk ↑ — lateral spinal loading',
      ['Core anti-rotation holds', 'Pallof press', 'Side plank variations'],
      'moderate'
    ))
    return { message: "Head is falling outside your base. Keep it steady on the off-stump.", isError: true }
  }

  // Knee bent in stance
  const backKneeBent = calculateAngle2D(landmarks[LA.RIGHT_HIP], landmarks[LA.RIGHT_KNEE], landmarks[LA.RIGHT_ANKLE])
  if (backKneeBent > 175 && !state.issuesDetected.has('stiff_knees')) {
    state.issuesDetected.add('stiff_knees')
    state.visionFaults.push(createVisionFault(
      'Stiff knees in batting stance — no athletic position',
      'Knee hyperextension risk ↑ — impaired shock absorption',
      ['Bodyweight squats', 'Drop squats', 'Athletic stance holds'],
      'low'
    ))
    return { message: "Flex your knees slightly in your stance for better trigger movement.", isError: true }
  }

  // V5: Shoulder alignment check (front shoulder dipping)
  const leftShoulderY = landmarks[LA.LEFT_SHOULDER].y
  const rightShoulderY = landmarks[LA.RIGHT_SHOULDER].y
  const shoulderTilt = Math.abs(leftShoulderY - rightShoulderY)
  if (shoulderTilt > 0.08 && !state.issuesDetected.has('shoulder_tilt')) {
    state.issuesDetected.add('shoulder_tilt')
    state.visionFaults.push(createVisionFault(
      'Excessive shoulder tilt in stance',
      'Shoulder impingement risk ↑ — asymmetric loading pattern',
      ['Band pull-aparts', 'Prone Y-raises', 'Wall slides'],
      'moderate'
    ))
    return { message: "Keep shoulders level. Excessive tilt affects shot execution.", isError: true }
  }

  return null
}

export function analyzeBadmintonSmash(landmarks: NormalizedLandmark[], state: AnalysisState): FeedbackEvent | null {
  const rightElbowAngle = calculateAngle2D(landmarks[LA.RIGHT_SHOULDER], landmarks[LA.RIGHT_ELBOW], landmarks[LA.RIGHT_WRIST])
  const rightWristY = landmarks[LA.RIGHT_WRIST].y
  const noseY = landmarks[LA.NOSE].y

  if (rightWristY < noseY && rightElbowAngle < 130 && !state.issuesDetected.has('low_contact_point')) {
    state.issuesDetected.add('low_contact_point')
    state.visionFaults.push(createVisionFault(
      'Contact point too low — cramped elbow during smash',
      'Shoulder impingement risk ↑ — repeated overhead compression',
      ['Overhead press with pause', 'Shoulder external rotation', 'Thoracic extension mobility'],
      'moderate'
    ))
    return { message: "Extend your arm fully to hit the shuttle at the highest point.", isError: true }
  }

  // V5: Landing mechanics check during jump smash
  if (state.frameCount > 40) {
    const leftKneeAngle = calculateAngle2D(landmarks[LA.LEFT_HIP], landmarks[LA.LEFT_KNEE], landmarks[LA.LEFT_ANKLE])
    if (leftKneeAngle > 170 && !state.issuesDetected.has('stiff_landing')) {
      state.issuesDetected.add('stiff_landing')
      state.visionFaults.push(createVisionFault(
        'Stiff-legged landing after jump smash',
        'Ankle/knee injury risk ↑ — inadequate shock absorption',
        ['Drop squat landings', 'Box jump step-downs', 'Single-leg landing drills'],
        'high'
      ))
      return { message: "Bend knees on landing. Stiff landings increase injury risk.", isError: true }
    }
  }

  return null
}

export function analyzeChangeOfDirection(landmarks: NormalizedLandmark[], state: AnalysisState): FeedbackEvent | null {
  const leftKneeAngle = calculateAngle2D(landmarks[LA.LEFT_HIP], landmarks[LA.LEFT_KNEE], landmarks[LA.LEFT_ANKLE])
  const rightKneeAngle = calculateAngle2D(landmarks[LA.RIGHT_HIP], landmarks[LA.RIGHT_KNEE], landmarks[LA.RIGHT_ANKLE])
  const leftKneeX = landmarks[LA.LEFT_KNEE].x
  const leftAnkleX = landmarks[LA.LEFT_ANKLE].x
  const rightKneeX = landmarks[LA.RIGHT_KNEE].x
  const rightAnkleX = landmarks[LA.RIGHT_ANKLE].x

  if (state.frameCount > 20) {
    const leftValgus = Math.abs(leftKneeX - leftAnkleX) > 0.09
    const rightValgus = Math.abs(rightKneeX - rightAnkleX) > 0.09
    if (leftValgus || rightValgus) {
      return registerFault(
        state,
        'knee_valgus',
        'Knee tracking collapses during cut or landing',
        'ACL and knee overload risk increases when the knee caves during reactive movement',
        ['Lateral band walks', 'Single-leg squat to box', 'Deceleration stick landings', 'Split squat isometric holds'],
        'high',
        'Knee is collapsing on direction change. Clean up landing and tracking before adding more speed.'
      )
    }
  }

  if (state.frameCount > 30 && leftKneeAngle > 168 && rightKneeAngle > 168) {
    return registerFault(
      state,
      'stiff_landing',
      'Landing or deceleration is too stiff',
      'Ankle and knee shock absorption risk rises when you cannot sink into the landing',
      ['Drop squat landings', 'Snap-down to stick', 'Low pogo to athletic stance'],
      'moderate',
      'Landing is too stiff. Sink into the hips and knees to absorb force.'
    )
  }

  return null
}

export function analyzeBowlingDelivery(landmarks: NormalizedLandmark[], state: AnalysisState): FeedbackEvent | null {
  const leftShoulderY = landmarks[LA.LEFT_SHOULDER].y
  const rightShoulderY = landmarks[LA.RIGHT_SHOULDER].y
  const shoulderTilt = Math.abs(leftShoulderY - rightShoulderY)
  const strideReach = Math.abs(landmarks[LA.LEFT_ANKLE].x - landmarks[LA.LEFT_HIP].x)
  const rightElbowY = landmarks[LA.RIGHT_ELBOW].y
  const rightShoulderYCurrent = landmarks[LA.RIGHT_SHOULDER].y

  if (state.frameCount > 20 && shoulderTilt > 0.1) {
    return registerFault(
      state,
      'shoulder_tilt',
      'Shoulder line is leaking during the delivery phase',
      'Shoulder and lower-back loading rise when trunk and shoulder alignment collapse at release',
      ['Wall slides', 'Half-kneeling anti-rotation press', 'Split-stance medicine-ball throw holds'],
      'moderate',
      'Shoulders are tilting too much in the delivery. Stack trunk and shoulders more cleanly.'
    )
  }

  if (state.frameCount > 30 && strideReach > 0.2) {
    return registerFault(
      state,
      'overstriding',
      'Stride reaches too far ahead of the hips in the delivery',
      'Lower back and hamstring load can spike when the stride gets too long and braking dominates the release',
      ['Short-approach walk-throughs', 'Wall drive drills', 'Split-stance rhythm throws'],
      'moderate',
      'The stride is reaching too far. Keep the delivery under the hips and stay connected through release.'
    )
  }

  if (state.frameCount > 18 && rightElbowY > rightShoulderYCurrent + 0.08) {
    return registerFault(
      state,
      'low_guard',
      'Arm slot is dropping during the delivery path',
      'Shoulder and elbow efficiency fall when the arm path drops below the clean delivery slot',
      ['Shoulder external rotation work', 'Band arm-path rehearsals', 'Shadow deliveries at 60% speed'],
      'moderate',
      'Arm path is dropping. Rehearse a cleaner delivery slot before pushing pace.'
    )
  }

  return null
}

export function analyzeCombatStance(landmarks: NormalizedLandmark[], state: AnalysisState): FeedbackEvent | null {
  const shoulderWidth = Math.abs(landmarks[LA.LEFT_SHOULDER].x - landmarks[LA.RIGHT_SHOULDER].x)
  const footWidth = Math.abs(landmarks[LA.LEFT_ANKLE].x - landmarks[LA.RIGHT_ANKLE].x)
  const leftWristY = landmarks[LA.LEFT_WRIST].y
  const rightWristY = landmarks[LA.RIGHT_WRIST].y
  const shoulderLineY = Math.min(landmarks[LA.LEFT_SHOULDER].y, landmarks[LA.RIGHT_SHOULDER].y)
  const torsoAngle = calculateAngle2D(landmarks[LA.LEFT_SHOULDER], landmarks[LA.LEFT_HIP], landmarks[LA.LEFT_KNEE])

  if (state.frameCount > 10 && footWidth < shoulderWidth * 0.7) {
    return registerFault(
      state,
      'narrow_base',
      'Base is too narrow for reactive combat movement',
      'Balance and knee control break down faster when the stance is too narrow under reactive load',
      ['Stance resets', 'Lateral step-outs', 'Mirror footwork without strikes'],
      'moderate',
      'Base is too narrow. Build a wider reactive stance before adding speed or contact.'
    )
  }

  if (state.frameCount > 12 && leftWristY > shoulderLineY + 0.12 && rightWristY > shoulderLineY + 0.12) {
    return registerFault(
      state,
      'low_guard',
      'Guard position is dropping away from the trunk',
      'Neck, shoulder, and reaction risk all rise when the guard falls during live movement',
      ['Wall guard holds', 'Shadow slips with frozen guard', 'Reactive guard taps'],
      'low',
      'Guard is falling. Keep the hands home while you move.'
    )
  }

  if (state.frameCount > 18 && torsoAngle < 145) {
    return registerFault(
      state,
      'trunk_collapse',
      'Trunk posture collapses in stance transitions',
      'Lower-back and neck load increase when the trunk loses structure in the stance',
      ['Dead bug', 'Tall-kneeling brace holds', 'Tempo level-change drills'],
      'moderate',
      'Trunk is collapsing during stance work. Rebuild the brace before increasing intensity.'
    )
  }

  return null
}

export function analyzeStrengthPattern(landmarks: NormalizedLandmark[], state: AnalysisState): FeedbackEvent | null {
  const leftKneeAngle = calculateAngle2D(landmarks[LA.LEFT_HIP], landmarks[LA.LEFT_KNEE], landmarks[LA.LEFT_ANKLE])
  const hipAngle = calculateAngle2D(landmarks[LA.LEFT_SHOULDER], landmarks[LA.LEFT_HIP], landmarks[LA.LEFT_KNEE])
  const shoulderTilt = Math.abs(landmarks[LA.LEFT_SHOULDER].y - landmarks[LA.RIGHT_SHOULDER].y)

  if (state.frameCount > 18 && leftKneeAngle > 160) {
    return registerFault(
      state,
      'shallow_squat',
      'Strength pattern stays too shallow to load well',
      'Knee and hip force transfer is reduced when the pattern never settles into a usable depth',
      ['Tempo goblet squat', 'Box squat', 'Counterbalance squat holds'],
      'moderate',
      'The pattern is staying too tall. Sit into the movement and own the bottom position.'
    )
  }

  if (state.frameCount > 20 && hipAngle < 140) {
    return registerFault(
      state,
      'rounded_spine',
      'Trunk angle suggests a collapsing brace',
      'Lower-back load rises when the trunk rounds or collapses instead of staying stacked',
      ['Hip-hinge wall drill', 'Bird dog', 'Paused Romanian deadlift with light load'],
      'high',
      'Brace is collapsing. Rebuild the hinge or squat shape before adding more load.'
    )
  }

  if (state.frameCount > 14 && shoulderTilt > 0.08) {
    return registerFault(
      state,
      'shoulder_tilt',
      'Upper body is tilting through the rep',
      'Asymmetrical loading shifts stress into the lower back and hips',
      ['Suitcase carry', 'Split squat hold', 'Single-arm rack hold'],
      'low',
      'Upper body is tilting. Stay stacked through the rep.'
    )
  }

  return null
}

export function analyzeRotationalSwing(landmarks: NormalizedLandmark[], state: AnalysisState): FeedbackEvent | null {
  const headOffset = Math.abs(landmarks[LA.NOSE].x - ((landmarks[LA.LEFT_HIP].x + landmarks[LA.RIGHT_HIP].x) / 2))
  const shoulderTilt = Math.abs(landmarks[LA.LEFT_SHOULDER].y - landmarks[LA.RIGHT_SHOULDER].y)
  const hipDrop = Math.abs(landmarks[LA.LEFT_HIP].y - landmarks[LA.RIGHT_HIP].y)

  if (state.frameCount > 25 && headOffset > 0.14) {
    return registerFault(
      state,
      'head_falling_over',
      'Head and trunk are drifting off the rotational axis',
      'Lower-back and balance load rise when the head leaves the central swing axis',
      ['Slow-motion shadow swings', 'Split-stance anti-rotation holds', 'Balance-finish holds'],
      'moderate',
      'Head is drifting off the swing axis. Stay centered and finish in balance.'
    )
  }

  if (state.frameCount > 25 && shoulderTilt > 0.1) {
    return registerFault(
      state,
      'rotation_leak',
      'Shoulder line is leaking before clean rotational transfer',
      'Shoulder and lower-back efficiency drop when rotation leaks through the upper body too early',
      ['Step-behind swing rehearsals', 'Medicine-ball rotation to stick', 'Half-swing tempo drills'],
      'moderate',
      'Rotation is leaking early. Sequence the hips and shoulders more cleanly.'
    )
  }

  if (state.frameCount > 25 && hipDrop > 0.07) {
    return registerFault(
      state,
      'hip_drop',
      'Pelvic control is unstable through rotation',
      'Hip and lower-back stress rise when the pelvis drops or shifts during the swing',
      ['Single-leg hinge reach', 'Lateral hip lift', 'Step-and-stick rotation drills'],
      'low',
      'Pelvis is drifting. Own the trail-to-lead side transfer more cleanly.'
    )
  }

  return null
}

export function analyzePrecisionSetup(landmarks: NormalizedLandmark[], state: AnalysisState): FeedbackEvent | null {
  const shoulderTilt = Math.abs(landmarks[LA.LEFT_SHOULDER].y - landmarks[LA.RIGHT_SHOULDER].y)
  if (shoulderTilt > 0.06) {
    return registerFault(
      state,
      'shoulder_tilt',
      'Shoulder line is not level in the setup',
      'Precision and upper-back efficiency drop when the setup loses symmetry',
      ['Wall slides', 'Tall posture holds', 'Breathing reset before each rep'],
      'low',
      'Shoulders are uneven in the setup. Rebuild posture before the next rep.'
    )
  }

  return analyzeGenericPosture(landmarks, state)
}

export function analyzeEndurancePosture(landmarks: NormalizedLandmark[], state: AnalysisState): FeedbackEvent | null {
  const headResult = analyzeGenericPosture(landmarks, state)
  if (headResult) return headResult

  const strideReach = Math.abs(landmarks[LA.LEFT_FOOT_INDEX].x - landmarks[LA.LEFT_HIP].x)
  if (state.frameCount > 30 && strideReach > 0.18) {
    return registerFault(
      state,
      'overstriding',
      'Stride or drive length is too long for a repeatable rhythm',
      'Efficiency and lower-limb stress worsen when each repetition reaches too far ahead of the hips',
      ['Cadence resets', 'Short ground-contact drills', 'Easy rhythm intervals'],
      'moderate',
      'Movement is reaching too far. Shorten the pattern and keep it more economical.'
    )
  }

  return null
}

// ─── GENERIC POSTURE ANALYZER (V5) ──────────────────────────────────────

export function analyzeGenericPosture(landmarks: NormalizedLandmark[], state: AnalysisState): FeedbackEvent | null {
  // Forward head posture (neck strain risk)
  const noseX = landmarks[LA.NOSE].x
  const shoulderMidX = (landmarks[LA.LEFT_SHOULDER].x + landmarks[LA.RIGHT_SHOULDER].x) / 2
  const forwardHead = noseX - shoulderMidX

  if (Math.abs(forwardHead) > 0.12 && !state.issuesDetected.has('forward_head')) {
    state.issuesDetected.add('forward_head')
    state.visionFaults.push(createVisionFault(
      'Forward head posture detected during movement',
      'Cervical strain risk ↑ — neck and upper back overload',
      ['Chin tucks', 'Wall angels', 'Thoracic extension over foam roller'],
      'low'
    ))
    return { message: "Keep head in neutral position — chin slightly tucked.", isError: true }
  }

  // Asymmetric hip drop (pelvic control)
  const leftHipY = landmarks[LA.LEFT_HIP].y
  const rightHipY = landmarks[LA.RIGHT_HIP].y
  const hipDrop = Math.abs(leftHipY - rightHipY)
  if (hipDrop > 0.06 && !state.issuesDetected.has('hip_drop')) {
    state.issuesDetected.add('hip_drop')
    state.visionFaults.push(createVisionFault(
      'Pelvic drop / Trendelenburg sign during movement',
      'IT band / hip injury risk ↑ — lateral stability deficit',
      ['Side-lying hip abduction', 'Clamshells', 'Single-leg Romanian deadlift'],
      'moderate'
    ))
    return { message: "Keep hips level. One side is dropping during movement.", isError: true }
  }
  
  return null
}

// ─── MAIN DISPATCHER ────────────────────────────────────────────────────

export function runDeterministicRules(
  sport: string,
  landmarks: NormalizedLandmark[],
  state: AnalysisState
): FeedbackEvent | null {
  
  try {
    const profile = resolveVideoAnalysisProfile(sport)
    // Always run generic posture check
    const genericResult = analyzeGenericPosture(landmarks, state)
    
    let sportResult: FeedbackEvent | null = null
    switch (profile.family) {
      case 'sprint_mechanics':
        sportResult = analyzeSprint(landmarks, state)
        break
      case 'batting_stance':
        sportResult = analyzeCricketBatting(landmarks, state)
        break
      case 'overhead_mechanics':
        sportResult = analyzeBadmintonSmash(landmarks, state)
        break
      case 'change_of_direction':
        sportResult = analyzeChangeOfDirection(landmarks, state)
        break
      case 'bowling_delivery':
        sportResult = analyzeBowlingDelivery(landmarks, state)
        break
      case 'combat_stance':
        sportResult = analyzeCombatStance(landmarks, state)
        break
      case 'strength_pattern':
        sportResult = analyzeStrengthPattern(landmarks, state)
        break
      case 'rotational_swing':
        sportResult = analyzeRotationalSwing(landmarks, state)
        break
      case 'precision_posture':
        sportResult = analyzePrecisionSetup(landmarks, state)
        break
      case 'endurance_posture':
        sportResult = analyzeEndurancePosture(landmarks, state)
        break
      default:
        sportResult = null
        break
    }

    if (sportResult || genericResult) return sportResult || genericResult

    if (state.frameCount > 0 && state.frameCount % 75 === 0 && state.issuesDetected.size === 0) {
      return { message: 'Movement looks stable. Keep the same setup for the next reps.', isError: false }
    }

    return null
  } catch {
    return null
  }
}

/**
 * V5: Initialize analysis state with visionFaults array
 */
export function createAnalysisState(sport: string): AnalysisState {
  return {
    sport,
    frameCount: 0,
    warnings: 0,
    positive: 0,
    issuesDetected: new Set<string>(),
    feedbackLog: [],
    visionFaults: [],
  }
}
