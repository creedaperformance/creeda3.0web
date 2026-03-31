export type HealthSource = 'apple' | 'android'

export type HealthDataModel = {
  date: string
  steps: number
  sleep_hours: number
  heart_rate_avg: number
  hrv: number
  source: HealthSource
}

export type HealthSyncPayload = {
  user_id?: string
  data: HealthDataModel[]
}

export type ConnectionPreference = 'connect_now' | 'later'

export type HealthSyncStatus = 'never' | 'success' | 'failed'
