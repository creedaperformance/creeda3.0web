import * as z from 'zod'

export const startDiagnosticSessionSchema = z.object({
  complaint_text: z.string().trim().min(3).max(600),
  sport_context: z.string().trim().max(120).optional().nullable(),
  user_context: z.record(z.string(), z.unknown()).optional().nullable(),
})

export const diagnosticFollowUpAnswerSchema = z.object({
  question_key: z.string().trim().min(1).max(80),
  answer_value: z.union([
    z.string().trim().min(1).max(1600),
    z.number().min(0).max(10),
    z.boolean(),
    z.array(z.string().max(120)).max(12),
  ]),
  answer_type: z.enum([
    'open_text',
    'multiple_choice',
    'yes_no',
    'body_side',
    'severity_scale',
    'activity_trigger',
    'duration',
    'sport_context',
    'training_context',
  ]),
})

export const submitFollowUpsSchema = z.object({
  answers: z.array(diagnosticFollowUpAnswerSchema).min(1).max(8),
})

export const createVideoUploadSchema = z.object({
  test_id: z.string().trim().min(1).max(120),
  camera_used: z.string().trim().max(40).default('back'),
  device_metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

const feedbackEventSchema = z.object({
  message: z.string().max(500),
  isError: z.boolean(),
  timestampMs: z.number().optional(),
})

const visionFaultSchema = z.object({
  fault: z.string().max(240),
  riskMapping: z.string().max(800),
  correctiveDrills: z.array(z.string().max(180)).max(8),
  severity: z.enum(['high', 'moderate', 'low']),
  confidence: z.number().min(0).max(1),
  timestamp: z.string().optional(),
})

export const analyzeDiagnosticSessionSchema = z.object({
  test_id: z.string().trim().min(1).max(120),
  video_reference: z.string().trim().max(600).optional().nullable(),
  device_metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  raw_engine_payload: z.object({
    testId: z.string().trim().min(1).max(120),
    sportId: z.string().max(120).optional().nullable(),
    frameCount: z.number().int().min(0).max(20000),
    warnings: z.number().int().min(0).max(20000),
    positive: z.number().int().min(0).max(20000),
    issuesDetected: z.array(z.string().max(120)).max(80),
    feedbackLog: z.array(feedbackEventSchema).max(500),
    visionFaults: z.array(visionFaultSchema).max(80),
    clipDurationSeconds: z.number().min(0).max(120).optional().nullable(),
    motionFrameLoad: z.number().min(0).max(20000).optional().nullable(),
    captureUsable: z.boolean().optional().nullable(),
    captureAssessment: z.record(z.string(), z.unknown()).optional().nullable(),
  }),
})

export function formatDiagnosticRequestIssues(error: unknown) {
  if (!(error instanceof z.ZodError)) return null

  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}
