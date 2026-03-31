import { z } from 'zod'
import type { HealthDataModel, HealthSyncPayload, HealthSource } from './types'

const sourceSchema = z.enum(['apple', 'android'])

const healthDataItemSchema = z.object({
  date: z.string().min(1),
  steps: z.number(),
  sleep_hours: z.number(),
  heart_rate_avg: z.number(),
  hrv: z.number(),
  source: sourceSchema,
})

const healthSyncPayloadSchema = z.object({
  user_id: z.string().uuid().optional(),
  data: z.array(healthDataItemSchema).min(1).max(31),
})

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function normalizeDate(input: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input
  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${input}`)
  }
  return parsed.toISOString().slice(0, 10)
}

function normalizeItem(item: HealthDataModel): HealthDataModel {
  return {
    date: normalizeDate(item.date),
    steps: Math.round(clamp(item.steps, 0, 200000)),
    sleep_hours: Number(clamp(item.sleep_hours, 0, 24).toFixed(2)),
    heart_rate_avg: Number(clamp(item.heart_rate_avg, 0, 260).toFixed(2)),
    hrv: Number(clamp(item.hrv, 0, 400).toFixed(2)),
    source: item.source,
  }
}

export function parseAndNormalizeHealthSyncPayload(rawPayload: unknown) {
  const parsed = healthSyncPayloadSchema.safeParse(rawPayload)
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.flatten(),
    }
  }

  const normalizedMap = new Map<string, HealthDataModel>()
  for (const item of parsed.data.data) {
    const normalized = normalizeItem(item)
    normalizedMap.set(`${normalized.date}::${normalized.source}`, normalized)
  }

  const normalizedData = [...normalizedMap.values()].sort((a, b) => {
    if (a.date === b.date) return a.source.localeCompare(b.source)
    return a.date.localeCompare(b.date)
  })

  return {
    ok: true as const,
    payload: {
      user_id: parsed.data.user_id,
      data: normalizedData,
    } satisfies HealthSyncPayload,
  }
}

export function inferSources(items: Array<{ source: HealthSource }>) {
  return {
    hasApple: items.some((item) => item.source === 'apple'),
    hasAndroid: items.some((item) => item.source === 'android'),
  }
}
