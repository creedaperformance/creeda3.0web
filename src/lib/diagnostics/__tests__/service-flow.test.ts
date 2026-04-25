import {
  analyzeDiagnosticSession,
  createDiagnosticVideoCapture,
  getDiagnosticResult,
  listDiagnosticHistory,
  startDiagnosticSession,
  submitDiagnosticFollowUps,
} from '@/lib/diagnostics/service'
import type { DiagnosticRawEnginePayload } from '@/lib/diagnostics/types'

type Row = Record<string, unknown>

type FakeDb = Record<string, Row[]>

let idCounter = 0

function nextId(prefix: string) {
  idCounter += 1
  return `${prefix}-${idCounter}`
}

function now() {
  return '2026-04-23T12:00:00.000Z'
}

function withDefaults(table: string, row: Row): Row {
  return {
    id: row.id || nextId(table),
    created_at: row.created_at || now(),
    updated_at: row.updated_at || now(),
    ...row,
  }
}

class FakeQueryBuilder {
  private operation: 'select' | 'insert' | 'upsert' | 'update' = 'select'
  private payload: Row | Row[] | null = null
  private filters: Array<(row: Row) => boolean> = []
  private orderKey: string | null = null
  private orderAscending = true
  private limitCount: number | null = null
  private conflictKeys: string[] = []
  private result: { data: unknown; error: null } | null = null

  constructor(
    private db: FakeDb,
    private table: string
  ) {}

  select() {
    return this
  }

  insert(payload: Row | Row[]) {
    this.operation = 'insert'
    this.payload = payload
    return this
  }

  upsert(payload: Row | Row[], options?: { onConflict?: string }) {
    this.operation = 'upsert'
    this.payload = payload
    this.conflictKeys = String(options?.onConflict || 'id')
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean)
    return this
  }

  update(payload: Row) {
    this.operation = 'update'
    this.payload = payload
    return this
  }

  eq(key: string, value: unknown) {
    this.filters.push((row) => row[key] === value)
    return this
  }

  in(key: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[key]))
    return this
  }

  order(key: string, options?: { ascending?: boolean }) {
    this.orderKey = key
    this.orderAscending = options?.ascending !== false
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  async single() {
    const result = this.execute()
    const rows = Array.isArray(result.data) ? result.data : [result.data]
    return { data: rows[0] || null, error: null }
  }

  async maybeSingle() {
    return this.single()
  }

  then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }

  private tableRows() {
    if (!this.db[this.table]) this.db[this.table] = []
    return this.db[this.table]
  }

  private applyFilters(rows: Row[]) {
    let result = rows.filter((row) => this.filters.every((filter) => filter(row)))

    if (this.orderKey) {
      result = result.toSorted((a, b) => {
        const left = String(a[this.orderKey!] || '')
        const right = String(b[this.orderKey!] || '')
        return this.orderAscending ? left.localeCompare(right) : right.localeCompare(left)
      })
    }

    if (this.limitCount !== null) result = result.slice(0, this.limitCount)
    return result
  }

  private execute(): { data: unknown; error: null } {
    if (this.result) return this.result

    if (this.operation === 'insert') {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload || {}]
      const inserted = rows.map((row) => withDefaults(this.table, row))
      this.tableRows().push(...inserted)
      this.result = { data: inserted, error: null }
      return this.result
    }

    if (this.operation === 'upsert') {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload || {}]
      const written = rows.map((row) => {
        const existing = this.tableRows().find((candidate) =>
          this.conflictKeys.every((key) => candidate[key] === row[key])
        )
        if (existing) {
          Object.assign(existing, row, { updated_at: now() })
          return existing
        }

        const inserted = withDefaults(this.table, row)
        this.tableRows().push(inserted)
        return inserted
      })
      this.result = { data: written, error: null }
      return this.result
    }

    if (this.operation === 'update') {
      const rows = this.applyFilters(this.tableRows())
      rows.forEach((row) => Object.assign(row, this.payload || {}, { updated_at: now() }))
      this.result = { data: rows, error: null }
      return this.result
    }

    this.result = { data: this.applyFilters(this.tableRows()), error: null }
    return this.result
  }
}

function createFakeSupabase() {
  const db: FakeDb = {
    diagnostic_sessions: [],
    diagnostic_followup_answers: [],
    prescribed_movement_tests: [],
    diagnostic_video_captures: [],
    diagnostic_analysis_results: [],
    diagnostic_interpretations: [],
    diagnostic_action_plans: [],
    product_analytics_events: [],
  }

  return {
    db,
    from(table: string) {
      return new FakeQueryBuilder(db, table)
    },
  }
}

const squatRawPayload: DiagnosticRawEnginePayload = {
  testId: 'bodyweight_squat',
  sportId: 'weightlifting',
  frameCount: 132,
  warnings: 3,
  positive: 2,
  issuesDetected: ['knee_valgus', 'shallow_squat'],
  feedbackLog: [
    { message: 'Knee is collapsing on direction change.', isError: true, timestampMs: 1200 },
  ],
  visionFaults: [
    {
      fault: 'Knee tracking collapses under load',
      riskMapping: 'Knee overload risk rises when the knee caves inward.',
      correctiveDrills: ['Single-leg glute bridge'],
      severity: 'high',
      confidence: 0.9,
    },
  ],
  clipDurationSeconds: 12,
  motionFrameLoad: 80,
  captureUsable: true,
}

test('runs diagnostic session from complaint through result and history', async () => {
  const supabase = createFakeSupabase()
  const userId = 'user-1'

  const started = await startDiagnosticSession(supabase as never, {
    userId,
    complaintText: 'My knees hurt in squats',
    sportContext: 'gym',
  })

  expect(started.classification.primaryBucket).toBe('lower_body_pain_with_movement')
  expect(started.questions.map((question) => question.key)).toEqual(['movement_story', 'context_story', 'safety_story'])
  expect(started.questions.every((question) => question.type === 'open_text')).toBe(true)

  const followup = await submitDiagnosticFollowUps(supabase as never, {
    userId,
    sessionId: started.session.id,
    answers: [
      {
        questionKey: 'movement_story',
        answerValue: 'Both knees feel achy, around 4 out of 10, especially near the bottom.',
        answerType: 'open_text',
      },
      {
        questionKey: 'context_story',
        answerValue: 'It happens during squats at the gym and has been going on for a few weeks.',
        answerType: 'open_text',
      },
      {
        questionKey: 'safety_story',
        answerValue: 'No swelling, locking, numbness, sharp pain, or trouble bearing weight.',
        answerType: 'open_text',
      },
    ],
  })

  expect(followup.prescribedTest?.testId).toBe('bodyweight_squat')
  expect(followup.prescribedTest?.requiredView).toBe('front')

  const capture = await createDiagnosticVideoCapture(supabase as never, {
    userId,
    sessionId: started.session.id,
    testId: 'bodyweight_squat',
    cameraUsed: 'back',
    deviceMetadata: { platform: 'jest' },
  })

  expect(capture.upload.mode).toBe('local_analysis_only')

  const analyzed = await analyzeDiagnosticSession(supabase as never, {
    userId,
    sessionId: started.session.id,
    testId: 'bodyweight_squat',
    rawEnginePayload: squatRawPayload,
    videoReference: 'local-browser-capture',
  })

  expect(analyzed.jobState).toBe('completed')
  expect(analyzed.result.session.status).toBe('completed')
  expect(analyzed.result.normalizedMetrics?.kneeTrackingScore).toBeLessThan(70)
  expect(analyzed.result.interpretation?.summaryText).toContain('not a diagnosis')
  expect(analyzed.result.actionPlan?.drills.map((drill) => drill.title)).toContain('Banded knee-control squats')

  const result = await getDiagnosticResult(supabase as never, {
    userId,
    sessionId: started.session.id,
  })
  expect(result.prescribedTest?.recordingStatus).toBe('completed')

  const history = await listDiagnosticHistory(supabase as never, { userId })
  expect(history).toHaveLength(1)
  expect(history[0].keyFinding).toContain('not a diagnosis')
})

test('rejects video analysis that does not match the prescribed test', async () => {
  const supabase = createFakeSupabase()
  const userId = 'user-1'
  const started = await startDiagnosticSession(supabase as never, {
    userId,
    complaintText: 'My knees hurt in squats',
  })

  await submitDiagnosticFollowUps(supabase as never, {
    userId,
    sessionId: started.session.id,
    answers: [
      {
        questionKey: 'movement_story',
        answerValue: 'Both knees feel achy, around 4 out of 10, especially near the bottom.',
        answerType: 'open_text',
      },
      {
        questionKey: 'context_story',
        answerValue: 'It happens during squats at the gym and has been going on for a few weeks.',
        answerType: 'open_text',
      },
      {
        questionKey: 'safety_story',
        answerValue: 'No swelling, locking, numbness, sharp pain, or trouble bearing weight.',
        answerType: 'open_text',
      },
    ],
  })

  await expect(
    analyzeDiagnosticSession(supabase as never, {
      userId,
      sessionId: started.session.id,
      testId: 'vertical_jump',
      rawEnginePayload: { ...squatRawPayload, testId: 'vertical_jump' },
    })
  ).rejects.toThrow('does not match the prescribed movement test')
})
