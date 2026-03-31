import { createAdminClient } from '@/lib/supabase/admin'
import type { ConnectionPreference, HealthDataModel, HealthSyncStatus } from './types'

export class SyncService {
  private supabase = createAdminClient()

  async upsertDailyMetrics(userId: string, data: HealthDataModel[]) {
    if (!data.length) return { syncedRows: 0 }

    const nowIso = new Date().toISOString()
    const rows = data.map((item) => ({
      user_id: userId,
      metric_date: item.date,
      steps: item.steps,
      sleep_hours: item.sleep_hours,
      heart_rate_avg: item.heart_rate_avg,
      hrv: item.hrv,
      source: item.source,
      updated_at: nowIso,
    }))

    const { error } = await this.supabase
      .from('health_daily_metrics')
      .upsert(rows, { onConflict: 'user_id,metric_date,source' })

    if (error) throw new Error(error.message)
    return { syncedRows: rows.length }
  }

  async updateConnectionState(args: {
    userId: string
    appleConnected?: boolean
    androidConnected?: boolean
    connectionPreference?: ConnectionPreference
    permissionState?: Record<string, unknown>
    status?: HealthSyncStatus
    errorMessage?: string | null
  }) {
    const nowIso = new Date().toISOString()
    const payload: Record<string, unknown> = {
      user_id: args.userId,
      updated_at: nowIso,
    }

    if (typeof args.appleConnected === 'boolean') payload.apple_connected = args.appleConnected
    if (typeof args.androidConnected === 'boolean') payload.android_connected = args.androidConnected
    if (args.connectionPreference) payload.connection_preference = args.connectionPreference
    if (args.permissionState) payload.permission_state = args.permissionState
    if (args.status) payload.last_sync_status = args.status
    if (args.status === 'success') payload.last_sync_at = nowIso
    if (typeof args.errorMessage !== 'undefined') payload.last_error = args.errorMessage

    const { error } = await this.supabase
      .from('health_connections')
      .upsert(payload, { onConflict: 'user_id' })

    if (error) throw new Error(error.message)
  }

  async fetchConnectionState(userId: string) {
    const { data, error } = await this.supabase
      .from('health_connections')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data
  }
}
