import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

type MediaPipeDelegate = 'CPU' | 'GPU'
type DebugRendererInfo = {
  UNMASKED_RENDERER_WEBGL: number
}

const MEDIAPIPE_TASKS_VERSION = '0.10.34'
const MEDIAPIPE_WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_TASKS_VERSION}/wasm`

function describeError(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}

export class MediaPipeEngine {
  private static instance: MediaPipeEngine
  private landmarker: PoseLandmarker | null = null
  private initPromise: Promise<PoseLandmarker> | null = null
  private vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>> | null = null
  private activeDelegate: MediaPipeDelegate | null = null
  private lastInitError: string | null = null
  private gpuSupported = false
  private fallbackUsed = false

  private constructor() {}

  public static getInstance(): MediaPipeEngine {
    if (!MediaPipeEngine.instance) {
      MediaPipeEngine.instance = new MediaPipeEngine()
    }
    return MediaPipeEngine.instance
  }

  public async initialize(preferredDelegates?: MediaPipeDelegate[]): Promise<PoseLandmarker> {
    if (this.landmarker) return this.landmarker
    if (this.initPromise) return this.initPromise

    this.gpuSupported = this.checkGpuSupport()
    const delegates: MediaPipeDelegate[] = preferredDelegates?.length
      ? preferredDelegates
      : this.gpuSupported
        ? ['GPU', 'CPU']
        : ['CPU']

    this.initPromise = (async () => {
      const vision = await this.getVisionFileset()
      const errors: string[] = []

      for (const [index, delegate] of delegates.entries()) {
        try {
          console.log(`[MediaPipe] Loading Pose model with ${delegate} delegate...`)

          const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: '/models/pose_landmark_lite.task',
              delegate,
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          })

          this.landmarker = poseLandmarker
          this.activeDelegate = delegate
          this.fallbackUsed = index > 0
          this.lastInitError = null
          console.log(
            this.fallbackUsed
              ? `[MediaPipe] Ready in compatibility mode (${delegate}).`
              : `[MediaPipe] Ready with ${delegate} delegate.`
          )

          return poseLandmarker
        } catch (error) {
          const message = describeError(error)
          errors.push(`${delegate}: ${message}`)
          console.warn(`[MediaPipe] ${delegate} delegate failed:`, error)
          this.disposeLandmarker()
        }
      }

      this.lastInitError = errors.join(' | ')
      throw new Error(this.lastInitError)
    })()

    try {
      return await this.initPromise
    } catch (error) {
      this.initPromise = null
      throw error
    }
  }

  public detect(videoElement: HTMLVideoElement, timestampMs: number) {
    if (!this.landmarker) {
      throw new Error('Landmarker not initialized. Call initialize() first.')
    }
    return this.landmarker.detectForVideo(videoElement, timestampMs)
  }

  public async recoverFromRuntimeFailure(error: unknown) {
    if (!this.isGpuRelatedFailure(error) || this.activeDelegate !== 'GPU') {
      return false
    }

    console.warn('[MediaPipe] GPU runtime failure detected, retrying in CPU mode...')
    this.reset()

    try {
      await this.initialize(['CPU'])
      return true
    } catch (recoveryError) {
      this.lastInitError = describeError(recoveryError)
      return false
    }
  }

  public getStatus() {
    return {
      isReady: this.landmarker !== null,
      delegate: this.activeDelegate,
      gpuSupported: this.gpuSupported,
      fallbackUsed: this.fallbackUsed,
      lastInitError: this.lastInitError,
    }
  }

  public isReady() {
    return this.landmarker !== null
  }

  public reset() {
    this.disposeLandmarker()
    this.initPromise = null
    this.activeDelegate = null
    this.fallbackUsed = false
  }

  private async getVisionFileset() {
    if (!this.vision) {
      console.log('[MediaPipe] Downloading WASM core...')
      this.vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_ROOT)
    }
    return this.vision
  }

  private disposeLandmarker() {
    if (this.landmarker) {
      this.landmarker.close()
      this.landmarker = null
    }
  }

  private checkGpuSupport() {
    if (typeof document === 'undefined') return false
    if (typeof navigator !== 'undefined') {
      const userAgent = navigator.userAgent.toLowerCase()
      if (navigator.webdriver || userAgent.includes('headless')) return false
    }

    const canvas = document.createElement('canvas')
    const gl = (
      canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ||
      canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true }) ||
      canvas.getContext('experimental-webgl', { failIfMajorPerformanceCaveat: true })
    ) as WebGLRenderingContext | WebGL2RenderingContext | null
    if (!gl) return false

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info') as DebugRendererInfo | null
    const renderer = String(
      debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
    ).toLowerCase()

    return !['swiftshader', 'software', 'llvmpipe', 'softpipe'].some((token) => renderer.includes(token))
  }

  private isGpuRelatedFailure(error: unknown) {
    const message = describeError(error).toLowerCase()
    return (
      message.includes('kgpuservice') ||
      message.includes('webgl') ||
      message.includes('activetexture') ||
      message.includes('emscripten_gl') ||
      message.includes('graphics acceleration') ||
      message.includes('context') ||
      message.includes('startgraph failed')
    )
  }
}
