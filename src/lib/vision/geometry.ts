import { NormalizedLandmark } from '@mediapipe/tasks-vision'

// Type definitions
export interface Vector3D {
  x: number
  y: number
  z: number
}

// History buffer for temporal smoothing (X frames)
export class LandmarkSmoother {
  private bufferSize: number
  private history: NormalizedLandmark[][] = []

  constructor(bufferSize = 3) {
    this.bufferSize = bufferSize
  }

  // Add the latest frame's landmarks and return the smoothed result
  public smooth(landmarks: NormalizedLandmark[]): NormalizedLandmark[] {
    if (!landmarks || landmarks.length === 0) return []

    this.history.push(landmarks)
    if (this.history.length > this.bufferSize) {
      this.history.shift()
    }

    if (this.history.length === 1) return landmarks

    // Calculate the average for each landmark (33 landmarks in Pose)
    const smoothed: NormalizedLandmark[] = []
    const numLandmarks = landmarks.length
    const numFrames = this.history.length

    for (let i = 0; i < numLandmarks; i++) {
      let sumX = 0, sumY = 0, sumZ = 0, sumVisibility = 0

      for (let j = 0; j < numFrames; j++) {
        const point = this.history[j][i]
        sumX += point.x
        sumY += point.y
        sumZ += point.z
        sumVisibility += point.visibility || 0
      }

      smoothed.push({
        x: sumX / numFrames,
        y: sumY / numFrames,
        z: sumZ / numFrames,
        visibility: sumVisibility / numFrames,
      })
    }

    return smoothed
  }

  public reset() {
    this.history = []
  }
}

// -------------------------------------------------------------
// Angular Calculations
// -------------------------------------------------------------

/**
 * Calculate the full 3D angle between three points (a, b, c) where b is the vertex.
 * Returns angle in degrees.
 */
export function calculateAngle3D(a: Vector3D, b: Vector3D, c: Vector3D): number {
  // Vector AB (from b to a)
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
  // Vector CB (from b to c)
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z }

  // Dot product
  const dotProduct = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z

  // Magnitudes
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z)
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z)

  if (mag1 === 0 || mag2 === 0) return 0

  // Ensure cosine is between -1 and 1 to prevent NaN from acos due to rounding errors
  let cosine = dotProduct / (mag1 * mag2)
  cosine = Math.max(-1, Math.min(1, cosine))

  // Convert to degrees
  return Math.acos(cosine) * (180 / Math.PI)
}

/**
 * Calculate the 2D angle (XY plane projection)
 */
export function calculateAngle2D(a: Vector3D, b: Vector3D, c: Vector3D): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let angle = Math.abs(radians * (180.0 / Math.PI))
  if (angle > 180.0) {
    angle = 360.0 - angle
  }
  return angle
}
