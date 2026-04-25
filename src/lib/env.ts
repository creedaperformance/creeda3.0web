import * as z from 'zod'

export const DEFAULT_SITE_URL = 'https://www.creeda.in'

const publicSupabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL.'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required.'),
})

const adminSupabaseEnvSchema = publicSupabaseEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required for admin access.'),
})

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required.'),
})

function formatIssues(result: z.ZodError) {
  return result.issues.map((issue) => issue.message).join(' ')
}

function normalizeEnvValue(value: string | undefined) {
  const trimmed = value?.trim() || ''
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }

  return trimmed
}

function normalizeSupabaseProjectUrl(value: string | undefined) {
  const normalized = normalizeEnvValue(value)
  if (!normalized) return normalized

  try {
    return new URL(normalized).origin
  } catch {
    return normalized
  }
}

export function getSupabaseProjectRef(supabaseUrl: string) {
  try {
    return new URL(supabaseUrl).hostname.split('.')[0] || 'unknown'
  } catch {
    return 'unknown'
  }
}

export function getPublicSupabaseEnv() {
  const parsed = publicSupabaseEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: normalizeSupabaseProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  })
  if (!parsed.success) {
    throw new Error(`Invalid public Supabase environment configuration. ${formatIssues(parsed.error)}`)
  }

  return parsed.data
}

export function getAdminSupabaseEnv() {
  const parsed = adminSupabaseEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: normalizeSupabaseProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY),
  })
  if (!parsed.success) {
    throw new Error(`Invalid admin Supabase environment configuration. ${formatIssues(parsed.error)}`)
  }

  return parsed.data
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim())
}

export function getDatabaseUrl() {
  const parsed = databaseEnvSchema.safeParse({
    DATABASE_URL: normalizeEnvValue(process.env.DATABASE_URL),
  })
  if (!parsed.success) {
    throw new Error(`Invalid database configuration. ${formatIssues(parsed.error)}`)
  }

  return parsed.data.DATABASE_URL
}

export function getSiteUrl() {
  const candidate = normalizeEnvValue(process.env.NEXT_PUBLIC_SITE_URL)
  if (!candidate) return DEFAULT_SITE_URL

  const parsed = z.string().url().safeParse(candidate)
  if (!parsed.success) return DEFAULT_SITE_URL

  return parsed.data.replace(/\/+$/, '')
}
