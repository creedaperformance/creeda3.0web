import type { FlowKind, UserType } from '@/forms/types'

export const ADAPTIVE_ENTRY_SOURCE_QUERY_KEY = 'adaptive_source'
export const ADAPTIVE_ENTRY_MODE_QUERY_KEY = 'adaptive_entry'
export const PROFILE_ACCURACY_CARD_SOURCE = 'profile_accuracy_card'

export const ADAPTIVE_FORM_EVENT_NAMES = [
  'adaptive_form_opened',
  'adaptive_form_step_viewed',
  'adaptive_form_step_completed',
  'adaptive_form_completed',
  'adaptive_enrichment_opened',
  'adaptive_next_question_resolved',
] as const

export type AdaptiveEntryMode = 'direct' | 'enrichment'
export type AdaptiveFormEventName = (typeof ADAPTIVE_FORM_EVENT_NAMES)[number]

export interface AdaptiveFormEventInput {
  eventName: AdaptiveFormEventName
  role: UserType
  flowId: string
  flowVersion?: string | null
  flowKind?: FlowKind | null
  sessionId: string
  stepId?: string | null
  questionId?: string | null
  entrySource?: string | null
  entryMode?: AdaptiveEntryMode | null
  eventProperties?: Record<string, unknown>
}

type SearchParamValue = string | string[] | undefined
type SearchParamsLike = Record<string, SearchParamValue> | null | undefined

function firstValue(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0] ?? null
  return typeof value === 'string' ? value : null
}

export function buildAdaptiveEntryHref(
  baseHref: string,
  options: {
    entrySource?: string | null
    entryMode?: AdaptiveEntryMode
  } = {}
) {
  const url = new URL(baseHref, 'https://creeda.local')

  if (options.entrySource) {
    url.searchParams.set(ADAPTIVE_ENTRY_SOURCE_QUERY_KEY, options.entrySource)
  }

  if (options.entryMode) {
    url.searchParams.set(ADAPTIVE_ENTRY_MODE_QUERY_KEY, options.entryMode)
  }

  return `${url.pathname}${url.search}${url.hash}`
}

export function parseAdaptiveEntryContext(searchParams?: SearchParamsLike) {
  const rawSource = firstValue(searchParams?.[ADAPTIVE_ENTRY_SOURCE_QUERY_KEY])
  const rawMode = firstValue(searchParams?.[ADAPTIVE_ENTRY_MODE_QUERY_KEY])

  return {
    entrySource: rawSource ?? 'direct',
    entryMode: rawMode === 'enrichment' ? 'enrichment' : 'direct',
  } as const
}
