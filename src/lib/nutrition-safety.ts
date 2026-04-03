import type { TrustSignalStatus } from '@/lib/engine/types'

export const NUTRITION_SAFETY_TABLE = 'user_dietary_constraints'

export type NutritionDietType = 'omnivore' | 'veg' | 'vegan' | 'jain'
export type NutritionAllergyStatus = 'unknown' | 'none' | 'has_allergies'
export type NutritionMedicalStatus = 'unknown' | 'none' | 'has_conditions'
export type NutritionBudgetTier = 'budget' | 'standard' | 'performance'
export type NutritionFoodSetup = 'home_kitchen' | 'hostel_canteen' | 'mixed' | 'travel_heavy'
export type NutritionCookingAccess = 'full_kitchen' | 'basic_reheat' | 'minimal'
export type NutritionIndiaRegion = 'north' | 'south' | 'west' | 'east' | 'central' | 'north_east'

interface SupabaseMaybeSingleResult {
  data: unknown
  error: unknown
}

interface SupabaseEqQuery {
  maybeSingle: () => Promise<SupabaseMaybeSingleResult>
}

interface SupabaseSelectQuery {
  eq: (column: string, value: string) => SupabaseEqQuery
}

interface SupabaseUpsertSelectQuery {
  maybeSingle: () => Promise<SupabaseMaybeSingleResult>
}

interface SupabaseUpsertQuery {
  select: (columns: string) => SupabaseUpsertSelectQuery
}

interface SupabaseTableQuery {
  select: (columns: string) => SupabaseSelectQuery
  upsert: (
    payload: Record<string, unknown>,
    options: { onConflict: string }
  ) => SupabaseUpsertQuery
}

type SupabaseLike = {
  from: (table: string) => SupabaseTableQuery
}

export interface NutritionSafetySummary {
  dietType: NutritionDietType
  allergyStatus: NutritionAllergyStatus
  allergies: string[]
  dislikes: string[]
  medicalStatus: NutritionMedicalStatus
  medicalConditions: string[]
  medications: string[]
  screeningComplete: boolean
  needsClinicalReview: boolean
  blocksDetailedAdvice: boolean
  budgetTier: NutritionBudgetTier | null
  foodSetup: NutritionFoodSetup | null
  cookingAccess: NutritionCookingAccess | null
  preferredCuisines: string[]
  indiaRegion: NutritionIndiaRegion | null
  trustStatus: TrustSignalStatus
  statusLabel: string
  gateTitle: string
  summary: string
  nextAction: string
}

export interface UpsertNutritionSafetyInput {
  userId: string
  dietType?: string | null
  allergyStatus?: string | null
  allergies?: unknown
  dislikes?: unknown
  medicalStatus?: string | null
  medicalConditions?: unknown
  medications?: unknown
  budgetTier?: string | null
  foodSetup?: string | null
  cookingAccess?: string | null
  preferredCuisines?: unknown
  indiaRegion?: string | null
  completedAt?: string
}

export function getNutritionSafetyRoute(role: 'athlete' | 'individual') {
  return `/${role}/nutrition-safety`
}

export function normalizeNutritionStringList(value: unknown) {
  const list = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,\n]/)
      : []

  return Array.from(
    new Set(
      list
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  )
}

export function extractDiagnosticMedicalConditions(physicalStatus: unknown) {
  if (!physicalStatus || typeof physicalStatus !== 'object') return []

  const record = physicalStatus as Record<string, unknown>
  const hasIllness = String(record.hasIllness || '').trim().toLowerCase()
  const illnesses = normalizeNutritionStringList(record.illnesses)

  if (hasIllness === 'yes') return illnesses
  return illnesses.length ? illnesses : []
}

function normalizeDietType(value: unknown): NutritionDietType {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'veg' || normalized === 'vegan' || normalized === 'jain') return normalized
  return 'omnivore'
}

function normalizeBudgetTier(value: unknown): NutritionBudgetTier | null {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'budget' || normalized === 'standard' || normalized === 'performance') return normalized
  return null
}

function normalizeFoodSetup(value: unknown): NutritionFoodSetup | null {
  const normalized = String(value || '').trim().toLowerCase()
  if (
    normalized === 'home_kitchen' ||
    normalized === 'hostel_canteen' ||
    normalized === 'mixed' ||
    normalized === 'travel_heavy'
  ) {
    return normalized
  }
  return null
}

function normalizeCookingAccess(value: unknown): NutritionCookingAccess | null {
  const normalized = String(value || '').trim().toLowerCase()
  if (
    normalized === 'full_kitchen' ||
    normalized === 'basic_reheat' ||
    normalized === 'minimal'
  ) {
    return normalized
  }
  return null
}

function normalizeIndiaRegion(value: unknown): NutritionIndiaRegion | null {
  const normalized = String(value || '').trim().toLowerCase()
  if (
    normalized === 'north' ||
    normalized === 'south' ||
    normalized === 'west' ||
    normalized === 'east' ||
    normalized === 'central' ||
    normalized === 'north_east'
  ) {
    return normalized
  }
  return null
}

function normalizeCuisinePreferenceList(value: unknown) {
  return Array.from(
    new Set(
      normalizeNutritionStringList(value)
        .map((item) =>
          String(item || '')
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, '_')
        )
        .filter(Boolean)
    )
  )
}

function regionToCuisineFallback(region: NutritionIndiaRegion | null) {
  if (region === 'north') return 'north_indian'
  if (region === 'south') return 'south_indian'
  if (region === 'west') return 'west_indian'
  if (region === 'east') return 'east_indian'
  if (region === 'north_east') return 'north_east_indian'
  if (region === 'central') return 'north_indian'
  return null
}

function isMissingColumnError(error: unknown, column: string) {
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String((error as { message?: unknown }).message || '')
      : String(error || '')

  const normalized = message.toLowerCase()
  return (
    normalized.includes('does not exist') &&
    normalized.includes(column.toLowerCase())
  )
}

function normalizeAllergyStatus(value: unknown, allergies: string[]): NutritionAllergyStatus {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'none' || normalized === 'has_allergies') return normalized
  if (allergies.length > 0) return 'has_allergies'
  return 'unknown'
}

function normalizeMedicalStatus(
  value: unknown,
  medicalConditions: string[],
  medications: string[]
): NutritionMedicalStatus {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'none' || normalized === 'has_conditions') return normalized
  if (medicalConditions.length > 0 || medications.length > 0) return 'has_conditions'
  return 'unknown'
}

export function createNutritionSafetySummary(args?: {
  record?: Record<string, unknown> | null
  fallbackMedicalConditions?: string[]
}): NutritionSafetySummary {
  const record = args?.record || null
  const allergies = normalizeNutritionStringList(record?.allergies)
  const dislikes = normalizeNutritionStringList(record?.dislikes)
  const fallbackMedicalConditions = normalizeNutritionStringList(args?.fallbackMedicalConditions || [])
  const storedMedicalConditions = normalizeNutritionStringList(record?.medical_conditions)
  const medications = normalizeNutritionStringList(record?.medications)
  const medicalConditions = Array.from(new Set([...storedMedicalConditions, ...fallbackMedicalConditions]))
  const allergyStatus = normalizeAllergyStatus(record?.allergy_status, allergies)
  const medicalStatus = normalizeMedicalStatus(record?.medical_status, medicalConditions, medications)
  const budgetTier = normalizeBudgetTier(record?.budget_tier)
  const foodSetup = normalizeFoodSetup(record?.food_setup)
  const cookingAccess = normalizeCookingAccess(record?.cooking_access)
  const indiaRegion = normalizeIndiaRegion(record?.india_region)
  const preferredCuisineValues = normalizeCuisinePreferenceList(record?.preferred_cuisines)
  const fallbackCuisine = regionToCuisineFallback(indiaRegion)
  const preferredCuisines =
    preferredCuisineValues.length > 0
      ? preferredCuisineValues
      : fallbackCuisine
        ? [fallbackCuisine]
        : []

  const allergyAnswered =
    allergyStatus !== 'unknown' &&
    (allergyStatus !== 'has_allergies' || allergies.length > 0)
  const medicalAnswered =
    medicalStatus !== 'unknown' &&
    (medicalStatus !== 'has_conditions' || medicalConditions.length > 0 || medications.length > 0)
  const screeningComplete = allergyAnswered && medicalAnswered
  const needsClinicalReview =
    screeningComplete && (medicalStatus === 'has_conditions' || medications.length > 0)
  const blocksDetailedAdvice = !screeningComplete || needsClinicalReview
  const trustStatus: TrustSignalStatus = !screeningComplete
    ? 'missing'
    : needsClinicalReview
      ? 'limited'
      : 'active'

  if (!screeningComplete) {
    return {
      dietType: normalizeDietType(record?.diet_type),
      allergyStatus,
      allergies,
      dislikes,
      medicalStatus,
      medicalConditions,
      medications,
      screeningComplete,
      needsClinicalReview,
      blocksDetailedAdvice,
      budgetTier,
      foodSetup,
      cookingAccess,
      preferredCuisines,
      indiaRegion,
      trustStatus,
      statusLabel: 'Screening needed',
      gateTitle: 'Complete nutrition safety first',
      summary:
        medicalConditions.length > 0 || medications.length > 0
          ? 'Creeda already has some medical context, but it still needs your explicit allergy and health screening before it can show detailed nutrition advice.'
          : 'Creeda needs your allergy and medical-health answers before it can show detailed nutrition advice.',
      nextAction:
        'Open Nutrition Safety and confirm allergies plus medical health before using personalized meals, fueling, or supplement guidance.',
    }
  }

  if (needsClinicalReview) {
    return {
      dietType: normalizeDietType(record?.diet_type),
      allergyStatus,
      allergies,
      dislikes,
      medicalStatus,
      medicalConditions,
      medications,
      screeningComplete,
      needsClinicalReview,
      blocksDetailedAdvice,
      budgetTier,
      foodSetup,
      cookingAccess,
      preferredCuisines,
      indiaRegion,
      trustStatus,
      statusLabel: 'Clinical caution',
      gateTitle: 'Medical context needs extra caution',
      summary:
        'Creeda has your allergy and health screening, but detailed nutrition advice is paused because medical conditions or ongoing medication could materially change what is safe or appropriate.',
      nextAction:
        'Keep this profile current and use clinician-approved nutrition guidance whenever medical conditions or medication could affect fueling, hydration, or supplement choices.',
    }
  }

  return {
    dietType: normalizeDietType(record?.diet_type),
    allergyStatus,
    allergies,
    dislikes,
    medicalStatus,
    medicalConditions,
    medications,
    screeningComplete,
    needsClinicalReview,
    blocksDetailedAdvice,
    budgetTier,
    foodSetup,
    cookingAccess,
    preferredCuisines,
    indiaRegion,
    trustStatus,
    statusLabel: 'Ready',
    gateTitle: 'Nutrition advice unlocked',
    summary:
      allergies.length > 0
        ? 'Detailed nutrition advice is active and filtered against the allergies you listed.'
        : 'Detailed nutrition advice is active. Update your allergies or health profile whenever something changes.',
    nextAction:
      'Update Nutrition Safety whenever allergies, medications, or other medical-health factors change.',
  }
}

export async function getNutritionSafetySummary(
  supabase: unknown,
  userId: string,
  options?: { fallbackMedicalConditions?: string[] }
) {
  const client = supabase as SupabaseLike
  try {
    const { data, error } = await client
      .from(NUTRITION_SAFETY_TABLE)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      throw error
    }

    return createNutritionSafetySummary({
      record: data as Record<string, unknown> | null,
      fallbackMedicalConditions: options?.fallbackMedicalConditions,
    })
  } catch (error) {
    console.warn('[nutrition-safety] falling back to default summary', error)
    return createNutritionSafetySummary({
      record: null,
      fallbackMedicalConditions: options?.fallbackMedicalConditions,
    })
  }
}

export async function upsertNutritionSafetyProfile(
  supabase: unknown,
  input: UpsertNutritionSafetyInput
) {
  const client = supabase as SupabaseLike
  const allergies = normalizeNutritionStringList(input.allergies)
  const dislikes = normalizeNutritionStringList(input.dislikes)
  const medicalConditions = normalizeNutritionStringList(input.medicalConditions)
  const medications = normalizeNutritionStringList(input.medications)
  const preferredCuisines = normalizeCuisinePreferenceList(input.preferredCuisines)
  const fallbackCuisine = regionToCuisineFallback(normalizeIndiaRegion(input.indiaRegion))
  const normalizedPreferredCuisines =
    preferredCuisines.length > 0
      ? preferredCuisines
      : fallbackCuisine
        ? [fallbackCuisine]
        : []
  const allergyStatus = normalizeAllergyStatus(input.allergyStatus, allergies)
  const medicalStatus = normalizeMedicalStatus(input.medicalStatus, medicalConditions, medications)
  const summary = createNutritionSafetySummary({
    record: {
      diet_type: input.dietType,
      allergy_status: allergyStatus,
      allergies,
      dislikes,
      medical_status: medicalStatus,
      medical_conditions: medicalConditions,
      medications,
      budget_tier: input.budgetTier,
      food_setup: input.foodSetup,
      cooking_access: input.cookingAccess,
      preferred_cuisines: normalizedPreferredCuisines,
      india_region: input.indiaRegion,
    },
  })
  const completedAt = input.completedAt || new Date().toISOString()

  const payload = {
    user_id: input.userId,
    diet_type: normalizeDietType(input.dietType),
    allergy_status: allergyStatus,
    allergies,
    dislikes,
    medical_status: medicalStatus,
    medical_conditions: medicalConditions,
    medications,
    budget_tier: normalizeBudgetTier(input.budgetTier),
    food_setup: normalizeFoodSetup(input.foodSetup),
    cooking_access: normalizeCookingAccess(input.cookingAccess),
    preferred_cuisines: normalizedPreferredCuisines,
    india_region: normalizeIndiaRegion(input.indiaRegion),
    nutrition_safety_completed_at: summary.screeningComplete ? completedAt : null,
    updated_at: completedAt,
  }

  const result = await client
    .from(NUTRITION_SAFETY_TABLE)
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .maybeSingle()

  if (result.error && isMissingColumnError(result.error, 'preferred_cuisines')) {
    const fallbackPayload: Record<string, unknown> = { ...payload }
    delete fallbackPayload.preferred_cuisines

    const fallbackResult = await client
      .from(NUTRITION_SAFETY_TABLE)
      .upsert(fallbackPayload, { onConflict: 'user_id' })
      .select('*')
      .maybeSingle()

    return {
      ...fallbackResult,
      summary,
    }
  }

  return {
    ...result,
    summary,
  }
}
