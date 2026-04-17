'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate_limit'

export async function login(formData: FormData) {
  const email = String(formData.get('email') || '').trim()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  // Rate Limit: Max 5 login attempts per 15 minutes per email
  const limiter = await rateLimit(`login:${email.toLowerCase()}`, 5, 900, {
    failOpen: false,
  })
  if (!limiter.success) return { error: limiter.error }

  const supabase = await createClient()

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: 'Invalid email or password.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
