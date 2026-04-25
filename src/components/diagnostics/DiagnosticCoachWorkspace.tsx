'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  ClipboardList,
  History,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
} from 'lucide-react'

import { COMMON_DIAGNOSTIC_PROMPTS, DIAGNOSTIC_DISCLAIMER } from '@/lib/diagnostics/config'
import type {
  ComplaintClassification,
  DiagnosticFollowUpQuestion,
  DiagnosticResultPayload,
  PrescribedMovementTestPayload,
} from '@/lib/diagnostics/types'
import type { MediaPipeEngine as EngineType } from '@/lib/vision/MediaPipeEngine'
import { LandmarkSmoother } from '@/lib/vision/geometry'
import {
  assessVideoCapture,
  createAnalysisState,
  runDeterministicRules,
  updateCaptureMetrics,
  type AnalysisState,
} from '@/lib/vision/rules'
import {
  loadClipMetadata,
  validateClipFile,
  validateClipMetadata,
  type ClipMetadata,
} from '@/lib/video-analysis/clipValidation'

type Role = 'athlete' | 'individual'

type FlowStep = 'intake' | 'followups' | 'instructions' | 'capture' | 'processing' | 'results' | 'history' | 'blocked'

type SessionPayload = {
  id: string
  status: string
  complaintText: string
  createdAt: string
  updatedAt: string
}

type SafetyPayload = {
  canContinue: boolean
  shouldStopTest: boolean
  intakeMessage: string
  resultMessage: string
  flags: Array<{
    key: string
    label: string
    severity: 'info' | 'caution' | 'stop'
    message: string
  }>
}

type HistoryItem = {
  id: string
  status: string
  complaintText: string
  primaryBucket: string
  bodyRegion: string
  painFlag: boolean
  createdAt: string
  updatedAt: string
  keyFinding: string | null
}

interface Props {
  role: Role
  dashboardHref: string
  scanHref: string
  preferredSport?: string | null
}

const processingSteps = ['upload', 'analyze', 'interpret', 'build plan'] as const

function diagnosticSportForTest(testId: string) {
  if (testId.includes('jump') || testId.includes('pogo')) return 'athletics_jumps'
  if (testId.includes('overhead') || testId.includes('wall_slide')) return 'badminton'
  if (testId.includes('balance') || testId.includes('step_down') || testId.includes('lunge')) return 'football'
  return 'weightlifting'
}

function cloneAnalysisState(state: AnalysisState): AnalysisState {
  return {
    ...state,
    issuesDetected: new Set(state.issuesDetected),
    feedbackLog: [...state.feedbackLog],
    visionFaults: [...state.visionFaults],
  }
}

function getMotionFrameLoad(state: AnalysisState) {
  return Math.max(
    state.strideFrames,
    state.deepFlexionFrames,
    state.overheadFrames,
    state.crossBodyFrames,
    state.stableSetupFrames
  )
}

function asApiAnswer(question: DiagnosticFollowUpQuestion, value: string | number | boolean | string[]) {
  return {
    question_key: question.key,
    answer_value: value,
    answer_type: question.type,
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const json = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(json?.error || 'Request failed.')
  }
  return json as T
}

function scoreTone(value: number | null) {
  if (value === null) return 'text-slate-400'
  if (value >= 80) return 'text-emerald-300'
  if (value >= 65) return 'text-amber-300'
  return 'text-rose-300'
}

function answerLabel(value: string | number | boolean | string[]) {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

export function DiagnosticCoachWorkspace({ role, dashboardHref, scanHref, preferredSport }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const smootherRef = useRef<LandmarkSmoother>(new LandmarkSmoother(3))

  const [step, setStep] = useState<FlowStep>('intake')
  const [complaintText, setComplaintText] = useState('')
  const [session, setSession] = useState<SessionPayload | null>(null)
  const [classification, setClassification] = useState<ComplaintClassification | null>(null)
  const [safety, setSafety] = useState<SafetyPayload | null>(null)
  const [questions, setQuestions] = useState<DiagnosticFollowUpQuestion[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Array<ReturnType<typeof asApiAnswer>>>([])
  const [chatAnswer, setChatAnswer] = useState('')
  const [prescribedTest, setPrescribedTest] = useState<PrescribedMovementTestPayload | null>(null)
  const [result, setResult] = useState<DiagnosticResultPayload | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [processingIndex, setProcessingIndex] = useState(0)
  const [clipMetadata, setClipMetadata] = useState<ClipMetadata | null>(null)

  const currentQuestion = questions[questionIndex] || null
  const homeHref = role === 'athlete' ? '/athlete/diagnostic' : '/individual/diagnostic'

  const resetFlow = useCallback(() => {
    setStep('intake')
    setComplaintText('')
    setSession(null)
    setClassification(null)
    setSafety(null)
    setQuestions([])
    setQuestionIndex(0)
    setAnswers([])
    setChatAnswer('')
    setPrescribedTest(null)
    setResult(null)
    setError(null)
    setAnalysisProgress(0)
    setProcessingIndex(0)
    setClipMetadata(null)
  }, [])

  useEffect(() => {
    if (step !== 'processing') return
    const timer = window.setInterval(() => {
      setProcessingIndex((current) => Math.min(processingSteps.length - 1, current + 1))
    }, 1400)

    return () => window.clearInterval(timer)
  }, [step])

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/diagnostic/history?limit=12', { cache: 'no-store' })
      const json = await parseJsonResponse<{ success: true; history: HistoryItem[] }>(response)
      setHistory(json.history)
      setStep('history')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load diagnostic history.')
    } finally {
      setLoading(false)
    }
  }, [])

  async function startSession() {
    if (!complaintText.trim()) {
      setError('Tell CREEDA what feels weak, painful, unstable, slow, stiff, or wrong.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/diagnostic/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint_text: complaintText.trim(),
          sport_context: preferredSport || null,
          user_context: { role },
        }),
      })
      const json = await parseJsonResponse<{
        success: true
        session: SessionPayload
        classification: ComplaintClassification
        safety: SafetyPayload
        questions: DiagnosticFollowUpQuestion[]
      }>(response)

      setSession(json.session)
      setClassification(json.classification)
      setSafety(json.safety)

      if (json.safety.shouldStopTest) {
        setStep('blocked')
        return
      }

      setQuestions(json.questions)
      setQuestionIndex(0)
      setAnswers([])
      setStep(json.questions.length ? 'followups' : 'instructions')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not start the diagnostic coach.')
    } finally {
      setLoading(false)
    }
  }

  async function submitAnswers(nextAnswers: Array<ReturnType<typeof asApiAnswer>>) {
    if (!session) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/diagnostic/sessions/${encodeURIComponent(session.id)}/followups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: nextAnswers }),
      })
      const json = await parseJsonResponse<{
        success: true
        classification: ComplaintClassification
        safety: SafetyPayload
        questions: DiagnosticFollowUpQuestion[]
        prescribedTest: PrescribedMovementTestPayload | null
      }>(response)

      setClassification(json.classification)
      setSafety(json.safety)

      if (json.safety.shouldStopTest) {
        setStep('blocked')
        return
      }

      if (json.questions.length) {
        setQuestions(json.questions)
        setQuestionIndex(0)
        setAnswers([])
        setChatAnswer('')
        setStep('followups')
        return
      }

      if (json.prescribedTest) {
        setPrescribedTest(json.prescribedTest)
        setStep('instructions')
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save follow-up answers.')
    } finally {
      setLoading(false)
    }
  }

  function handleQuestionAnswer(value: string | number | boolean | string[]) {
    if (!currentQuestion) return
    const nextAnswers = [...answers, asApiAnswer(currentQuestion, value)]
    setAnswers(nextAnswers)
    setChatAnswer('')

    if (questionIndex < questions.length - 1) {
      setQuestionIndex((current) => current + 1)
      return
    }

    void submitAnswers(nextAnswers)
  }

  function handleOpenAnswerSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = chatAnswer.trim()

    if (trimmed.length < 2) {
      setError('Give CREEDA a short answer so it can choose the right movement screen.')
      return
    }

    setError(null)
    handleQuestionAnswer(trimmed)
  }

  async function loadPrescribedTest() {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/diagnostic/sessions/${encodeURIComponent(session.id)}/test`, { cache: 'no-store' })
      const json = await parseJsonResponse<{ success: true; test: PrescribedMovementTestPayload }>(response)
      setPrescribedTest(json.test)
      setStep('instructions')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load the movement test.')
    } finally {
      setLoading(false)
    }
  }

  async function createUploadSession() {
    if (!session || !prescribedTest) return

    const response = await fetch(`/api/diagnostic/sessions/${encodeURIComponent(session.id)}/video-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test_id: prescribedTest.testId,
        camera_used: 'back',
        device_metadata: {
          userAgent: navigator.userAgent,
          viewport: { width: window.innerWidth, height: window.innerHeight },
        },
      }),
    })

    await parseJsonResponse(response)
  }

  async function runLocalVideoAnalysis(file: File) {
    if (!session || !prescribedTest || !videoRef.current) return

    setStep('processing')
    setProcessingIndex(0)
    setAnalysisProgress(0)
    setError(null)

    const fileError = validateClipFile(file)
    if (fileError) {
      setError(fileError)
      setStep('capture')
      return
    }

    let objectUrl: string | null = null

    try {
      await createUploadSession()
      objectUrl = URL.createObjectURL(file)
      const metadata = await loadClipMetadata(objectUrl)
      const metadataError = validateClipMetadata(metadata)
      if (metadataError) throw new Error(metadataError)
      setClipMetadata(metadata)

      const sportId = diagnosticSportForTest(prescribedTest.testId)
      const video = videoRef.current
      video.src = objectUrl
      video.muted = true
      video.playsInline = true
      video.currentTime = 0

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve()
        video.onerror = () => reject(new Error('CREEDA could not read this clip. Try a shorter MP4, MOV, or WEBM file.'))
      })

      const { MediaPipeEngine } = await import('@/lib/vision/MediaPipeEngine')
      const engine: EngineType = MediaPipeEngine.getInstance()
      await engine.initialize()

      const analysisRef = { current: createAnalysisState(sportId) }
      smootherRef.current.reset()
      let lastVideoTime = -1

      await new Promise<void>((resolve, reject) => {
        const runFrame = () => {
          if (video.paused || video.ended) {
            if (video.ended) resolve()
            return
          }

          if (video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime
            analysisRef.current.processedFrames += 1

            try {
              const result = engine.detect(video, performance.now())
              if (result.landmarks && result.landmarks.length > 0) {
                const smoothed = smootherRef.current.smooth(result.landmarks[0])
                updateCaptureMetrics(smoothed, analysisRef.current)
                const feedback = runDeterministicRules(sportId, smoothed, analysisRef.current)

                if (feedback) {
                  if (feedback.isError) analysisRef.current.warnings += 1
                  else analysisRef.current.positive += 1
                  analysisRef.current.feedbackLog.push({
                    ...feedback,
                    timestampMs: Math.round(video.currentTime * 1000),
                  })
                }
              }
              setAnalysisProgress((video.currentTime / Math.max(video.duration || 1, 1)) * 100)
            } catch (analysisError) {
              reject(analysisError)
              return
            }
          }

          requestAnimationFrame(runFrame)
        }

        video.play().then(() => requestAnimationFrame(runFrame)).catch(reject)
      })

      const snapshot = cloneAnalysisState(analysisRef.current)
      const captureAssessment = assessVideoCapture(snapshot, sportId)
      if (!captureAssessment.usable) {
        throw new Error(captureAssessment.reason || 'CREEDA needs a clearer full-body clip before it can build a diagnostic plan.')
      }

      const response = await fetch(`/api/diagnostic/sessions/${encodeURIComponent(session.id)}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_id: prescribedTest.testId,
          video_reference: 'local-browser-capture',
          device_metadata: {
            userAgent: navigator.userAgent,
            viewport: { width: window.innerWidth, height: window.innerHeight },
            fileType: file.type,
            fileSize: file.size,
          },
          raw_engine_payload: {
            testId: prescribedTest.testId,
            sportId,
            frameCount: snapshot.frameCount,
            warnings: snapshot.warnings,
            positive: snapshot.positive,
            issuesDetected: Array.from(snapshot.issuesDetected),
            feedbackLog: snapshot.feedbackLog,
            visionFaults: snapshot.visionFaults,
            clipDurationSeconds: metadata.durationSec,
            motionFrameLoad: getMotionFrameLoad(snapshot),
            captureUsable: captureAssessment.usable,
            captureAssessment,
          },
        }),
      })

      const json = await parseJsonResponse<{ success: true; result: DiagnosticResultPayload }>(response)
      setResult(json.result)
      setAnalysisProgress(100)
      setStep('results')
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : 'CREEDA could not analyze this diagnostic clip. Try recording again with the full body visible.'
      )
      setStep('capture')
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.removeAttribute('src')
        videoRef.current.load()
      }
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    void runLocalVideoAnalysis(file)
  }

  async function reopenResult(sessionId: string) {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/diagnostic/sessions/${encodeURIComponent(sessionId)}/result`, { cache: 'no-store' })
      const json = await parseJsonResponse<{ success: true; result: DiagnosticResultPayload }>(response)
      setResult(json.result)
      setSession(json.result.session)
      setClassification(json.result.classification)
      setSafety(json.result.safety)
      setPrescribedTest(json.result.prescribedTest)
      setStep('results')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not open that diagnostic result.')
    } finally {
      setLoading(false)
    }
  }

  const answeredPreview = useMemo(
    () => answers.map((answer) => ({
      question: questions.find((item) => item.key === answer.question_key)?.prompt || answer.question_key,
      answer: answerLabel(answer.answer_value),
    })),
    [answers, questions]
  )

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-white">
      <video ref={videoRef} className="hidden" playsInline muted />

      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[var(--background)]/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href={dashboardHref} className="grid h-10 w-10 place-items-center rounded-lg border border-white/[0.08] text-white/55">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-black tracking-tight">Movement Diagnostic Coach</h1>
              <p className="text-xs text-white/45">Guided screen, plain-English result, practical next step.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchHistory}
            className="grid h-10 w-10 place-items-center rounded-lg border border-white/[0.08] text-white/65"
            aria-label="Open diagnostic history"
          >
            <History className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6">
        {error && (
          <div className="mb-4 rounded-lg border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        )}

        {step === 'intake' && (
          <section className="grid gap-6 lg:grid-cols-[1fr_0.82fr]">
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-5">
              <div className="mb-5 flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-cyan-400/12 text-cyan-200">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200/70">Start with the complaint</p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight">What feels off?</h2>
                </div>
              </div>

              <textarea
                value={complaintText}
                onChange={(event) => setComplaintText(event.target.value)}
                placeholder="Example: My knees hurt in squats"
                className="min-h-36 w-full resize-none rounded-lg border border-white/[0.1] bg-black/25 p-4 text-base text-white outline-none placeholder:text-white/30 focus:border-cyan-300/50"
                aria-label="Describe the movement complaint"
              />

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {COMMON_DIAGNOSTIC_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setComplaintText(prompt)}
                    className="min-h-11 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-left text-sm text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={startSession}
                disabled={loading}
                className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                Start diagnostic
              </button>
            </div>

            <aside className="space-y-4">
              <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-200" />
                  <p className="text-sm leading-6 text-amber-50/85">{DIAGNOSTIC_DISCLAIMER}</p>
                </div>
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">How this works</p>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  {['Classify the complaint', 'Ask open coach follow-ups', 'Prescribe one movement screen', 'Analyze one guided clip', 'Return a practical plan'].map((item, index) => (
                    <div key={item} className="flex items-center gap-3">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/[0.06] text-xs font-black text-cyan-200">{index + 1}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </section>
        )}

        {step === 'followups' && currentQuestion && (
          <section className="mx-auto max-w-2xl">
            <div className="mb-4 h-2 rounded-full bg-white/[0.06]">
              <div
                className="h-2 rounded-full bg-cyan-300 transition-all"
                style={{ width: `${((questionIndex + 1) / Math.max(questions.length, 1)) * 100}%` }}
              />
            </div>

            <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200/70">
                Coach question {questionIndex + 1} of {questions.length}
              </p>

              <div className="mt-5 space-y-4">
                {answeredPreview.map((item, index) => (
                  <div key={`${item.question}-${index}`} className="space-y-3">
                    <div className="mr-auto max-w-[88%] rounded-lg border border-white/[0.06] bg-black/20 p-3">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">CREEDA asked</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">{item.question}</p>
                    </div>
                    <div className="ml-auto max-w-[88%] rounded-lg bg-white text-slate-950 p-3">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">You</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 font-medium">{item.answer}</p>
                    </div>
                  </div>
                ))}

                <div className="mr-auto max-w-[88%] rounded-lg border border-cyan-300/15 bg-cyan-300/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/70">CREEDA</p>
                  <p className="mt-2 text-base font-bold leading-6 text-white">{currentQuestion.prompt}</p>
                  {currentQuestion.helperText && <p className="mt-2 text-sm leading-6 text-cyan-50/70">{currentQuestion.helperText}</p>}
                </div>
              </div>

              <form onSubmit={handleOpenAnswerSubmit} className="mt-6">
                <label htmlFor="diagnostic-chat-answer" className="sr-only">
                  Answer CREEDA follow-up question
                </label>
                <textarea
                  id="diagnostic-chat-answer"
                  value={chatAnswer}
                  onChange={(event) => setChatAnswer(event.target.value)}
                  placeholder="Answer naturally. One or two sentences is enough."
                  className="min-h-32 w-full resize-none rounded-lg border border-white/[0.1] bg-black/25 p-4 text-base text-white outline-none placeholder:text-white/30 focus:border-cyan-300/50"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || chatAnswer.trim().length < 2}
                  className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                  {questionIndex < questions.length - 1 ? 'Send answer' : 'Choose my movement screen'}
                </button>
              </form>

              <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-50/80">
                This is movement guidance only. If symptoms are sharp, worsening, swollen, numb, locked, or unsafe, stop and seek a qualified professional.
              </div>
            </div>
          </section>
        )}

        {step === 'blocked' && safety && (
          <section className="mx-auto max-w-2xl rounded-lg border border-rose-300/25 bg-rose-500/10 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 h-6 w-6 text-rose-200" />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-100/75">Stop test</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight">Do not run a movement screen right now</h2>
                <p className="mt-3 text-sm leading-6 text-rose-50/85">{safety.resultMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={resetFlow}
              className="mt-5 min-h-11 rounded-lg border border-white/[0.1] px-4 py-2 text-sm font-bold text-white"
            >
              Start over
            </button>
          </section>
        )}

        {step === 'instructions' && prescribedTest && (
          <section className="grid gap-5 lg:grid-cols-[1.05fr_0.85fr]">
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200/70">Prescribed screen</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">{prescribedTest.displayName}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{prescribedTest.prescriptionReason}</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <InfoTile icon={<Camera className="h-5 w-5" />} label="Camera" value="Back camera" />
                <InfoTile icon={<Target className="h-5 w-5" />} label="Angle" value={`${prescribedTest.requiredView} view`} />
              </div>

              <div className="mt-5 space-y-3">
                {prescribedTest.definition.instructions.map((instruction) => (
                  <div key={instruction} className="flex gap-3 rounded-lg border border-white/[0.06] bg-black/20 p-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <p className="text-sm text-slate-200">{instruction}</p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setStep('capture')}
                className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-300 px-4 py-3 text-sm font-black text-slate-950"
              >
                Continue to camera setup
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <aside className="space-y-4">
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Phone setup</p>
                <div className="mt-4 space-y-3">
                  {prescribedTest.definition.cameraSetup.map((item) => (
                    <p key={item} className="text-sm leading-6 text-slate-300">{item}</p>
                  ))}
                </div>
              </div>
              {prescribedTest.safetyNotes.length > 0 && (
                <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-100/80">Safety notes</p>
                  <div className="mt-3 space-y-2">
                    {prescribedTest.safetyNotes.map((flag) => (
                      <p key={flag.key} className="text-sm leading-6 text-amber-50/85">{flag.message}</p>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </section>
        )}

        {step === 'capture' && prescribedTest && (
          <section className="mx-auto max-w-2xl">
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200/70">Camera setup</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">Record one clean {prescribedTest.requiredView}-view clip</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Use the back camera. Keep the full body visible. Record only the prescribed test, then CREEDA will analyze it locally before saving the diagnostic result.
              </p>

              <div className="mt-5 rounded-lg border border-dashed border-cyan-300/25 bg-cyan-300/10 p-5 text-center">
                <Camera className="mx-auto h-10 w-10 text-cyan-200" />
                <p className="mt-3 text-sm font-bold text-white">Back camera by default</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">On mobile, this opens the native camera. On desktop, choose a short recorded clip.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                  aria-label="Record diagnostic video"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950"
                >
                  <Camera className="h-4 w-4" />
                  Record or choose video
                </button>
              </div>

              <button
                type="button"
                onClick={loadPrescribedTest}
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/[0.08] px-4 py-2 text-sm font-bold text-white/75"
              >
                <RefreshCw className="h-4 w-4" />
                Reload test instructions
              </button>
            </div>
          </section>
        )}

        {step === 'processing' && (
          <section className="mx-auto max-w-2xl rounded-lg border border-white/[0.08] bg-white/[0.03] p-5">
            <div className="flex items-start gap-3">
              <Loader2 className="mt-1 h-6 w-6 animate-spin text-cyan-200" />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200/70">Processing</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight">Building your movement plan</h2>
                {clipMetadata && (
                  <p className="mt-2 text-sm text-white/45">
                    Clip loaded. {Math.round(clipMetadata.durationSec)} seconds, {clipMetadata.width}x{clipMetadata.height}.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 h-2 rounded-full bg-white/[0.06]">
              <div className="h-2 rounded-full bg-cyan-300 transition-all" style={{ width: `${Math.min(100, analysisProgress)}%` }} />
            </div>

            <div className="mt-5 grid gap-3">
              {processingSteps.map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-black/20 p-3">
                  <span className={`grid h-7 w-7 place-items-center rounded-lg ${index <= processingIndex ? 'bg-cyan-300 text-slate-950' : 'bg-white/[0.06] text-white/35'}`}>
                    {index < processingIndex ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                  <span className="text-sm font-semibold capitalize text-slate-200">{item}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {step === 'results' && result && (
          <DiagnosticResultView
            result={result}
            onRetest={resetFlow}
            scanHref={scanHref}
            homeHref={homeHref}
          />
        )}

        {step === 'history' && (
          <section className="mx-auto max-w-3xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">History</p>
                <h2 className="text-2xl font-black tracking-tight">Prior diagnostics</h2>
              </div>
              <button
                type="button"
                onClick={resetFlow}
                className="min-h-10 rounded-lg border border-white/[0.08] px-3 text-sm font-bold text-white/75"
              >
                New
              </button>
            </div>

            {loading ? (
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-5 text-sm text-white/55">Loading...</div>
            ) : history.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/[0.08] bg-white/[0.02] p-6 text-center">
                <ClipboardList className="mx-auto h-9 w-9 text-white/30" />
                <p className="mt-3 text-sm text-white/50">No diagnostic sessions yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void reopenResult(item.id)}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] p-4 text-left transition hover:border-cyan-300/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-white">{item.complaintText}</p>
                        <p className="mt-1 text-xs text-white/40">
                          {new Date(item.createdAt).toLocaleDateString()} / {item.primaryBucket.replace(/_/g, ' ')}
                        </p>
                        {item.keyFinding && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-300">{item.keyFinding}</p>}
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
      <div className="flex items-center gap-2 text-cyan-200">
        {icon}
        <span className="text-xs font-black uppercase tracking-[0.16em] text-white/35">{label}</span>
      </div>
      <p className="mt-2 text-sm font-bold capitalize text-white">{value}</p>
    </div>
  )
}

function DiagnosticResultView({
  result,
  onRetest,
  scanHref,
  homeHref,
}: {
  result: DiagnosticResultPayload
  onRetest: () => void
  scanHref: string
  homeHref: string
}) {
  const scores = result.movementScores?.relevantScores || []
  const contributors = result.interpretation?.likelyContributors || []
  const plan = result.actionPlan
  const cautionFlags = result.interpretation?.cautionFlags?.length ? result.interpretation.cautionFlags : result.safety.flags.filter((flag) => flag.severity !== 'info')

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/80">What we found</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">{result.prescribedTest?.displayName || 'Movement screen'} result</h2>
        <p className="mt-3 text-sm leading-6 text-cyan-50/90">{result.interpretation?.summaryText || result.safety.resultMessage}</p>
        <p className="mt-3 text-xs text-cyan-50/60">
          Confidence: {result.movementScores?.confidenceLabel || 'limited'} {result.confidenceScore !== null ? `(${Math.round(result.confidenceScore * 100)}%)` : ''}
        </p>
      </div>

      <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Movement scores</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-white/[0.08] bg-black/20 p-4">
            <p className="text-xs text-white/40">Overall</p>
            <p className={`mt-2 text-3xl font-black ${scoreTone(result.movementScores?.overall ?? null)}`}>
              {result.movementScores?.overall ?? '--'}%
            </p>
          </div>
          {scores.map((score) => (
            <div key={score.key} className="rounded-lg border border-white/[0.08] bg-black/20 p-4">
              <p className="text-xs text-white/40">{score.label}</p>
              <p className={`mt-2 text-3xl font-black ${scoreTone(score.value)}`}>
                {score.value === null ? '--' : `${score.value}%`}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Likely contributors</p>
        <div className="mt-4 space-y-3">
          {contributors.map((item) => (
            <div key={item.title} className="rounded-lg border border-white/[0.08] bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-white">{item.title}</p>
                <span className="rounded-lg border border-white/[0.08] px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white/45">
                  {item.priority}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.explanation}</p>
            </div>
          ))}
        </div>
      </div>

      {plan && (
        <>
          <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100/80">What to do next today</p>
            <div className="mt-4 space-y-2">
              {plan.doThisNow.map((item) => (
                <p key={item} className="flex gap-3 text-sm leading-6 text-emerald-50/90">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-200" />
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">7 to 14 day focus plan</p>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {plan.drills.map((drill) => (
                <div key={drill.title} className="rounded-lg border border-white/[0.08] bg-black/20 p-4">
                  <p className="text-sm font-bold text-white">{drill.title}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-300">{drill.why}</p>
                  <p className="mt-3 text-xs font-bold text-cyan-200">{drill.dosage}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Training and recovery adjustment</p>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <GuidanceList title="Training modification" items={plan.loadModification} icon={<Activity className="h-4 w-4" />} />
              <GuidanceList title="Recovery suggestion" items={plan.recoveryGuidance} icon={<RefreshCw className="h-4 w-4" />} />
            </div>
            <p className="mt-4 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-50/85">
              {plan.retestRecommendation}
            </p>
          </div>
        </>
      )}

      <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-100/80">Caution / professional escalation</p>
        <div className="mt-4 space-y-2">
          {(cautionFlags.length ? cautionFlags : [{ key: 'default', message: result.safety.resultMessage }]).map((flag) => (
            <p key={flag.key} className="flex gap-3 text-sm leading-6 text-amber-50/90">
              <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-200" />
              {flag.message}
            </p>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={onRetest}
          className="min-h-12 rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950"
        >
          Retest
        </button>
        <Link
          href={scanHref}
          className="flex min-h-12 items-center justify-center rounded-lg border border-white/[0.08] px-4 py-3 text-sm font-bold text-white/75"
        >
          Open video analysis
        </Link>
        <Link
          href={homeHref}
          className="flex min-h-12 items-center justify-center rounded-lg border border-white/[0.08] px-4 py-3 text-sm font-bold text-white/75"
        >
          Diagnostic home
        </Link>
      </div>
    </section>
  )
}

function GuidanceList({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-black/20 p-4">
      <div className="flex items-center gap-2 text-cyan-200">
        {icon}
        <p className="text-sm font-bold text-white">{title}</p>
      </div>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <p key={item} className="text-sm leading-6 text-slate-300">{item}</p>
        ))}
      </div>
    </div>
  )
}
