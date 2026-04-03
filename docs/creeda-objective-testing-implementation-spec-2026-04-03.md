# Creeda Objective Testing Implementation Spec

Date: 2026-04-03
Workspace: `/Users/creeda/creeda-app`

References:

- `/Users/creeda/creeda-app/docs/creeda-unified-modification-blueprint-2026-04-02.md`
- `/Users/creeda/creeda-app/docs/creeda-execution-roadmap-2026-04-02.md`
- `/Users/creeda/creeda-app/src/lib/objective-tests/reaction.ts`
- `/Users/creeda/creeda-app/src/components/objective-tests/ObjectiveTestingLab.tsx`
- `/Users/creeda/creeda-app/src/lib/dashboard_decisions.ts`
- `/Users/creeda/creeda-app/src/lib/state_engine.tsx`
- `/Users/creeda/creeda-app/src/lib/vision/MediaPipeEngine.ts`
- `/Users/creeda/creeda-app/src/components/video-analysis/VideoAnalysisWorkspace.tsx`

## Purpose

This document defines the concrete pre-build specification for expanding Creeda objective testing beyond reaction into:

- balance and stability
- breathing recovery
- jump and landing
- mobility
- asymmetry
- sprint and agility

The goal is not to add "more tests." The goal is to turn Creeda objective testing into a trustworthy protocol platform that fits the product blueprint:

- `Today`
- `Plan`
- `Trends`
- `Technique`
- `Science`

## Executive Decision

Creeda should **not** build these tests as one-off features inside the current reaction-specific stack.

Creeda should build:

1. one strict protocol registry
2. one validity and confidence system
3. one baseline system
4. one cadence system
5. one influence system

If that architecture is skipped, the result will be:

- inconsistent dashboard language
- overconfident recommendations
- noisy trend interpretation
- user fatigue from too many tests
- coach confusion
- trust damage

## Current-State Assessment

Creeda already has the right foundation, but it is too reaction-specific.

### What already exists

- session persistence in `/Users/creeda/creeda-app/migrations/20260402_v21_objective_test_sessions.sql`
- reaction scoring in `/Users/creeda/creeda-app/src/lib/objective-tests/reaction.ts`
- a live test route in `/Users/creeda/creeda-app/src/components/objective-tests/ObjectiveTestingLab.tsx`
- dashboard and review integration in `/Users/creeda/creeda-app/src/lib/dashboard_decisions.ts`
- coach integration in `/Users/creeda/creeda-app/src/lib/state_engine.tsx`
- reusable pose engine in `/Users/creeda/creeda-app/src/lib/vision/MediaPipeEngine.ts`
- reusable video-analysis capture workflow in `/Users/creeda/creeda-app/src/components/video-analysis/VideoAnalysisWorkspace.tsx`

### What is not ready

- `objective_test_sessions` is still constrained to `reaction_tap`
- dashboard logic still assumes one measured signal
- coach logic still assumes reaction-only trend logic
- there is no shared protocol schema
- there is no baseline model
- there is no decision-weight model
- there is no testing cadence engine
- there is no invalid-session model

## Non-Negotiable Product Rules

1. Objective testing stays optional for athletes and individuals.
2. Missing objective tests must not reduce core trust the same way missing daily logs do.
3. Objective tests may increase decision certainty, but only when they are valid, recent, and relevant.
4. Camera tests must reuse Creeda's existing pose and video-analysis infrastructure.
5. `/tests` remains the measurement product. `/scan` remains the technique product.
6. Asymmetry is a derived layer first, not a standalone first capture flow.
7. Breathing recovery must not ship as a high-impact objective signal unless Creeda has a trustworthy heart-rate source.
8. No single objective protocol may overrule the full readiness decision by itself.

## Mandatory Architecture Before Further Build

Creeda needs five design artifacts implemented in code before adding new tests:

1. strict protocol definition schema
2. baseline and minimum-detectable-change logic
3. influence engine for decision weighting
4. cadence and testing-load engine
5. validity, confidence, and safety-gate engine

## Exact Database Schema Changes

## Migration plan

Create one new migration:

- `migrations/20260403_v25_objective_testing_platform.sql`

Do not delete the current reaction fields in `objective_test_sessions` yet. Keep backward compatibility for existing data and migrate summary logic incrementally.

## 1. Expand `objective_test_sessions`

```sql
BEGIN;

ALTER TABLE public.objective_test_sessions
  DROP CONSTRAINT IF EXISTS objective_test_sessions_test_type_check,
  DROP CONSTRAINT IF EXISTS objective_test_sessions_source_check;

ALTER TABLE public.objective_test_sessions
  ADD COLUMN IF NOT EXISTS family TEXT
    CHECK (family IN ('neural', 'balance', 'recovery', 'power', 'mobility', 'speed', 'agility', 'derived')),
  ADD COLUMN IF NOT EXISTS capture_mode TEXT NOT NULL DEFAULT 'screen_tap'
    CHECK (capture_mode IN (
      'screen_tap',
      'camera_pose_live',
      'camera_pose_upload',
      'guided_timer_hr_optional',
      'camera_timed_distance'
    )),
  ADD COLUMN IF NOT EXISTS sport TEXT,
  ADD COLUMN IF NOT EXISTS capture_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS side_scope TEXT NOT NULL DEFAULT 'none'
    CHECK (side_scope IN ('none', 'left', 'right', 'bilateral', 'battery')),
  ADD COLUMN IF NOT EXISTS dominant_side TEXT
    CHECK (dominant_side IN ('left', 'right')),
  ADD COLUMN IF NOT EXISTS headline_metric_key TEXT,
  ADD COLUMN IF NOT EXISTS headline_metric_value NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS headline_metric_unit TEXT,
  ADD COLUMN IF NOT EXISTS headline_metric_direction TEXT
    CHECK (headline_metric_direction IN ('higher_better', 'lower_better', 'target_band')),
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(5,4)
    CHECK (confidence_score >= 0 AND confidence_score <= 1),
  ADD COLUMN IF NOT EXISTS capture_quality_score NUMERIC(5,4)
    CHECK (capture_quality_score >= 0 AND capture_quality_score <= 1),
  ADD COLUMN IF NOT EXISTS validity_status TEXT NOT NULL DEFAULT 'accepted'
    CHECK (validity_status IN ('accepted', 'low_confidence', 'invalid_saved', 'supplemental')),
  ADD COLUMN IF NOT EXISTS baseline_status TEXT NOT NULL DEFAULT 'building'
    CHECK (baseline_status IN ('building', 'provisional', 'ready', 'stale')),
  ADD COLUMN IF NOT EXISTS baseline_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS quality_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS safety_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS linked_video_report_id UUID REFERENCES public.video_analysis_reports(id) ON DELETE SET NULL;

ALTER TABLE public.objective_test_sessions
  ADD CONSTRAINT objective_test_sessions_test_type_check
  CHECK (test_type IN (
    'reaction_tap',
    'balance_single_leg',
    'breathing_recovery',
    'jump_landing_control',
    'mobility_battery',
    'sprint_10m',
    'agility_505'
  ));

ALTER TABLE public.objective_test_sessions
  ADD CONSTRAINT objective_test_sessions_source_check
  CHECK (source IN (
    'phone_browser',
    'camera_live',
    'camera_upload',
    'health_sync',
    'hybrid'
  ));

CREATE INDEX IF NOT EXISTS idx_objective_test_sessions_user_family
  ON public.objective_test_sessions(user_id, family, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_objective_test_sessions_user_validity
  ON public.objective_test_sessions(user_id, test_type, validity_status, completed_at DESC);

COMMIT;
```

### Why these fields are required

- `family`: lets dashboard, coach, and cadence logic operate above one test type
- `capture_mode`: needed for quality rules and UI flow
- `headline_metric_*`: gives every test one exact top-line metric
- `confidence_score` and `capture_quality_score`: separate score meaning from capture reliability
- `validity_status`: avoids treating every saved session as equally trustworthy
- `baseline_status`: prevents premature decision influence
- `linked_video_report_id`: lets one capture power both `Technique` and `Science`

## 2. Create `objective_test_measurements`

This table stores all exact metrics per session. It is required for batteries, bilateral tests, and future validation.

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.objective_test_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.objective_test_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('athlete', 'individual')),
  test_type TEXT NOT NULL,
  subtest_key TEXT,
  side TEXT CHECK (side IN ('left', 'right', 'bilateral', 'none')),
  metric_key TEXT NOT NULL,
  metric_group TEXT NOT NULL,
  display_label TEXT NOT NULL,
  value NUMERIC(12,4) NOT NULL,
  unit TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('higher_better', 'lower_better', 'target_band')),
  is_headline BOOLEAN NOT NULL DEFAULT false,
  quality_weight NUMERIC(5,4) NOT NULL DEFAULT 1
    CHECK (quality_weight >= 0 AND quality_weight <= 1),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_objective_test_measurements_user_metric
  ON public.objective_test_measurements(user_id, test_type, metric_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_objective_test_measurements_session
  ON public.objective_test_measurements(session_id, metric_key);

ALTER TABLE public.objective_test_measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_objective_test_measurements_select ON public.objective_test_measurements;
DROP POLICY IF EXISTS creeda_objective_test_measurements_insert ON public.objective_test_measurements;

CREATE POLICY creeda_objective_test_measurements_select
  ON public.objective_test_measurements
  FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) IS NOT NULL
    AND (
      (select auth.uid()) = user_id
      OR EXISTS (
        SELECT 1
        FROM public.team_memberships tm
        WHERE tm.athlete_id = public.objective_test_measurements.user_id
          AND tm.coach_id = (select auth.uid())
          AND tm.status = 'active'
      )
    )
  );

CREATE POLICY creeda_objective_test_measurements_insert
  ON public.objective_test_measurements
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

GRANT ALL ON public.objective_test_measurements TO postgres, service_role, authenticated;

COMMIT;
```

## 3. Create `objective_test_baselines`

This table stores the personal baseline state for each metric. Baselines must not be recomputed ad hoc inside dashboard code.

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.objective_test_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('athlete', 'individual')),
  test_type TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  side TEXT NOT NULL DEFAULT 'none' CHECK (side IN ('left', 'right', 'bilateral', 'none')),
  baseline_method TEXT NOT NULL CHECK (baseline_method IN ('first_3_median', 'rolling_5_median', 'rolling_28d', 'manual_clinician_override')),
  baseline_n INTEGER NOT NULL DEFAULT 0 CHECK (baseline_n >= 0),
  baseline_value NUMERIC(12,4) NOT NULL,
  baseline_unit TEXT NOT NULL,
  min_detectable_change NUMERIC(12,4) NOT NULL,
  ready BOOLEAN NOT NULL DEFAULT false,
  last_session_id UUID REFERENCES public.objective_test_sessions(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, test_type, metric_key, side)
);

CREATE INDEX IF NOT EXISTS idx_objective_test_baselines_user_test
  ON public.objective_test_baselines(user_id, test_type, metric_key, side);

ALTER TABLE public.objective_test_baselines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creeda_objective_test_baselines_select ON public.objective_test_baselines;
DROP POLICY IF EXISTS creeda_objective_test_baselines_insert ON public.objective_test_baselines;
DROP POLICY IF EXISTS creeda_objective_test_baselines_update ON public.objective_test_baselines;

CREATE POLICY creeda_objective_test_baselines_select
  ON public.objective_test_baselines
  FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) IS NOT NULL
    AND (
      (select auth.uid()) = user_id
      OR EXISTS (
        SELECT 1
        FROM public.team_memberships tm
        WHERE tm.athlete_id = public.objective_test_baselines.user_id
          AND tm.coach_id = (select auth.uid())
          AND tm.status = 'active'
      )
    )
  );

CREATE POLICY creeda_objective_test_baselines_insert
  ON public.objective_test_baselines
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY creeda_objective_test_baselines_update
  ON public.objective_test_baselines
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

GRANT ALL ON public.objective_test_baselines TO postgres, service_role, authenticated;

COMMIT;
```

## TypeScript Protocol Schema

Create:

- `/Users/creeda/creeda-app/src/lib/objective-tests/types.ts`
- `/Users/creeda/creeda-app/src/lib/objective-tests/protocols/index.ts`
- one file per protocol in `/Users/creeda/creeda-app/src/lib/objective-tests/protocols/`

```ts
export type ObjectiveTestType =
  | 'reaction_tap'
  | 'balance_single_leg'
  | 'breathing_recovery'
  | 'jump_landing_control'
  | 'mobility_battery'
  | 'sprint_10m'
  | 'agility_505'

export type ObjectiveTestFamily =
  | 'neural'
  | 'balance'
  | 'recovery'
  | 'power'
  | 'mobility'
  | 'speed'
  | 'agility'
  | 'derived'

export type CaptureMode =
  | 'screen_tap'
  | 'camera_pose_live'
  | 'camera_pose_upload'
  | 'guided_timer_hr_optional'
  | 'camera_timed_distance'

export type MetricDirection = 'higher_better' | 'lower_better' | 'target_band'
export type ValidityStatus = 'accepted' | 'low_confidence' | 'invalid_saved' | 'supplemental'
export type RecommendationState =
  | 'recommended'
  | 'optional'
  | 'cooldown'
  | 'not_useful_now'
  | 'unsafe_now'
  | 'replace_with_lower_load'

export type DecisionDomain =
  | 'neural_sharpness'
  | 'postural_control'
  | 'systemic_recovery'
  | 'explosive_readiness'
  | 'movement_capacity'
  | 'asymmetry_risk'
  | 'speed_exposure_readiness'
  | 'return_to_play_confidence'

export interface ProtocolMetricDefinition {
  key: string
  label: string
  unit: string
  direction: MetricDirection
  decimals: number
  minimumDetectableChange: number
  provisionalThresholds: {
    good: number | [number, number]
    risk: number | [number, number]
    critical: number | [number, number]
  }
}

export interface BaselineDefinition {
  minimumAcceptedSessions: number
  initialMethod: 'first_3_median'
  rollingMethod: 'rolling_5_median'
  minimumDaysBetweenAnchorSessions: number
}

export interface DecisionMappingDefinition {
  domain: DecisionDomain
  coefficient: number
  maxInfluencePoints: number
  rehabMultiplier?: number
}

export interface ObjectiveTestProtocolDefinition {
  id: ObjectiveTestType
  family: ObjectiveTestFamily
  displayName: string
  captureMode: CaptureMode
  rolloutPhase: 1 | 2 | 3
  supportedRoles: Array<'athlete' | 'individual'>
  supportedSports: 'all' | string[]
  estimatedDurationMinutes: number
  estimatedLoad: 'very_low' | 'low' | 'moderate' | 'high'
  headlineMetric: ProtocolMetricDefinition
  secondaryMetrics: ProtocolMetricDefinition[]
  subtests?: Array<{
    key: string
    label: string
    metrics: ProtocolMetricDefinition[]
  }>
  baseline: BaselineDefinition
  freshnessWindowHours: number
  cooldownHours: number
  weeklyCap: number
  validityRules: {
    minimumCaptureQuality: number
    minimumConfidence: number
    minimumAcceptedTrials?: number
    minimumVisibleLandmarks?: string[]
    minimumFps?: number
    requiredSides?: Array<'left' | 'right'>
  }
  contraindications: string[]
  decisionMappings: DecisionMappingDefinition[]
  alternativesWhenUnsafe?: ObjectiveTestType[]
}
```

## Protocol Definitions

All protocols below must define:

- one exact headline metric
- exact units
- directionality
- baseline logic
- provisional thresholds
- validity rules
- cadence rules
- decision domains

The dashboard should show one headline metric. The engine should read all measurements.

## 1. Reaction Tap

### Protocol identity

- `id`: `reaction_tap`
- `family`: `neural`
- `captureMode`: `screen_tap`
- `rolloutPhase`: already live, refactor into registry

### Session structure

- 2 practice taps
- 5 accepted trials
- max 10 total attempts
- false starts allowed but counted

### Exact metrics

- `headline`: `validated_reaction_ms`
  - unit: `ms`
  - direction: `lower_better`
- `secondary`:
  - `average_reaction_ms`
  - `best_reaction_ms`
  - `consistency_ms`
  - `false_start_count`

### Provisional thresholds

- `good`: `< 250 ms`
- `risk`: `250-309 ms`
- `critical`: `>= 310 ms`

These thresholds are only orientation bands. Engine influence must use personal baseline first.

### Baseline logic

- baseline after 3 accepted sessions
- baseline method: first 3-session median for `validated_reaction_ms`
- rolling baseline: last 5 accepted sessions
- minimum detectable change: `10 ms`

### Validity rules

- 5 accepted trials required
- `consistency_ms <= 55` for full-confidence status
- `false_start_count <= 3` for full-confidence status
- otherwise `validity_status = low_confidence`

### Cadence

- freshness window: `168 hours`
- cooldown: `24 hours`
- weekly cap: `2`

### Decision mapping

- `neural_sharpness`: coefficient `1.0`, max influence `6`
- may softly inform `speed_exposure_readiness`: coefficient `0.35`, max influence `2`

### Safety

- no major physical contraindications
- suppress recommendation if severe screen/input lag detected

## 2. Single-Leg Balance / Stability

### Protocol identity

- `id`: `balance_single_leg`
- `family`: `balance`
- `captureMode`: `camera_pose_live`
- `rolloutPhase`: `1`

### Session structure

- one practice per side
- one scored 20-second hold per side
- left and right both required
- hands on hips
- eyes open
- flat surface
- full body visible in front view

### Exact metrics

- `headline`: `normalized_sway_velocity_bw_per_s`
  - unit: `body_widths_per_second`
  - direction: `lower_better`
- `secondary`:
  - `hold_completion_sec`
  - `foot_touch_count`
  - `trunk_lean_variability_deg`
  - `pelvis_drop_variability_deg`
  - `balance_asymmetry_percent`

### Why this metric

Do **not** use centimeter sway in v1. A single phone camera without scale calibration cannot defend centimeter-level validity. Use body-size-normalized sway instead.

### Provisional thresholds

- `good`:
  - headline `<= 0.18`
  - `foot_touch_count = 0`
  - `hold_completion_sec = 20`
  - `balance_asymmetry_percent < 8`
- `risk`:
  - headline `0.19-0.28`
  - or `foot_touch_count = 1`
  - or `balance_asymmetry_percent 8-14`
- `critical`:
  - headline `> 0.28`
  - or `hold_completion_sec < 15`
  - or `foot_touch_count >= 2`
  - or `balance_asymmetry_percent >= 15`

### Baseline logic

- baseline after 3 valid bilateral sessions
- baseline metric stored per side and as asymmetry composite
- minimum detectable change:
  - sway velocity: `0.03 body_widths_per_second`
  - asymmetry: `5%`

### Validity rules

- front-view camera only in v1
- minimum frame rate: `24 fps`
- full body visible from head to planted foot
- one person only
- shoulder and hip landmarks visible at least `85%` of frames
- if visibility or calibration fails: `invalid_saved`

### Cadence

- freshness window: `168 hours`
- cooldown: `48 hours`
- weekly cap: `2`

### Decision mapping

- `postural_control`: coefficient `1.0`, max influence `5`
- `asymmetry_risk`: coefficient `0.7`, max influence `4`
- `return_to_play_confidence`: coefficient `0.9`, max influence `6` when rehab active

### Safety

- do not recommend if:
  - dizziness
  - acute ankle or knee instability
  - pain `>= 6/10`
  - unsafe surface
- replace with `reaction_tap` or low-load logging if unsafe

## 3. Breathing Recovery

### Protocol identity

- `id`: `breathing_recovery`
- `family`: `recovery`
- `captureMode`: `guided_timer_hr_optional`
- `rolloutPhase`: `1`, but **public influence is blocked unless heart-rate source exists**

### Critical product rule

Do **not** market v1 as AI breathing detection.

Public v1 should be:

- guided exertion
- timed recovery
- heart-rate-recovery-driven when HR is available

Without HR, the protocol may exist as a guided reflection tool, but it must not materially influence core decisions.

### Session structure

- 60-second step-in-place block at guided cadence
- immediate recovery phase
- capture HR peak and HR at 60 seconds if source available
- symptom check before save

### Exact metrics

- `headline`: `hrr_60_bpm`
  - formula: `peak_hr_bpm - hr_60s_bpm`
  - unit: `bpm`
  - direction: `higher_better`
- `secondary`:
  - `peak_hr_bpm`
  - `hr_60s_bpm`
  - `perceived_breathlessness_delta`
  - `recovery_symptom_flags`

### Provisional thresholds

- `good`: `>= 25 bpm`
- `risk`: `15-24 bpm`
- `critical`: `< 15 bpm`

### Baseline logic

- baseline after 3 accepted HR-backed sessions
- minimum detectable change: `5 bpm`
- if no HR source, `baseline_status = building` and `decision weight = 0`

### Validity rules

- HR source must be present for accepted status
- if guided timer completed without HR:
  - save as `supplemental`
  - show in history
  - do not affect readiness

### Cadence

- freshness window: `168 hours`
- cooldown: `48 hours`
- weekly cap: `2`

### Decision mapping

- `systemic_recovery`: coefficient `1.0`, max influence `5`
- `return_to_play_confidence`: coefficient `0.25`, max influence `1`

### Safety

- hard block if:
  - chest pain
  - wheeze or uncontrolled asthma symptoms
  - fever or active illness
  - dizziness
  - medical contraindication on profile
- replace with check-in only if unsafe

## 4. Jump / Landing Control

### Protocol identity

- `id`: `jump_landing_control`
- `family`: `power`
- `captureMode`: `camera_pose_live`
- `rolloutPhase`: `2`

### Critical product rule

Do **not** headline jump height in v1. Monocular phone capture can support landing control sooner than it can defend true vertical height accuracy.

### Session structure

- athletes: 3 countermovement jumps
- individuals: 3 snap-down landings by default, CMJ only if cleared
- front or front-45-degree view
- stable flat surface

### Exact metrics

- `headline`: `time_to_stabilization_ms`
  - unit: `ms`
  - direction: `lower_better`
- `secondary`:
  - `landing_valgus_event_count`
  - `trunk_control_variability_deg`
  - `landing_asymmetry_percent`
  - `jump_amplitude_proxy_bw`

### Provisional thresholds

- `good`:
  - `time_to_stabilization_ms <= 1200`
  - `landing_valgus_event_count = 0`
  - `landing_asymmetry_percent < 10`
- `risk`:
  - `1201-1800 ms`
  - or `landing_valgus_event_count = 1`
  - or `landing_asymmetry_percent 10-14`
- `critical`:
  - `> 1800 ms`
  - or `landing_valgus_event_count >= 2`
  - or `landing_asymmetry_percent >= 15`

### Baseline logic

- baseline after 3 accepted sessions
- minimum detectable change:
  - stabilization time `150 ms`
  - asymmetry `5%`

### Validity rules

- minimum frame rate: `30 fps`, target `60 fps`
- feet and trunk visible on landing
- no major occlusion
- at least 3 valid reps

### Cadence

- freshness window: `168 hours`
- cooldown: `72 hours`
- weekly cap:
  - athlete `2`
  - individual `1`

### Decision mapping

- `explosive_readiness`: coefficient `1.0`, max influence `7`
- `postural_control`: coefficient `0.6`, max influence `3`
- `asymmetry_risk`: coefficient `0.7`, max influence `4`
- `return_to_play_confidence`: coefficient `1.0`, max influence `8` if rehab active

### Safety

- hard block if:
  - lower-limb pain `>= 4/10`
  - back pain `>= 4/10`
  - rehab phase earlier than late loading
  - unsafe surface or low ceiling
  - severe fatigue or illness
- replace with `balance_single_leg` when blocked

## 5. Mobility Battery

### Protocol identity

- `id`: `mobility_battery`
- `family`: `mobility`
- `captureMode`: `camera_pose_live`
- `rolloutPhase`: `2`

### Critical product rule

Mobility must ship as a battery, not as one vague score.

### Session structure

Four guided subtests:

1. `ankle_dorsiflexion_left_right`
2. `overhead_squat`
3. `shoulder_flexion_overhead`
4. `toe_touch_hip_hinge`

### Exact metrics

- `headline`: `mobility_battery_score`
  - unit: `points`
  - direction: `higher_better`
- `subtest metrics`:
  - ankle dorsiflexion:
    - `ankle_dorsiflexion_deg`
    - `ankle_asymmetry_percent`
  - overhead squat:
    - `squat_depth_ratio`
    - `heel_lift_event_count`
    - `trunk_lean_deg`
  - shoulder flexion:
    - `shoulder_flexion_deg`
    - `rib_flare_event_count`
  - toe touch / hinge:
    - `hip_hinge_score`
    - `fingertip_to_ankle_ratio`

### Provisional thresholds

- battery score:
  - `good >= 80`
  - `risk 60-79`
  - `critical < 60`
- ankle dorsiflexion:
  - `good >= 35 deg`
  - `risk 28-34 deg`
  - `critical < 28 deg`
- shoulder flexion:
  - `good >= 165 deg`
  - `risk 150-164 deg`
  - `critical < 150 deg`
- squat depth ratio:
  - `good <= 1.00`
  - `risk 1.01-1.15`
  - `critical > 1.15`

### Baseline logic

- baseline after 2 complete batteries
- baseline stored per subtest metric
- minimum detectable change:
  - battery score `5 points`
  - joint-angle measures `5 deg`

### Validity rules

- each subtest has its own setup instructions
- battery accepted only if all four subtests are completed
- per-subtest validity can be accepted or invalid independently

### Cadence

- freshness window: `336 hours`
- cooldown: `168 hours`
- weekly cap: `1`

### Decision mapping

- `movement_capacity`: coefficient `1.0`, max influence `4`
- `asymmetry_risk`: coefficient `0.5`, max influence `2`
- `postural_control`: coefficient `0.35`, max influence `1`

### Safety

- soft caution for discomfort
- hard block only for acute pain, instability, or clinician restriction

## 6. Asymmetry Layer

### Protocol identity

- `id`: derived, not standalone in v1
- `family`: `derived`
- `rolloutPhase`: `2`

### Critical product rule

Do **not** launch asymmetry as a first standalone capture flow.

Derive it from unilateral protocols:

- balance left vs right
- ankle dorsiflexion left vs right
- shoulder flexion left vs right if measured
- landing left-right load or control asymmetry when valid

### Exact metric

- `headline`: `composite_asymmetry_percent`
  - unit: `%`
  - direction: `lower_better`

Formula:

`abs(left - right) / greatest(abs(left), abs(right)) * 100`

### Provisional thresholds

- `good < 8%`
- `risk 8-14%`
- `critical >= 15%`

### Baseline logic

- derived baseline after any two unilateral bilateral sessions are ready
- refresh when any source metric changes

### Cadence

- no standalone cadence
- stale when all source tests are stale

### Decision mapping

- `asymmetry_risk`: coefficient `1.0`, max influence `8` in rehab, `4` otherwise
- `return_to_play_confidence`: coefficient `1.0`, max influence `8` in rehab

### Safety

- this is an interpretation layer, not a provocative test

## 7. Sprint 10m

### Protocol identity

- `id`: `sprint_10m`
- `family`: `speed`
- `captureMode`: `camera_timed_distance`
- `rolloutPhase`: `3`

### Critical product rule

Sprint timing should launch only for supported sports and controlled setups. Do not ship this as a generic "record anywhere" feature.

### Session structure

- supported sports only
- 10m marked distance required
- 60 fps preferred
- side-view wide capture with both start and finish markers visible
- 2 valid reps

### Exact metrics

- `headline`: `sprint_10m_time_ms`
  - unit: `ms`
  - direction: `lower_better`
- `secondary`:
  - `step_count_10m`
  - `first_step_time_ms`
  - `acceleration_posture_score`

### Provisional thresholds

- no universal population thresholds in v1
- use:
  - personal baseline
  - sport-specific orientation bands if validated

### Baseline logic

- baseline after 3 valid sessions
- minimum detectable change: `40 ms`

### Validity rules

- marked 10m distance required
- visible start and finish markers
- minimum `60 fps` for accepted status
- if setup quality is weak, save as `low_confidence`

### Cadence

- freshness window: `336 hours`
- cooldown: `72 hours`
- weekly cap: `1`

### Decision mapping

- `speed_exposure_readiness`: coefficient `1.0`, max influence `6`
- `explosive_readiness`: coefficient `0.45`, max influence `2`

### Safety

- hard block if:
  - lower-limb pain `>= 3/10`
  - early rehab phase
  - unsafe surface
  - inadequate space
  - heat index or AQI above configured threshold

## 8. Agility 505

### Protocol identity

- `id`: `agility_505`
- `family`: `agility`
- `captureMode`: `camera_timed_distance`
- `rolloutPhase`: `3`

### Session structure

- marked 5-0-5 setup
- left and right turn versions
- 2 valid reps per turn side

### Exact metrics

- `headline`: `agility_505_time_ms`
  - unit: `ms`
  - direction: `lower_better`
- `secondary`:
  - `left_turn_vs_right_turn_asymmetry_percent`
  - `deceleration_control_score`
  - `turn_quality_score`

### Provisional thresholds

- personal baseline first
- no public generic thresholds without sport validation

### Baseline logic

- baseline after 3 complete sessions
- minimum detectable change: `60 ms`

### Validity rules

- visible setup markers
- minimum `60 fps`
- left and right turn versions both required

### Cadence

- freshness window: `336 hours`
- cooldown: `96 hours`
- weekly cap: `1`

### Decision mapping

- `speed_exposure_readiness`: coefficient `0.8`, max influence `4`
- `postural_control`: coefficient `0.4`, max influence `2`
- `asymmetry_risk`: coefficient `0.6`, max influence `3`

### Safety

- same hard blocks as sprint
- stronger caution in rehab and return-to-play phases

## Baseline System

The baseline model is mandatory.

### Rules

1. No strong engine influence before baseline is ready.
2. The first accepted session is orientation only.
3. Baseline readiness requires enough valid sessions for that protocol.
4. Rolling baseline should replace fixed baseline once enough data exists.
5. Every metric needs a minimum detectable change.

### Baseline statuses

- `building`: fewer than minimum valid sessions
- `provisional`: enough sessions for a temporary baseline, but not enough spread over time
- `ready`: baseline valid for engine use
- `stale`: baseline exists, but underlying sessions are too old

### Baseline formulas

- initial baseline:
  - `median(first 3 accepted sessions)`
- rolling baseline:
  - `median(last 5 accepted sessions)` when available
- asymmetry baseline:
  - median of last 3 derived asymmetry values

### Change interpretation

For a metric to be labeled `meaningful`, change must exceed:

- its `minimumDetectableChange`
- and the session must be `accepted` or `low_confidence` with score `>= 0.7`

## Validity, Confidence, and Capture Quality

These are not the same thing.

- `validity_status`: whether the session should count at all
- `capture_quality_score`: how good the capture conditions were
- `confidence_score`: overall trust in the resulting metric

### Confidence formula

Use:

`confidence_score = validity_gate * capture_quality * protocol_completion * repeatability_factor`

Suggested rules:

- `accepted`: confidence ceiling `1.0`
- `low_confidence`: confidence ceiling `0.74`
- `invalid_saved`: confidence ceiling `0.39`
- `supplemental`: confidence ceiling `0.29`

### Invalid-session model

Every protocol must classify session output into one of:

- `accepted`
- `low_confidence`
- `invalid_saved`
- `supplemental`

Do not silently discard all weak sessions. Save them when useful for audit and UX, but exclude them from engine influence.

## Decision Influence Engine

Create:

- `/Users/creeda/creeda-app/src/lib/objective-tests/influence.ts`

Do not put the real weighting system only in `/Users/creeda/creeda-app/src/lib/dashboard_decisions.ts`. That file should summarize, not decide.

## Domain model

Every objective test contributes to one or more decision domains:

- `neural_sharpness`
- `postural_control`
- `systemic_recovery`
- `explosive_readiness`
- `movement_capacity`
- `asymmetry_risk`
- `speed_exposure_readiness`
- `return_to_play_confidence`

## Influence formula

For each usable metric:

```text
directional_change =
  if higher_better: (current - baseline) / mdc
  if lower_better: (baseline - current) / mdc
  if target_band: distance_from_target / mdc * -1

normalized_change = clamp(directional_change, -2, 2)

effective_weight =
  max_influence
  * validity_gate
  * freshness_factor
  * confidence_factor
  * baseline_factor
  * cadence_factor
  * context_factor
  * safety_factor

domain_contribution = normalized_change * effective_weight * domain_coefficient
```

## Weighting factors

### `validity_gate`

- `accepted = 1.0`
- `low_confidence = 0.6`
- `invalid_saved = 0.0`
- `supplemental = 0.0`

### `freshness_factor`

- within freshness window: `1.0`
- 1 to 2 windows old: `0.5`
- older than 2 windows: `0.0`

### `confidence_factor`

- use raw `confidence_score`

### `baseline_factor`

- `building = 0.0`
- `provisional = 0.5`
- `ready = 1.0`
- `stale = 0.35`

### `cadence_factor`

- within cadence rules: `1.0`
- repeated too soon: `0.5`
- repeated far too soon or weekly cap exceeded: `0.0`

### `context_factor`

- based on relevance to the current user state
- examples:
  - reaction before skill or speed day: `1.0`
  - jump test for sedentary individual: `0.3`
  - balance in lower-limb rehab: `1.25`
  - sprint outside supported sport: `0.0`

### `safety_factor`

- safe context: `1.0`
- cautionary but allowed: `0.5`
- unsafe: `0.0`

## Max influence caps

No protocol may exceed the following total influence on the daily decision:

- reaction: `6` points
- balance: `5` points
- breathing HRR: `5` points
- jump/landing: `7` points
- mobility: `4` points
- asymmetry derived layer: `4` points general, `8` points rehab
- sprint 10m: `6` points
- agility 505: `4` points

## Practical engine rules

### Athlete

- reaction can bias sharpness and speed-session confidence
- balance can bias lower-limb caution, unilateral work, and rehab progression
- breathing HRR can bias recovery emphasis and heat caution if HR is valid
- jump/landing can bias plyometric exposure and explosive-session recommendation
- mobility should bias plan emphasis more than same-day readiness
- asymmetry should increase caution and coach attention, especially during rehab
- sprint/agility should only influence speed prescriptions in supported sports

### Individual

- reaction can influence focus and lighter-intensity guidance
- balance can influence movement-control advice and safer exercise selection
- breathing HRR can influence recovery and fatigue messaging when HR-backed
- jump should be heavily constrained and often replaced with balance or mobility
- mobility should mostly influence `Plan`, not aggressive `Today` calls

### Coach

- objective domains should surface as roster signals, not just raw test scores
- coach cards should say:
  - what changed
  - how trustworthy it is
  - what action is reasonable
- asymmetry and jump/balance changes should be high-salience in rehab views

## Cadence and Testing-Load Engine

Create:

- `/Users/creeda/creeda-app/src/lib/objective-tests/cadence.ts`

Cadence should decide:

- `recommended`
- `optional`
- `cooldown`
- `not_useful_now`
- `unsafe_now`
- `replace_with_lower_load`

### Global rules

- daily testing budget:
  - athlete: `1 moderate/high-load camera protocol or 2 very-low/low-load protocols`
  - individual: `1 protocol per day`
- no more than `2 objective sessions in 48 hours`
- no more than `3 objective sessions per 7 days` for individuals
- no more than `4 objective sessions per 7 days` for athletes

### Protocol cadence

| Protocol | Cooldown | Weekly cap | Freshness window |
|---|---:|---:|---:|
| Reaction | 24h | 2 | 7d |
| Balance | 48h | 2 | 7d |
| Breathing HRR | 48h | 2 | 7d |
| Jump/Landing | 72h | 1-2 | 7d |
| Mobility battery | 168h | 1 | 14d |
| Sprint 10m | 72h | 1 | 14d |
| Agility 505 | 96h | 1 | 14d |

### Recommendation rules by state

- if data quality is weak and user wants one low-load anchor:
  - recommend reaction
- if lower-limb rehab, unilateral pain history, or coach wants control signal:
  - recommend balance
- if HR source exists and recovery ambiguity is high:
  - recommend breathing HRR
- if explosive session planned and athlete is late-stage healthy:
  - optionally recommend jump/landing
- if repeated stiffness or restricted movement patterns are present:
  - recommend mobility battery
- if sprint or COD exposure is planned in supported sport and environment is safe:
  - optionally recommend sprint/agility

## Safety Gates

Create:

- `/Users/creeda/creeda-app/src/lib/objective-tests/safety.ts`

Safety must be checked before recommendation and again before protocol start.

### Universal hard blocks

- chest pain
- fever or active illness
- dizziness or faintness
- current medical red flag
- unsafe surface or environment
- capture quality precheck below threshold

### Pain-based blocks

- `pain >= 6/10`: block all provocative protocols
- `lower-limb pain >= 4/10`: block jump, sprint, agility
- `back pain >= 4/10`: block jump and sprint

### Rehab-based blocks

- acute rehab: block jump, sprint, agility
- early loading: block sprint and agility
- late loading: jump allowed only if previous sessions are stable

### Environment blocks

- outdoor speed tests blocked if:
  - `AQI > 180`
  - `heat_index_c > 38`
  - required distance not confirmed
  - surface unsafe

### Medical profile blocks

- breathing recovery blocked if respiratory or cardiac caution exists
- jump/sprint/agility blocked if clinician restriction exists

## Screen-by-Screen UX

The UX should be routed around real Creeda surfaces, not invented in isolation.

## 1. Tests Hub

Routes:

- `/Users/creeda/creeda-app/src/app/athlete/tests/page.tsx`
- `/Users/creeda/creeda-app/src/app/individual/tests/page.tsx`

### Replace current one-test lab with a hub

Sections:

1. `Recommended today`
2. `Quick tests`
3. `Camera tests`
4. `Recent results`
5. `Why tests are optional`

### Each test card must show

- display name
- duration
- estimated load
- setup needed
- why it matters
- last result
- freshness
- baseline state
- recommendation state

### Athlete tone

- performance-first
- more operational
- emphasizes session relevance

### Individual tone

- calmer
- less performance pressure
- emphasizes movement quality and safer guidance

## 2. Protocol Detail Screen

Recommended new routes:

- `/athlete/tests/[protocolId]`
- `/individual/tests/[protocolId]`

Content order:

1. what this test measures
2. when it is useful
3. when to skip it
4. how long it takes
5. what equipment or space is needed
6. latest baseline and freshness
7. start button

Do not start capture immediately from the hub for camera protocols.

## 3. Safety Gate Screen

Before every protocol:

- quick contraindication checks
- environment confirmation
- space/surface confirmation
- role-specific copy

Possible outcomes:

- proceed
- proceed with caution
- switch to lower-load test
- stop

## 4. Setup and Calibration Screen

### Reaction

- finger position
- phone stillness
- response instructions

### Camera tests

- tripod or stable support guidance
- distance from camera
- framing overlay
- visible landmarks checklist
- lighting prompt

### Sprint/agility

- marker placement
- distance confirmation
- frame-rate confirmation
- safety note

## 5. Live Capture Screen

### Requirements

- progress bar
- rep counter
- capture-quality indicator
- repeatability hint
- stop and retry option

For camera protocols:

- live framing feedback
- explicit quality state:
  - `good`
  - `adjust camera`
  - `too far`
  - `feet not visible`

## 6. Results Screen

Show only:

1. headline metric
2. confidence
3. change vs personal baseline
4. one plain-language meaning
5. one next action

Then optionally:

- secondary metrics
- left-right comparison
- quality warnings

Do not dump every sub-metric in the hero.

## 7. History Screen

Recommended routes:

- `/athlete/tests/[protocolId]/history`
- `/individual/tests/[protocolId]/history`

Show:

- last 6-8 valid sessions
- baseline line
- best recent
- meaningful change markers
- invalid or low-confidence sessions visually separated

## 8. Athlete Dashboard Integration

Primary surface:

- `/Users/creeda/creeda-app/src/app/athlete/dashboard/DecisionHUD.tsx`

Changes:

- replace single reaction card with `Measured Signals`
- show only top 1-2 relevant fresh signals
- each signal tile shows:
  - headline metric
  - freshness
  - confidence
  - effect on today
- include `optional` language if no test exists

## 9. Individual Dashboard Integration

Primary surface:

- `/Users/creeda/creeda-app/src/app/individual/dashboard/components/IndividualDashboardClient.tsx`

Changes:

- objective testing stays framed as optional
- mobility and balance should surface more often than jump
- measured signals should primarily influence safer plan adjustments and clarity

## 10. Weekly Review Integration

Surfaces:

- `/Users/creeda/creeda-app/src/app/athlete/review/page.tsx`
- `/Users/creeda/creeda-app/src/app/individual/review/page.tsx`

Rules:

- only fresh, valid, baseline-ready objective changes appear as `wins` or `bottlenecks`
- stale or low-confidence sessions appear in history, not as strong narrative drivers
- asymmetry changes should appear in review if clinically meaningful

## 11. Coach Command Center Integration

Primary surface:

- `/Users/creeda/creeda-app/src/app/coach/dashboard/components/CoachDecisionHUD.tsx`

Add:

- `Objective Coverage` by protocol family
- `Meaningful Declines` queue
- `Asymmetry Watchlist`
- `Return-to-play Watchlist`

Each coach card should show:

- freshest relevant protocol
- confidence
- meaningful change vs baseline
- whether this should change load, drill type, rehab progression, or simply monitoring

## File-Level Implementation Map

## New files

- `/Users/creeda/creeda-app/src/lib/objective-tests/types.ts`
- `/Users/creeda/creeda-app/src/lib/objective-tests/protocols/index.ts`
- `/Users/creeda/creeda-app/src/lib/objective-tests/protocols/reactionTap.ts`
- `/Users/creeda/creeda-app/src/lib/objective-tests/protocols/singleLegBalance.ts`
- `/Users/creeda/creeda-app/src/lib/objective-tests/protocols/breathingRecovery.ts`
- `/Users/creeda/creeda-app/src/lib/objective-tests/protocols/jumpLandingControl.ts`
- `/Users/creeda/creeda-app/src/lib/objective-tests/protocols/mobilityBattery.ts`
- `/Users/creeda/creeda-app/src/lib/objective-tests/protocols/asymmetry.ts`
- `/Users/creeda/creeda-app/src/lib/objective-tests/protocols/sprint10m.ts`
- `/Users/creeda/creeda-app/src/lib/objective-tests/protocols/agility505.ts`
- `/Users/creeda/creeda-app/src/lib/objective-tests/baselines.ts`
- `/Users/creeda/creeda-app/src/lib/objective-tests/influence.ts`
- `/Users/creeda/creeda-app/src/lib/objective-tests/cadence.ts`
- `/Users/creeda/creeda-app/src/lib/objective-tests/safety.ts`
- `/Users/creeda/creeda-app/src/lib/objective-tests/store.ts`

## Existing files to refactor

- `/Users/creeda/creeda-app/src/lib/objective-tests/reaction.ts`
- `/Users/creeda/creeda-app/src/components/objective-tests/ObjectiveTestingLab.tsx`
- `/Users/creeda/creeda-app/src/lib/dashboard_decisions.ts`
- `/Users/creeda/creeda-app/src/lib/state_engine.tsx`
- `/Users/creeda/creeda-app/src/lib/engine/DecisionService.ts`
- `/Users/creeda/creeda-app/src/lib/engine/types.ts`
- `/Users/creeda/creeda-app/src/lib/vision/MediaPipeEngine.ts`
- `/Users/creeda/creeda-app/src/components/video-analysis/VideoAnalysisWorkspace.tsx`

## Recommended refactor shape

- keep reaction scoring logic, but move it under protocol registry
- evolve `ObjectiveTestingLab.tsx` from one-test component into a protocol hub and renderer
- extract shared camera-capture primitives from video-analysis flow instead of cloning them
- move test influence out of dashboard rendering and into engine/objective logic

## Rollout Order

## Phase 0: Platform refactor

Build first:

1. schema expansion
2. protocol registry
3. baseline engine
4. validity engine
5. cadence engine
6. influence engine
7. refactor reaction into new platform

No new protocol should launch before this.

## Phase 1: Balance first

Why first:

- lower injury risk
- high rehab value
- strong coach value
- best fit for current pose stack

Ship:

- `balance_single_leg`

## Phase 1.5: Breathing only if HR-backed

Why second:

- high recovery value
- useful India-context interaction
- but high trust risk if sensor quality is weak

Ship publicly only if:

- HR source is available and validated
- supplemental no-HR mode is clearly non-influential

## Phase 2: Jump / landing control

Why third:

- strong performance and rehab value
- higher load than balance
- more safety burden

Ship:

- `jump_landing_control`

## Phase 2.5: Mobility battery

Why fourth:

- powerful for `Plan`
- lower day-to-day urgency than balance or jump
- requires battery architecture

Ship:

- `mobility_battery`

## Phase 3: Asymmetry layer

Why fifth:

- should be derived from earlier unilateral tests
- becomes much more believable after balance and mobility exist

Ship:

- `composite_asymmetry_percent`

## Phase 4: Sprint and agility pilots

Why last:

- highest setup burden
- highest validation burden
- strongest environment risk

Ship first as narrow pilot:

- `sprint_10m`
- `agility_505`

Only for:

- supported sports
- athlete role first
- calibrated setups

## Final Go / No-Go Rule

Creeda is ready to build the next test only when all of the following are true for the previous one:

1. repeatability is acceptable
2. capture-quality failures are understandable
3. coach interpretation is operationally useful
4. the test does not create noise in daily decisions
5. users do not feel pressured to do it too often

If any of those are false, do not add the next protocol yet.
