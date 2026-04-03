export const MIN_VIDEO_ANALYSIS_SECONDS = 5
export const MAX_VIDEO_ANALYSIS_SECONDS = 20
export const MIN_VIDEO_ANALYSIS_DIMENSION = 240
export const MIN_VIDEO_ANALYSIS_BYTES = 24 * 1024
export const MAX_VIDEO_ANALYSIS_BYTES = 150 * 1024 * 1024

const SUPPORTED_VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
])

const SUPPORTED_VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'qt', 'webm', 'm4v'])

export interface ClipMetadata {
  durationSec: number
  width: number
  height: number
}

function getFileExtension(fileName: string) {
  const parts = String(fileName || '').toLowerCase().split('.')
  return parts.length > 1 ? parts.pop() || '' : ''
}

export function validateClipFile(file: File) {
  const mimeType = String(file.type || '').toLowerCase()
  const extension = getFileExtension(file.name)

  if (!SUPPORTED_VIDEO_MIME_TYPES.has(mimeType) && !SUPPORTED_VIDEO_EXTENSIONS.has(extension)) {
    return 'Upload an MP4, MOV, or WEBM clip'
  }

  if (file.size < MIN_VIDEO_ANALYSIS_BYTES) {
    return 'This clip is too small to analyze reliably'
  }

  if (file.size > MAX_VIDEO_ANALYSIS_BYTES) {
    return 'This clip is too large. Keep it under 150 MB'
  }

  return null
}

export async function loadClipMetadata(objectUrl: string): Promise<ClipMetadata> {
  return await new Promise<ClipMetadata>((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.playsInline = true

    const cleanup = () => {
      video.removeAttribute('src')
      video.load()
    }

    video.onloadedmetadata = () => {
      const metadata = {
        durationSec: Number(video.duration || 0),
        width: Number(video.videoWidth || 0),
        height: Number(video.videoHeight || 0),
      }
      cleanup()
      resolve(metadata)
    }

    video.onerror = () => {
      cleanup()
      reject(new Error('metadata-load-failed'))
    }

    video.src = objectUrl
  })
}

export function validateClipMetadata(metadata: ClipMetadata) {
  if (!Number.isFinite(metadata.durationSec) || metadata.durationSec <= 0) {
    return 'CREEDA could not read this video file'
  }

  if (metadata.durationSec < MIN_VIDEO_ANALYSIS_SECONDS) {
    return `Record at least ${MIN_VIDEO_ANALYSIS_SECONDS} seconds so CREEDA can see a repeatable movement`
  }

  if (metadata.durationSec > MAX_VIDEO_ANALYSIS_SECONDS) {
    return `Trim the clip to ${MAX_VIDEO_ANALYSIS_SECONDS} seconds or less so the analysis stays focused`
  }

  if (metadata.width < MIN_VIDEO_ANALYSIS_DIMENSION || metadata.height < MIN_VIDEO_ANALYSIS_DIMENSION) {
    return 'This clip resolution is too low. Re-record with the full body clearly visible'
  }

  return null
}

export function formatClipDuration(durationSec: number) {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return '0.0s'
  return `${durationSec.toFixed(1)}s`
}

export function formatClipResolution(metadata: Pick<ClipMetadata, 'width' | 'height'>) {
  return `${Math.round(metadata.width)}×${Math.round(metadata.height)}`
}
