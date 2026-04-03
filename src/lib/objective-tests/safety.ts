import { getObjectiveProtocol } from '@/lib/objective-tests/protocols'
import type { ObjectiveTestType } from '@/lib/objective-tests/types'

export interface ObjectiveSafetyInput {
  protocolId: ObjectiveTestType
  painScore?: number | null
  lowerLimbPainScore?: number | null
  backPainScore?: number | null
  dizziness?: boolean
  feverOrIllness?: boolean
  chestPain?: boolean
  wheezeOrBreathingIssue?: boolean
  unsafeSurface?: boolean
  poorAirQuality?: boolean
  extremeHeat?: boolean
  rehabStage?: number | null
}

export interface ObjectiveSafetyDecision {
  safe: boolean
  reason: string
  alternativeProtocolId?: ObjectiveTestType
}

export function getObjectiveSafetyDecision(input: ObjectiveSafetyInput): ObjectiveSafetyDecision {
  const protocol = getObjectiveProtocol(input.protocolId)
  if (!protocol) return { safe: false, reason: 'Protocol is not configured yet.' }

  if (input.chestPain) {
    return { safe: false, reason: 'Skip testing right now because chest pain needs caution first.' }
  }

  if (input.feverOrIllness) {
    return { safe: false, reason: 'Skip testing right now because illness can distort results and safety.' }
  }

  if (input.dizziness && protocol.family !== 'neural') {
    return {
      safe: false,
      reason: 'Skip this protocol because dizziness makes the movement unsafe today.',
      alternativeProtocolId: 'reaction_tap',
    }
  }

  if (input.unsafeSurface && protocol.captureMode !== 'screen_tap') {
    return {
      safe: false,
      reason: 'The surface or setup does not look safe enough for this movement test.',
      alternativeProtocolId: 'reaction_tap',
    }
  }

  if (input.poorAirQuality && (input.protocolId === 'sprint_10m' || input.protocolId === 'agility_505')) {
    return { safe: false, reason: 'Outdoor speed testing is not a good idea with current air quality.' }
  }

  if (input.extremeHeat && (input.protocolId === 'sprint_10m' || input.protocolId === 'agility_505')) {
    return { safe: false, reason: 'Heat strain is too high for speed testing right now.' }
  }

  if (input.protocolId === 'breathing_recovery' && (input.wheezeOrBreathingIssue || input.dizziness)) {
    return { safe: false, reason: 'Skip the breathing recovery test until breathing symptoms settle.' }
  }

  if (
    (input.protocolId === 'jump_landing_control' || input.protocolId === 'sprint_10m' || input.protocolId === 'agility_505') &&
    ((input.lowerLimbPainScore || 0) >= 4 || (input.backPainScore || 0) >= 4)
  ) {
    return {
      safe: false,
      reason: 'Skip this higher-load protocol because pain is high enough to reduce safety and signal quality.',
      alternativeProtocolId: 'balance_single_leg',
    }
  }

  if ((input.protocolId === 'sprint_10m' || input.protocolId === 'agility_505') && (input.rehabStage || 0) > 0 && (input.rehabStage || 0) < 4) {
    return {
      safe: false,
      reason: 'Speed testing is too aggressive for the current rehab stage.',
      alternativeProtocolId: 'balance_single_leg',
    }
  }

  return { safe: true, reason: `${protocol.displayName} looks safe enough to run.` }
}
