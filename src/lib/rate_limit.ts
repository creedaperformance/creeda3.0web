import { createClient } from './supabase/server';

/**
 * CREEDA Infrastructure Rate Limiter
 * Uses DB-backed tracking for cross-server synchronization.
 */
export async function rateLimit(
    key: string, 
    limit: number, 
    windowSeconds: number
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    
    // Call DB rate limiter RPC
    const { data: isAllowed, error } = await supabase.rpc('check_rate_limit', {
        p_key: key,
        p_limit: limit,
        p_window_seconds: windowSeconds
    });

    if (error) {
        console.error(`[Rate Limit Error] Key: ${key}`, error);
        return { success: true }; // Fail open for production safety if DB is reachable but RPC fails
    }

    if (!isAllowed) {
        return { 
            success: false, 
            error: `Too many attempts. Please wait ${windowSeconds} seconds.` 
        };
    }

    return { success: true };
}
