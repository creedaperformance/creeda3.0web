import test from 'node:test'
import assert from 'node:assert/strict'

import {
  allExerciseLibraryItems,
  buildExecutionSession,
  buildSkillIntelligenceSnapshot,
  queryExercises,
  recommendExercises,
  type ExerciseRecommendationContext,
} from './index'

function createContext(overrides: Partial<ExerciseRecommendationContext> = {}): ExerciseRecommendationContext {
  return {
    goal: 'strength',
    sport: 'football',
    position: 'midfielder',
    ageBand: 'adult',
    trainingAge: 'intermediate',
    currentFitnessLevel: 'competitive',
    availableEquipment: ['bodyweight', 'band', 'dumbbell', 'barbell'],
    availableEnvironment: ['gym', 'field', 'home'],
    injuryHistory: [],
    currentPainAreas: [],
    activeInjuries: [],
    sorenessAreas: [],
    fatigueLevel: 'moderate',
    readinessBand: 'high',
    readinessScore: 82,
    sleepQuality: 'good',
    missedSessionsInLast14Days: 0,
    complianceScore: 0.9,
    sessionDurationPreferenceMinutes: 60,
    trainingDaysPerWeek: 4,
    preferredTrainingEnvironment: 'gym',
    skillConfidence: 'confident',
    bodyRegionsToImprove: ['posterior_chain', 'acceleration'],
    currentLimitations: [],
    primaryMotivation: 'performance',
    participationProfile: 'competitive',
    goalTags: ['strength', 'athletic_performance'],
    painFlags: [],
    rehabFocusAreas: [],
    ...overrides,
  }
}

test('exercise library is curated, rich, and scalable', () => {
  assert.ok(allExerciseLibraryItems.length >= 400, 'expected at least 400 exercise records')

  const ids = new Set(allExerciseLibraryItems.map((item) => item.id))
  const slugs = new Set(allExerciseLibraryItems.map((item) => item.slug))

  assert.equal(ids.size, allExerciseLibraryItems.length, 'exercise ids must be unique')
  assert.equal(slugs.size, allExerciseLibraryItems.length, 'exercise slugs must be unique')

  const categories = new Set(allExerciseLibraryItems.map((item) => item.category))
  for (const expected of ['strength', 'mobility', 'conditioning', 'recovery', 'rehab', 'warmup', 'cooldown'] as const) {
    assert.ok(categories.has(expected), `expected category ${expected} to exist`)
  }

  const sample = allExerciseLibraryItems.find((item) => item.slug === 'db-goblet-squat')
  assert.ok(sample, 'expected a representative foundational lift')
  assert.ok(sample?.instructions.length >= 3, 'exercise should have detailed instructions')
  assert.ok(sample?.coachingCues.length >= 2, 'exercise should have coaching cues')
  assert.ok(sample?.media.videoUrl.length > 0, 'exercise should include media placeholder')
})

test('recommendation engine prioritizes safe rehab-aware alternatives under shoulder pain and low readiness', () => {
  const context = createContext({
    goal: 'return_to_play',
    sport: 'cricket',
    position: 'fast bowler',
    readinessBand: 'low',
    readinessScore: 34,
    fatigueLevel: 'high',
    activeInjuries: ['shoulder_irritability'],
    currentPainAreas: ['shoulder'],
    sorenessAreas: ['shoulder'],
    rehabFocusAreas: ['rotator_cuff', 'scapular_control'],
    availableEquipment: ['bodyweight', 'band'],
    preferredTrainingEnvironment: 'home',
    availableEnvironment: ['home'],
    goalTags: ['return_to_play', 'rehab', 'recovery'],
  })

  const recommendations = recommendExercises({
    context,
    blockType: 'rehab',
    limit: 12,
  })

  assert.ok(recommendations.length > 0, 'expected rehab recommendations')
  assert.ok(
    recommendations.every((entry) => !entry.exercise.name.toLowerCase().includes('overhead press')),
    'unsafe overhead work should be filtered out'
  )
  assert.ok(
    recommendations.some((entry) =>
      entry.exercise.rehabTags.some((tag) =>
        ['shoulder_resilience', 'scapular_control', 'rotator_cuff'].includes(tag)
      )
    ),
    'shoulder rehab emphasis should appear in recommendations'
  )
  assert.ok(
    recommendations.some((entry) => entry.explanation.some((reason) => reason.includes('shoulder pain'))),
    'recommendations should explain pain-aware selection'
  )
})

test('session builder composes a guided rehab-aware day from readiness and constraints', () => {
  const context = createContext({
    goal: 'athletic_performance',
    sport: 'badminton',
    position: 'singles',
    readinessBand: 'moderate',
    readinessScore: 58,
    fatigueLevel: 'moderate',
    activeInjuries: ['ankle_sprain_history'],
    currentPainAreas: ['ankle'],
    sorenessAreas: ['calf'],
    rehabFocusAreas: ['ankle_stability'],
    availableEquipment: ['bodyweight', 'band', 'dumbbell'],
    availableEnvironment: ['home', 'court'],
    preferredTrainingEnvironment: 'court',
    bodyRegionsToImprove: ['single_leg_control', 'reactive_footwork'],
  })

  const session = buildExecutionSession({
    athleteId: 'athlete_123',
    context,
    mode: 'train_light',
    date: '2026-04-20',
    source: 'test',
  })

  assert.equal(session.mode, 'train_light')
  assert.ok(session.blocks.some((block) => block.type === 'warmup'), 'session should include a warmup')
  assert.ok(session.blocks.some((block) => block.type === 'cooldown'), 'session should include a cooldown')
  assert.ok(session.blocks.some((block) => block.type === 'recovery'), 'session should include recovery work')
  assert.ok(session.blocks.some((block) => block.type === 'rehab'), 'session should include rehab when injury context exists')
  assert.ok(session.summary.expectedDurationMinutes > 0, 'session should compute expected duration')
  assert.ok(session.summary.focus.length > 0, 'session should explain focus')
  assert.ok(session.explainability.reasons.length >= 3, 'session should expose explainability reasons')
})

test('position-specific recommendations diverge for football roles', () => {
  const baseContext = createContext({
    goal: 'agility',
    sport: 'football',
    availableEquipment: ['bodyweight', 'band', 'cones'],
    availableEnvironment: ['field', 'court', 'home'],
    preferredTrainingEnvironment: 'field',
    bodyRegionsToImprove: ['change_of_direction', 'speed'],
  })

  const winger = recommendExercises({
    context: { ...baseContext, position: 'winger' },
    blockType: 'main',
    limit: 5,
  })

  const midfielder = recommendExercises({
    context: { ...baseContext, position: 'midfielder' },
    blockType: 'main',
    limit: 5,
  })

  assert.ok(
    winger.some((entry) => entry.exercise.positionTags.includes('winger')),
    'winger recommendations should include winger-specific drills'
  )
  assert.ok(
    midfielder.some((entry) => entry.exercise.positionTags.includes('midfielder')),
    'midfielder recommendations should include midfielder-specific drills'
  )
  assert.notDeepEqual(
    winger.map((entry) => entry.exercise.slug),
    midfielder.map((entry) => entry.exercise.slug),
    'position should materially change ranked recommendations'
  )
})

test('low readiness plus pain converts a hard request into a compact rehab day', () => {
  const context = createContext({
    goal: 'return_to_play',
    sport: 'football',
    position: 'midfielder',
    readinessBand: 'low',
    readinessScore: 32,
    fatigueLevel: 'high',
    sleepQuality: 'poor',
    activeInjuries: ['ankle_sprain'],
    currentPainAreas: ['ankle'],
    sorenessAreas: ['calf'],
    rehabFocusAreas: ['ankle_stability'],
    availableEquipment: ['bodyweight', 'band'],
    availableEnvironment: ['home', 'field'],
    preferredTrainingEnvironment: 'home',
    sessionDurationPreferenceMinutes: 28,
    complianceScore: 0.6,
    participationProfile: 'returning',
  })

  const session = buildExecutionSession({
    athleteId: 'athlete_123',
    context,
    mode: 'train_hard',
    date: '2026-04-21',
    source: 'test',
  })

  assert.equal(session.mode, 'rehab')
  assert.ok(session.blocks.some((block) => block.type === 'rehab'), 'rehab block should be present')
  assert.ok(
    session.blocks.every((block) => block.exercises.length <= 2),
    'short-session preference should trim block volume'
  )
  assert.ok(
    session.summary.expectedDurationMinutes <= 30,
    'compact rehab day should stay near the requested duration'
  )
})

test('exercise query service filters by sport, equipment, and block intent', () => {
  const results = queryExercises({
    sport: 'badminton',
    equipment: 'band',
    blockType: 'rehab',
    search: 'shoulder',
  })

  assert.ok(results.length > 0, 'expected filtered rehab results')
  assert.ok(
    results.every((item) => item.sportTags.includes('badminton')),
    'sport filter should be enforced'
  )
  assert.ok(
    results.every((item) => item.suitableBlocks.includes('rehab')),
    'block filter should be enforced'
  )
  assert.ok(
    results.every((item) => item.equipmentRequired.includes('band')),
    'equipment filter should be enforced'
  )
})

test('skill intelligence converts video faults into plan-ready drill and movement targets', () => {
  const skill = buildSkillIntelligenceSnapshot({
    id: 'report-1',
    userId: 'athlete-1',
    sportId: 'cricket',
    sportLabel: 'Cricket',
    subjectRole: 'athlete',
    subjectPosition: 'fast bowler',
    analyzerFamily: 'bowling_delivery',
    createdAt: '2026-04-22T08:00:00.000Z',
    frameCount: 100,
    warnings: 2,
    positive: 1,
    issuesDetected: ['shoulder_tilt'],
    feedbackLog: [],
    visionFaults: [
      {
        fault: 'Shoulder line is leaking during the delivery phase',
        riskMapping: 'Shoulder and lower-back loading rise when trunk and shoulder alignment collapse at release',
        correctiveDrills: ['Wall slides', 'Half-kneeling anti-rotation press'],
        severity: 'moderate',
        confidence: 0.75,
      },
    ],
    summary: {
      score: 72,
      status: 'watch',
      headline: 'Shoulder line needs cleanup',
      coachSummary: 'Bias the next session toward cleaner trunk and shoulder alignment.',
    },
    recommendations: [
      {
        title: 'Shoulder line needs cleanup',
        reason: 'Shoulder and lower-back loading rise when trunk and shoulder alignment collapse at release',
        drills: ['Wall slides', 'Split-stance medicine-ball throw holds'],
        priority: 'medium',
      },
    ],
  })

  assert.equal(skill.status, 'watch')
  assert.ok(skill.targetedDrills.includes('Wall slides'))
  assert.ok(skill.movementTags.includes('scapular_control'))
  assert.ok(skill.planAdjustment.includes('shoulder line'))
})
