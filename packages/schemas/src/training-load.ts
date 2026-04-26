import { z } from 'zod'

export const TrainingLoadSnapshotSchema = z.object({
  weekly_sessions: z.number().int().min(0).max(14),
  avg_session_minutes: z.union([
    z.literal(15),
    z.literal(30),
    z.literal(45),
    z.literal(60),
    z.literal(90),
    z.literal(120),
    z.literal(150),
  ]),
  typical_rpe: z.number().min(1).max(10),
  pattern_4_weeks: z.enum(['same', 'more_now', 'less_now', 'returning_from_break']),
})

export type TrainingLoadSnapshot = z.infer<typeof TrainingLoadSnapshotSchema>

export function calcChronicLoadFromSnapshot(snapshot: TrainingLoadSnapshot) {
  const factor =
    snapshot.pattern_4_weeks === 'returning_from_break'
      ? 0.5
      : snapshot.pattern_4_weeks === 'less_now'
        ? 0.7
        : snapshot.pattern_4_weeks === 'more_now'
          ? 1.2
          : 1

  return Math.round(
    snapshot.weekly_sessions *
      snapshot.avg_session_minutes *
      snapshot.typical_rpe *
      factor
  )
}
