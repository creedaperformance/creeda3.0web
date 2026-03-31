'use server'

import { submitAthleteDailyCheckIn } from '@/app/athlete/checkin/actions'

export async function submitDailyLog(data: unknown) {
  return submitAthleteDailyCheckIn(data)
}
