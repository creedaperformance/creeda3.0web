import { createClient } from './supabase/server';

/**
 * CREEDA Infrastructure Rate Limiter
 *
 * Two-tier rate limiting:
 *
 * 1. DB-backed RPC `check_rate_limit` (preferred) — gives cross-instance
 *    synchronization. Defined in
 *    migrations/02_patch_rate_limit_and_log_columns.sql and exposed via
 *    PostgREST. Requires GRANT EXECUTE for anon + authenticated.
 *
 * 2. In-memory per-process counter (fallback) — kicks in whenever the DB
 *    RPC errors for any reason: missing function, missing GRANT, stale
 *    PostgREST schema cache, transient outage, network blip. The
 *    fallback is per-process so a multi-worker host gets N×limit total
 *    in the worst case, but every request is still rate-limited.
 *
 * Design choice: the rate limiter never blocks a user with
 * "Rate limiting is temporarily unavailable" anymore. Falling back to a
 * leakier limiter is strictly better than blocking real users; the real
 * abuse defense for auth flows is Supabase's own per-IP throttling on
 * /auth/v1/signup, which sits in front of us regardless.
 *
 * The `failOpen` option is accepted for backward compatibility with
 * existing callers but no longer changes behavior — the limiter always
 * fails to in-memory rather than failing to a user-visible error.
 */

interface InMemoryEntry {
    count: number;
    windowStartedAt: number;
}

const inMemoryCounters = new Map<string, InMemoryEntry>();

interface SupabaseRpcError {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
}

function checkInMemory(
    key: string,
    limit: number,
    windowSeconds: number
): { success: boolean; error?: string } {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const existing = inMemoryCounters.get(key);

    if (!existing || now - existing.windowStartedAt > windowMs) {
        inMemoryCounters.set(key, { count: 1, windowStartedAt: now });
        return { success: true };
    }

    if (existing.count >= limit) {
        return {
            success: false,
            error: `Too many attempts. Please wait ${windowSeconds} seconds.`,
        };
    }

    existing.count += 1;
    return { success: true };
}

export async function rateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
    _options?: {
        failOpen?: boolean
    }
): Promise<{ success: boolean; error?: string }> {
    let rpcError: SupabaseRpcError | null = null;
    try {
        const supabase = await createClient();
        const { data: isAllowed, error } = await supabase.rpc('check_rate_limit', {
            p_key: key,
            p_limit: limit,
            p_window_seconds: windowSeconds
        });

        if (error) {
            rpcError = error as SupabaseRpcError;
        } else if (!isAllowed) {
            return {
                success: false,
                error: `Too many attempts. Please wait ${windowSeconds} seconds.`,
            };
        } else {
            return { success: true };
        }
    } catch (err) {
        rpcError = err as SupabaseRpcError;
    }

    // Any RPC failure -> in-memory fallback. Log loudly so operators can
    // diagnose the underlying DB issue without users being blocked.
    console.warn(
        `[Rate Limit] DB RPC failed for key "${key}". Using in-memory fallback. ` +
        `code=${rpcError?.code || 'n/a'} ` +
        `message=${rpcError?.message || 'n/a'} ` +
        `details=${rpcError?.details || 'n/a'} ` +
        `hint=${rpcError?.hint || 'n/a'}`
    );
    return checkInMemory(key, limit, windowSeconds);
}
