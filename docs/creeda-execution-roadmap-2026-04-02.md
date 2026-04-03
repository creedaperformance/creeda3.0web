# Creeda Execution Roadmap

Date: 2026-04-02
Workspace: `/Users/creeda/creeda-app`

References:

- `/Users/creeda/creeda-app/docs/creeda-unified-modification-blueprint-2026-04-02.md`
- `/Users/creeda/creeda-app/docs/creeda-strategy-upgrades-2026-04-02.md`
- `/Users/creeda/creeda-app/docs/creeda-competitive-analysis-2026-04-01.md`

## Decision

Creeda should execute against one simple product direction:

**Build the most believable and actionable sports-science decision system in India first, then expand globally.**

That means the first build wedge is:

- athlete readiness and daily decision quality
- coach workflow and intervention tooling
- trust and confidence visibility
- smartphone-based testing and video intelligence

The individual journey stays in scope, but it should reuse the same backbone with calmer UX rather than becoming a separate science stack.

## What To Build First

### Priority order

1. Trust system and role hero redesign
2. Athlete daily loop and weekly review
3. Coach command center v1
4. Health sync cleanup and data-model cleanup
5. Phone-based objective testing v1
6. India-context intelligence layer
7. Brand and landing refresh

## Phase 0: Foundation Cleanup

Duration:

- 3 to 5 days

Goal:

- remove schema and platform ambiguity before adding new product layers

### Required fixes

1. Reconcile health-sync schema

Current issue:

- code expects `health_connections` and `health_daily_metrics`
- `migrations/20260326_v7_health_removal.sql` drops them
- later app code still relies on them

Files involved:

- `/Users/creeda/creeda-app/src/lib/health/sync-service.ts`
- `/Users/creeda/creeda-app/src/lib/dashboard_decisions.ts`
- `/Users/creeda/creeda-app/migrations/20260326_v6_health_data_integration.sql`
- `/Users/creeda/creeda-app/migrations/20260326_v7_health_removal.sql`

Action:

- create one canonical migration that restores or confirms health sync tables
- remove contradictory migration behavior from the effective deployment path

2. Confirm source of truth for dashboard rendering

Current shape:

- `computed_intelligence.intelligence_trace` already acts like a central payload

Action:

- formalize `computed_intelligence.intelligence_trace` as the canonical trust-and-explanation container

3. Standardize naming

Action:

- standardize around:
  - `trustSummary`
  - `changeSummary`
  - `weeklyReview`
  - `objectiveTest`
  - `coachIntervention`

## Phase 1: Trust System And “Today” Redesign

Duration:

- 2 weeks

Goal:

- make every major recommendation understandable and believable

### Product changes

For athlete, individual, and coach hero surfaces, add:

- recommendation
- confidence
- data quality
- top drivers
- what changed since yesterday
- missing input that would improve the recommendation

### Screens to modify first

- `/Users/creeda/creeda-app/src/app/athlete/dashboard/DecisionHUD.tsx`
- `/Users/creeda/creeda-app/src/app/individual/dashboard/components/IndividualDashboardClient.tsx`
- `/Users/creeda/creeda-app/src/app/coach/dashboard/components/CoachDecisionHUD.tsx`

### Engine changes

Modify:

- `/Users/creeda/creeda-app/src/lib/engine/types.ts`
- `/Users/creeda/creeda-app/src/lib/engine/DecisionService.ts`
- `/Users/creeda/creeda-app/src/lib/dashboard_decisions.ts`
- `/Users/creeda/creeda-app/src/lib/explainability_layer.ts`

Add to `CreedaDecision`:

- `trustSummary`
  - `confidenceLevel`
  - `dataQuality`
  - `signalsUsed`
  - `signalsMissing`
  - `signalTypes`
  - `whyTodayChanged`

### Acceptance criteria

- no recommendation card appears without trust state
- athlete, individual, and coach all show the same trust language
- user can understand the main reason for today’s decision in under 5 seconds

## Phase 2: Athlete Daily Loop And Weekly Review

Duration:

- 2 weeks

Goal:

- improve retention and perceived usefulness

### Athlete daily loop

Modify:

- `/Users/creeda/creeda-app/src/app/athlete/checkin/page.tsx`
- `/Users/creeda/creeda-app/src/app/athlete/checkin/actions.ts`

Changes:

- shorten repeated friction where possible
- after submit, show:
  - decision
  - confidence
  - main driver
  - one next-best action
- add “what would improve certainty tomorrow”

### Weekly review

Add new athlete weekly review surface:

- this week’s readiness trend
- biggest recovery bottleneck
- biggest adherence win
- next-week focus

Recommended new routes:

- `/athlete/review`
- `/individual/review`
- `/coach/review`

### Schema addition

Create `weekly_reviews` table:

- `id`
- `user_id`
- `role`
- `week_start`
- `summary_json`
- `focus`
- `completed_at`
- `created_at`

### Acceptance criteria

- athlete can complete weekly review in under 2 minutes
- weekly review output is generated from real trend data, not static text

## Phase 3: Coach Command Center V1

Duration:

- 2 weeks

Goal:

- move coach experience from dashboard to operating workflow

### Core additions

1. Intervention queue

- who needs action now
- why
- suggested action
- status: new, acknowledged, acted, dismissed

2. Low-data queue

- missing check-ins
- stale health sync
- weak-confidence recommendations

3. Rehab-return tracker

- rehab stage
- restrictions
- progression readiness
- return confidence

4. Group suggestions

- squad cluster insights
- subgroup drill or load suggestions

### Screens to modify

- `/Users/creeda/creeda-app/src/app/coach/dashboard/components/CoachDecisionHUD.tsx`
- `/Users/creeda/creeda-app/src/app/coach/analytics/page.tsx`
- `/Users/creeda/creeda-app/src/app/coach/dashboard/GamifiedCoachDashboard.tsx`

### Schema additions

Create `coach_interventions` table:

- `id`
- `coach_id`
- `athlete_id`
- `team_id`
- `reason_codes`
- `recommendation`
- `status`
- `acknowledged_at`
- `resolved_at`
- `notes`
- `created_at`

Create `coach_notes` table if needed:

- `id`
- `author_id`
- `athlete_id`
- `team_id`
- `note_type`
- `body`
- `created_at`

### Acceptance criteria

- coach can identify top 5 intervention priorities without opening athlete profiles
- coach can separate “high risk” from “low confidence” from “missing data”

## Phase 4: Individual Product Upgrade

Duration:

- 1.5 to 2 weeks

Goal:

- make `Creeda Life` feel truly health-led, not like reduced athlete mode

### Screens to modify

- `/Users/creeda/creeda-app/src/app/fitstart/page.tsx`
- `/Users/creeda/creeda-app/src/app/individual/dashboard/components/IndividualDashboardClient.tsx`
- `/Users/creeda/creeda-app/src/app/individual/dashboard/components/IndividualDecisionHUD.tsx`
- `/Users/creeda/creeda-app/src/app/individual/logging/page.tsx`

### Changes

- simplify language further
- surface one clear path identity:
  - sleep reset
  - strength build
  - fat loss
  - mobility rebuild
  - sport entry
- add weekly wins and momentum summaries
- show device influence in plain language

### Acceptance criteria

- individual users see “health momentum” and “next step” before science details
- the dashboard feels calmer than athlete mode in both copy and hierarchy

## Phase 5: Smartphone Testing Moat V1

Duration:

- 2 to 3 weeks

Goal:

- ship a useful and repeatable first version of phone-based testing

### First tests to ship

1. Reaction test
2. Single-leg balance or stability test
3. Breathing recovery test

These are lower risk than full-field sprint and jump systems and still create real differentiation.

### Screens and modules

- `/Users/creeda/creeda-app/src/app/athlete/scan/page.tsx`
- `/Users/creeda/creeda-app/src/app/individual/scan/page.tsx`
- `/Users/creeda/creeda-app/src/lib/vision/MediaPipeEngine.ts`
- `/Users/creeda/creeda-app/src/lib/video-analysis/*`

### Schema addition

Create `objective_test_sessions` table:

- `id`
- `user_id`
- `role`
- `test_type`
- `sport`
- `capture_context`
- `score`
- `confidence`
- `results_json`
- `captured_at`

### Acceptance criteria

- test can be repeated consistently
- results include confidence and capture quality
- history view shows change over time

## Phase 6: India-Context Intelligence Layer

Duration:

- 2 weeks

Goal:

- make Creeda truly India-native at the engine level

### Add contextual inputs

- heat
- humidity
- AQI
- commute burden
- exam stress
- fasting or religious schedule
- vegetarian or Jain diet context
- shift work

### Engine and data changes

Modify:

- `/Users/creeda/creeda-app/src/lib/dashboard_decisions.ts`
- `/Users/creeda/creeda-app/src/lib/engine/DecisionService.ts`
- `/Users/creeda/creeda-app/src/lib/engine/Prescription/NutritionGenerator.ts`
- `/Users/creeda/creeda-app/src/lib/individual_performance_engine.ts`

### Schema approach

Add `context_meta` JSONB to daily decision inputs or log tables, or create a separate `daily_context_signals` table if you want cleaner analytics.

Recommended first version:

- `daily_context_signals`
  - `id`
  - `user_id`
  - `log_date`
  - `heat_level`
  - `humidity_level`
  - `aqi_band`
  - `commute_minutes`
  - `exam_stress_score`
  - `fasting_state`
  - `diet_pattern`
  - `created_at`

## Phase 7: Brand And Surface Refresh

Duration:

- 1 week

Goal:

- align public positioning with the actual product architecture

### Surfaces to modify

- `/Users/creeda/creeda-app/src/app/page.tsx`
- `/Users/creeda/creeda-app/src/app/features/page.tsx`

### Changes

- lead with one message:
  - `Know your body. Make the right call today.`
- show the three role journeys more clearly:
  - athlete
  - coach
  - individual
- explain the five-layer product model publicly:
  - Today
  - Plan
  - Trends
  - Technique
  - Science
- emphasize trust:
  - confidence-aware
  - explainable
  - India-first

## Recommended Schema Backlog

### Must-add

- `weekly_reviews`
- `coach_interventions`
- `objective_test_sessions`

### Must-clean

- health sync tables and migrations

### Likely-add

- `daily_context_signals`
- `coach_notes`

## Recommended Engine Backlog

### Must-add

- shared `trustSummary`
- shared `changeSummary`
- weekly review summary generator
- signal typing: measured, estimated, self-reported

### Must-improve

- confidence logic
- low-data logic
- driver explanation logic
- health-sync influence calculation

## Recommended UX Backlog By Route

### Athlete

- `/Users/creeda/creeda-app/src/app/athlete/checkin/page.tsx`
- `/Users/creeda/creeda-app/src/app/athlete/dashboard/DecisionHUD.tsx`
- `/Users/creeda/creeda-app/src/app/athlete/progress/page.tsx`
- `/Users/creeda/creeda-app/src/app/athlete/scan/page.tsx`

### Coach

- `/Users/creeda/creeda-app/src/app/coach/dashboard/components/CoachDecisionHUD.tsx`
- `/Users/creeda/creeda-app/src/app/coach/analytics/page.tsx`
- `/Users/creeda/creeda-app/src/app/coach/reports/page.tsx`

### Individual

- `/Users/creeda/creeda-app/src/app/fitstart/page.tsx`
- `/Users/creeda/creeda-app/src/app/individual/dashboard/components/IndividualDashboardClient.tsx`
- `/Users/creeda/creeda-app/src/app/individual/logging/page.tsx`
- `/Users/creeda/creeda-app/src/app/individual/scan/page.tsx`

## Success Metrics

Track from the first release:

- check-in completion rate
- weekly review completion rate
- recommendation action completion rate
- share of high-confidence versus low-confidence recommendations
- number of weak-data users over time
- coach intervention resolution rate
- objective test repeat rate
- retention at 7, 28, and 84 days

## Final Recommendation

If there is only enough capacity to do one serious push next, do this:

**Ship trust system + athlete today redesign + coach intervention queue first.**

That combination will improve:

- clarity
- retention
- credibility
- team usefulness

faster than any other single package of work.
