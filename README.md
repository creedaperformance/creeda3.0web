# Creeda — Web

The Next.js web application for Creeda. Sports science on a phone, starting with India.

> Vision: be the most trusted AI sports scientist and health-performance operating system for athletes, coaches, and everyday people. Replace "magical but ungrounded" wellness tracking with believable, actionable, localized decisions.

This repo is the v2 baseline. The mobile app lives separately at [creedaperformance/CREEDA-2.0-Android](https://github.com/creedaperformance/CREEDA-2.0-Android) (one Expo project that builds for both Android and iOS).

---

## What this product is, in one screen

Every persona — Athlete, Coach, Individual — gets one home screen with the same four zones. Every other route is one tap away.

```
ZONE 1  TODAY DECISION  — readiness ring + single-line directive + why-line
ZONE 2  TODAY PLAN      — one prescribed session / drills / rest, with start CTA
ZONE 3  THIS WEEK       — streak, compliance, phase, event countdown
ZONE 4  NEXT            — one contextual unlock (coach feedback > scan > wearable > check-in)
```

Per-persona content fills the same shell:

| Persona     | Z1 voice                                | Z4 priority example                            |
|-------------|------------------------------------------|------------------------------------------------|
| Athlete     | "Body says steady. Build."               | Coach left feedback → review last scan         |
| Individual  | "Push, Maintain, or Recover today."      | Try a movement scan                             |
| Coach       | "3 red flags — bench or modify before practice." | Video review queue (athlete clips waiting) |

The single-line directive engine produces 6 action states (`train_hard`, `train_light`, `mobility_only`, `recovery_focus`, `deload`, `full_rest`) with multiple stable copy variants per persona. See [src/components/performance-view/directives.ts](src/components/performance-view/directives.ts).

The full product blueprint, kill list, and phased plan live at [docs/CREEDA_BLUEPRINT.md](docs/CREEDA_BLUEPRINT.md).

---

## Tech stack

- **Framework:** Next.js 16.2 (App Router) + React 19, TypeScript
- **Styling:** Tailwind CSS 4 with a CSS-variable design system. `data-persona`, `data-sport`, `data-region` attributes drive accent colors via the modulator system in [src/app/globals.css](src/app/globals.css).
- **Data + auth:** Supabase (Postgres + Auth + RLS). SSR via `@supabase/ssr`.
- **Vision:** `@mediapipe/tasks-vision` for the Universal Movement Screen and sport-specific overlays.
- **Payments:** Stripe.
- **Forms:** React Hook Form + Zod, with an adaptive form engine in [src/forms/](src/forms/).
- **Background jobs:** BullMQ (Redis) for the research-intelligence pipeline.
- **Testing:** Playwright (E2E) + Jest (unit). Stable test IDs `data-testid="zone-{decision,plan,week,next}"` keep dashboard specs robust.

---

## Quick start

Requirements: Node 20.9+ (and < 25), a Supabase project, optionally Redis for the research pipeline.

```bash
git clone https://github.com/creedaperformance/Creeda-2.0-Web.git
cd Creeda-2.0-Web
npm install
cp .env.example .env.local   # or create .env.local manually with the vars below
npm run dev
```

The app runs at `http://localhost:3000`. Sign up flows live at `/signup`; persona homes are `/athlete/dashboard`, `/coach/dashboard`, `/individual/dashboard`.

### Environment variables

Required for any non-trivial run:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # admin-only operations like account deletion
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DATABASE_URL=postgres://...           # for Prisma + the research subsystem
```

Optional:

```
# Stripe (only needed for paid tier)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...

# Research intelligence pipeline (admin-only, hidden from end users)
RESEARCH_INTERNAL_API_TOKEN=...
RESEARCH_REDIS_URL=...
RESEARCH_OPENALEX_API_KEY=...
RESEARCH_SEMANTIC_SCHOLAR_API_KEY=...
RESEARCH_ENABLE_OPENALEX=true
RESEARCH_ENABLE_SEMANTIC_SCHOLAR=true
RESEARCH_ENABLE_SEMANTIC_RETRIEVAL=true
RESEARCH_CONTACT_EMAIL=...
RESEARCH_PUBMED_QUERY=...

# SEO (production only)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-...
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=...
NEXT_PUBLIC_BING_SITE_VERIFICATION=...
INDEXNOW_KEY=...
INDEXNOW_API_TOKEN=...
```

---

## Database

Migrations are hand-rolled SQL in [migrations/](migrations/). Apply them in the Supabase SQL Editor or via `psql`. The latest migration ([migrations/20260425_video_analysis_comments.sql](migrations/20260425_video_analysis_comments.sql)) wires the coach ↔ athlete video-review feedback loop.

There's also a Prisma schema for the research subsystem at [prisma/schema.prisma](prisma/schema.prisma):

```bash
npm run prisma:validate
npm run prisma:generate
npx prisma migrate deploy
```

Seed scripts:

```bash
npm run seed:exercise-library
npm run seed:research-intelligence
npm run media:build-exercises
```

---

## Scripts

```bash
npm run dev               # Next dev server
npm run build             # production build (webpack)
npm run start             # serve the production build
npm run lint              # ESLint
npm run typecheck         # tsc --noEmit
npm run test              # Jest
npm run security:predeploy
```

Playwright E2E uses `webServer: npm run build && npm run start` so it boots a real production build:

```bash
npx playwright test                          # full suite (requires .auth setup)
npx playwright test --project=chromium-public # public + connection flows only
```

---

## Project structure

```
src/
├── app/                          # Next.js App Router
│   ├── athlete/dashboard/        # Athlete Performance View (4 zones)
│   ├── coach/dashboard/          # Coach Performance View (squad pulse + triage)
│   ├── individual/dashboard/     # Individual Performance View (calm pacing)
│   ├── athlete/scan/             # Video analysis flow (Universal + sport overlays)
│   ├── coach/reports/[id]/       # Coach video-report viewer + comment composer
│   ├── athlete/scan/report/[id]/ # Athlete report viewer + read-marked comments
│   ├── api/                      # Web + mobile API routes
│   └── (auth)/, /signup, /login  # Public + auth surfaces
├── components/
│   ├── performance-view/         # 4-zone shell + directive library
│   ├── neon/                     # canonical design primitives (also used by mobile)
│   ├── video-analysis/           # MediaPipe scan UI + coach-athlete comment thread
│   ├── form/                     # adaptive form wizard
│   └── ui/                       # base primitives
├── forms/                        # adaptive onboarding flows + schemas + decision engines
└── lib/                          # decision engines, vision rules, video analysis,
                                  #   research intelligence, dashboard composers
docs/
├── CREEDA_BLUEPRINT.md           # the unified product blueprint
└── audits/                       # historical audit reports
migrations/                       # raw SQL migrations for Supabase
prisma/                           # Prisma schema + research-intelligence migrations
mobile/                           # Expo app — kept in sync with the standalone mobile repo
tests/                            # Playwright + Jest specs
```

The `mobile/` directory in this repo is a working copy of the Expo app. The canonical mobile repo is [CREEDA-2.0-Android](https://github.com/creedaperformance/CREEDA-2.0-Android). Either keep them in sync via subtree, or delete `mobile/` from this repo once you're confident in the standalone workflow.

---

## Deploy

### Vercel (recommended)

1. Connect this repo to a Vercel project
2. Add the env vars above to the Vercel project settings (Production + Preview)
3. The build command is the default: `npm run build`
4. First deploy goes to your preview URL; production deploys on push to `main`

### Apply the latest migration

Before the coach ↔ athlete feedback loop works in production:

```bash
psql "$DATABASE_URL" -f migrations/20260425_video_analysis_comments.sql
```

Or paste the file into the Supabase SQL Editor.

---

## Testing checklist for beta

The beta is shippable when all three founders can complete this loop in under 5 minutes from a cold install:

1. Open the app, sign up, pick a persona
2. Finish onboarding (target: 90s)
3. Complete the daily check-in (target: 10s)
4. See readiness score + single-line directive on the home screen
5. Tap *Today's session* → see the prescription
6. (Athlete) tap *Movement Analysis* → record a 5–20s clip → see fault detection result
7. (Coach) see the squad grid with at least one red/amber athlete
8. Receive a push notification 12–24 hours later prompting the next check-in

If any step fails, the beta is not ready. See [docs/CREEDA_BLUEPRINT.md §10](docs/CREEDA_BLUEPRINT.md) for the full readiness rubric.

---

## Other repos

- Mobile (Expo, builds Android + iOS): https://github.com/creedaperformance/CREEDA-2.0-Android
- Original v1 archive: https://github.com/creedaperformance/Creeda-live

---

## Contact

This is a closed-source product repo. For investor / partnership / academy onboarding inquiries, reach the founding team at [creedaperformance.com](https://creedaperformance.com) (or the equivalent contact route documented in your internal handbook).
