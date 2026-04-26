import 'server-only'

import { isEmailAdmin } from './quotas'

type SupabaseLike = {
  from: (table: string) => any
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string; email?: string | null } | null }
    }>
  }
}

/**
 * Returns true iff the current request is from an admin user.
 *
 * Two ways to be admin:
 * 1. profiles.is_admin = TRUE (manual SQL flip).
 * 2. The user's auth email is in the ADMIN_EMAILS env var (auto-bootstrap).
 *
 * When (2) matches but (1) is FALSE, we promote them silently so future
 * requests don't have to re-check the env var.
 */
export async function requireAdmin(supabase: SupabaseLike): Promise<
  | { ok: true; userId: string; email: string | null }
  | { ok: false; reason: 'unauthenticated' | 'not_admin' }
> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'unauthenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  let isAdmin = Boolean((profile as { is_admin?: boolean } | null)?.is_admin)

  if (!isAdmin && isEmailAdmin(user.email)) {
    // Promote on first login so we don't keep checking env vars.
    await supabase.from('profiles').update({ is_admin: true }).eq('id', user.id)
    isAdmin = true
  }

  if (!isAdmin) return { ok: false, reason: 'not_admin' }
  return { ok: true, userId: user.id, email: user.email ?? null }
}
