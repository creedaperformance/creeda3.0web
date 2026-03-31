import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export class MediaPipeEngine {
  private static instance: MediaPipeEngine;
  private landmarker: PoseLandmarker | null = null;
  private isInitializing = false;
  private initPromise: Promise<PoseLandmarker> | null = null;

  private constructor() {}

  public static getInstance(): MediaPipeEngine {
    if (!MediaPipeEngine.instance) {
      MediaPipeEngine.instance = new MediaPipeEngine();
    }
    return MediaPipeEngine.instance;
  }

  /**
   * Lazily loads the WASM backend and initializes the Pose model.
   * Caches the promise to prevent multiple concurrent loads.
   */
  public async initialize(): Promise<PoseLandmarker> {
    if (this.landmarker) return this.landmarker;
    if (this.initPromise) return this.initPromise;

    this.isInitializing = true;

    this.initPromise = (async () => {
      try {
        console.log('[MediaPipe] Downloading WASM core...');
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
        );
        
        console.log('[MediaPipe] Loading Lite Model...');
        // We use the lite model from the public directory (which we downloaded in the build step)
        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/models/pose_landmark_lite.task',
            delegate: "GPU" // Attempt GPU hardware acceleration, fallback to CPU
          },
          runningMode: "VIDEO", // Optimized for video streams
          numPoses: 1, // Restrict to single dominant person per the optimization requirement
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        this.landmarker = poseLandmarker;
        this.isInitializing = false;
        console.log('[MediaPipe] Ready.');
        return poseLandmarker;
      } catch (error) {
        this.isInitializing = false;
        this.initPromise = null;
        console.error('[MediaPipe] Initialization failed:', error);
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Directly passes a video frame timestamp to the model.
   * Use this inside requestAnimationFrame.
   */
  public detect(videoElement: HTMLVideoElement, timestampMs: number) {
    if (!this.landmarker) {
      throw new Error("Landmarker not initialized. Call initialize() first.");
    }
    return this.landmarker.detectForVideo(videoElement, timestampMs);
  }

  public isReady() {
    return this.landmarker !== null;
  }
}
