import { createClient } from './supabase/server';

/**
 * CREEDA Infrastructure Rate Limiter
 *
 * Primary path: a DB-backed RPC `check_rate_limit` that gives cross-instance
 * synchronization (one Postgres counter per key). Defined in
 * `migrations/02_patch_rate_limit_and_log_columns.sql`.
 *
 * Fallback path: an in-memory per-process counter. This kicks in when the DB
 * limiter cannot be invoked for *structural* reasons — function missing,
 * permission denied, schema cache not reloaded, table missing. In all those
 * cases the fix is operator-side (apply migrations / GRANT EXECUTE / NOTIFY
 * pgrst) and the in-memory fallback keeps production auth surfaces alive.
 *
 * Other (transient) RPC errors still honor the caller's `failOpen` flag, so
 * sensitive flows can still block on real DB outages.
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

function isStructuralError(error: SupabaseRpcError): { match: boolean; reason: string } {
    const code = error.code || '';
    const msg = (error.message || '').toLowerCase();
    const details = (error.details || '').toLowerCase();

    // Postgres native codes
    if (code === '42883') return { match: true, reason: 'function does not exist (42883)' };
    if (code === '42501') return { match: true, reason: 'permission denied (42501)' };
    if (code === '42P01') return { match: true, reason: 'undefined table (42P01)' };

    // PostgREST error codes (returned when REST cannot route to the function)
    if (code === 'PGRST202') return { match: true, reason: 'function not in PostgREST schema cache (PGRST202)' };
    if (code === 'PGRST204') return { match: true, reason: 'PGRST204' };
    if (code === 'PGRST116') return { match: true, reason: 'PGRST116' };

    // Message-based detection for older error shapes
    if (msg.includes('function') && msg.includes('does not exist')) {
        return { match: true, reason: 'function does not exist (msg match)' };
    }
    if (msg.includes('not find the function')) {
        return { match: true, reason: 'function not found (msg match)' };
    }
    if (msg.includes('permission denied')) {
        return { match: true, reason: 'permission denied (msg match)' };
    }
    if (msg.includes('schema cache') || details.includes('schema cache')) {
        return { match: true, reason: 'schema cache (msg match)' };
    }

    return { match: false, reason: '' };
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
    options?: {
        failOpen?: boolean
    }
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { data: isAllowed, error } = await supabase.rpc('check_rate_limit', {
        p_key: key,
        p_limit: limit,
        p_window_seconds: windowSeconds
    });

    if (error) {
        const rpcError = error as SupabaseRpcError;
        const structural = isStructuralError(rpcError);

        if (structural.match) {
            console.warn(
                `[Rate Limit] DB-backed limiter unavailable (${structural.reason}) for key "${key}". ` +
                `Falling back to in-memory limiter. ` +
                `Fix: ensure migrations/02_patch_rate_limit_and_log_columns.sql is applied AND that the function ` +
                `is granted EXECUTE for anon + authenticated roles, then NOTIFY pgrst, 'reload schema'. ` +
                `Raw error: code=${rpcError.code || 'n/a'} message=${rpcError.message || 'n/a'}`
            );
            return checkInMemory(key, limit, windowSeconds);
        }

        // Genuine transient/unexpected error - keep the existing failOpen contract
        // but log the full error shape so operators can diagnose.
        console.error(
            `[Rate Limit Error] Key: ${key} code=${rpcError.code || 'n/a'} ` +
            `message=${rpcError.message || 'n/a'} details=${rpcError.details || 'n/a'}`,
            error
        );
        if (options?.failOpen === false) {
            return {
                success: false,
                error: 'Rate limiting is temporarily unavailable. Please try again shortly.',
            };
        }

        return { success: true }; // Fail open for non-sensitive flows
    }

    if (!isAllowed) {
        return {
            success: false,
            error: `Too many attempts. Please wait ${windowSeconds} seconds.`
        };
    }

    return { success: true };
}
