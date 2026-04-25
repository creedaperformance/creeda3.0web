# CREEDA Full Build Test Audit

Audit date: 2026-04-22 IST
Repository: `/Users/creeda/creeda-app`
Mode: production build plus local runtime verification on `http://localhost:3000`

## Executive Summary

CREEDA was audited as a multi-role Next.js/Supabase product with active athlete, coach, and individual journeys. The active role journeys now pass end-to-end smoke coverage for signup, onboarding, daily logging/check-in, dashboards, coach-athlete linking, video analysis entry, and current decision/risk surfaces.

The production build is stable. TypeScript is clean. Security predeploy checks pass with warnings. The main remaining release gate is repository-wide lint: after removing generated local worktrees from the lint surface, ESLint still reports 384 real legacy/app issues. Those are not caused by the changes in this audit and are logged separately.

## Architecture Inventory

### Runtime Stack

- App framework: Next.js App Router.
- Auth/data: Supabase auth, Supabase server/client helpers, and role-aware middleware.
- Active app roles: `athlete`, `coach`, `individual`.
- Role route source of truth: `src/lib/role_routes.ts`.
- Role verification: `src/lib/auth_utils.ts`.
- Middleware/proxy: `src/proxy.ts` plus `src/lib/supabase/middleware.ts`.
- Form engine: `src/components/form/AdaptiveFormWizard.tsx`, `src/forms/flows/*`, `src/forms/schemas/*`, `src/forms/storage.ts`.
- Decision layers: `src/lib/dashboard_decisions.ts`, `src/lib/athlete-checkin.ts`, `src/lib/fitstart.ts`, `src/lib/individual-logging.ts`, `src/lib/product/*`.

### Active Role Entry Points

| Role | Home | Onboarding | Daily/data capture | Dashboard/result |
| --- | --- | --- | --- | --- |
| Athlete | `/athlete` -> `/athlete/dashboard` | `/athlete/onboarding` | `/athlete/checkin` | `/athlete/dashboard` |
| Coach | `/coach` -> `/coach/dashboard` | `/coach/onboarding` | Coach actions, execution, review, reports | `/coach/dashboard` |
| Individual | `/individual` -> `/individual/dashboard` | `/fitstart` | `/individual/logging` | `/individual/dashboard` |

`guardian` is not an active `AppRole`. Linked/guardian surfaces are present through `/athlete/family`, coach academy handoff flows, guardian consent fields, `athlete_guardian_profiles`, and `/join/[lockerCode]`.

### Route Tree Inventory

Public/auth/legal routes include:

- `/`, `/features`, `/mission`, `/learn`
- `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/verification-success`
- `/terms`, `/privacy`, `/consent`, `/cookies`, `/data-ownership`, `/disclaimer`, `/refund-policy`, `/security`, `/sla`
- `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/llms.txt`, `/humans.txt`, `/indexnow.txt`

Legacy journey routes still present and reachable:

- `/home`, `/welcome`, `/role-selection`, `/onboarding`, `/onboarding/basic`, `/onboarding/goals`, `/onboarding/injury-mobility`, `/onboarding/intensity`, `/onboarding/lifestyle`, `/onboarding/physiology`, `/onboarding/sport`, `/onboarding/time-horizon`, `/daily-checkin`, `/analysis`, `/peak`, `/plan`, `/results`, `/weekly-review`

These are separate from the active role-gated adaptive onboarding routes. They should be treated as legacy/public journey surfaces unless intentionally retained.

Athlete routes include:

- `/athlete`, `/athlete/dashboard`, `/athlete/onboarding`, `/athlete/checkin`, `/athlete/log`, `/athlete/wellness`
- `/athlete/plans`, `/athlete/plans/generate`, `/athlete/sessions/today`, `/athlete/exercises`
- `/athlete/scan`, `/athlete/scan/analyze`, `/athlete/scan/report/[id]`
- `/athlete/tests`, `/athlete/review`, `/athlete/report`, `/athlete/readiness`, `/athlete/progress`, `/athlete/reassess`
- `/athlete/events`, `/athlete/events/[id]`, `/athlete/integrations`, `/athlete/nutrition-safety`, `/athlete/family`, `/athlete/legal`, `/athlete/settings`

Coach routes include:

- `/coach`, `/coach/dashboard`, `/coach/onboarding`, `/coach/academy`, `/coach/analytics`, `/coach/execution`, `/coach/review`, `/coach/reports`, `/coach/reports/[id]`, `/coach/legal`, `/coach/settings`

Individual routes include:

- `/individual`, `/individual/dashboard`, `/fitstart`, `/individual/logging`, `/individual/plans`, `/individual/sessions/today`, `/individual/exercises`, `/individual/scan`, `/individual/scan/analyze`, `/individual/scan/report/[id]`, `/individual/tests`, `/individual/review`, `/individual/nutrition-safety`, `/individual/legal`

API routes include:

- Health/ops: `/api/health`, `/api/ready`, `/api/metrics`, `/api/security/csp-report`, `/api/indexnow`
- Core/mobile: `/api/mobile/me`, `/api/mobile/dashboard`, `/api/mobile/account`, `/api/mobile/profile`, `/api/mobile/profile/avatar`, `/api/mobile/web-session`
- Mobile auth/onboarding/logging: `/api/mobile/auth/signup`, `/api/mobile/athlete/onboarding`, `/api/mobile/athlete/checkin`, `/api/mobile/coach/onboarding`, `/api/mobile/fitstart`, `/api/mobile/fitstart/recommendations`, `/api/mobile/individual/logging`
- Reports/review/video/tests: `/api/mobile/athlete/report`, `/api/mobile/athlete/review`, `/api/mobile/coach/reports`, `/api/mobile/coach/review`, `/api/mobile/individual/review`, `/api/mobile/video-analysis`, `/api/mobile/video-analysis/[id]`, `/api/mobile/objective-tests`, `/api/mobile/objective-tests/reaction-tap`
- Health integration: `/api/v1/health/connection`, `/api/v1/health/sync`
- Exercise library: `/api/exercises`

### Authorization And Access Rules

- `/athlete*`, `/coach*`, and `/individual*` are protected by role prefix checks in Supabase middleware.
- Wrong-role users are redirected to their own role home route.
- `/dashboard` acts as a role controller and redirects based on profile role/onboarding state.
- Unauthenticated protected pages redirect to `/login`.
- Unauthenticated protected APIs return `401`.
- Public legal, marketing, auth, and health endpoints remain accessible.

### Data Touchpoints

Main read/write tables found in active code paths:

- Identity/auth/profile: `profiles`, `user_legal_consents`, `data_rights_requests`
- Adaptive forms: `adaptive_form_events`, `adaptive_form_profiles`, `adaptive_daily_logs`
- Athlete decision loop: `diagnostics`, `daily_load_logs`, `computed_intelligence`, `adaptation_profiles`, `performance_profiles`, `rehab_history`, `vision_faults`
- Individual journey: `individual_profiles`, `individual_guidance_snapshots`
- Coach/team/linking: `teams`, `team_members`, `connection_requests`, `coach_interventions`, `athlete_guardian_profiles`
- Execution system: `training_sessions`, `training_session_logs`, `training_exercise_logs`, `training_calendar_entries`, `coach_session_feedback`, `session_comments`
- Health/device: `health_source_connections`, `normalized_health_samples`, `health_daily_metrics`
- Objective/video: `objective_test_sessions`, `objective_test_measurements`, `video_analysis_reports`
- Product telemetry: `product_analytics_events`, `recommendation_audit_events`
- Content/events: `platform_events`, `exercises`, `equipment_profiles`, `user_preferences`, `user_dietary_constraints`

## Test Matrix

| Area | Command / method | Result | Notes |
| --- | --- | --- | --- |
| TypeScript | `npm run typecheck` | Pass | Clean after build completed. A parallel run during `next build` collided with `.next/types` regeneration; rerun cleanly passed. |
| Production build | `npm run build` | Pass | Next.js built 113 app routes with webpack. |
| Security predeploy | `npm run security:predeploy` | Pass with warnings | Warnings are logged in bug/readiness docs. |
| Lint | `npm run lint` | Fail | 384 problems after generated worktrees were excluded. |
| Public/individual/connection smoke | `npx playwright test ... --project=chromium-public` | Pass | 18/18 passed. |
| Authenticated athlete/coach flows | `npx playwright test tests/athlete-dashboard.spec.ts tests/coach-dashboard.spec.ts tests/coach-intelligence.spec.ts tests/injury-system.spec.ts --project=setup --project=athlete-flow --project=coach-flow` | Pass | 11/11 passed. |
| CSP runtime header | `curl -sSI /login` | Pass | `script-src` includes `https://cdn.jsdelivr.net` after fix. |
| HTTP auth baseline | Node fetch status sweep | Pass | Public pages 200; protected pages 307 to `/login`; protected APIs 401. |

### Role Journey Results

| Flow | Coverage | Status |
| --- | --- | --- |
| Athlete signup | Role selection, required legal consents, account creation | Pass |
| Athlete onboarding | Adaptive setup: profile, sport, snapshot, goal, pain, consent, dashboard open | Pass |
| Athlete daily check-in | Three-tap check-in, server action, DB/API-backed decision result, dashboard return | Pass |
| Athlete dashboard | Today call, Daily Operating System, Trust Layer, plan, video entry, deeper science/risk expansion | Pass |
| Athlete video entry | `/athlete/scan`, `/athlete/scan/analyze?sport=cricket`, clip requirements, select video CTA | Pass |
| Athlete risk path | Trust layer plus deeper science risk forecast/hotspots | Pass |
| Coach signup | Role selection, legal consents, account creation | Pass |
| Coach onboarding | Identity, squad setup, team structure, focus, dashboard open | Pass |
| Coach dashboard | Locker code, squad/report/intelligence surfaces | Pass |
| Coach-athlete connection | Coach code invite, `/join/[lockerCode]`, athlete signup with code, onboarding | Pass |
| Individual signup | Role selection, legal consents, account creation | Pass |
| Individual FitStart | Adaptive profile, day shape, goal, equipment, limitation, dashboard open | Pass |
| Individual daily pulse | Energy, stress, body feel, server action, dashboard return | Pass |
| Individual video entry | `/individual/scan/analyze?sport=other` route visible | Pass |

## Dead, Duplicate, Legacy, And Redirect Routes

No build-breaking dead route was found in the active app route tree.

Redirect/alias routes found:

- `/athlete` redirects into athlete dashboard/onboarding logic.
- `/coach` redirects into coach dashboard/onboarding logic.
- `/individual` redirects into individual dashboard/onboarding logic.
- `/dashboard` is a role-aware router.
- `/athlete/log` redirects to `/athlete/checkin`.
- `/athlete/wellness` redirects to `/athlete/checkin`.
- `/athlete/plans/generate` redirects to `/athlete/sessions/today`.

Legacy route tree still present:

- The `(journey)` public route tree remains reachable and uses older journey language. It is not the active role-gated onboarding/data-capture system. This should be kept only if it is intentionally public marketing/prototype history; otherwise it should be retired or noindexed in a separate product decision.

## Forms, Dashboards, Decisions, And Data Use

Validated forms that submit into active decision/dashboard paths:

- Athlete onboarding writes profile/diagnostic/adaptive data and unlocks `/athlete/dashboard`.
- Athlete daily check-in writes `daily_load_logs`, `computed_intelligence`, context/adaptation data, and updates dashboard decisions.
- Coach onboarding writes profile/team data and unlocks `/coach/dashboard`.
- Individual FitStart writes `profiles`, `individual_profiles`, `individual_guidance_snapshots`, and unlocks `/individual/dashboard`.
- Individual daily pulse writes individual daily/intelligence data and updates dashboard guidance.

Dashboards verified as data-backed rather than static-only:

- Athlete dashboard uses decision result, daily operating snapshot, adaptive profile, health summary, objective/video context, and nutrition safety.
- Coach dashboard uses profile, teams, locker code, connection/squad intelligence, and operating command surfaces.
- Individual dashboard uses FitStart baseline, individual profile, daily signals, and guidance snapshots.

## Runtime Observations

- CSP for MediaPipe video analysis was blocking jsDelivr scripts. Fixed and verified in response headers.
- CSP reports for `blocked-uri: eval` were seen from a Next chunk while running the app. This did not break tested flows, but should be investigated rather than solved by adding production `unsafe-eval`.
- A transient coach runtime console error appeared once during E2E: profile role fetch failed with `TypeError: Failed to fetch`. The flow recovered and tests passed; still logged as residual runtime noise.
- Cookie notice can overlap lower-form actions on small flows unless dismissed. The tests now dismiss it, but the product should ensure primary actions are not obscured on small screens.

## Conclusion

Core active CREEDA user journeys are now stable in the tested local production runtime. The app is not fully release-clean under strict lint policy because repository-wide ESLint still fails on legacy/app debt. Treat this build as core-journey-ready and build/typecheck-ready, but not strict-quality-gate-ready until the lint backlog and residual runtime warnings are closed.
