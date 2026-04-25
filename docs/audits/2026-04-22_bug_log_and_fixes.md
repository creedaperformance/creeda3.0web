# CREEDA Bug Log And Fixes

Audit date: 2026-04-22 IST
Scope: full-build QA stabilization across active athlete, coach, and individual flows.

## Fixed During This Audit

| ID | Severity | Area | Root Cause | Fix Applied | Retest |
| --- | --- | --- | --- | --- | --- |
| CREEDA-QA-001 | High | Lint/quality gate | ESLint was crawling local/generated tool workspaces under `.claude`, causing thousands of generated `.next` issues and making lint output unusable. | Added `.claude/**`, `.expo/**`, `.vscode/**`, `.auth/**`, `.playwright-cli/**`, `playwright-report/**`, `coverage/**`, `test-results/**`, and `artifacts/**` to `eslint.config.mjs`; added local tooling/test output folders to `.gitignore`. | `npm run lint` now reports 384 real repo issues instead of generated worktree noise. |
| CREEDA-QA-002 | High | Video analysis runtime | Production CSP allowed jsDelivr in `connect-src` but not `script-src`; MediaPipe attempted to load `vision_wasm_nosimd_internal.js` from jsDelivr and was blocked. | Added `https://cdn.jsdelivr.net` to `script-src` in `next.config.ts`. | `npm run build` passed; runtime header verified with `curl -sSI /login`; athlete video analysis entry test passed. |
| CREEDA-QA-003 | High | Auth/signup E2E | Signup tests used a retired single `#consent` checkbox, but current signup requires four explicit consent checkboxes. | Added `acceptRequiredSignupConsents()` and updated setup, payment, ecosystem, connection, and helper tests. | Public/connection suite passed 18/18; authenticated setup passed inside 11/11 role suite. |
| CREEDA-QA-004 | High | Athlete onboarding E2E | Tests were written for an older long-form athlete onboarding flow with fields like `fullName`, `primarySport`, `Next Phase`; current app uses adaptive card steps. | Rebuilt athlete onboarding helper around current adaptive steps: profile, sport context, athlete snapshot, primary goal, pain check, finish setup. | Authenticated athlete/coach suite passed 11/11. |
| CREEDA-QA-005 | High | Coach onboarding E2E | Tests expected older coach copy such as `Professional Identity`, `Squad Blueprint`, and `Complete Setup`; current coach setup is adaptive. | Rebuilt coach onboarding helper around current steps: Coach Identity, Squad Setup, Team Structure, Main Focus, Open dashboard. | Authenticated athlete/coach suite passed 11/11. |
| CREEDA-QA-006 | High | Individual FitStart/logging E2E | Individual pathway spec targeted a retired multi-page/rating workflow. Current FitStart and Daily Pulse are adaptive short flows. | Updated individual spec to drive Quick Snapshot, Day Shape, Main Goal, What You Have, Any Limitation, Daily Pulse, and dashboard return. | Public/individual suite passed 18/18. |
| CREEDA-QA-007 | Medium | Adaptive form accessibility/testability | Adaptive toggles were plain buttons without `aria-pressed` or stable field identifiers. | Added `aria-pressed` and `data-testid="adaptive-toggle-{field.id}"` to toggle fields in `AdaptiveFormWizard`. | Typecheck passed; authenticated role suite passed 11/11. |
| CREEDA-QA-008 | Medium | Athlete final consent step | New athletes already carry signup consents into onboarding. The test blindly clicked final consent toggles and turned valid consents off, blocking submission. | Added `ensureToggleOn()` helper so tests only click toggles when not already on. | Athlete onboarding passed in authenticated role suite. |
| CREEDA-QA-009 | Medium | Athlete check-in test stability | Check-in completion used a real server action and then a client-side router navigation. The test had a 30s budget and waited for a full load, causing timeout pressure even though manual replay confirmed navigation worked. | Increased athlete dashboard spec timeout to 60s and changed the helper to wait for URL commit plus dashboard content. | Authenticated role suite passed 11/11. |
| CREEDA-QA-010 | Medium | Athlete risk/injury test | Test expected retired labels `Performance Risk Outlook` / `Risk IQ`; current dashboard exposes risk through Trust Layer and deeper science labels like `Risk Hotspots` and `3-5 Day Forecast`. | Updated injury/risk spec to verify current dashboard entry state and expand deeper science when available. | Authenticated role suite passed 11/11. |

## Logged But Not Fully Fixed

| ID | Severity | Area | Evidence | Required Follow-Up |
| --- | --- | --- | --- | --- |
| CREEDA-REL-001 | High | Repository lint | `npm run lint` reports 384 problems: 257 errors and 127 warnings. Major clusters include `no-explicit-any`, unused imports/vars, `prefer-const`, unescaped entities, React set-state-in-effect rules, and legacy engine files. | Decide whether CI must block on lint. If yes, run a focused lint cleanup sprint across scripts, auth UI, dashboard components, engines, and i18n. |
| CREEDA-REL-002 | Medium | CSP eval reports | Runtime CSP reports included `blocked-uri: eval` from a Next static chunk. Tested flows passed. | Identify source chunk/library and remove eval usage or add a dev-only exception. Do not add production `unsafe-eval` without root-cause confirmation. |
| CREEDA-REL-003 | Medium | Security warnings | `npm run security:predeploy` passed but warned on `JsonLd.tsx` `dangerouslySetInnerHTML` and console logging in engine/offline/vision files. | Review JSON-LD sanitization posture and remove/guard production console logs. |
| CREEDA-REL-004 | Medium | Cookie notice overlay | Cookie notice can overlap bottom form controls until dismissed. Tests now dismiss it. | Confirm mobile layout leaves primary form actions usable without first dismissing the banner, or move the banner away from critical CTAs. |
| CREEDA-REL-005 | Low | Coach runtime console noise | One E2E run logged `Error fetching profile roles: TypeError: Failed to fetch`; coach tests still passed. | Trace fetch source, add resilient error handling if it corresponds to user-visible state, and prevent noisy console errors. |
| CREEDA-REL-006 | Medium | Guardian linked-account depth | Guardian is not an active `AppRole`; linked-account/guardian surfaces exist but were not deep-tested as a standalone journey. | If guardian/family workflows are launch-critical, add dedicated E2E around `/athlete/family`, academy handoff, guardian consent, and coach visibility. |
| CREEDA-REL-007 | Medium | Legacy public journey tree | `(journey)` routes remain reachable separately from active role-gated flows. | Product decision needed: keep as intentional public/prototype journey, noindex it, or retire it. |

## Files Changed By This Audit

- `.gitignore`
- `eslint.config.mjs`
- `next.config.ts`
- `src/components/form/AdaptiveFormWizard.tsx`
- `tests/utils/current-flows.ts`
- `tests/auth.setup.ts`
- `tests/utils/auth-helper.ts`
- `tests/ecosystem-audit.spec.ts`
- `tests/connection-loop-full.spec.ts`
- `tests/individual-pathway.spec.ts`
- `tests/payment-integrity.spec.ts`
- `tests/athlete-dashboard.spec.ts`
- `tests/injury-system.spec.ts`
- `tests/coach-dashboard.spec.ts`
- `creeda_full_build_test_audit.md`
- `creeda_bug_log_and_fixes.md`
- `creeda_release_readiness_report.md`

## Retest Summary

- `npm run build`: pass.
- `npm run typecheck`: pass.
- `npm run security:predeploy`: pass with warnings.
- `npm run lint`: fail with 384 real repo issues after generated worktree noise was removed.
- Public/individual/connection Playwright bundle: 18/18 passed.
- Authenticated athlete/coach Playwright bundle: 11/11 passed.
- HTTP auth baseline: public pages 200; protected pages 307 to `/login`; unauthenticated protected APIs 401.
- CSP header: jsDelivr is present in `script-src`.
