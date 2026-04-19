import type { VisionFault } from '@/lib/engine/types'

export type VideoAnalysisIssueKey =
  | 'forward_head'
  | 'head_falling_over'
  | 'hip_drop'
  | 'knee_valgus'
  | 'low_contact_point'
  | 'low_guard'
  | 'low_knee_drive_left'
  | 'narrow_base'
  | 'overstriding'
  | 'rotation_leak'
  | 'rounded_spine'
  | 'shallow_squat'
  | 'shoulder_tilt'
  | 'stiff_knees'
  | 'stiff_landing'
  | 'trunk_collapse'

export interface VideoAnalysisIssueProfile {
  key: VideoAnalysisIssueKey
  title: string
  riskMapping: string
  correctiveDrills: string[]
  severity: VisionFault['severity']
  correctionCue: string
  nextRepFocus: string
  aliases: string[]
}

export const VIDEO_ANALYSIS_ISSUE_PROFILES: Record<VideoAnalysisIssueKey, VideoAnalysisIssueProfile> = {
  forward_head: {
    key: 'forward_head',
    title: 'Head posture is drifting forward',
    riskMapping: 'Neck and upper-back loading rise when the head leads the movement instead of staying stacked over the trunk.',
    correctiveDrills: ['Chin tucks', 'Wall angels', 'Thoracic extension over foam roller'],
    severity: 'low',
    correctionCue: 'Keep the chin softly tucked and let the sternum lead while the head stays stacked over the shoulders.',
    nextRepFocus: 'On the next clip, the ear line should stay closer to the shoulder line instead of jutting forward.',
    aliases: ['forward head', 'head posture', 'chin tucked'],
  },
  head_falling_over: {
    key: 'head_falling_over',
    title: 'Head stability is drifting outside the base',
    riskMapping: 'Balance and lower-back load worsen when the head leaves the center of the stance or swing axis.',
    correctiveDrills: ['Core anti-rotation holds', 'Pallof press', 'Side plank variations'],
    severity: 'moderate',
    correctionCue: 'Keep the head centered between the hips and let the body rotate or shift underneath a quieter head position.',
    nextRepFocus: 'The next rep should show the head finishing inside the base instead of falling outside the support foot line.',
    aliases: ['head falling', 'head stability', 'off the swing axis'],
  },
  hip_drop: {
    key: 'hip_drop',
    title: 'Pelvic control is dropping during movement',
    riskMapping: 'Hip, knee, and lower-back stress rise when one side of the pelvis drops during support or transfer.',
    correctiveDrills: ['Side-lying hip abduction', 'Clamshells', 'Single-leg Romanian deadlift'],
    severity: 'moderate',
    correctionCue: 'Own the stance leg and keep the belt line level while you transfer force through the floor.',
    nextRepFocus: 'The next clip should show a quieter pelvis with less side-to-side dip during stance or rotation.',
    aliases: ['hip drop', 'pelvic drop', 'trendelenburg'],
  },
  knee_valgus: {
    key: 'knee_valgus',
    title: 'Knee tracking collapses under load',
    riskMapping: 'ACL and knee overload risk rise when the knee caves inward during landing, braking, or push-off.',
    correctiveDrills: ['Single-leg glute bridge', 'Clamshells with band', 'Lateral band walks', 'Single-leg squat to box'],
    severity: 'high',
    correctionCue: 'Stack hip, knee, and second toe on the landing and hold that line before you re-accelerate.',
    nextRepFocus: 'On the next clip, the knee should stay centered over the foot from initial contact through push-off.',
    aliases: ['knee valgus', 'knee tracking', 'knee caves', 'medial knee collapse'],
  },
  low_contact_point: {
    key: 'low_contact_point',
    title: 'Contact point is too low',
    riskMapping: 'Shoulder compression and lost force transfer increase when the arm path never reaches a clean overhead contact point.',
    correctiveDrills: ['Overhead press with pause', 'Shoulder external rotation', 'Thoracic extension mobility'],
    severity: 'moderate',
    correctionCue: 'Reach taller through the ribcage and let the arm finish high instead of striking from a cramped elbow position.',
    nextRepFocus: 'The next rep should show the hand contacting higher with a cleaner arm extension above the head line.',
    aliases: ['low contact', 'contact point', 'cramped elbow'],
  },
  low_guard: {
    key: 'low_guard',
    title: 'Guard or arm slot is dropping',
    riskMapping: 'Reaction quality and shoulder efficiency fall when the hands or arm path drop away from the intended working slot.',
    correctiveDrills: ['Wall guard holds', 'Shadow slips with frozen guard', 'Reactive guard taps'],
    severity: 'moderate',
    correctionCue: 'Keep the hands home and rehearse the intended arm path before you add speed, chaos, or contact.',
    nextRepFocus: 'The next clip should show the hands or arm slot staying closer to the trunk through the key movement phase.',
    aliases: ['low guard', 'guard position', 'arm slot', 'arm path is dropping'],
  },
  low_knee_drive_left: {
    key: 'low_knee_drive_left',
    title: 'Drive-phase mechanics are dropping off',
    riskMapping: 'Rear-chain overload and hamstring strain risk rise when knee lift and front-side mechanics disappear during the stride phase.',
    correctiveDrills: ['A-skip drills', 'Wall knee drives', 'High-knee marching'],
    severity: 'moderate',
    correctionCue: 'Attack the ground with a stronger front-side knee lift instead of reaching or cycling late underneath the hips.',
    nextRepFocus: 'The next rep should show a sharper drive knee with better front-side lift before ground contact.',
    aliases: ['low knee drive', 'drive phase', 'front-side mechanics'],
  },
  narrow_base: {
    key: 'narrow_base',
    title: 'Base width is too narrow for clean control',
    riskMapping: 'Balance, reaction quality, and knee control degrade when the stance is too narrow for the task.',
    correctiveDrills: ['Stance resets', 'Lateral step-outs', 'Mirror footwork without strikes'],
    severity: 'moderate',
    correctionCue: 'Create a slightly wider base so you can own balance first and then layer speed or contact on top.',
    nextRepFocus: 'The next clip should show the feet setting a wider, more reactive platform before movement starts.',
    aliases: ['narrow base', 'stance is too narrow', 'base width'],
  },
  overstriding: {
    key: 'overstriding',
    title: 'Stride reach is too aggressive',
    riskMapping: 'Braking load, shin stress, and lower-limb inefficiency rise when the foot lands too far ahead of the hips.',
    correctiveDrills: ['Cadence drills (180 BPM)', 'Short cue sprints', 'Barefoot jogging on grass'],
    severity: 'moderate',
    correctionCue: 'Bring the step back underneath the hips and think quick ground contacts instead of reaching out in front.',
    nextRepFocus: 'The next clip should show the foot striking closer to the center of mass with a faster cadence rhythm.',
    aliases: ['overstriding', 'stride reach', 'foot striking ahead'],
  },
  rotation_leak: {
    key: 'rotation_leak',
    title: 'Rotation is leaking before clean transfer',
    riskMapping: 'Shoulder and lower-back efficiency drop when the upper body opens before the hips have finished transferring force.',
    correctiveDrills: ['Step-behind swing rehearsals', 'Medicine-ball rotation to stick', 'Half-swing tempo drills'],
    severity: 'moderate',
    correctionCue: 'Delay the shoulder release until the lower body has anchored and transferred force more cleanly.',
    nextRepFocus: 'The next clip should show hips leading a little longer before the shoulders and hands unwind.',
    aliases: ['rotation leak', 'opens early', 'rotation is leaking'],
  },
  rounded_spine: {
    key: 'rounded_spine',
    title: 'Spinal position is losing neutrality',
    riskMapping: 'Lower-back loading rises when the trunk rounds instead of staying braced through the hinge or squat pattern.',
    correctiveDrills: ['Hip-hinge wall drill', 'Bird dog', 'Paused Romanian deadlift with light load'],
    severity: 'high',
    correctionCue: 'Brace before you descend and keep the chest-ribs-pelvis stack quiet while the hips do the work.',
    nextRepFocus: 'The next clip should show a steadier trunk angle with less visible rounding through the middle of the rep.',
    aliases: ['rounded spine', 'brace is collapsing', 'neutral spine'],
  },
  shallow_squat: {
    key: 'shallow_squat',
    title: 'Depth and brace quality are limited',
    riskMapping: 'Hip and knee force transfer stay limited when the movement never settles into a strong, usable bottom position.',
    correctiveDrills: ['Tempo goblet squat', 'Box squat', 'Counterbalance squat holds'],
    severity: 'moderate',
    correctionCue: 'Sit into the pattern with control and keep the trunk stacked so the hips can own more range.',
    nextRepFocus: 'The next clip should show a deeper, calmer bottom position before the body reverses upward.',
    aliases: ['shallow squat', 'too shallow', 'depth is limited'],
  },
  shoulder_tilt: {
    key: 'shoulder_tilt',
    title: 'Upper-body alignment is uneven',
    riskMapping: 'Shoulder and trunk loading become less efficient when one side of the shoulder line collapses or leads too early.',
    correctiveDrills: ['Band pull-aparts', 'Prone Y-raises', 'Wall slides'],
    severity: 'moderate',
    correctionCue: 'Keep the shoulders level and the ribcage quiet so force transfers through a more balanced trunk.',
    nextRepFocus: 'The next clip should show less shoulder drop through setup, delivery, or finish.',
    aliases: ['shoulder tilt', 'shoulders level', 'upper-body alignment'],
  },
  stiff_knees: {
    key: 'stiff_knees',
    title: 'Athletic stance is too rigid',
    riskMapping: 'Shock absorption and rhythm suffer when the knees lock out instead of staying ready to load and move.',
    correctiveDrills: ['Bodyweight squats', 'Drop squats', 'Athletic stance holds'],
    severity: 'low',
    correctionCue: 'Unlock the knees slightly and stay spring-loaded so the body can absorb and redirect force.',
    nextRepFocus: 'The next rep should show a softer knee angle in the stance instead of a locked, upright position.',
    aliases: ['stiff knees', 'rigid stance', 'knees locked'],
  },
  stiff_landing: {
    key: 'stiff_landing',
    title: 'Landing mechanics are too stiff',
    riskMapping: 'Ankle and knee loading spike when the body cannot sink into the hips and knees to absorb force.',
    correctiveDrills: ['Drop squat landings', 'Box jump step-downs', 'Single-leg landing drills'],
    severity: 'high',
    correctionCue: 'Meet the ground with softer hips and knees so the landing becomes quiet before the next movement happens.',
    nextRepFocus: 'The next clip should show more bend and a quieter landing instead of a rigid hit into the floor.',
    aliases: ['stiff landing', 'landing is too stiff', 'shock absorption'],
  },
  trunk_collapse: {
    key: 'trunk_collapse',
    title: 'Trunk posture is collapsing under load',
    riskMapping: 'Lower-back and neck stress rise when the trunk loses structure during the working phase of the movement.',
    correctiveDrills: ['Dead bug', 'Tall-kneeling brace holds', 'Tempo level-change drills'],
    severity: 'moderate',
    correctionCue: 'Brace earlier and keep the sternum-pelvis relationship quiet while the hips and legs create the movement.',
    nextRepFocus: 'The next clip should show a steadier trunk with less folding or sway during the hardest phase.',
    aliases: ['trunk collapse', 'brace collapses', 'trunk posture'],
  },
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function getVideoAnalysisIssueProfile(issueKey: string | null | undefined) {
  if (!issueKey) return null
  return VIDEO_ANALYSIS_ISSUE_PROFILES[issueKey as VideoAnalysisIssueKey] || null
}

export function inferVideoAnalysisIssueKeyFromFault(faultLabel: string) {
  const normalizedFault = normalizeText(faultLabel)
  const entries = Object.entries(VIDEO_ANALYSIS_ISSUE_PROFILES) as Array<
    [VideoAnalysisIssueKey, VideoAnalysisIssueProfile]
  >

  for (const [issueKey, profile] of entries) {
    if (normalizeText(profile.title) === normalizedFault) return issueKey
    if (profile.aliases.some((alias) => normalizedFault.includes(normalizeText(alias)))) {
      return issueKey
    }
  }

  return null
}

export function synthesizeVisionFaultsFromIssues(issueKeys: string[]) {
  return issueKeys
    .map((issueKey) => {
      const profile = getVideoAnalysisIssueProfile(issueKey)
      if (!profile) return null
      return {
        fault: profile.title,
        riskMapping: profile.riskMapping,
        correctiveDrills: profile.correctiveDrills,
        severity: profile.severity,
        confidence: profile.severity === 'high' ? 0.9 : profile.severity === 'moderate' ? 0.78 : 0.66,
      } satisfies VisionFault
    })
    .filter((fault): fault is VisionFault => Boolean(fault))
}
