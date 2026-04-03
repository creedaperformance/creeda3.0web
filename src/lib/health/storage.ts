import type { ConnectionPreference } from "./types";

export const HEALTH_CONNECTIONS_TABLE = "health_connections";
export const HEALTH_DAILY_METRICS_TABLE = "health_daily_metrics";

type SupabaseLike = {
  from: (table: string) => unknown;
};

type HealthConnectionTable = {
  upsert: (
    values: Record<string, unknown>,
    options?: Record<string, unknown>
  ) => PromiseLike<{ error: { message: string } | null }> | { error: { message: string } | null };
};

type HealthMetricsTable = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      order: (column: string, options: { ascending: boolean }) => {
        limit: (count: number) => HealthMetricsQueryResult;
      };
    };
  };
};

type HealthMetricsQueryResult =
  | PromiseLike<{ data: unknown; error: { message: string } | null }>
  | { data: unknown; error: { message: string } | null };

export function isHealthStorageMissingError(error: { message?: string | null } | null | undefined) {
  const message = String(error?.message || "");
  return message.includes(HEALTH_CONNECTIONS_TABLE) || message.includes(HEALTH_DAILY_METRICS_TABLE);
}

export async function upsertHealthConnectionPreference(
  supabase: SupabaseLike,
  args: {
    userId: string;
    connectionPreference: ConnectionPreference;
    updatedAt?: string;
  }
) {
  const table = supabase.from(HEALTH_CONNECTIONS_TABLE) as HealthConnectionTable;

  const payload = {
    user_id: args.userId,
    connection_preference: args.connectionPreference,
    updated_at: args.updatedAt || new Date().toISOString(),
  };

  return table.upsert(payload, { onConflict: "user_id" });
}

export function selectRecentHealthMetrics(supabase: SupabaseLike, userId: string, limit = 14) {
  const table = supabase.from(HEALTH_DAILY_METRICS_TABLE) as HealthMetricsTable;

  return table
    .select("metric_date,steps,sleep_hours,heart_rate_avg,hrv,source")
    .eq("user_id", userId)
    .order("metric_date", { ascending: false })
    .limit(limit);
}
