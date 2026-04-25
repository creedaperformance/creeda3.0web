# Guided Movement Diagnostic Coach Implementation

## Status

Implemented as an additive V1 on top of Creeda's existing AI video-analysis stack.

The feature is intentionally not a medical diagnosis system. It classifies movement complaints, asks focused open-ended follow-up questions, parses the user's free-text answers, prescribes one low-friction movement screen, runs the existing browser MediaPipe pose-analysis path, and stores a diagnostic interpretation plus action plan.

## Current flow

1. User opens `/athlete/diagnostic` or `/individual/diagnostic`.
2. User enters a complaint or taps a common prompt.
3. `/api/diagnostic/sessions` creates a `diagnostic_sessions` row after deterministic classification.
4. The UI shows one chatbot-style open-ended follow-up question at a time from the configurable question engine.
5. `/api/diagnostic/sessions/:id/followups` stores free-text answers, refines classification, evaluates safety with negation-aware red-flag parsing, and prescribes exactly one movement test.
6. The UI shows one prescribed movement test with one camera angle.
7. The user records with native mobile capture using the back camera hint.
8. The browser reuses `MediaPipeEngine`, `createAnalysisState`, `updateCaptureMetrics`, `runDeterministicRules`, and `assessVideoCapture`.
9. `/api/diagnostic/sessions/:id/analyze` persists normalized metrics, interpretation, and action plan.
10. The UI renders the result and history can reopen prior sessions.

## Existing systems reused

- `src/lib/vision/MediaPipeEngine.ts`
- `src/lib/vision/rules.ts`
- `src/lib/video-analysis/reporting.ts`
- `src/lib/video-analysis/issueProfiles.ts`
- Existing Supabase cookie auth through `src/lib/supabase/server.ts`
- Existing security response helpers in `src/lib/security/http.ts`
- Existing `product_analytics_events` table for diagnostic event telemetry

## New modules

- `src/lib/diagnostics/types.ts`
- `src/lib/diagnostics/config.ts`
- `src/lib/diagnostics/classifier.ts`
- `src/lib/diagnostics/followup.ts`
- `src/lib/diagnostics/prescription.ts`
- `src/lib/diagnostics/guardrails.ts`
- `src/lib/diagnostics/adapter.ts`
- `src/lib/diagnostics/interpretation.ts`
- `src/lib/diagnostics/action-plan.ts`
- `src/lib/diagnostics/service.ts`
- `src/lib/diagnostics/events.ts`

## Persistence

Migration: `migrations/20260423_v36_guided_movement_diagnostic.sql`

Tables:

- `diagnostic_sessions`
- `diagnostic_followup_answers`
- `prescribed_movement_tests`
- `diagnostic_video_captures`
- `diagnostic_analysis_results`
- `diagnostic_interpretations`
- `diagnostic_action_plans`

All tables are protected by RLS. Child tables are accessible only when the authenticated user owns the parent `diagnostic_sessions` row.

## V1 privacy model

V1 analyzes captured video in the browser and persists diagnostic outputs, not raw video. `diagnostic_video_captures.media_url` is nullable so a private signed-storage upload path can be added later without changing the diagnostic result schema.

## Product limits

- One camera angle per test.
- Back camera is requested through native capture.
- Athlete comparisons are not implemented.
- LLM parsing is not used in V1; deterministic parsing of complaint text plus open-ended follow-up answers is easier to audit and safer.
