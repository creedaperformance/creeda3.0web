import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { classifyComplaint, refineClassificationWithAnswers } from '@/lib/diagnostics/classifier'
import { evaluateDiagnosticSafety } from '@/lib/diagnostics/guardrails'
import { hasEnoughFollowUpContext, selectFollowUpQuestions } from '@/lib/diagnostics/followup'
import { prescribeMovementTest } from '@/lib/diagnostics/prescription'
import { normalizeDiagnosticAnalysis } from '@/lib/diagnostics/adapter'
import { interpretDiagnosticResult } from '@/lib/diagnostics/interpretation'
import { buildDiagnosticActionPlan } from '@/lib/diagnostics/action-plan'
import { getMovementTestDefinition } from '@/lib/diagnostics/config'
import { trackDiagnosticEvent } from '@/lib/diagnostics/events'
import type {
  ComplaintClassification,
  DiagnosticActionPlanPayload,
  DiagnosticFollowUpAnswer,
  DiagnosticInterpretationPayload,
  DiagnosticRawEnginePayload,
  DiagnosticResultPayload,
  DiagnosticSafetyState,
  DiagnosticSessionStatus,
  MovementScores,
  NormalizedDiagnosticMetrics,
  PrescribedMovementTestPayload,
} from '@/lib/diagnostics/types'

type SupabaseLike = SupabaseClient

type SessionRow = {
  id: string
  user_id: string
  status: DiagnosticSessionStatus
  complaint_text: string
  primary_bucket: ComplaintClassification['primaryBucket']
  secondary_bucket: ComplaintClassification['secondaryBucket']
  body_region: ComplaintClassification['bodyRegion']
  pain_flag: boolean
  severity: number | null
  sport_context: string | null
  classification_json?: ComplaintClassification | null
  created_at: string
  updated_at: string
}

function rowClassification(row: SessionRow): ComplaintClassification {
  if (row.classification_json && typeof row.classification_json === 'object') {
    return row.classification_json
  }

  return {
    primaryBucket: row.primary_bucket,
    secondaryBucket: row.secondary_bucket,
    bodyRegion: row.body_region,
    painFlag: Boolean(row.pain_flag),
    severity: row.severity,
    severityFlag:
      row.severity === null ? 'none' : row.severity >= 8 ? 'urgent' : row.severity >= 6 ? 'high' : row.severity >= 3 ? 'moderate' : 'mild',
    activityTrigger: null,
    side: 'unknown',
    sportRelevance: row.sport_context,
    confidence: 0.5,
    matchedSignals: [],
  }
}

function toAnswer(row: Record<string, unknown>): DiagnosticFollowUpAnswer {
  return {
    questionKey: String(row.question_key || ''),
    answerValue: row.answer_value as DiagnosticFollowUpAnswer['answerValue'],
    answerType: row.answer_type as DiagnosticFollowUpAnswer['answerType'],
  }
}

function toSessionPayload(row: SessionRow) {
  return {
    id: row.id,
    status: row.status,
    complaintText: row.complaint_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toPrescribedPayload(row: Record<string, unknown> | null): PrescribedMovementTestPayload | null {
  if (!row) return null
  const testId = String(row.test_id || '')
  const definition = getMovementTestDefinition(testId)
  if (!definition) return null

  return {
    id: String(row.id || ''),
    testId,
    displayName: definition.displayName,
    requiredView: definition.requiredView,
    instructionVersion: String(row.instruction_version || ''),
    recordingStatus:
      row.recording_status === 'uploaded' ||
      row.recording_status === 'analysis_started' ||
      row.recording_status === 'completed' ||
      row.recording_status === 'blocked'
        ? row.recording_status
        : 'pending',
    definition,
    prescriptionReason: String(row.prescription_reason || ''),
    safetyNotes: Array.isArray(row.safety_notes_json) ? row.safety_notes_json as PrescribedMovementTestPayload['safetyNotes'] : [],
  }
}

function throwIfSupabaseError(error: { message?: string | null } | null | undefined) {
  if (error) throw new Error(error.message || 'Supabase request failed.')
}

async function loadSessionOrThrow(supabase: SupabaseLike, userId: string, sessionId: string) {
  const { data, error } = await supabase
    .from('diagnostic_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Diagnostic session not found.')
  return data as SessionRow
}

async function loadPrescribedTestRowOrThrow(supabase: SupabaseLike, sessionId: string, testId?: string) {
  const { data, error } = await supabase
    .from('prescribed_movement_tests')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle()

  throwIfSupabaseError(error)

  if (!data) throw new Error('No movement test has been prescribed for this diagnostic session.')

  const row = data as Record<string, unknown>
  if (testId && String(row.test_id || '') !== testId) {
    throw new Error('The submitted video does not match the prescribed movement test.')
  }

  if (row.recording_status === 'blocked') {
    throw new Error('This diagnostic session is blocked by safety guidance.')
  }

  return row
}

async function loadDiagnosticAnswers(supabase: SupabaseLike, sessionId: string) {
  const { data, error } = await supabase
    .from('diagnostic_followup_answers')
    .select('*')
    .eq('session_id', sessionId)

  throwIfSupabaseError(error)
  return (Array.isArray(data) ? data : []).map(toAnswer)
}

export async function startDiagnosticSession(
  supabase: SupabaseLike,
  args: {
    userId: string
    complaintText: string
    sportContext?: string | null
    userContext?: Record<string, unknown> | null
  }
) {
  const classification = classifyComplaint({
    complaintText: args.complaintText,
    sportContext: args.sportContext,
    userContext: args.userContext,
  })
  const safety = evaluateDiagnosticSafety({ complaintText: args.complaintText, classification })
  const questions = selectFollowUpQuestions(classification, [])
  const status: DiagnosticSessionStatus = safety.shouldStopTest ? 'caution_blocked' : 'followup_pending'

  const { data, error } = await supabase
    .from('diagnostic_sessions')
    .insert({
      user_id: args.userId,
      status,
      complaint_text: args.complaintText,
      primary_bucket: classification.primaryBucket,
      secondary_bucket: classification.secondaryBucket,
      body_region: classification.bodyRegion,
      pain_flag: classification.painFlag,
      severity: classification.severity,
      sport_context: classification.sportRelevance,
      classification_json: classification,
      user_context_json: args.userContext || {},
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  await Promise.all([
    trackDiagnosticEvent(supabase, {
      userId: args.userId,
      sessionId: data.id,
      eventName: 'diagnostic_session_started',
      properties: { primary_bucket: classification.primaryBucket },
    }),
    trackDiagnosticEvent(supabase, {
      userId: args.userId,
      sessionId: data.id,
      eventName: 'complaint_submitted',
      properties: { pain_flag: classification.painFlag, body_region: classification.bodyRegion },
    }),
  ])

  return {
    session: toSessionPayload(data as SessionRow),
    classification,
    safety,
    questions: safety.shouldStopTest ? [] : questions,
  }
}

export async function submitDiagnosticFollowUps(
  supabase: SupabaseLike,
  args: {
    userId: string
    sessionId: string
    answers: DiagnosticFollowUpAnswer[]
  }
) {
  const session = await loadSessionOrThrow(supabase, args.userId, args.sessionId)

  const answerRows = args.answers.map((answer) => ({
    session_id: args.sessionId,
    question_key: answer.questionKey,
    answer_value: answer.answerValue,
    answer_type: answer.answerType,
  }))

  const { error: answerError } = await supabase
    .from('diagnostic_followup_answers')
    .upsert(answerRows, { onConflict: 'session_id,question_key' })

  if (answerError) throw new Error(answerError.message)

  const allAnswers = await loadDiagnosticAnswers(supabase, args.sessionId)
  const classification = refineClassificationWithAnswers(rowClassification(session), allAnswers)
  const safety = evaluateDiagnosticSafety({
    complaintText: session.complaint_text,
    classification,
    answers: allAnswers,
  })
  const nextQuestions = selectFollowUpQuestions(classification, allAnswers)
  const enoughContext = hasEnoughFollowUpContext(classification, allAnswers)

  const { error: updateError } = await supabase
    .from('diagnostic_sessions')
    .update({
      status: safety.shouldStopTest ? 'caution_blocked' : enoughContext ? 'test_prescribed' : 'followup_pending',
      primary_bucket: classification.primaryBucket,
      secondary_bucket: classification.secondaryBucket,
      body_region: classification.bodyRegion,
      pain_flag: classification.painFlag,
      severity: classification.severity,
      sport_context: classification.sportRelevance,
      classification_json: classification,
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.sessionId)
    .eq('user_id', args.userId)

  throwIfSupabaseError(updateError)

  await trackDiagnosticEvent(supabase, {
    userId: args.userId,
    sessionId: args.sessionId,
    eventName: 'followup_completed',
    properties: { answer_count: args.answers.length, enough_context: enoughContext },
  })

  if (safety.shouldStopTest || (!enoughContext && nextQuestions.length > 0)) {
    return {
      classification,
      safety,
      questions: safety.shouldStopTest ? [] : nextQuestions,
      prescribedTest: null,
    }
  }

  const prescribed = await upsertPrescribedMovementTest(supabase, {
    userId: args.userId,
    sessionId: args.sessionId,
    classification,
    answers: allAnswers,
    safety,
  })

  return {
    classification,
    safety,
    questions: [],
    prescribedTest: prescribed,
  }
}

export async function upsertPrescribedMovementTest(
  supabase: SupabaseLike,
  args: {
    userId: string
    sessionId: string
    classification: ComplaintClassification
    answers?: DiagnosticFollowUpAnswer[]
    safety: DiagnosticSafetyState
  }
) {
  const prescribed = prescribeMovementTest({
    sessionId: args.sessionId,
    classification: args.classification,
    answers: args.answers || [],
    safetyNotes: args.safety.flags.filter((flag) => flag.severity !== 'info'),
  })

  const { data, error } = await supabase
    .from('prescribed_movement_tests')
    .upsert(
      {
        session_id: args.sessionId,
        test_id: prescribed.testId,
        required_view: prescribed.requiredView,
        instruction_version: prescribed.instructionVersion,
        recording_status: args.safety.shouldStopTest ? 'blocked' : 'pending',
        prescription_reason: prescribed.prescriptionReason,
        safety_notes_json: prescribed.safetyNotes,
      },
      { onConflict: 'session_id' }
    )
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  const sessionUpdateResult = await supabase
    .from('diagnostic_sessions')
    .update({ status: args.safety.shouldStopTest ? 'caution_blocked' : 'test_prescribed', updated_at: new Date().toISOString() })
    .eq('id', args.sessionId)
    .eq('user_id', args.userId)

  throwIfSupabaseError(sessionUpdateResult.error)

  await trackDiagnosticEvent(supabase, {
    userId: args.userId,
    sessionId: args.sessionId,
    eventName: 'test_prescribed',
    properties: { test_id: prescribed.testId, required_view: prescribed.requiredView },
  })

  return toPrescribedPayload(data as Record<string, unknown>)
}

export async function getDiagnosticPrescribedTest(
  supabase: SupabaseLike,
  args: { userId: string; sessionId: string }
) {
  const session = await loadSessionOrThrow(supabase, args.userId, args.sessionId)
  const { data, error } = await supabase.from('prescribed_movement_tests').select('*').eq('session_id', args.sessionId).maybeSingle()
  throwIfSupabaseError(error)
  if (data) return toPrescribedPayload(data as Record<string, unknown>)

  const classification = rowClassification(session)
  const answers = await loadDiagnosticAnswers(supabase, args.sessionId)
  const safety = evaluateDiagnosticSafety({ complaintText: session.complaint_text, classification, answers })
  return upsertPrescribedMovementTest(supabase, {
    userId: args.userId,
    sessionId: args.sessionId,
    classification,
    answers,
    safety,
  })
}

export async function createDiagnosticVideoCapture(
  supabase: SupabaseLike,
  args: {
    userId: string
    sessionId: string
    testId: string
    cameraUsed: string
    deviceMetadata?: Record<string, unknown> | null
  }
) {
  const session = await loadSessionOrThrow(supabase, args.userId, args.sessionId)
  if (session.status === 'caution_blocked') {
    throw new Error('This diagnostic session is blocked by safety guidance.')
  }
  await loadPrescribedTestRowOrThrow(supabase, args.sessionId, args.testId)

  const { data, error } = await supabase
    .from('diagnostic_video_captures')
    .insert({
      session_id: args.sessionId,
      test_id: args.testId,
      media_url: null,
      camera_used: args.cameraUsed || 'back',
      device_metadata: args.deviceMetadata || {},
      upload_status: 'local_analysis_pending',
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  const [{ error: sessionUpdateError }, { error: testUpdateError }] = await Promise.all([
    supabase
      .from('diagnostic_sessions')
      .update({ status: 'recording_pending', updated_at: new Date().toISOString() })
      .eq('id', args.sessionId)
      .eq('user_id', args.userId),
    supabase
      .from('prescribed_movement_tests')
      .update({ recording_status: 'uploaded', updated_at: new Date().toISOString() })
      .eq('session_id', args.sessionId)
      .eq('test_id', args.testId),
  ])

  throwIfSupabaseError(sessionUpdateError)
  throwIfSupabaseError(testUpdateError)

  await trackDiagnosticEvent(supabase, {
    userId: args.userId,
    sessionId: args.sessionId,
    eventName: 'recording_started',
    properties: { test_id: args.testId, camera_used: args.cameraUsed || 'back' },
  })

  return {
    capture: data,
    upload: {
      mode: 'local_analysis_only',
      cameraUsed: args.cameraUsed || 'back',
      note: 'V1 analyzes the clip locally and stores only diagnostic outputs unless a private video bucket is added later.',
    },
  }
}

export async function analyzeDiagnosticSession(
  supabase: SupabaseLike,
  args: {
    userId: string
    sessionId: string
    testId: string
    rawEnginePayload: DiagnosticRawEnginePayload
    videoReference?: string | null
    deviceMetadata?: Record<string, unknown> | null
  }
) {
  const session = await loadSessionOrThrow(supabase, args.userId, args.sessionId)
  if (session.status === 'caution_blocked') {
    throw new Error('This diagnostic session is blocked by safety guidance.')
  }
  await loadPrescribedTestRowOrThrow(supabase, args.sessionId, args.testId)

  const classification = rowClassification(session)
  const answers = await loadDiagnosticAnswers(supabase, args.sessionId)
  const safety = evaluateDiagnosticSafety({ complaintText: session.complaint_text, classification, answers })
  const normalized = normalizeDiagnosticAnalysis({ raw: args.rawEnginePayload, classification })
  const interpretation = interpretDiagnosticResult({
    classification,
    testId: args.testId,
    metrics: normalized.normalizedMetrics,
    movementScores: normalized.movementScores,
    safety,
  })
  const actionPlan = buildDiagnosticActionPlan({
    classification,
    testId: args.testId,
    metrics: normalized.normalizedMetrics,
    interpretation,
  })

  const [{ error: sessionPendingError }, { error: testPendingError }] = await Promise.all([
    supabase
      .from('diagnostic_sessions')
      .update({ status: 'analysis_pending', updated_at: new Date().toISOString() })
      .eq('id', args.sessionId)
      .eq('user_id', args.userId),
    supabase
      .from('prescribed_movement_tests')
      .update({ recording_status: 'analysis_started', updated_at: new Date().toISOString() })
      .eq('session_id', args.sessionId)
      .eq('test_id', args.testId),
  ])

  throwIfSupabaseError(sessionPendingError)
  throwIfSupabaseError(testPendingError)

  await trackDiagnosticEvent(supabase, {
    userId: args.userId,
    sessionId: args.sessionId,
    eventName: 'analysis_started',
    properties: { test_id: args.testId },
  })

  const { error: analysisError } = await supabase.from('diagnostic_analysis_results').insert({
    session_id: args.sessionId,
    raw_engine_payload: args.rawEnginePayload,
    normalized_metrics_json: normalized.normalizedMetrics,
    movement_scores_json: normalized.movementScores,
    asymmetry_scores_json: normalized.asymmetryScores,
    flags_json: normalized.flags,
    confidence_score: normalized.confidenceScore,
  })

  if (analysisError) throw new Error(analysisError.message)

  const [{ error: interpretationError }, { error: actionError }] = await Promise.all([
    supabase.from('diagnostic_interpretations').upsert(
      {
        session_id: args.sessionId,
        summary_text: interpretation.summaryText,
        likely_contributors_json: interpretation.likelyContributors,
        limitations_json: interpretation.limitations,
        caution_flags_json: interpretation.cautionFlags,
        recommended_next_steps_json: interpretation.recommendedNextSteps,
      },
      { onConflict: 'session_id' }
    ),
    supabase.from('diagnostic_action_plans').upsert(
      {
        session_id: args.sessionId,
        drills_json: actionPlan.drills,
        load_modification_json: actionPlan.loadModification,
        recovery_guidance_json: actionPlan.recoveryGuidance,
        escalation_guidance_json: actionPlan.escalationGuidance,
        review_after_days: actionPlan.reviewAfterDays,
        plan_json: actionPlan,
      },
      { onConflict: 'session_id' }
    ),
  ])

  if (interpretationError) throw new Error(interpretationError.message)
  if (actionError) throw new Error(actionError.message)

  const [captureUpdateResult, testCompleteResult, sessionCompleteResult] = await Promise.all([
    supabase
      .from('diagnostic_video_captures')
      .update({
        media_url: args.videoReference || null,
        device_metadata: args.deviceMetadata || {},
        upload_status: 'analyzed',
      })
      .eq('session_id', args.sessionId)
      .eq('test_id', args.testId),
    supabase
      .from('prescribed_movement_tests')
      .update({ recording_status: 'completed' })
      .eq('session_id', args.sessionId),
    supabase
      .from('diagnostic_sessions')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', args.sessionId)
      .eq('user_id', args.userId),
  ])

  throwIfSupabaseError(captureUpdateResult.error)
  throwIfSupabaseError(testCompleteResult.error)
  throwIfSupabaseError(sessionCompleteResult.error)

  await Promise.all([
    trackDiagnosticEvent(supabase, {
      userId: args.userId,
      sessionId: args.sessionId,
      eventName: 'recording_uploaded',
      properties: { test_id: args.testId, local_analysis_only: true },
    }),
    trackDiagnosticEvent(supabase, {
      userId: args.userId,
      sessionId: args.sessionId,
      eventName: 'analysis_completed',
      properties: { test_id: args.testId, confidence_score: normalized.confidenceScore },
    }),
  ])

  return {
    jobState: 'completed' as const,
    result: await getDiagnosticResult(supabase, { userId: args.userId, sessionId: args.sessionId }),
  }
}

export async function getDiagnosticResult(
  supabase: SupabaseLike,
  args: { userId: string; sessionId: string }
): Promise<DiagnosticResultPayload> {
  const session = await loadSessionOrThrow(supabase, args.userId, args.sessionId)
  const classification = rowClassification(session)
  const answers = await loadDiagnosticAnswers(supabase, args.sessionId)
  const safety = evaluateDiagnosticSafety({ complaintText: session.complaint_text, classification, answers })

  const [testResult, analysisResult, interpretationResult, actionPlanResult] = await Promise.all([
    supabase.from('prescribed_movement_tests').select('*').eq('session_id', args.sessionId).maybeSingle(),
    supabase
      .from('diagnostic_analysis_results')
      .select('*')
      .eq('session_id', args.sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('diagnostic_interpretations').select('*').eq('session_id', args.sessionId).maybeSingle(),
    supabase.from('diagnostic_action_plans').select('*').eq('session_id', args.sessionId).maybeSingle(),
  ])

  if (testResult.error) throw new Error(testResult.error.message)
  if (analysisResult.error) throw new Error(analysisResult.error.message)
  if (interpretationResult.error) throw new Error(interpretationResult.error.message)
  if (actionPlanResult.error) throw new Error(actionPlanResult.error.message)

  const analysis = analysisResult.data as Record<string, unknown> | null
  const interpretationRow = interpretationResult.data as Record<string, unknown> | null
  const actionRow = actionPlanResult.data as Record<string, unknown> | null

  const interpretation: DiagnosticInterpretationPayload | null = interpretationRow
    ? {
        summaryText: String(interpretationRow.summary_text || ''),
        likelyContributors: Array.isArray(interpretationRow.likely_contributors_json)
          ? interpretationRow.likely_contributors_json as DiagnosticInterpretationPayload['likelyContributors']
          : [],
        limitations: Array.isArray(interpretationRow.limitations_json) ? interpretationRow.limitations_json.map(String) : [],
        cautionFlags: Array.isArray(interpretationRow.caution_flags_json)
          ? interpretationRow.caution_flags_json as DiagnosticInterpretationPayload['cautionFlags']
          : [],
        recommendedNextSteps: Array.isArray(interpretationRow.recommended_next_steps_json)
          ? interpretationRow.recommended_next_steps_json.map(String)
          : [],
      }
    : null

  const actionPlan = actionRow?.plan_json && typeof actionRow.plan_json === 'object'
    ? actionRow.plan_json as DiagnosticActionPlanPayload
    : null

  return {
    session: toSessionPayload(session),
    classification,
    prescribedTest: toPrescribedPayload(testResult.data as Record<string, unknown> | null),
    normalizedMetrics: analysis?.normalized_metrics_json as NormalizedDiagnosticMetrics | null || null,
    movementScores: analysis?.movement_scores_json as MovementScores | null || null,
    asymmetryScores: analysis?.asymmetry_scores_json as Record<string, unknown> | null || null,
    flags: analysis?.flags_json as Record<string, unknown> | null || null,
    confidenceScore: typeof analysis?.confidence_score === 'number' ? analysis.confidence_score : null,
    interpretation,
    actionPlan,
    safety,
  }
}

export async function listDiagnosticHistory(
  supabase: SupabaseLike,
  args: { userId: string; limit?: number }
) {
  const limit = Math.min(50, Math.max(1, args.limit || 12))
  const { data: sessions, error } = await supabase
    .from('diagnostic_sessions')
    .select('*')
    .eq('user_id', args.userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  const rows = (Array.isArray(sessions) ? sessions : []) as SessionRow[]
  const sessionIds = rows.map((row) => row.id)
  const { data: interpretations } = sessionIds.length
    ? await supabase
        .from('diagnostic_interpretations')
        .select('session_id, summary_text')
        .in('session_id', sessionIds)
    : { data: [] as Array<Record<string, unknown>> }

  const summaryBySession = new Map(
    (Array.isArray(interpretations) ? interpretations : []).map((row: Record<string, unknown>) => [
      String(row.session_id),
      String(row.summary_text || ''),
    ])
  )

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    complaintText: row.complaint_text,
    primaryBucket: row.primary_bucket,
    bodyRegion: row.body_region,
    painFlag: row.pain_flag,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    keyFinding: summaryBySession.get(row.id) || null,
  }))
}
