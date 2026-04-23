# Creeda Training Visibility Audit - 2026-04-21

## Scope

Audited the recently added exercise library, guided execution session, warmup/cooldown/recovery/rehab blocks, daily operating guidance, personalized exercise recommendations, FitStart/profile-driven personalization, and coach session assignment/review surfaces.

The audit standard was user visibility, not code existence: a normal logged-in athlete, coach, and individual user should be able to find the upgrades from the visible product UI.

## Executive Finding

The underlying training system was real, but the product surface was uneven:

- Athletes already had the strongest wiring, but the exercise library was hidden until this pass and some navigation/CTA wiring was incomplete.
- Coaches had the execution board, but discoverability was weaker than it should have been.
- Individuals already had recommendation logic and workout prescription logic on the dashboard, but no executable session route, no exercise library route, no plan/calendar route, and no session persistence flow. In practice, the upgrades existed in intelligence code but not in the user journey.

## What Was Already Working Before This Fix

### Athlete

- `/athlete/dashboard`
  - Rendered decision output and daily guidance.
  - Exposed start-session and plans CTAs in the dashboard flow.

- `/athlete/sessions/today`
  - Rendered the guided session execution client.
  - Showed warmup, main, accessory, conditioning, cooldown, recovery, and rehab blocks when generated.
  - Showed exercise media, instructions, cues, mistakes, timers, substitutions, logging, pain flags, and save flow.

- `/athlete/plans`
  - Rendered today's session summary, weekly calendar, session history, and exercise history.

### Coach

- `/coach/dashboard`
  - Rendered the coach operating panel with links into execution.

- `/coach/execution`
  - Rendered the coach assignment/review board.
  - Allowed assign-mode, notes, and review feedback for linked athletes.

### Individual

- `/individual/dashboard`
  - Rendered `IndividualDecisionHUD`, workout prescription, nutrition prescription, and pathway recommendations.
  - Surfaced why-this-path-fit logic and FitStart-driven direction.

## What Was Hidden Or Incomplete Before This Fix

### Shared / Cross-role

- `src/lib/product/exercises/catalog/*`
  - Large exercise library existed in code, but not all journeys had a mounted browsing route.

- `src/app/api/exercises/route.ts`
  - Authenticated API existed, but it was not sufficient on its own because user-facing route discoverability was missing.

- `src/components/DashboardLayout.tsx`
  - Shared nav omitted key execution/library links for the upgraded system.

### Athlete

- `/athlete/exercises`
  - Missing before this fix.

- `src/components/BottomNav.tsx`
  - Mobile athlete nav did not make Today's guided session a primary destination.

- `/athlete/plans/generate`
  - Still presented stale coming-soon behavior even though the live execution system existed.

### Coach

- `/coach/execution`
  - Reachable, but under-linked from shared nav and weaker than it should have been in the visible product shell.

### Individual

- No mounted user-facing execution flow:
  - `/individual/sessions/today` did not exist.
  - `/individual/plans` did not exist.
  - `/individual/exercises` did not exist.

- `src/app/individual/dashboard/components/IndividualDashboardClient.tsx`
  - Quick actions linked logging/review/tests, but not session, plan calendar, or exercise library.

- `src/app/individual/dashboard/components/IndividualDecisionHUD.tsx`
  - Recommendation output existed, but the CTAs still sent users to logging/review rather than the upgraded training system.

- `src/app/athlete/sessions/actions.ts`
  - Session persistence path was athlete-only, so even if an individual session UI had been mounted, the completion/save loop would still have been broken.

## Route And Component Inventory

### Product Engines

- `src/lib/product/types.ts`
  - Exercise categories, session block types, prescriptions, execution sessions, completion logs, calendar entries, coach feedback.

- `src/lib/product/recommendation-engine.ts`
  - Exercise scoring by goal, sport, position, equipment, environment, readiness, pain, fatigue, and block type.

- `src/lib/product/session-builder.ts`
  - Builds executable sessions with warmup, main, accessory, conditioning, cooldown, recovery, and rehab blocks.

- `src/lib/product/server.ts`
  - Session generation, history, weekly calendar, exercise history, coach board, and persistence helpers.
  - Now includes both athlete and individual session/calendar generation paths.

### Athlete Routes

- `/athlete/dashboard`
- `/athlete/sessions/today`
- `/athlete/plans`
- `/athlete/exercises`
- `/athlete/plans/generate`

### Coach Routes

- `/coach/dashboard`
- `/coach/execution`

### Individual Routes

- `/individual/dashboard`
- `/individual/sessions/today`
- `/individual/plans`
- `/individual/exercises`

## Data, Auth, And Rendering Dependencies

- Athlete execution routes require logged-in athlete role plus completed athlete onboarding.
- Individual execution routes require logged-in individual role plus completed FitStart/onboarding.
- Coach execution requires logged-in coach role.
- Session generation falls back to conservative defaults when new preference/equipment tables are missing.
- Exercise browsing uses the code catalog directly, so it does not depend on Supabase exercise seed rows to render.
- Persistent save/history/calendar flows still depend on the execution-related tables being present:
  - `training_sessions`
  - `training_session_logs`
  - `training_exercise_logs`
  - `training_calendar_entries`
  - `coach_session_feedback`
- Coach execution visibility still depends on approved `connection_requests` between coach and athlete.

## Fixes Applied

- Added `src/app/athlete/exercises/page.tsx`
  - Mounted the athlete-facing exercise library.

- Added `src/components/RoleDesktopNav.tsx`
  - Desktop nav rail for the custom athlete/coach shells.
  - Extended in this pass so the individual journey also has a role-specific execution/library rail on the new personal-training pages.

- Updated athlete discoverability:
  - `src/app/athlete/dashboard/DecisionHUD.tsx`
  - `src/app/athlete/dashboard/components/TodayPlan.tsx`
  - `src/app/athlete/plans/page.tsx`
  - `src/app/athlete/sessions/components/SessionExecutionClient.tsx`
  - `src/components/DashboardLayout.tsx`
  - `src/components/BottomNav.tsx`
  - `src/app/athlete/plans/generate/page.tsx`

- Updated coach discoverability:
  - `src/app/coach/dashboard/GamifiedCoachDashboard.tsx`
  - `src/app/coach/execution/components/CoachExecutionBoard.tsx`
  - `src/components/DashboardLayout.tsx`

- Added individual execution flow:
  - `src/app/individual/sessions/today/page.tsx`
  - `src/app/individual/plans/page.tsx`
  - `src/app/individual/exercises/page.tsx`
  - `src/app/individual/sessions/actions.ts`

- Added individual session generation/persistence support:
  - `src/lib/product/server.ts`
    - `getOrCreateTodayExecutionSessionForIndividual`
    - `buildWeeklyCalendarForIndividual`
    - shared role-aware mapping from individual dashboard/FitStart outputs into the same execution engine
  - `src/app/athlete/sessions/components/SessionExecutionClient.tsx`
    - now supports both athlete and individual execution/save flows through the same UI

- Updated individual discoverability:
  - `src/app/individual/dashboard/components/IndividualDashboardClient.tsx`
    - adds clear quick actions for Start Session, Plan Calendar, and Exercise Library
  - `src/app/individual/dashboard/components/IndividualDecisionHUD.tsx`
    - recommendation CTAs now point into the upgraded training system
  - `src/components/DashboardLayout.tsx`
    - shared individual sidebar now includes Today's Session, Plan Calendar, Exercise Library
  - `src/components/BottomNav.tsx`
    - individual mobile nav now includes Plans, Today, and Check-In

- Updated translations:
  - `src/lib/i18n/translations/en.json`
  - `src/lib/i18n/translations/hi.json`

## Manual Verification Routes

### Athlete

1. `/athlete/dashboard`
   - Desktop rail shows Home, Today's Session, Plan Calendar, Exercise Library.
   - Dashboard CTAs expose Start Session, Open Calendar, Exercise Library.

2. `/athlete/sessions/today`
   - Shows guided session, explainability, media, instructions, timers, substitutions, logging, recovery/rehab blocks when relevant.

3. `/athlete/plans`
   - Shows weekly calendar, history, exercise progression, and execution loop.

4. `/athlete/exercises`
   - Shows recommended movements from today's generated session and filterable library browsing.

5. `/athlete/plans/generate`
   - Redirects to `/athlete/sessions/today`.

### Individual

1. `/individual/dashboard`
   - Shared nav now includes Today's Session, Plan Calendar, Exercise Library.
   - Quick actions show Start Today's Session, Plan Calendar, Exercise Library.
   - Decision HUD CTA sends users into Start Session and Exercise Library.

2. `/individual/sessions/today`
   - Shows the same guided execution flow as athlete, but driven by the individual/FitStart pathway.
   - Save flow persists history for the individual role.

3. `/individual/plans`
   - Shows today's plan, weekly rhythm, session history, exercise progression, and why-this-session reasons.

4. `/individual/exercises`
   - Shows recommended exercises from today's generated personal plan plus filterable library browsing.

### Coach

1. `/coach/dashboard`
   - Execution Board is visible from both dashboard cards and shell navigation.

2. `/coach/execution`
   - Lists linked athletes when approved connections exist.
   - Supports assignment, review, and feedback loop.

## Remaining External Checks

- Confirm V33/V34/V35 migrations are applied in the target Supabase project before expecting persistence outside local verification.
- Confirm exercise media assets are present in the deployed build output.
- Confirm at least one approved coach-athlete connection exists before validating coach assignment with real data.
