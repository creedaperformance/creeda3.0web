# Mobile Prototype API Contracts

These routes serve the prototype-integrated Expo app. They require a mobile bearer token and return only real Supabase-backed data or explicit empty states.

## `GET /api/mobile/body-map`

Returns:

- `success`
- `user`
- `bodyMap.overallStatus`: `strong | caution | attention | unknown`
- `bodyMap.latestReadiness`: number or `null`
- `bodyMap.evidenceSources`: `onboarding | check-in | health | scan`
- `bodyMap.regions[]`: region id, label, side, front/back coordinates, status, evidence source, insight, confidence, last updated timestamp
- `bodyMap.emptyState`: present when no body-map evidence exists

Sources: `diagnostics`, `daily_load_logs`, `daily_check_ins`, `movement_baselines`, `diagnostic_sessions`, `video_analysis_reports`, `readiness_scores`, `health_daily_metrics`.

## `GET /api/mobile/tracker/trends?range=7`

Returns:

- `success`
- `user`
- `tracker.rangeDays`
- `tracker.healthSync`
- `tracker.metrics`
- `tracker.trends[]`: date, sleep hours, HRV, resting heart rate, steps, training load, recovery score, source table names
- `tracker.emptyState`: present when no trend source has data

Sources: `health_connections`, `health_daily_metrics`, `training_load_history`, `daily_load_logs`, `readiness_scores`.

## `GET /api/mobile/dashboard/sport/:sportId`

Returns:

- `success`
- `user`
- `dashboard.sport`
- `dashboard.readiness`
- `dashboard.loadSummary`
- `dashboard.trainingFocus`
- `dashboard.cautionNotes`
- `dashboard.sessionGuidance`
- `dashboard.emptyState`

Sources: existing athlete dashboard snapshot, `training_sessions`, `training_load_history`, `daily_load_logs`.

## `GET /api/mobile/coach/squad`

Coach-only route.

Returns:

- `success`
- `user`
- `squad.summary`: total, ready, caution, attention, unknown, team count
- `squad.teams[]`: team or squad rows visible to the coach
- `squad.athletes[]`: athlete identity, groups, readiness, status light, attendance, last check-in, plan completion, flags
- `squad.emptyState`: present when no connected athletes exist

Sources: `teams`, `team_members`, `squads`, `squad_memberships`, `profiles`, `computed_intelligence`, `readiness_scores`, `daily_load_logs`, `daily_check_ins`, `training_sessions`, `training_session_logs`, `coach_interventions`.

## `GET /api/mobile/coach/squad/:athleteId`

Coach-only route. The athlete must be connected to the requesting coach through `team_members` or `squad_memberships`.

Returns:

- `success`
- `user`
- `athlete.athlete`
- `athlete.readiness`
- `athlete.recentCheckIns`
- `athlete.recentLogs`
- `athlete.recentScans`
- `athlete.trainingLoad`
- `athlete.coachComments`
- `athlete.flags`
- `athlete.emptyState`

Sources: same as coach squad plus `video_analysis_reports`, `diagnostic_sessions`, `movement_baselines`, `coach_session_feedback`.

## `GET /api/mobile/coach/rts`

Coach-only route. Returns return-to-training support records, not medical diagnoses.

Returns:

- `success`
- `user`
- `rts.records[]`: athlete, stage, next review date if available, evidence, coach notes, safety copy
- `rts.emptyState`: present when no active records exist

Sources: coach roster tables plus `rehab_history`.

## `GET /api/mobile/learn/daily`

Returns an honest coming-soon response until a lesson catalog/progress schema exists.

Returns:

- `success`
- `user`
- `learn.dailyLesson`: `null`
- `learn.library`: empty array
- `learn.completedLessons`: empty array
- `learn.comingSoon`: `true`
- `learn.emptyState`

## `GET /api/mobile/community/challenges`

Returns active configured public challenges when the `challenges` table exists.

Returns:

- `success`
- `user`
- `community.challenges[]`: challenge metadata and the current user's participation row if present
- `community.emptyState`: present when no challenge rows exist

Sources: `challenges`, `challenge_participants`.

## `GET /api/mobile/community/nearby`

Returns a disabled state until explicit location consent and privacy-safe discovery rules exist.

Returns:

- `success`
- `user`
- `nearby.enabled`: `false`
- `nearby.requiresConsent`: `true`
- `nearby.nearby`: empty array
- `nearby.emptyState`
