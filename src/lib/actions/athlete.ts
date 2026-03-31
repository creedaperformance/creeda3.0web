import { createClient } from '@/lib/supabase/server'

export async function getAthleteProfile(userId: string) {
  const supabase = await createClient()

  // 1. Fetch Profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileError) {
    console.error('Error fetching athlete profile:', profileError)
    return { profile: null, error: profileError.message }
  }

  // 2. Fetch Latest Diagnostic
  const { data: diagnostic, error: diagnosticError } = await supabase
    .from('diagnostics')
    .select('*')
    .eq('athlete_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (diagnosticError) {
    console.warn('Error fetching athlete diagnostics:', diagnosticError)
  }

  return { 
    profile: {
      ...profile,
      diagnostics: diagnostic
    }, 
    error: null 
  }
}
