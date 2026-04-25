import { createClient } from './supabase/server';

/**
 * CREEDA Infrastructure Rate Limiter
 *
 * Primary path: a DB-backed RPC `check_rate_limit` that gives cross-instance
 * synchronization (one Postgres counter per key). Defined in
 * `migrations/02_patch_rate_limit_and_log_columns.sql`.
 *
 * Fallback path: an in-memory per-process counter. This kicks in only when
 * the DB function is missing entirely (Postgres error 42883 - "undefined
 * function"), which is the case on a fresh Supabase project before
 * migrations have been applied. Other transient DB errors honor the
 * caller's `failOpen` preference.
 */

interface InMemoryEntry {
    count: number;
    windowStartedAt: number;
}

const inMemoryCounters = new Map<string, InMemoryEntry>();

function isUndefinedFunctionError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const e = error as { code?: string; message?: string };
    if (e.code === '42883') return true;
    const msg = (e.message || '').toLowerCase();
    return msg.includes('function') && msg.includes('does not exist');
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
        // Fresh Supabase project: the migration creating check_rate_limit hasn't
        // been applied yet. Fall back to in-memory counters so production auth
        // surfaces (signup, login, password reset) stay usable. Log loudly so
        // operators notice and run the migration.
        if (isUndefinedFunctionError(error)) {
            console.warn(
                `[Rate Limit] DB function check_rate_limit is missing for key "${key}". ` +
                `Falling back to in-memory rate limiting. Apply migrations/02_patch_rate_limit_and_log_columns.sql to restore cross-instance limits.`
            );
            return checkInMemory(key, limit, windowSeconds);
        }

        console.error(`[Rate Limit Error] Key: ${key}`, error);
        if (options?.failOpen === false) {
            return {
                success: false,
                error: 'Rate limiting is temporarily unavailable. Please try again shortly.',
            };
        }

        return { success: true }; // Fail open for non-sensitive flows if DB is reachable but RPC fails
    }

    if (!isAllowed) {
        return {
            success: false,
            error: `Too many attempts. Please wait ${windowSeconds} seconds.`
        };
    }

    return { success: true };
}
