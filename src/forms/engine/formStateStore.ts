export interface StoredFormDraft {
  version: string
  savedAt: string
  answers: Record<string, unknown>
}

export function getDraftStorageKey(flowId: string, userId?: string | null) {
  return userId ? `creeda:forms:${flowId}:${userId}` : `creeda:forms:${flowId}:guest`
}

export function readDraft(flowId: string, userId?: string | null): StoredFormDraft | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(getDraftStorageKey(flowId, userId))
    if (!raw) return null
    return JSON.parse(raw) as StoredFormDraft
  } catch {
    return null
  }
}

export function writeDraft(flowId: string, version: string, answers: Record<string, unknown>, userId?: string | null) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(
    getDraftStorageKey(flowId, userId),
    JSON.stringify({
      version,
      answers,
      savedAt: new Date().toISOString(),
    } satisfies StoredFormDraft)
  )
}

export function clearDraft(flowId: string, userId?: string | null) {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(getDraftStorageKey(flowId, userId))
}
