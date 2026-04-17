'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import {
  calculateAgeFromDateOfBirth,
  type GuardianConsentStatus,
  type ParentHandoffPreference,
} from '@/lib/academy/workflows'
import {
  type UpdateCoachAcademyTeamPayload,
  markGuardianHandoffSentForCoach,
  updateCoachAcademyTeamSettingsForCoach,
} from '@/lib/coach-academy'

type SaveGuardianPayload = {
  guardianName: string
  guardianRelationship: string
  guardianPhone: string
  guardianEmail: string
  emergencyContactName: string
  emergencyContactPhone: string
  consentStatus: Exclude<GuardianConsentStatus, 'coach_confirmed'>
  handoffPreference: ParentHandoffPreference
  notes: string
}

function normalizeText(value: string) {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

export async function saveAthleteGuardianProfile(payload: SaveGuardianPayload) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Please log in again before updating guardian details.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, date_of_birth')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'athlete') {
    return { error: 'You do not have access to update athlete guardian details.' }
  }

  if (!['unknown', 'pending', 'confirmed', 'declined'].includes(payload.consentStatus)) {
    return { error: 'Please choose a valid guardian consent state.' }
  }

  if (!['whatsapp', 'email', 'coach_led', 'none'].includes(payload.handoffPreference)) {
    return { error: 'Please choose a valid parent handoff preference.' }
  }

  const age = calculateAgeFromDateOfBirth(profile.date_of_birth || null)
  const isJunior = typeof age === 'number' ? age < 18 : false

  const guardianName = normalizeText(payload.guardianName)
  const guardianRelationship = normalizeText(payload.guardianRelationship)
  const guardianPhone = normalizeText(payload.guardianPhone)
  const guardianEmail = normalizeText(payload.guardianEmail)
  const emergencyContactName = normalizeText(payload.emergencyContactName)
  const emergencyContactPhone = normalizeText(payload.emergencyContactPhone)
  const notes = normalizeText(payload.notes)

  const hasGuardianContact = Boolean(guardianPhone || guardianEmail)

  if (isJunior) {
    if (!guardianName || !guardianRelationship || !hasGuardianContact) {
      return { error: 'Junior athletes need guardian name, relationship, and at least one contact route.' }
    }
    if (!emergencyContactName || !emergencyContactPhone) {
      return { error: 'Junior athletes need a clear emergency contact before guardian workflow can be considered complete.' }
    }
    if (payload.consentStatus === 'unknown') {
      return { error: 'Please record whether guardian consent is pending, confirmed, or declined.' }
    }
  }

  const { error: guardianError } = await supabase
    .from('athlete_guardian_profiles')
    .upsert(
      {
        athlete_id: user.id,
        guardian_name: guardianName,
        guardian_relationship: guardianRelationship,
        guardian_phone: guardianPhone,
        guardian_email: guardianEmail,
        emergency_contact_name: emergencyContactName,
        emergency_contact_phone: emergencyContactPhone,
        consent_status: payload.consentStatus,
        handoff_preference: payload.handoffPreference,
        notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'athlete_id' }
    )

  if (guardianError) {
    console.error('[academy] guardian save failed', guardianError)
    return { error: 'Could not save guardian details right now. Please try again.' }
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      guardian_consent_confirmed: payload.consentStatus === 'confirmed',
    })
    .eq('id', user.id)

  if (profileError) {
    console.error('[academy] guardian consent sync failed', profileError)
  }

  revalidatePath('/athlete/dashboard')
  revalidatePath('/athlete/family')
  revalidatePath('/coach/dashboard')
  revalidatePath('/coach/academy')

  return { success: true, redirectTo: '/athlete/dashboard' }
}

export async function updateCoachAcademyTeamSettings(payload: UpdateCoachAcademyTeamPayload) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Please log in again before updating academy settings.' }
  }

  const result = await updateCoachAcademyTeamSettingsForCoach(supabase, user.id, payload)
  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/coach/dashboard')
  revalidatePath('/coach/academy')
  revalidatePath('/coach/review')

  return { success: true }
}

export async function markGuardianHandoffSent(athleteId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Please log in again before marking a guardian handoff.' }
  }

  const result = await markGuardianHandoffSentForCoach(supabase, user.id, athleteId)
  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/coach/dashboard')
  revalidatePath('/coach/academy')

  return { success: true }
}
