import {
  RehabInput, RehabOutput, RehabStage, RehabHistoryEntry,
  InjuryType, InjuryContext, VisionFault
} from './types';

/**
 * CREEDA V5: REHAB ENGINE
 * Injury-Aware 5-Stage State Machine
 * 
 * Stages:
 *   1: Acute        — Pain > 6, rest-only protocols
 *   2: Isometric    — Pain 4-6, static holds & isometric loading
 *   3: Strength     — Pain < 4, progressive resistance
 *   4: Dynamic      — Controlled explosive movement
 *   5: Return to Sport — Sport-specific integration
 * 
 * Progression Rules:
 *   - 3 consecutive days of improvement → progress
 *   - Pain spike (increase ≥ 2 from average) → regress
 *   - Poor movement quality (< 50) → hold
 */

// ─── INJURY-SPECIFIC EXERCISE PROTOCOLS ──────────────────────────────────

const INJURY_PROTOCOLS: Record<string, Record<number, RehabStage['exercises']>> = {
  HAMSTRING: {
    1: {
      mobility: ['Gentle hamstring nerve glide', 'Supine hip flexor stretch', 'Ankle circles'],
      strength: [],
      control: ['Diaphragmatic breathing', 'Pelvic tilts'],
    },
    2: {
      mobility: ['Standing hamstring stretch (30s holds)', 'Hip CARs'],
      strength: ['Isometric hamstring bridge (5s holds x 10)', 'Single-leg glute bridge (isometric)'],
      control: ['Balance board stance', 'Single-leg stand (eyes closed)'],
    },
    3: {
      mobility: ['Nordic hamstring prep (eccentric control)', 'Dynamic hip flexor stretch'],
      strength: ['Romanian deadlift (light)', 'Single-leg hamstring curl', 'Step-ups with control'],
      control: ['Single-leg RDL', 'Lateral lunges'],
    },
    4: {
      mobility: ['Dynamic warm-up sequence', 'A-skips progression'],
      strength: ['Split squat jumps (controlled)', 'Box jumps (low)', 'Kettlebell swings'],
      control: ['Acceleration drills (50%→70%)', 'Deceleration training', 'Change of direction'],
    },
    5: {
      mobility: ['Sport-specific dynamic warm-up'],
      strength: ['Full sprint mechanics', 'Plyometric circuits'],
      control: ['Match simulation drills', 'Reactive agility', 'Full training integration'],
    },
  },
  ACL: {
    1: {
      mobility: ['Gentle knee bending (pain-free range)', 'Ankle pumps', 'Quad sets'],
      strength: [],
      control: ['Patellar mobilisation', 'Straight leg raises'],
    },
    2: {
      mobility: ['Wall slides (knee flexion)', 'Heel slides'],
      strength: ['Isometric quad sets (5s x 15)', 'Isometric hamstring co-contraction', 'Calf raises'],
      control: ['Weight shifting exercises', 'Mini squats (quarter range)'],
    },
    3: {
      mobility: ['Full ROM cycling', 'Step-overs'],
      strength: ['Goblet squat', 'Leg press (controlled)', 'Hamstring curls'],
      control: ['Single-leg balance', 'Lateral band walks', 'Step-ups/step-downs'],
    },
    4: {
      mobility: ['Dynamic warm-up', 'Linear jogging progression'],
      strength: ['Single-leg squat', 'Drop landings', 'Lateral lunges with load'],
      control: ['Agility ladder', 'Cutting drills (planned)', 'Deceleration training'],
    },
    5: {
      mobility: ['Sport-specific warm-up'],
      strength: ['Reactive plyometrics', 'Sport-specific power drills'],
      control: ['Unplanned cutting drills', 'Full match simulation', 'Contact preparation'],
    },
  },
  ANKLE: {
    1: {
      mobility: ['RICE protocol', 'Gentle ankle circles', 'Towel scrunches'],
      strength: [],
      control: ['Alphabet tracing with foot', 'Toe raises (seated)'],
    },
    2: {
      mobility: ['Calf stretching (wall)', 'Ankle dorsiflexion mobilisation'],
      strength: ['Isometric calf raise (5s holds)', 'Resistance band inversion/eversion'],
      control: ['Single-leg balance (flat surface)', 'Weight shifting'],
    },
    3: {
      mobility: ['Deep squat ankle mobility', 'Banded ankle dorsiflexion'],
      strength: ['Single-leg calf raise', 'Resistance band 4-way ankle', 'Step-ups'],
      control: ['Balance board work', 'Single-leg hops (in place)'],
    },
    4: {
      mobility: ['Dynamic warm-up with ankle focus'],
      strength: ['Box jumps', 'Lateral bounds', 'Single-leg landing drills'],
      control: ['Agility drills', 'Cutting movements', 'Reactive balance'],
    },
    5: {
      mobility: ['Sport-specific warm-up'],
      strength: ['Full plyometric circuits', 'Sprint mechanics'],
      control: ['Match simulation', 'Uneven surface training', 'Full competition prep'],
    },
  },
  SHOULDER: {
    1: {
      mobility: ['Pendulum swings', 'Passive shoulder flexion', 'Scapular squeezes'],
      strength: [],
      control: ['Diaphragmatic breathing', 'Postural correction'],
    },
    2: {
      mobility: ['Wall slides', 'Cross-body stretch', 'Doorway stretch'],
      strength: ['Isometric external rotation', 'Isometric shoulder flexion (wall)', 'Scapular push-ups'],
      control: ['Rhythmic stabilisation', 'Ball on wall circles'],
    },
    3: {
      mobility: ['Sleeper stretch', 'Lat stretch', 'Thoracic rotation'],
      strength: ['Band pull-aparts', 'External rotation with band', 'Rows (light)'],
      control: ['Turkish get-up (light)', 'Overhead carries'],
    },
    4: {
      mobility: ['Dynamic shoulder warm-up', 'PNF patterns'],
      strength: ['Push-ups (full)', 'Overhead press (moderate)', 'Face pulls'],
      control: ['Throwing progression', 'Overhead sport movements (controlled)'],
    },
    5: {
      mobility: ['Sport-specific warm-up'],
      strength: ['Full overhead training', 'Sport-specific loading'],
      control: ['Full competition movements', 'Reactive drills', 'Match intensity'],
    },
  },
};

// Default protocol for any injury type not specifically mapped
const DEFAULT_PROTOCOL: Record<number, RehabStage['exercises']> = {
  1: {
    mobility: ['Gentle range of motion exercises', 'Joint circles', 'Light stretching'],
    strength: [],
    control: ['Breathing exercises', 'Body awareness drills'],
  },
  2: {
    mobility: ['Active range of motion', 'Controlled stretching'],
    strength: ['Isometric holds (pain-free)', 'Bodyweight static exercises'],
    control: ['Balance work', 'Proprioception drills'],
  },
  3: {
    mobility: ['Dynamic stretching', 'Foam rolling'],
    strength: ['Progressive resistance exercises', 'Compound movements (light)'],
    control: ['Single-leg stability', 'Movement quality drills'],
  },
  4: {
    mobility: ['Sport-specific mobility', 'Dynamic warm-up'],
    strength: ['Plyometric introduction', 'Power movements'],
    control: ['Agility drills', 'Change of direction'],
  },
  5: {
    mobility: ['Competition warm-up'],
    strength: ['Full sport-specific training'],
    control: ['Match simulation', 'Full integration'],
  },
};

const STAGE_LABELS: Record<number, RehabStage['label']> = {
  1: 'Acute',
  2: 'Isometric',
  3: 'Strength',
  4: 'Dynamic',
  5: 'Return to Sport',
};

// ─── MAIN REHAB ENGINE ───────────────────────────────────────────────────

export function calculateRehab(input: RehabInput): RehabOutput {
  const {
    painScore,
    movementQuality,
    injuryContext,
    rehabHistory,
    visionFaults,
  } = input;

  // 1. Determine current stage based on pain thresholds
  let targetPhase = determinePhaseFromPain(painScore);

  // 2. Check progression/regression from history
  const lastEntries = rehabHistory.slice(-5); // Most recent entries
  const currentPhase = lastEntries.length > 0 ? lastEntries[lastEntries.length - 1].stage : targetPhase;

  let shouldProgress = false;
  let shouldRegress = false;
  let shouldHold = false;
  let reasoning = '';

  // 3. Progression: 3 consecutive days of improvement
  if (lastEntries.length >= 3) {
    const last3 = lastEntries.slice(-3);
    const allImproving = last3.every((entry, i) => {
      if (i === 0) return true;
      return entry.pain_score <= last3[i - 1].pain_score;
    });
    const avgPainLast3 = last3.reduce((sum, e) => sum + e.pain_score, 0) / 3;

    if (allImproving && avgPainLast3 < painThresholdForPhase(currentPhase + 1) && currentPhase < 5) {
      shouldProgress = true;
      targetPhase = Math.min(5, currentPhase + 1) as 1 | 2 | 3 | 4 | 5;
      reasoning = `3 consecutive days of improvement detected (avg pain ${avgPainLast3.toFixed(1)}). Progressing to ${STAGE_LABELS[targetPhase]}.`;
    }
  }

  // 4. Pain spike → regress
  if (lastEntries.length >= 2) {
    const prevAvgPain = lastEntries.slice(-3, -1).reduce((sum, e) => sum + e.pain_score, 0) / Math.max(1, lastEntries.slice(-3, -1).length);
    if (painScore >= prevAvgPain + 2 && currentPhase > 1) {
      shouldRegress = true;
      shouldProgress = false;
      targetPhase = Math.max(1, currentPhase - 1) as 1 | 2 | 3 | 4 | 5;
      reasoning = `Pain spike detected (${painScore} vs avg ${prevAvgPain.toFixed(1)}). Regressing to ${STAGE_LABELS[targetPhase]} for safety.`;
    }
  }

  // 5. Poor movement quality → hold
  if (movementQuality < 50 && !shouldRegress) {
    shouldHold = true;
    shouldProgress = false;
    targetPhase = currentPhase as 1 | 2 | 3 | 4 | 5;
    reasoning = `Movement quality below threshold (${movementQuality}/100). Holding at ${STAGE_LABELS[targetPhase]} until quality improves.`;
  }

  // 6. Vision fault override: critical biomechanical faults → hold or regress
  const criticalFaults = visionFaults.filter(f => f.severity === 'high');
  if (criticalFaults.length > 0 && !shouldRegress) {
    shouldHold = true;
    shouldProgress = false;
    reasoning = `Critical movement fault detected: ${criticalFaults[0].fault}. Holding at ${STAGE_LABELS[targetPhase]} and prescribing corrective drills.`;
  }

  // 7. Default reasoning
  if (!reasoning) {
    if (targetPhase === currentPhase) {
      reasoning = `Maintaining ${STAGE_LABELS[targetPhase]} phase. Continue current protocol and monitor progress.`;
    } else {
      reasoning = `Pain assessment indicates ${STAGE_LABELS[targetPhase]} phase.`;
    }
  }

  // 8. Calculate days in current phase
  let daysInPhase = 0;
  for (let i = lastEntries.length - 1; i >= 0; i--) {
    if (lastEntries[i].stage === targetPhase) daysInPhase++;
    else break;
  }
  if (targetPhase !== currentPhase) daysInPhase = 0; // Reset on phase change

  // 9. Get exercises for injury type + phase
  const exercises = getExercisesForPhase(injuryContext.type, targetPhase, visionFaults);

  const stage: RehabStage = {
    phase: targetPhase as 1 | 2 | 3 | 4 | 5,
    label: STAGE_LABELS[targetPhase],
    exercises,
    progressionReadiness: shouldProgress || (daysInPhase >= 3 && painScore < painThresholdForPhase(targetPhase + 1)),
    daysInPhase,
    injuryContext,
  };

  return {
    stage,
    shouldProgress,
    shouldRegress,
    shouldHold,
    reasoning,
  };
}

// ─── HELPERS ─────────────────────────────────────────────────────────────

function determinePhaseFromPain(painScore: number): 1 | 2 | 3 | 4 | 5 {
  if (painScore > 6) return 1;      // Acute
  if (painScore >= 4) return 2;     // Isometric
  if (painScore >= 2) return 3;     // Strength
  if (painScore >= 1) return 4;     // Dynamic
  return 5;                          // Return to Sport
}

function painThresholdForPhase(phase: number): number {
  switch (phase) {
    case 1: return 10; // Always allowed
    case 2: return 7;
    case 3: return 5;
    case 4: return 3;
    case 5: return 2;
    default: return 10;
  }
}

function getExercisesForPhase(
  injuryType: InjuryType,
  phase: number,
  visionFaults: VisionFault[]
): RehabStage['exercises'] {
  const injuryKey = injuryType || '';
  const protocols = INJURY_PROTOCOLS[injuryKey] || DEFAULT_PROTOCOL;
  const exercises = protocols[phase] || DEFAULT_PROTOCOL[phase] || DEFAULT_PROTOCOL[1];

  // Inject corrective drills from vision faults
  const correctives = visionFaults
    .filter(f => f.correctiveDrills.length > 0)
    .flatMap(f => f.correctiveDrills)
    .slice(0, 3);

  if (correctives.length > 0) {
    return {
      ...exercises,
      control: [...exercises.control, ...correctives],
    };
  }

  return exercises;
}

// ─── INJURY DETECTION FROM CONTEXT ───────────────────────────────────────

/**
 * Infer injury context from pain, soreness, vision faults, and sport context
 */
export function inferInjuryContext(
  painScore: number,
  soreness: number,
  sport: string,
  visionFaults: VisionFault[],
  rehabHistory: RehabHistoryEntry[],
  baselineInjuries: string[] = []
): InjuryContext {
  // If currently in rehab, continue with same injury type
  if (rehabHistory.length > 0) {
    const latest = rehabHistory[rehabHistory.length - 1];
    if (latest.injury_type && latest.pain_score > 0) {
      return { type: latest.injury_type, confidence: 0.85 };
    }
  }

  const baselineInjury = inferBaselineInjuryType(baselineInjuries)
  if (baselineInjury) {
    return { type: baselineInjury, confidence: painScore >= 3 ? 0.72 : 0.58 }
  }

  // If pain is low and no prior injury, no injury context
  if (painScore <= 2 && soreness <= 2) {
    return { type: null, confidence: 0.9 };
  }

  // Infer from vision faults
  for (const fault of visionFaults) {
    if (fault.riskMapping.toLowerCase().includes('acl') || fault.riskMapping.toLowerCase().includes('knee')) {
      return { type: 'ACL', confidence: 0.6 + (fault.severity === 'high' ? 0.2 : 0) };
    }
    if (fault.riskMapping.toLowerCase().includes('hamstring')) {
      return { type: 'HAMSTRING', confidence: 0.6 };
    }
    if (fault.riskMapping.toLowerCase().includes('ankle')) {
      return { type: 'ANKLE', confidence: 0.6 };
    }
    if (fault.riskMapping.toLowerCase().includes('shoulder')) {
      return { type: 'SHOULDER', confidence: 0.5 };
    }
  }

  // Infer from sport + high pain
  if (painScore >= 4) {
    const sportLower = (sport || '').toLowerCase();
    if (sportLower.includes('football') || sportLower.includes('sprint') || sportLower.includes('athletics')) {
      return { type: 'HAMSTRING', confidence: 0.4 };
    }
    if (sportLower.includes('basketball') || sportLower.includes('volleyball')) {
      return { type: 'ANKLE', confidence: 0.4 };
    }
    if (sportLower.includes('cricket') || sportLower.includes('tennis') || sportLower.includes('badminton')) {
      return { type: 'SHOULDER', confidence: 0.4 };
    }
    return { type: 'KNEE', confidence: 0.3 };
  }

  return { type: null, confidence: 0.7 };
}

function inferBaselineInjuryType(regions: string[]): InjuryType {
  for (const region of regions) {
    const normalized = region.toLowerCase()
    if (normalized.includes('hamstring')) return 'HAMSTRING'
    if (normalized.includes('knee')) return 'KNEE'
    if (normalized.includes('ankle') || normalized.includes('foot') || normalized.includes('achilles')) return 'ANKLE'
    if (normalized.includes('shoulder') || normalized.includes('elbow') || normalized.includes('wrist') || normalized.includes('hand')) return 'SHOULDER'
    if (normalized.includes('lower back') || normalized.includes('upper back') || normalized.includes('back') || normalized.includes('neck')) return 'LOWER_BACK'
    if (normalized.includes('hip') || normalized.includes('groin') || normalized.includes('quad') || normalized.includes('oblique') || normalized.includes('side')) return 'GROIN'
    if (normalized.includes('calf') || normalized.includes('shin')) return 'CALF'
  }

  return null
}
