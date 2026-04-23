import type { Prisma } from '@prisma/client'

import { logResearchEvent } from '@/lib/research/logging'
import {
  normalizeAgeGroup,
  normalizePopulation,
  normalizeSexGroup,
  normalizeSport,
  normalizeStudyType,
  parseSampleSize,
} from '@/lib/research/taxonomy'
import type { SourcePaperRecord } from '@/lib/research/types'

export function toJsonValue(value: unknown) {
  return value as Prisma.InputJsonValue
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function stripTags(value: string | null | undefined) {
  if (!value) return null
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function fetchWithRetry<T>(
  label: string,
  action: () => Promise<T>,
  retryAttempts = 3,
  minIntervalMs = 250
) {
  let lastError: unknown
  for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
    try {
      if (attempt > 1) {
        logResearchEvent('warn', `${label}.retry`, { attempt })
      }
      return await action()
    } catch (error) {
      lastError = error
      if (attempt < retryAttempts) {
        await sleep(minIntervalMs * attempt)
      }
    }
  }

  throw lastError
}

export function inferMetadataFromText(title?: string | null, abstract?: string | null) {
  const haystack = `${title || ''} ${abstract || ''}`.trim()
  return {
    studyType: normalizeStudyType(haystack),
    sport: normalizeSport(haystack),
    population: normalizePopulation(haystack),
    ageGroup: normalizeAgeGroup(haystack),
    sexGroup: normalizeSexGroup(haystack),
    sampleSize: parseSampleSize(haystack),
  }
}

export function buildSourceRecord(args: SourcePaperRecord): SourcePaperRecord {
  const inferred = inferMetadataFromText(args.title, args.abstract)
  return {
    ...args,
    studyType: args.studyType || inferred.studyType,
    sport: args.sport || inferred.sport,
    population: args.population || inferred.population,
    ageGroup: args.ageGroup || inferred.ageGroup,
    sexGroup: args.sexGroup || inferred.sexGroup,
    sampleSize: args.sampleSize || inferred.sampleSize,
  }
}
