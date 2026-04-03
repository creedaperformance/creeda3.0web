import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

import { getObjectiveProtocol } from '@/lib/objective-tests/protocols'
import type {
  ObjectiveTestMeasurement,
  ObjectiveTestType,
  ObjectiveValidityStatus,
} from '@/lib/objective-tests/types'
import { MediaPipeEngine } from '@/lib/vision/MediaPipeEngine'
import { LandmarkSmoother, calculateAngle2D } from '@/lib/vision/geometry'
import { LA } from '@/lib/vision/rules'

type PoseFrameFeature = {
  timeSec: number
  hipCenterX: number
  hipCenterY: number
  shoulderCenterX: number
  shoulderCenterY: number
  shoulderWidth: number
  hipWidth: number
  bodyHeight: number
  trunkLeanDeg: number
  hipTiltDeg: number
  leftKneeAngle: number
  rightKneeAngle: number
  leftShoulderFlexionDeg: number
  rightShoulderFlexionDeg: number
  leftAnkleX: number
  leftAnkleY: number
  rightAnkleX: number
  rightAnkleY: number
  leftFootX: number
  leftFootY: number
  rightFootX: number
  rightFootY: number
  leftWristY: number
  rightWristY: number
  leftHipY: number
  rightHipY: number
  leftShoulderY: number
  rightShoulderY: number
}

export interface ObjectiveProtocolAnalysisResult {
  protocolId: ObjectiveTestType
  protocolVersion: string
  classification: string
  summary: string
  confidenceScore: number
  captureQualityScore: number
  validityStatus: ObjectiveValidityStatus
  measurements: ObjectiveTestMeasurement[]
  headlineMetric: ObjectiveTestMeasurement
  resultsJson: Record<string, unknown>
  metadata: Record<string, unknown>
  qualityFlags: string[]
  safetyFlags: string[]
  sampleCount: number
  captureContext?: Record<string, unknown>
}

export interface ObjectiveVideoAnalysisInput {
  protocolId: Exclude<ObjectiveTestType, 'reaction_tap' | 'breathing_recovery'>
  file: File
  side?: 'left' | 'right'
  subtestKey?: string
}

export interface BreathingRecoveryInput {
  peakHrBpm: number | null
  hr60Bpm: number | null
  perceivedBreathlessnessDelta: number | null
  symptomFlags: string[]
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function round(value: number, decimals = 0) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function average(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function standardDeviation(values: number[]) {
  if (values.length <= 1) return 0
  const mean = average(values)
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)))
}

function safeLandmark(landmarks: NormalizedLandmark[], index: number, minVisibility = 0.45) {
  const point = landmarks[index]
  if (!point) return null
  if ((point.visibility ?? 1) < minVisibility) return null
  return point
}

function pointVisible(landmarks: NormalizedLandmark[], index: number, minVisibility = 0.45) {
  return Boolean(safeLandmark(landmarks, index, minVisibility))
}

function safeAngle(
  landmarks: NormalizedLandmark[],
  first: number,
  middle: number,
  last: number,
  minVisibility = 0.45
) {
  const a = safeLandmark(landmarks, first, minVisibility)
  const b = safeLandmark(landmarks, middle, minVisibility)
  const c = safeLandmark(landmarks, last, minVisibility)
  if (!a || !b || !c) return 0
  return calculateAngle2D(a, b, c)
}

function computeFrameFeature(landmarks: NormalizedLandmark[], timeSec: number): PoseFrameFeature | null {
  const required = [
    LA.LEFT_SHOULDER,
    LA.RIGHT_SHOULDER,
    LA.LEFT_HIP,
    LA.RIGHT_HIP,
    LA.LEFT_ANKLE,
    LA.RIGHT_ANKLE,
  ]

  if (!required.every((index) => pointVisible(landmarks, index))) {
    return null
  }

  const leftShoulder = landmarks[LA.LEFT_SHOULDER]
  const rightShoulder = landmarks[LA.RIGHT_SHOULDER]
  const leftHip = landmarks[LA.LEFT_HIP]
  const rightHip = landmarks[LA.RIGHT_HIP]
  const leftAnkle = landmarks[LA.LEFT_ANKLE]
  const rightAnkle = landmarks[LA.RIGHT_ANKLE]
  const leftFoot = landmarks[LA.LEFT_FOOT_INDEX] || leftAnkle
  const rightFoot = landmarks[LA.RIGHT_FOOT_INDEX] || rightAnkle
  const leftWrist = landmarks[LA.LEFT_WRIST] || leftShoulder
  const rightWrist = landmarks[LA.RIGHT_WRIST] || rightShoulder

  const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2
  const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2
  const hipCenterX = (leftHip.x + rightHip.x) / 2
  const hipCenterY = (leftHip.y + rightHip.y) / 2
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x)
  const hipWidth = Math.abs(leftHip.x - rightHip.x)
  const bodyHeight = Math.max(((leftAnkle.y + rightAnkle.y) / 2) - shoulderCenterY, 0.01)
  const trunkLeanDeg = Math.abs(Math.atan2(shoulderCenterX - hipCenterX, hipCenterY - shoulderCenterY) * (180 / Math.PI))
  const hipTiltDeg = Math.abs(Math.atan2(leftHip.y - rightHip.y, leftHip.x - rightHip.x) * (180 / Math.PI))
  const leftKneeAngle = safeAngle(landmarks, LA.LEFT_HIP, LA.LEFT_KNEE, LA.LEFT_ANKLE)
  const rightKneeAngle = safeAngle(landmarks, LA.RIGHT_HIP, LA.RIGHT_KNEE, LA.RIGHT_ANKLE)
  const leftShoulderFlexionDeg = safeAngle(landmarks, LA.LEFT_ELBOW, LA.LEFT_SHOULDER, LA.LEFT_HIP)
  const rightShoulderFlexionDeg = safeAngle(landmarks, LA.RIGHT_ELBOW, LA.RIGHT_SHOULDER, LA.RIGHT_HIP)

  return {
    timeSec,
    hipCenterX,
    hipCenterY,
    shoulderCenterX,
    shoulderCenterY,
    shoulderWidth,
    hipWidth,
    bodyHeight,
    trunkLeanDeg,
    hipTiltDeg,
    leftKneeAngle,
    rightKneeAngle,
    leftShoulderFlexionDeg,
    rightShoulderFlexionDeg,
    leftAnkleX: leftAnkle.x,
    leftAnkleY: leftAnkle.y,
    rightAnkleX: rightAnkle.x,
    rightAnkleY: rightAnkle.y,
    leftFootX: leftFoot.x,
    leftFootY: leftFoot.y,
    rightFootX: rightFoot.x,
    rightFootY: rightFoot.y,
    leftWristY: leftWrist.y,
    rightWristY: rightWrist.y,
    leftHipY: leftHip.y,
    rightHipY: rightHip.y,
    leftShoulderY: leftShoulder.y,
    rightShoulderY: rightShoulder.y,
  }
}

async function loadVideoElement(file: File) {
  const objectUrl = URL.createObjectURL(file)
  try {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.src = objectUrl

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error('video-load-failed'))
    })

    return {
      video,
      objectUrl,
      durationSec: Number(video.duration || 0),
      width: Number(video.videoWidth || 0),
      height: Number(video.videoHeight || 0),
    }
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
}

async function collectPoseFrames(file: File) {
  const { video, objectUrl, durationSec, width, height } = await loadVideoElement(file)
  const engine = MediaPipeEngine.getInstance()
  await engine.initialize()
  const smoother = new LandmarkSmoother(3)

  const frames: PoseFrameFeature[] = []
  let analyzedFrames = 0
  let trackedFrames = 0
  let fullBodyFrames = 0

  try {
    video.currentTime = 0
    await video.play()

    await new Promise<void>((resolve) => {
      const tick = () => {
        if (video.paused || video.ended) {
          resolve()
          return
        }

        const result = engine.detect(video, video.currentTime * 1000)
        analyzedFrames += 1
        const pose = result.landmarks?.[0]
        if (pose) {
          trackedFrames += 1
          const smoothed = smoother.smooth(pose)
          if (
            pointVisible(smoothed, LA.LEFT_SHOULDER) &&
            pointVisible(smoothed, LA.RIGHT_SHOULDER) &&
            pointVisible(smoothed, LA.LEFT_ANKLE) &&
            pointVisible(smoothed, LA.RIGHT_ANKLE)
          ) {
            fullBodyFrames += 1
          }
          const feature = computeFrameFeature(smoothed, video.currentTime)
          if (feature) {
            frames.push(feature)
          }
        }

        requestAnimationFrame(tick)
      }

      requestAnimationFrame(tick)
    })
  } finally {
    video.pause()
    URL.revokeObjectURL(objectUrl)
  }

  return {
    durationSec,
    width,
    height,
    analyzedFrames,
    trackedFrames,
    fullBodyFrames,
    frames,
  }
}

function classifyFromThresholds(value: number, good: number | [number, number], critical: number | [number, number], direction: 'higher_better' | 'lower_better' | 'target_band') {
  const inThreshold = (threshold: number | [number, number]) => {
    if (Array.isArray(threshold)) return value >= threshold[0] && value <= threshold[1]
    if (direction === 'higher_better') return value >= threshold
    if (direction === 'lower_better') return value <= threshold
    return value === threshold
  }

  if (inThreshold(good)) return 'Good'
  if (inThreshold(critical)) return 'Critical'
  return 'Risk'
}

function buildQualityScore(durationSec: number, analyzedFrames: number, trackedFrames: number, fullBodyFrames: number) {
  if (durationSec <= 0 || analyzedFrames <= 0) return 0
  const trackingCoverage = trackedFrames / analyzedFrames
  const fullBodyCoverage = fullBodyFrames / analyzedFrames
  const durationScore = clamp(durationSec / 6, 0.4, 1)
  return round(clamp(trackingCoverage * 0.45 + fullBodyCoverage * 0.35 + durationScore * 0.2, 0, 1), 2)
}

function detectPeaks(values: number[]) {
  const peaks: number[] = []
  for (let index = 1; index < values.length - 1; index += 1) {
    if (values[index] > values[index - 1] && values[index] >= values[index + 1]) peaks.push(index)
  }
  return peaks
}

function analyzeBalance(frames: PoseFrameFeature[], side: 'left' | 'right' | undefined, captureQualityScore: number, durationSec: number): ObjectiveProtocolAnalysisResult {
  const protocol = getObjectiveProtocol('balance_single_leg')
  if (!protocol) throw new Error('balance-protocol-missing')

  const avgShoulderWidth = average(frames.map((frame) => frame.shoulderWidth))
  const totalPath = sum(
    frames.slice(1).map((frame, index) => {
      const previous = frames[index]
      return Math.hypot(frame.hipCenterX - previous.hipCenterX, frame.hipCenterY - previous.hipCenterY)
    })
  )
  const swayVelocity = avgShoulderWidth > 0 && durationSec > 0 ? totalPath / avgShoulderWidth / durationSec : 0
  const holdCompletionSec = frames.length ? frames[frames.length - 1].timeSec - frames[0].timeSec : 0
  const trunkVar = standardDeviation(frames.map((frame) => frame.trunkLeanDeg))
  const pelvisVar = standardDeviation(frames.map((frame) => frame.hipTiltDeg))
  const freeFootHeights = frames.map((frame) =>
    side === 'left' ? frame.rightAnkleY - frame.leftAnkleY : frame.leftAnkleY - frame.rightAnkleY
  )
  let footTouchCount = 0
  let wasTouching = false
  for (const delta of freeFootHeights) {
    const touching = Math.abs(delta) < 0.025
    if (touching && !wasTouching) footTouchCount += 1
    wasTouching = touching
  }

  const classification = classifyFromThresholds(
    swayVelocity,
    protocol.headlineMetric.provisionalThresholds.good,
    protocol.headlineMetric.provisionalThresholds.critical,
    protocol.headlineMetric.direction
  )
  const qualityFlags: string[] = []
  if (captureQualityScore < 0.7) qualityFlags.push('Capture quality is limited. Re-record with better framing and lighting.')
  if (holdCompletionSec < 15) qualityFlags.push('The hold was short, so this result is less stable than ideal.')

  const confidenceScore = round(
    clamp(
      captureQualityScore * 0.6 +
        clamp(holdCompletionSec / 20, 0.4, 1) * 0.2 +
        clamp(1 - trunkVar / 15, 0.3, 1) * 0.2,
      0,
      1
    ),
    2
  )
  const validityStatus: ObjectiveValidityStatus =
    captureQualityScore < 0.5 || holdCompletionSec < 8 ? 'invalid_saved' : confidenceScore < 0.68 ? 'low_confidence' : 'accepted'

  const measurements: ObjectiveTestMeasurement[] = [
    {
      key: protocol.headlineMetric.key,
      label: protocol.headlineMetric.label,
      value: round(swayVelocity, 3),
      unit: protocol.headlineMetric.unit,
      direction: protocol.headlineMetric.direction,
      isHeadline: true,
      side: side || 'none',
    },
    { key: 'hold_completion_sec', label: 'Hold time', value: round(holdCompletionSec, 1), unit: 's', direction: 'higher_better', side: side || 'none' },
    { key: 'trunk_lean_variability_deg', label: 'Trunk variability', value: round(trunkVar, 1), unit: 'deg', direction: 'lower_better', side: side || 'none' },
    { key: 'pelvis_drop_variability_deg', label: 'Pelvis variability', value: round(pelvisVar, 1), unit: 'deg', direction: 'lower_better', side: side || 'none' },
    { key: 'foot_touch_count', label: 'Foot touches', value: footTouchCount, unit: 'count', direction: 'lower_better', side: side || 'none' },
  ]

  return {
    protocolId: 'balance_single_leg',
    protocolVersion: 'balance_single_leg_v1_ai',
    classification,
    summary:
      classification === 'Good'
        ? 'AI balance scan found a stable hold with manageable sway.'
        : classification === 'Critical'
          ? 'AI balance scan saw elevated sway or loss of control. Keep today more conservative.'
          : 'AI balance scan found enough instability to keep an eye on control and asymmetry.',
    confidenceScore,
    captureQualityScore,
    validityStatus,
    measurements,
    headlineMetric: measurements[0],
    resultsJson: {
      side: side || 'none',
      hold_completion_sec: round(holdCompletionSec, 1),
      free_foot_contact_events: footTouchCount,
    },
    metadata: {
      ai_mode: 'pose_landmarker_v1',
    },
    qualityFlags,
    safetyFlags: [],
    sampleCount: frames.length,
    captureContext: { side: side || 'none' },
  }
}

function analyzeJump(frames: PoseFrameFeature[], captureQualityScore: number): ObjectiveProtocolAnalysisResult {
  const protocol = getObjectiveProtocol('jump_landing_control')
  if (!protocol) throw new Error('jump-protocol-missing')

  const baselineFrames = frames.slice(0, Math.max(3, Math.floor(frames.length * 0.15)))
  const baselineHipY = average(baselineFrames.map((frame) => frame.hipCenterY))
  const minHipY = Math.min(...frames.map((frame) => frame.hipCenterY))
  const avgShoulderWidth = Math.max(average(frames.map((frame) => frame.shoulderWidth)), 0.01)
  const amplitude = Math.max(0, (baselineHipY - minHipY) / avgShoulderWidth)
  const apexIndex = frames.findIndex((frame) => frame.hipCenterY === minHipY)
  const landingIndex = frames.findIndex(
    (frame, index) => index > apexIndex && frame.hipCenterY >= baselineHipY - amplitude * avgShoulderWidth * 0.25
  )
  const postLanding = landingIndex >= 0 ? frames.slice(landingIndex) : []
  const stabilizationWindow = Math.max(4, Math.floor((frames.length / Math.max(frames[frames.length - 1]?.timeSec || 1, 1)) * 0.4))
  let stabilizationIndex = -1
  for (let index = 0; index < postLanding.length - stabilizationWindow; index += 1) {
    const window = postLanding.slice(index, index + stabilizationWindow)
    const trunkWindow = standardDeviation(window.map((frame) => frame.trunkLeanDeg))
    const hipPath = sum(
      window.slice(1).map((frame, innerIndex) => {
        const previous = window[innerIndex]
        return Math.hypot(frame.hipCenterX - previous.hipCenterX, frame.hipCenterY - previous.hipCenterY)
      })
    )
    if (trunkWindow < 6 && hipPath < avgShoulderWidth * 0.08) {
      stabilizationIndex = index
      break
    }
  }

  const landingFrame = landingIndex >= 0 ? frames[landingIndex] : null
  const kneeSeparationRatio =
    landingFrame && Math.abs(landingFrame.leftKneeAngle - landingFrame.rightKneeAngle) > 0
      ? Math.abs(landingFrame.leftKneeAngle - landingFrame.rightKneeAngle) / Math.max(landingFrame.leftKneeAngle, landingFrame.rightKneeAngle)
      : 0
  const landingAsymmetryPercent = round(kneeSeparationRatio * 100, 1)
  const valgusEvents = postLanding.filter((frame) => {
    const ankleWidth = Math.abs(frame.leftAnkleX - frame.rightAnkleX)
    const kneeWidthProxy = Math.abs(frame.leftKneeAngle - frame.rightKneeAngle)
    return ankleWidth > 0 && kneeWidthProxy / 180 > 0.18
  }).length

  const timeToStabilizationMs =
    landingIndex >= 0 && stabilizationIndex >= 0
      ? Math.max(0, round((postLanding[stabilizationIndex].timeSec - frames[landingIndex].timeSec) * 1000))
      : round(Math.max((frames[frames.length - 1]?.timeSec || 0) - (landingFrame?.timeSec || 0), 0) * 1000)

  const classification = classifyFromThresholds(
    timeToStabilizationMs,
    protocol.headlineMetric.provisionalThresholds.good,
    protocol.headlineMetric.provisionalThresholds.critical,
    protocol.headlineMetric.direction
  )
  const confidenceScore = round(
    clamp(
      captureQualityScore * 0.55 +
        clamp(amplitude / 0.35, 0.3, 1) * 0.2 +
        clamp(landingIndex >= 0 ? 1 : 0.3, 0.3, 1) * 0.25,
      0,
      1
    ),
    2
  )
  const validityStatus: ObjectiveValidityStatus =
    captureQualityScore < 0.5 || amplitude < 0.08 ? 'invalid_saved' : confidenceScore < 0.68 ? 'low_confidence' : 'accepted'
  const qualityFlags: string[] = []
  if (amplitude < 0.12) qualityFlags.push('Jump amplitude looked small, so landing metrics may be less stable.')
  if (captureQualityScore < 0.7) qualityFlags.push('Capture quality is limited. Re-record with a wider frame and better lighting.')

  const measurements: ObjectiveTestMeasurement[] = [
    {
      key: protocol.headlineMetric.key,
      label: protocol.headlineMetric.label,
      value: timeToStabilizationMs,
      unit: 'ms',
      direction: 'lower_better',
      isHeadline: true,
    },
    { key: 'landing_valgus_event_count', label: 'Valgus events', value: valgusEvents, unit: 'count', direction: 'lower_better' },
    { key: 'landing_asymmetry_percent', label: 'Landing asymmetry', value: landingAsymmetryPercent, unit: '%', direction: 'lower_better' },
    { key: 'jump_amplitude_proxy_bw', label: 'Jump amplitude proxy', value: round(amplitude, 2), unit: 'bw', direction: 'higher_better' },
  ]

  return {
    protocolId: 'jump_landing_control',
    protocolVersion: 'jump_landing_control_v1_ai',
    classification,
    summary:
      classification === 'Good'
        ? 'AI jump scan shows the landing settled quickly enough to support normal progression.'
        : classification === 'Critical'
          ? 'AI jump scan found a slow or unstable landing. Keep explosive work more conservative.'
          : 'AI jump scan found some instability on landing. Keep an eye on control before pushing harder.',
    confidenceScore,
    captureQualityScore,
    validityStatus,
    measurements,
    headlineMetric: measurements[0],
    resultsJson: {
      landing_index: landingIndex,
      stabilization_index: stabilizationIndex,
    },
    metadata: { ai_mode: 'pose_landmarker_v1' },
    qualityFlags,
    safetyFlags: [],
    sampleCount: frames.length,
  }
}

function analyzeMobility(frames: PoseFrameFeature[], subtestKey: string | undefined, captureQualityScore: number): ObjectiveProtocolAnalysisResult {
  const protocol = getObjectiveProtocol('mobility_battery')
  if (!protocol) throw new Error('mobility-protocol-missing')

  const deepestFrame = [...frames].sort((left, right) => (left.hipCenterY > right.hipCenterY ? -1 : 1))[0] || frames[0]
  const topReachFrame = [...frames].sort((left, right) => {
    const leftReach = Math.min(left.leftWristY, left.rightWristY)
    const rightReach = Math.min(right.leftWristY, right.rightWristY)
    return leftReach < rightReach ? -1 : 1
  })[0] || frames[0]
  const toeTouchFrame = [...frames].sort((left, right) => {
    const leftReach = Math.abs(left.leftWristY - left.leftAnkleY)
    const rightReach = Math.abs(right.leftWristY - right.leftAnkleY)
    return leftReach < rightReach ? -1 : 1
  })[0] || frames[0]

  const squatDepthRatio = round(
    clamp((deepestFrame.hipCenterY - average([deepestFrame.leftShoulderY, deepestFrame.rightShoulderY])) / deepestFrame.bodyHeight, 0, 1.6),
    2
  )
  const ankleDorsiflexionDeg = round(
    Math.max(0, 180 - average([deepestFrame.leftKneeAngle, deepestFrame.rightKneeAngle])),
    1
  )
  const shoulderFlexionDeg = round(
    Math.max(topReachFrame.leftShoulderFlexionDeg, topReachFrame.rightShoulderFlexionDeg),
    1
  )
  const fingertipToAnkleRatio = round(
    Math.min(
      Math.abs(toeTouchFrame.leftWristY - toeTouchFrame.leftAnkleY),
      Math.abs(toeTouchFrame.rightWristY - toeTouchFrame.rightAnkleY)
    ) / toeTouchFrame.bodyHeight,
    2
  )
  const hingeScore = round(clamp(100 - fingertipToAnkleRatio * 120 - standardDeviation(frames.map((frame) => frame.trunkLeanDeg)) * 1.5, 0, 100))

  const subScores = [
    clamp(100 - Math.max(squatDepthRatio - 0.8, 0) * 120, 0, 100),
    clamp((shoulderFlexionDeg / 170) * 100, 0, 100),
    clamp((ankleDorsiflexionDeg / 40) * 100, 0, 100),
    clamp(hingeScore, 0, 100),
  ]
  const batteryScore = round(average(subScores))
  const classification = classifyFromThresholds(
    batteryScore,
    protocol.headlineMetric.provisionalThresholds.good,
    protocol.headlineMetric.provisionalThresholds.critical,
    protocol.headlineMetric.direction
  )
  const confidenceScore = round(clamp(captureQualityScore * 0.7 + clamp(frames.length / 30, 0.3, 1) * 0.3, 0, 1), 2)
  const validityStatus: ObjectiveValidityStatus =
    captureQualityScore < 0.5 ? 'invalid_saved' : confidenceScore < 0.65 ? 'low_confidence' : 'accepted'

  const measurements: ObjectiveTestMeasurement[] = [
    {
      key: protocol.headlineMetric.key,
      label: protocol.headlineMetric.label,
      value: batteryScore,
      unit: 'pts',
      direction: 'higher_better',
      isHeadline: true,
      subtestKey: subtestKey || undefined,
    },
    { key: 'ankle_dorsiflexion_deg', label: 'Ankle dorsiflexion', value: ankleDorsiflexionDeg, unit: 'deg', direction: 'higher_better', subtestKey: 'ankle_dorsiflexion' },
    { key: 'squat_depth_ratio', label: 'Squat depth ratio', value: squatDepthRatio, unit: 'ratio', direction: 'lower_better', subtestKey: 'overhead_squat' },
    { key: 'shoulder_flexion_deg', label: 'Shoulder flexion', value: shoulderFlexionDeg, unit: 'deg', direction: 'higher_better', subtestKey: 'shoulder_flexion' },
    { key: 'fingertip_to_ankle_ratio', label: 'Toe touch ratio', value: fingertipToAnkleRatio, unit: 'ratio', direction: 'lower_better', subtestKey: 'toe_touch_hinge' },
    { key: 'hip_hinge_score', label: 'Hinge score', value: hingeScore, unit: 'pts', direction: 'higher_better', subtestKey: 'toe_touch_hinge' },
  ]

  return {
    protocolId: 'mobility_battery',
    protocolVersion: 'mobility_battery_v1_ai',
    classification,
    summary:
      classification === 'Good'
        ? 'AI mobility battery found enough range and control to keep progressing normally.'
        : classification === 'Critical'
          ? 'AI mobility battery found clear range or control limits. Bias the plan toward movement quality first.'
          : 'AI mobility battery found a few movement limits worth addressing in the plan.',
    confidenceScore,
    captureQualityScore,
    validityStatus,
    measurements,
    headlineMetric: measurements[0],
    resultsJson: {
      subtest: subtestKey || 'composite',
      sub_scores: subScores,
    },
    metadata: { ai_mode: 'pose_landmarker_v1' },
    qualityFlags: captureQualityScore < 0.7 ? ['Mobility scoring would be stronger with clearer full-body framing.'] : [],
    safetyFlags: [],
    sampleCount: frames.length,
  }
}

function analyzeSprint(frames: PoseFrameFeature[], captureQualityScore: number): ObjectiveProtocolAnalysisResult {
  const protocol = getObjectiveProtocol('sprint_10m')
  if (!protocol) throw new Error('sprint-protocol-missing')

  const xValues = frames.map((frame) => frame.hipCenterX)
  const direction = xValues[xValues.length - 1] >= xValues[0] ? 1 : -1
  const startThreshold = direction === 1 ? 0.2 : 0.8
  const finishThreshold = direction === 1 ? 0.8 : 0.2
  const startIndex = frames.findIndex((frame, index) => {
    if (index < 1) return false
    const previous = frames[index - 1]
    return Math.abs(frame.hipCenterX - previous.hipCenterX) > 0.004 && (direction === 1 ? frame.hipCenterX >= startThreshold : frame.hipCenterX <= startThreshold)
  })
  const finishIndex = frames.findIndex((frame, index) => index > startIndex && (direction === 1 ? frame.hipCenterX >= finishThreshold : frame.hipCenterX <= finishThreshold))
  const sprintMs =
    startIndex >= 0 && finishIndex >= 0
      ? round((frames[finishIndex].timeSec - frames[startIndex].timeSec) * 1000)
      : round((frames[frames.length - 1]?.timeSec || 0) * 1000)
  const firstStepIndex = frames.findIndex((frame, index) => index > startIndex && Math.abs(frame.leftAnkleX - frame.rightAnkleX) > 0.08)
  const firstStepTimeMs =
    startIndex >= 0 && firstStepIndex >= 0
      ? round((frames[firstStepIndex].timeSec - frames[startIndex].timeSec) * 1000)
      : null
  const ankleSpread = frames.map((frame) => Math.abs(frame.leftAnkleX - frame.rightAnkleX))
  const stepCount = detectPeaks(ankleSpread).length
  const classification = classifyFromThresholds(
    sprintMs,
    protocol.headlineMetric.provisionalThresholds.good,
    protocol.headlineMetric.provisionalThresholds.critical,
    protocol.headlineMetric.direction
  )
  const confidenceScore = round(
    clamp(
      captureQualityScore * 0.55 +
        clamp(Math.abs(xValues[xValues.length - 1] - xValues[0]) / 0.6, 0.25, 1) * 0.25 +
        clamp(startIndex >= 0 && finishIndex >= 0 ? 1 : 0.2, 0.2, 1) * 0.2,
      0,
      1
    ),
    2
  )
  const validityStatus: ObjectiveValidityStatus =
    captureQualityScore < 0.5 || startIndex < 0 || finishIndex < 0 ? 'invalid_saved' : confidenceScore < 0.62 ? 'low_confidence' : 'accepted'

  const measurements: ObjectiveTestMeasurement[] = [
    { key: protocol.headlineMetric.key, label: protocol.headlineMetric.label, value: sprintMs, unit: 'ms', direction: 'lower_better', isHeadline: true },
    { key: 'first_step_time_ms', label: 'First-step time', value: firstStepTimeMs || 0, unit: 'ms', direction: 'lower_better' },
    { key: 'step_count_10m', label: 'Step count', value: stepCount, unit: 'count', direction: 'target_band' },
  ]

  return {
    protocolId: 'sprint_10m',
    protocolVersion: 'sprint_10m_v1_ai',
    classification,
    summary:
      classification === 'Good'
        ? 'AI sprint timing pilot captured a usable acceleration signal.'
        : classification === 'Critical'
          ? 'AI sprint timing pilot found a slower acceleration signal. Re-check only if the setup was clean.'
          : 'AI sprint timing pilot captured a usable but moderate speed signal.',
    confidenceScore,
    captureQualityScore,
    validityStatus,
    measurements,
    headlineMetric: measurements[0],
    resultsJson: { direction, start_index: startIndex, finish_index: finishIndex },
    metadata: { ai_mode: 'pose_landmarker_v1' },
    qualityFlags: captureQualityScore < 0.7 ? ['Speed timing works best when the whole lane is clearly visible.'] : [],
    safetyFlags: [],
    sampleCount: frames.length,
  }
}

function analyzeAgility(frames: PoseFrameFeature[], captureQualityScore: number): ObjectiveProtocolAnalysisResult {
  const protocol = getObjectiveProtocol('agility_505')
  if (!protocol) throw new Error('agility-protocol-missing')

  const xSeries = frames.map((frame) => frame.hipCenterX)
  const velocities = xSeries.slice(1).map((value, index) => value - xSeries[index])
  const startIndex = velocities.findIndex((velocity) => Math.abs(velocity) > 0.004)
  let turnIndex = -1
  for (let index = 1; index < velocities.length; index += 1) {
    const previous = velocities[index - 1]
    const current = velocities[index]
    if (Math.sign(previous) !== 0 && Math.sign(current) !== 0 && Math.sign(previous) !== Math.sign(current)) {
      turnIndex = index
      break
    }
  }
  const finishIndex = velocities.findIndex((velocity, index) => index > turnIndex && Math.abs(velocity) > 0.004 && Math.sign(velocity) === Math.sign(velocities[startIndex] || 1))
  const agilityMs =
    startIndex >= 0 && turnIndex >= 0 && finishIndex >= 0
      ? round((frames[finishIndex].timeSec - frames[startIndex].timeSec) * 1000)
      : round((frames[frames.length - 1]?.timeSec || 0) * 1000)
  const preTurn = turnIndex >= 0 ? frames.slice(Math.max(turnIndex - 5, 0), turnIndex) : []
  const postTurn = turnIndex >= 0 ? frames.slice(turnIndex, Math.min(turnIndex + 5, frames.length)) : []
  const turnAsymmetryPercent =
    preTurn.length && postTurn.length
      ? round(
          Math.abs(average(preTurn.map((frame) => frame.leftKneeAngle - frame.rightKneeAngle)) - average(postTurn.map((frame) => frame.leftKneeAngle - frame.rightKneeAngle))) /
            180 *
            100,
          1
        )
      : 0
  const decelScore = round(clamp(100 - standardDeviation(postTurn.map((frame) => frame.trunkLeanDeg)) * 6 - turnAsymmetryPercent * 1.5, 0, 100))
  const classification = classifyFromThresholds(
    agilityMs,
    protocol.headlineMetric.provisionalThresholds.good,
    protocol.headlineMetric.provisionalThresholds.critical,
    protocol.headlineMetric.direction
  )
  const confidenceScore = round(
    clamp(
      captureQualityScore * 0.55 +
        clamp(turnIndex >= 0 ? 1 : 0.2, 0.2, 1) * 0.25 +
        clamp(finishIndex >= 0 ? 1 : 0.2, 0.2, 1) * 0.2,
      0,
      1
    ),
    2
  )
  const validityStatus: ObjectiveValidityStatus =
    captureQualityScore < 0.5 || turnIndex < 0 ? 'invalid_saved' : confidenceScore < 0.62 ? 'low_confidence' : 'accepted'
  const measurements: ObjectiveTestMeasurement[] = [
    { key: protocol.headlineMetric.key, label: protocol.headlineMetric.label, value: agilityMs, unit: 'ms', direction: 'lower_better', isHeadline: true },
    { key: 'left_turn_vs_right_turn_asymmetry_percent', label: 'Turn asymmetry', value: turnAsymmetryPercent, unit: '%', direction: 'lower_better' },
    { key: 'turn_quality_score', label: 'Turn quality', value: decelScore, unit: 'pts', direction: 'higher_better' },
  ]

  return {
    protocolId: 'agility_505',
    protocolVersion: 'agility_505_v1_ai',
    classification,
    summary:
      classification === 'Good'
        ? 'AI agility timing pilot captured a clean turn and return path.'
        : classification === 'Critical'
          ? 'AI agility timing pilot saw a slow or unstable turn. Re-check only if the setup was clean.'
          : 'AI agility timing pilot captured a moderate change-of-direction signal.',
    confidenceScore,
    captureQualityScore,
    validityStatus,
    measurements,
    headlineMetric: measurements[0],
    resultsJson: { start_index: startIndex, turn_index: turnIndex, finish_index: finishIndex },
    metadata: { ai_mode: 'pose_landmarker_v1' },
    qualityFlags: captureQualityScore < 0.7 ? ['Agility timing needs a very clear turn point and full-body visibility.'] : [],
    safetyFlags: [],
    sampleCount: frames.length,
  }
}

export async function analyzeObjectiveVideoProtocol(input: ObjectiveVideoAnalysisInput) {
  const protocol = getObjectiveProtocol(input.protocolId)
  if (!protocol) throw new Error('objective-protocol-not-found')

  const poseData = await collectPoseFrames(input.file)
  const captureQualityScore = buildQualityScore(
    poseData.durationSec,
    poseData.analyzedFrames,
    poseData.trackedFrames,
    poseData.fullBodyFrames
  )

  if (!poseData.frames.length) {
    return {
      protocolId: input.protocolId,
      protocolVersion: `${input.protocolId}_v1_ai`,
      classification: 'Critical',
      summary: `${protocol.displayName} could not find enough visible body frames to score the clip.`,
      confidenceScore: 0.2,
      captureQualityScore: 0.2,
      validityStatus: 'invalid_saved' as const,
      measurements: [
        {
          key: protocol.headlineMetric.key,
          label: protocol.headlineMetric.label,
          value: 0,
          unit: protocol.headlineMetric.unit,
          direction: protocol.headlineMetric.direction,
          isHeadline: true,
        },
      ],
      headlineMetric: {
        key: protocol.headlineMetric.key,
        label: protocol.headlineMetric.label,
        value: 0,
        unit: protocol.headlineMetric.unit,
        direction: protocol.headlineMetric.direction,
        isHeadline: true,
      },
      resultsJson: {
        error: 'no_pose_frames',
      },
      metadata: {
        ai_mode: 'pose_landmarker_v1',
      },
      qualityFlags: ['The full body was not visible consistently enough for AI scoring.'],
      safetyFlags: [],
      sampleCount: 0,
    }
  }

  switch (input.protocolId) {
    case 'balance_single_leg':
      return analyzeBalance(poseData.frames, input.side, captureQualityScore, poseData.durationSec)
    case 'jump_landing_control':
      return analyzeJump(poseData.frames, captureQualityScore)
    case 'mobility_battery':
      return analyzeMobility(poseData.frames, input.subtestKey, captureQualityScore)
    case 'sprint_10m':
      return analyzeSprint(poseData.frames, captureQualityScore)
    case 'agility_505':
      return analyzeAgility(poseData.frames, captureQualityScore)
    default:
      throw new Error('objective-protocol-not-supported')
  }
}

export function analyzeBreathingRecoveryInput(
  input: BreathingRecoveryInput
): ObjectiveProtocolAnalysisResult {
  const protocol = getObjectiveProtocol('breathing_recovery')
  if (!protocol) throw new Error('breathing-protocol-missing')

  const hasHr = typeof input.peakHrBpm === 'number' && typeof input.hr60Bpm === 'number'
  const hrr = hasHr ? Math.max((input.peakHrBpm || 0) - (input.hr60Bpm || 0), 0) : 0
  const classification = hasHr
    ? classifyFromThresholds(
        hrr,
        protocol.headlineMetric.provisionalThresholds.good,
        protocol.headlineMetric.provisionalThresholds.critical,
        protocol.headlineMetric.direction
      )
    : 'Risk'
  const symptomPenalty = input.symptomFlags.length ? 0.2 : 0
  const confidenceScore = hasHr ? round(clamp(0.82 - symptomPenalty, 0, 1), 2) : 0.25
  const captureQualityScore = hasHr ? 0.85 : 0.4
  const validityStatus: ObjectiveValidityStatus = hasHr ? 'accepted' : 'supplemental'
  const measurements: ObjectiveTestMeasurement[] = [
    {
      key: protocol.headlineMetric.key,
      label: protocol.headlineMetric.label,
      value: hrr,
      unit: 'bpm',
      direction: 'higher_better',
      isHeadline: true,
    },
    {
      key: 'peak_hr_bpm',
      label: 'Peak HR',
      value: input.peakHrBpm || 0,
      unit: 'bpm',
      direction: 'target_band',
    },
    {
      key: 'hr_60s_bpm',
      label: 'HR at 60s',
      value: input.hr60Bpm || 0,
      unit: 'bpm',
      direction: 'lower_better',
    },
    {
      key: 'perceived_breathlessness_delta',
      label: 'Breathlessness delta',
      value: input.perceivedBreathlessnessDelta || 0,
      unit: 'pts',
      direction: 'lower_better',
    },
  ]

  return {
    protocolId: 'breathing_recovery',
    protocolVersion: 'breathing_recovery_v1_ai',
    classification,
    summary: hasHr
      ? `AI-assisted recovery fusion captured a 60-second HR recovery of ${hrr} bpm.`
      : 'This breathing recovery session is saved as supplemental because no heart-rate source was attached.',
    confidenceScore,
    captureQualityScore,
    validityStatus,
    measurements,
    headlineMetric: measurements[0],
    resultsJson: {
      symptom_flags: input.symptomFlags,
    },
    metadata: {
      ai_mode: 'sensor_fusion_v1',
      hr_attached: hasHr,
    },
    qualityFlags: hasHr ? [] : ['Attach heart-rate data if you want this protocol to influence decisions.'],
    safetyFlags: [...input.symptomFlags],
    sampleCount: hasHr ? 2 : 0,
  }
}
