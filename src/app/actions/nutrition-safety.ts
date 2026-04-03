'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import {
  normalizeNutritionStringList,
  upsertNutritionSafetyProfile,
  type NutritionBudgetTier,
  type NutritionCookingAccess,
  type NutritionDietType,
  type NutritionFoodSetup,
} from '@/lib/nutrition-safety'

type NutritionRole = 'athlete' | 'individual'
type AnsweredAllergyStatus = 'none' | 'has_allergies'
type AnsweredMedicalStatus = 'none' | 'has_conditions'
type NutritionListInput = string | string[]

export interface SaveNutritionSafetyPayload {
  role: NutritionRole
  dietType: NutritionDietType
  allergyStatus: AnsweredAllergyStatus
  allergies: NutritionListInput
  dislikes: NutritionListInput
  medicalStatus: AnsweredMedicalStatus
  medicalConditions: NutritionListInput
  medications: NutritionListInput
  budgetTier: NutritionBudgetTier | ''
  foodSetup: NutritionFoodSetup | ''
  cookingAccess: NutritionCookingAccess | ''
  preferredCuisines: NutritionListInput
}

export async function saveNutritionSafetyProfile(payload: SaveNutritionSafetyPayload) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Please log in again before updating nutrition safety.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== payload.role) {
    return { error: 'You do not have access to update this nutrition profile.' }
  }

  if (!['omnivore', 'veg', 'vegan', 'jain'].includes(payload.dietType)) {
    return { error: 'Please choose the diet pattern that fits you best right now.' }
  }

  if (!['none', 'has_allergies'].includes(payload.allergyStatus)) {
    return { error: 'Please answer whether you have food allergies.' }
  }

  if (!['none', 'has_conditions'].includes(payload.medicalStatus)) {
    return { error: 'Please answer whether you have medical conditions that should be considered.' }
  }

  const allergies =
    payload.allergyStatus === 'has_allergies' ? normalizeNutritionStringList(payload.allergies) : []
  const medicalConditions =
    payload.medicalStatus === 'has_conditions' ? normalizeNutritionStringList(payload.medicalConditions) : []
  const medications =
    payload.medicalStatus === 'has_conditions' ? normalizeNutritionStringList(payload.medications) : []

  if (payload.allergyStatus === 'has_allergies' && allergies.length === 0) {
    return { error: 'Please list the allergies that Creeda should avoid before giving nutrition advice.' }
  }

  if (
    payload.medicalStatus === 'has_conditions' &&
    medicalConditions.length === 0 &&
    medications.length === 0
  ) {
    return { error: 'Please list the medical conditions, medications, or health issues that should be considered.' }
  }

  const { error, summary } = await upsertNutritionSafetyProfile(supabase, {
    userId: user.id,
    dietType: payload.dietType,
    allergyStatus: payload.allergyStatus,
    allergies,
    dislikes: payload.dislikes,
    medicalStatus: payload.medicalStatus,
    medicalConditions,
    medications,
    budgetTier: payload.budgetTier || null,
    foodSetup: payload.foodSetup || null,
    cookingAccess: payload.cookingAccess || null,
    preferredCuisines: payload.preferredCuisines,
    completedAt: new Date().toISOString(),
  })

  if (error) {
    console.error('[nutrition-safety] save failed', error)
    return { error: 'Could not save nutrition safety right now. Please try again.' }
  }

  revalidatePath(`/${payload.role}`)
  revalidatePath(`/${payload.role}/dashboard`)
  revalidatePath(`/${payload.role}/review`)
  revalidatePath(`/${payload.role}/nutrition-safety`)

  return {
    success: true,
    redirectTo: `/${payload.role}/dashboard`,
    summary,
  }
}
