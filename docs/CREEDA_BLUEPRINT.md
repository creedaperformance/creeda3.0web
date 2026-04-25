# CREEDA Unified Product Blueprint

Audit date: 2026-04-25
Sources: creeda end-to-end report, tech stack report, user journeys report, Vineet journey inputs, Karan inputs (MVP scope), full audit + bug log

---

## 1. The Honest Reality Check

The codebase is **not** broken or empty. It is **overbuilt**.

- Web app: 113 routes, build passes, typecheck passes, 29/29 E2E tests pass
- Mobile app: Expo project exists with parallel athlete/coach/individual screens
- MediaPipe vision pipeline is wired (Karan confirmed it is ready)
- HealthKit and Health Connect integrations exist
- Research intelligence subsystem exists (large, internal-only)
- 384 lint issues (real, non-blocking) and 6 logged residual risks

**The user-perceived problem ("nothing makes sense to a new user") is not a build problem. It is a narrative problem.**

There are two parallel onboarding trees, twenty dashboard components per persona, and no single screen that answers the only question a user ever asks: *"What should I do today, and why?"*

The blueprint below removes 40-60% of the surface area and forces every kept feature to terminate in **one performance view** per persona.

---

## 2. Personas (Reconciled)

Vineet's PDF and the team docs use slightly different names for the same person. Pick one set and standardize:

| Vineet's term | Team doc term | Codebase term | Final canonical name |
|---|---|---|---|
| Beginner (Priya) | Individual / FitStart | `individual`, `fitstart` | **Individual** |
| Athlete (Arjun) | Athlete | `athlete` | **Athlete** |
| Coach (Sunita) | Coach | `coach` | **Coach** |

**Decision:** Standardize on `Athlete`, `Individual`, `Coach`. Retire the `fitstart` URL and brand it as Individual onboarding. `FitStart` survives only as the *name of the Individual program*, not a separate persona.

---

## 3. The One Performance View (the missing spine)

Every persona gets exactly one home screen. Everything else is a drill-down. The home screen always has the same 4-zone structure, just different content.

```
┌─────────────────────────────────────────┐
│ ZONE 1: TODAY DECISION (the hero)       │  Single-line directive + readiness ring
│ "Body says steady. Build."              │  Why-line (1 sentence, plain English)
├─────────────────────────────────────────┤
│ ZONE 2: TODAY PLAN (the action)         │  One card: session / drills / rest
│ [ Start session ] [ Skip / log RPE ]    │  Action button is always visible
├─────────────────────────────────────────┤
│ ZONE 3: THIS WEEK (the trend)           │  7-day strip: load + readiness + streak
│ Acute:Chronic ratio, sleep, soreness    │  One number, one sparkline
├─────────────────────────────────────────┤
│ ZONE 4: NEXT (the unlock)               │  Scan | Reassess | Connect wearable
│ One contextual prompt, never two        │  Progressive profiling lives here
└─────────────────────────────────────────┘
```

### Per-persona content of the same 4 zones

**Athlete view:**
- Z1: Readiness 0-100, Decision label (Fresh / Steady / Guarded / Deload), Why-line citing ACWR / sleep / HRV
- Z2: Today's session prescription with intensity zone, duration, drill warmups
- Z3: ACWR, TSS, soreness map, taper score (when in peak mode)
- Z4: Camera scan prompt for sport-specific fault detection

**Individual view:**
- Z1: Readiness as Push / Maintain / Recover (no number anxiety)
- Z2: Today's 20-30 min session or active recovery, with one swap option
- Z3: Streak, weekly consistency score, sleep trend
- Z4: One progressive-profile prompt ("Tell me your sleep baseline and I'll tune this")

**Coach view:**
- Z1: Squad pulse — 18 athletes, 3 red, 4 amber, 11 green; one priority callout
- Z2: Pre-practice triage — who to bench, who to push, who to scan
- Z3: 7-day squad load curve, RTS pipeline status, missed check-in count
- Z4: Video review queue (athlete clips waiting for coach approval)

This is the **only** screen that ships to beta. Every other route is one tap away from this.

---

## 4. The Product Spine (7 modules)

Everything in the codebase must trace to one of these. Anything that doesn't is the kill list.

| # | Module | Purpose | Current code home |
|---|---|---|---|
| 1 | **Adaptive Onboarding** | Get to dashboard in <90s, infer the rest | `src/forms/flows/*`, `src/components/form/AdaptiveFormWizard.tsx` |
| 2 | **Daily Check-in** | 3-tap pulse → readiness score + directive | `src/lib/athlete-checkin.ts`, `src/lib/individual-logging.ts` |
| 3 | **Performance View** | The 4-zone home screen above | `src/app/{athlete,individual,coach}/dashboard/*` (needs collapse) |
| 4 | **Vision Scan** | Manual fault detection + drill prescription | `src/lib/vision/*`, `src/lib/video-analysis/*`, `src/components/video-analysis/*` |
| 5 | **Plan Engine** | Auto-periodised mesocycles, daily session prescription | `src/lib/dashboard_decisions.ts`, `src/forms/engine/*` |
| 6 | **Coach Command** | Squad triage, RTS tracker, video review queue | `src/app/coach/*` |
| 7 | **Health Sync** | Auto-discover HealthKit / Health Connect / wearables | `src/lib/health/*`, `mobile/src/lib/health-sync/*` |

These seven and only these seven are in MVP beta scope. Everything else is Phase 2 or kill.

---

## 5. Kill List (cut for beta)

These exist in the repo but do not serve the seven-module spine. Cut from the production build via feature flag or route removal:

| Surface | Reason | Action |
|---|---|---|
| `src/app/(journey)/*` (welcome, onboarding/basic, onboarding/goals, onboarding/intensity, onboarding/lifestyle, onboarding/physiology, onboarding/sport, onboarding/time-horizon, daily-checkin, analysis, peak, plan, results, weekly-review, role-selection) | Legacy duplicate of role-gated flow; users never need this tree | Delete the entire `(journey)` group; redirect any inbound to `/login` or persona home |
| `src/components/gamified/*` | Competing design system; the mobile app already standardised on `neon` | Delete entirely; web dashboards rebuild on the `neon` primitives |
| _Correction (2026-04-25):_ `src/components/neon/*` was originally tagged for kill in an early draft. Reversed after audit — `neon` is the canonical design system used by all 20 mobile screens (`ReadinessOrb`, `NeonGlassCard`, `GlowingButton`, `StreakFlame`, etc.). Web dashboards adopt `neon` primitives instead of competing | Keep `neon`. Kill `gamified` |
| `src/components/objective-tests/*` reaction/balance tests | Layer-3 features per the journey doc; not beta | Hide behind `feature.objectiveTests=false` flag |
| `src/components/academy/*` (multi-team, locker codes for academies) | B2B2C is the GTM but not the MVP feature; manual coach invites work | Keep `/join/[lockerCode]` working but hide academy admin UI behind flag |
| `src/components/nutrition/*` (full nutrition prescription views, carb-loading protocols) | Phase 2 per Vineet's journey 5 | Keep only the "nutrition timing intro" 2-min card; hide the prescription UI |
| `src/lib/research/*` and `/api/internal/research/*` | Brilliant but enormous; must not be in user-facing path | Keep code, hide all UI surfaces, lock the API behind admin-only token (already done) |
| Two of the three "today plan" component variants in `src/app/athlete/dashboard/components/` (`DailyOperatingSystem.tsx`, `TodayPlan.tsx`, `TodaysPlanSection.tsx`) | Three components for the same zone | Keep `TodayPlan.tsx`, delete the others |
| `RevolutionaryEnginesRow.tsx`, `ScientificEvidencePanel.tsx`, `WhySection.tsx` (athlete dashboard) | Trust-layer copy creep — research must stay hidden | Collapse into a single one-line "Why" inside Zone 1 |
| `creeda_bug_log_and_fixes.md`, `creeda_full_build_test_audit.md`, `creeda_release_readiness_report.md` at repo root | Working documents not for the product repo | Move to `docs/audits/` |

**Estimated route reduction:** 113 → ~55. **Estimated component reduction:** ~30%.

---

## 6. Keep List (already works, leave alone)

- Adaptive Form Wizard (`src/components/form/AdaptiveFormWizard.tsx`) — clean, accessible, tested
- Adaptive question engine (`src/forms/engine/adaptiveQuestionEngine.ts`)
- Supabase auth + role middleware (`src/proxy.ts`, `src/lib/supabase/middleware.ts`)
- MediaPipe + clip validation (`src/lib/vision/*`, `src/lib/video-analysis/clipValidation.ts`)
- Dashboard decisions engine (`src/lib/dashboard_decisions.ts`) — the brain
- Mobile app shell (`mobile/app/_layout.tsx`, `mobile/app/(tabs)/*`)
- Health sync libraries on mobile (`@kingstinct/react-native-healthkit`, `react-native-health-connect`)
- Stripe integration scaffolding
- The 4-question coach onboarding (Coach Identity, Squad Setup, Team Structure, Main Focus) — matches Sunita's <10 minute target

---

## 7. Fix List (small repairs, big payoff)

These are the bugs and gaps that block beta release as one coherent product.

| Priority | Issue | Fix |
|---|---|---|
| P0 | **Single-line directive** is generic ("Body says steady") with no specificity | Per Vineet: this is the make-or-break. Add 6-12 sport+state combinations per persona, A/B variants. Owner: copy + decision engine |
| P0 | Two parallel onboarding flows confuse users | Delete `(journey)/onboarding/*`, route everything through `/{persona}/onboarding` |
| P0 | Cookie banner overlays form CTAs on mobile | Move banner above bottom nav or auto-dismiss after first scroll (CREEDA-REL-004) |
| P0 | Wearable auto-discovery doesn't exist on web; only on mobile | Web should ask "Do you have an Apple Watch or Garmin?" and link to mobile install. Mobile auto-detects on first launch via permission prompt |
| P1 | CSP `eval` violation in Next chunk (CREEDA-REL-002) | Trace source, remove or whitelist explicitly |
| P1 | 384 lint errors | Run autofix pass, then manual on `no-explicit-any`, unused vars, React set-state-in-effect |
| P1 | Coach video review queue is in code but no end-to-end flow from athlete clip → coach inbox → comment → athlete sees it | Wire the loop. This is the differentiator per Vineet ("the feedback loop between coach and athlete is the single biggest differentiator") |
| P2 | `/dashboard` is a role controller, not the home; new users land on `/login` and bounce | Marketing landing → signup → role-selection (one screen) → onboarding → persona home. End. No legacy welcome tree |
| P2 | Migrations folder has 25 SQL files mixing master schemas and patches | Squash to a single baseline migration; everything before MVP launch is one consolidated SQL |

---

## 8. Design System (sport / persona / region color logic)

The user explicitly called out that **different sports, personas, and countries attract different colors**. This is correct and underbaked in the current code (two competing design experiments: production tailwind + `neon` futurism).

### Decision: one base + three modulators

**Base palette (always present):**
- Background: near-black `#0B0B0F` (premium athletic feel, works dark mode default)
- Surface: `#15161D`
- Ink: `#F5F6F8`
- Trust accent: `#00D4FF` (CREEDA brand cyan)

**Persona modulator (sets emotional temperature of the home screen):**
- Athlete: sharp electric — accent `#FF3A5C` (alert red) + `#00D4FF` (data cyan)
- Individual: calm encouraging — accent `#3DDC97` (steady green) + soft amber `#FFB547`
- Coach: operational neutral — accent `#7C5CFF` (decision purple) + `#FFB547` (triage amber)

**Sport modulator (overlays on Athlete + Coach views):**
- Cricket: `#1B5E20` deep green + `#FFD600` accent
- Football / Soccer: `#0D47A1` blue + `#FFFFFF`
- Badminton: `#6A1B9A` purple + `#FFEB3B`
- Athletics / Running: `#FF6F00` orange + `#212121`
- Strength / Gym: `#37474F` slate + `#FF3A5C`
- Default (general fitness): the persona modulator only

**Region modulator (subtle — affects only marketing, illustrations, success-state imagery):**
- India: warm saffron-leaning illustrations, Hindi-friendly type fallback (Inter + Hind)
- SE Asia: cooler greens, no Hindi
- Middle East: gold/teal accents, RTL-ready
- US/UK: high-contrast monochrome with one accent

**Type:** Inter (system) → Inter Display for headlines. One fallback per region. No second display font.

**Implementation:** All of this lives in `tailwind.config.ts` as CSS variables driven by `data-persona`, `data-sport`, and `data-region` on `<html>`. Existing `neon` components either adopt the variable system or are deleted.

---

## 9. Three-Repo Architecture

The user wants three repos. The honest answer: **one monorepo serves the same outcome better and is what the existing code is built for**. But if the user requirement is firm, here is the split.

### Recommended: monorepo with three deployment targets

```
creeda/
├── apps/
│   ├── web/         # Next.js, deploys to Vercel
│   ├── mobile/      # Expo, builds iOS + Android
│   └── admin/       # internal coach + ops (later)
├── packages/
│   ├── core/        # shared TS: types, decision engine, vision rules
│   ├── ui/          # shared design tokens, RN-compatible primitives
│   └── api-client/  # shared Supabase + REST client
└── supabase/        # migrations, edge functions, RLS policies
```

**Pros:** zero code duplication, one PR fixes web + mobile, shared types are honest.
**Cons:** the user said three repos.

### If the user insists on three repos (Creeda-2.0-Web, CREEDA-2.0-Android, Creeda-2.0-iOS)

There is no good reason to split Android and iOS — they are the same React Native + Expo project, build target is a flag. Two repos at most:

- **Creeda-2.0-Web**: Next.js app from current `src/`
- **Creeda-2.0-Mobile**: Expo app from current `mobile/` (one repo, builds both iOS and Android)
- Shared code (types, decision engine, vision rules) gets published as a private npm package or copy-pasted at sync time

Splitting one Expo project into two repos (one for `eas build --platform ios`, one for `eas build --platform android`) creates pure overhead. **Recommend pushing back on the user on this.**

### Concrete migration path (whichever option is chosen)

1. Tag current `Creeda-live` as `v1-archive`
2. Create the new repo(s)
3. Copy (not fork — clean copy) only the Keep-list code
4. Run the kill-list deletions as the first commit
5. Run the fix-list as the second commit cluster
6. CI on day one: build + typecheck + Playwright on web, Detox or Maestro on mobile

---

## 10. Beta Definition (what "shippable" means)

Beta is shippable when **all three founders can complete this loop in under 5 minutes on their own phone:**

1. Open app from cold install
2. Sign up + pick persona + finish onboarding (target: 90s)
3. Complete daily check-in (target: 10s)
4. See readiness score + single-line directive on home screen
5. Tap "Today's session" → see prescription
6. (Athlete only) Tap scan → record 5s clip → see fault detection result
7. (Coach only) See squad grid with at least one red/amber athlete
8. Receive a push notification 12-24 hours later prompting next check-in

If any step fails, breaks, or feels generic, beta is not ready.

**Beta is not:** every feature working, lint clean, full sport coverage, full nutrition module, full research transparency, multi-academy mode, family/guardian flows. Those are post-beta.

---

## 11. Realistic Phased Plan

The user's 48-hour deadline does not produce a stable beta. Here is what 48 hours **can** do, and what realistic windows look like for the rest.

### Window 1: 48 hours (now → Sunday 2026-04-27)
**Goal: one coherent web app on staging, sharable via URL**

- Day 1 (today): execute the kill list. Delete `(journey)/*`, the duplicate dashboard components, the neon variants. Squash the repo.
- Day 1 evening: implement the 4-zone Performance View on `/{persona}/dashboard`. Replace 19 athlete dashboard components with one composed view.
- Day 2: A/B copy for the 12 single-line directives per persona+state. Fix cookie overlay. Wire health sync auto-prompt on web.
- Day 2 evening: deploy to Vercel staging at `staging.creeda.app`. Founders use the web app, give written feedback.

**Deliverable:** working web app, one persona at a time tested, no mobile yet.

### Window 2: 5-7 days (next week)
**Goal: mobile beta on TestFlight + Google Play Internal Testing**

- Mobile parity for the Performance View
- Wire HealthKit + Health Connect auto-discovery
- Wire MediaPipe scan flow (Cricket batting + Squat only — Karan's tight scope)
- EAS build for iOS + Android
- TestFlight invite to founders + 5 friendly users
- Google Play Internal Testing track invite

**Deliverable:** founders run the app on their actual phones with their own data.

### Window 3: 2-3 weeks
**Goal: first academy beta**

- Coach Command center hardened (squad triage + video queue + RTS tracker)
- Locker code invites work end-to-end on mobile
- Onboard one cricket academy via Karan's GTM plan
- 30-40 athletes use it daily for two weeks
- Measure: scan submission rate vs check-in rate (Vineet's leading indicator that scan isn't cannibalizing the habit loop)

**Deliverable:** real users, real data, real feedback.

### Window 4: 4-6 weeks
**Goal: paying tier + second academy + Phase 2 features**

- Stripe paid tier ($800-1,500/month per Vineet's Athlete persona)
- Second sport profile (Football or Strength)
- Coach video review queue (the "single biggest differentiator")
- Family/guardian flow if any U18 athletes are in scope

**Deliverable:** revenue + cohort of two academies.

---

## 12. What I Need From You to Move

To execute Window 1 starting now, I need explicit answers on:

1. **Do you accept the kill list as written, or do you want to defend any item?** (Killing the wrong thing is worse than building one too many.)
2. **Three repos or two repos (web + mobile)?** Strongly recommend two.
3. **Which persona ships first to staging in 48 hours?** Recommend Athlete (most work already done, most differentiated, easiest to demo to academy coach #1).
4. **Cricket batting + Squat as the only two scan profiles for beta** — confirm or pick alternates.
5. **Do you have an Apple Developer account ($99/yr) and Google Play Developer account ($25 one-time) ready?** Both required before TestFlight / Internal Testing invites.
6. **Authentication on the new repos** — give me a GitHub PAT scoped to `repo` if you want me to push directly, or I can produce branch tarballs you push yourself.
7. **Domain / subdomain for staging** — `staging.creeda.app` or alternative.

Once those are settled, I start the kill-list deletions and the Performance View collapse in this worktree, and you get a stagable web build by end of Day 2.

---

## 13. The One Sentence

Creeda is one screen — *"What should I do today, and why?"* — answered three different ways for three different people, with everything else (scan, plan, trends, coach view) sitting one tap away from that screen.

If a feature does not directly support that sentence, it is Phase 2 or it is dead.
