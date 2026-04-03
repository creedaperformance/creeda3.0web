# Creeda Unified Modification Blueprint

Date: 2026-04-02
Workspace: `/Users/creeda/creeda-app`

References:

- `/Users/creeda/creeda-app/docs/creeda-competitive-analysis-2026-04-01.md`
- `/Users/creeda/creeda-app/docs/creeda-strategy-upgrades-2026-04-02.md`

## Purpose

This document merges the earlier competitive analysis with the attached strategy-upgrades document into one product blueprint for Creeda.

It answers one question:

**What should Creeda actually change in product, UX, data, and positioning to become a world-class sports science app?**

## Short Comparison: What Changed Between The Two Strategy Docs

### Where both documents agree

Both documents clearly align on the big ideas:

- Creeda should be a decision engine, not another tracker
- Creeda should separate athlete, individual, and coach experiences
- Creeda should own India-first sports-science context
- Creeda should treat explainability and trust as product features
- Creeda should invest in smartphone-first testing and video intelligence
- Creeda should win on actionability, not on dashboard sprawl

### What the attached file improves

The attached file adds four important upgrades that should be adopted fully:

1. Retention architecture should be treated as a first-class product system.
2. Confidence and uncertainty should be visible on every important recommendation.
3. The role split should be emotional, not just navigational.
4. The product should be organized around a five-layer operating model:
   - Today
   - Plan
   - Trends
   - Technique
   - Science

### What the final combined blueprint should be

The right merged position is:

**Creeda should become the most believable, actionable, and localized sports-science decision system for athletes, coaches, academies, and everyday people, starting with India.**

## Final Product Thesis

Creeda should be built as:

- `Creeda Performance`
  - athletes
  - coaches
  - teams
  - academies

- `Creeda Life`
  - individuals
  - beginners
  - healthier-living users
  - sport-entry users

Underneath both sits one shared intelligence backbone:

- readiness
- load
- recovery
- pain and rehab
- trends
- health sync
- video and phone-based objective testing
- confidence and evidence

## The One Blueprint

## 1. Redesign Creeda Around One Shared Five-Layer Product Model

Every role should use the same structural stack, but with different tone and depth.

### Layer 1: Today

Purpose:

- answer the immediate question
- reduce cognitive load
- create daily habit value

What every role should see:

- what to do today
- how hard to push
- why this is the call
- what to avoid
- confidence level

Current surfaces to evolve:

- `/Users/creeda/creeda-app/src/app/athlete/dashboard/DecisionHUD.tsx`
- `/Users/creeda/creeda-app/src/app/individual/dashboard/components/IndividualDashboardClient.tsx`
- `/Users/creeda/creeda-app/src/app/coach/dashboard/components/CoachDecisionHUD.tsx`

Modification:

- make the hero card for each role more operational
- show recommendation, confidence, and primary drivers in the first viewport
- reduce the need to open deeper panels just to understand the recommendation

### Layer 2: Plan

Purpose:

- connect today's decision to the week
- reduce random day-to-day behavior

What it should contain:

- today’s session or habit target
- weekly structure
- progression logic
- deload or caution logic
- next review checkpoint

Current surfaces to evolve:

- athlete today plan and full plan sheet
- individual weekly movement and nutrition plan
- coach analytics and squad planning surfaces

Modification:

- move from isolated prescriptions to a visible weekly operating structure
- especially strengthen planning on the coach side

### Layer 3: Trends

Purpose:

- show whether the user is improving, stalling, or drifting
- prevent overreaction to one bad day

What it should contain:

- 7-day trend
- 28-day trend
- block trend
- adherence trend
- risk trend
- what changed and why

Current surfaces to evolve:

- athlete prediction and metrics panels
- coach analytics trend page
- individual journey and weekly feedback sections

Modification:

- standardize trend stories into one language:
  - improving
  - stable
  - overloaded
  - under-recovered
  - inconsistent

### Layer 4: Technique

Purpose:

- make movement quality a practical edge
- turn video from a novelty into a performance tool

What it should contain:

- video scan
- supported sport and angle rules
- movement faults
- asymmetry
- fatigue-related technical drift
- coach review comments
- before/after comparison

Current surfaces to evolve:

- `/Users/creeda/creeda-app/src/components/video-analysis/VideoAnalysisSummaryCard.tsx`
- `/Users/creeda/creeda-app/src/lib/video-analysis/service.ts`
- athlete and individual scan routes
- coach video report review flows

Modification:

- narrow supported sports and capture contexts
- deepen accuracy and clarity for those sports

### Layer 5: Science

Purpose:

- make Creeda trustworthy
- explain the system without overwhelming the user

What it should contain:

- major drivers behind the score
- measured versus estimated versus self-reported
- confidence level
- data quality
- evidence references
- what would improve the call

Current surfaces to evolve:

- `/Users/creeda/creeda-app/src/app/athlete/dashboard/components/ScientificEvidencePanel.tsx`
- `/Users/creeda/creeda-app/src/lib/explainability_layer.ts`
- `/Users/creeda/creeda-app/src/lib/dashboard_decisions.ts`
- `/Users/creeda/creeda-app/src/lib/engine/DecisionService.ts`

Modification:

- promote science from a hidden detail panel into an explicit trust layer

## 2. Build A Real Trust System

This is the most important product-system change.

Every major recommendation should declare:

- based on what inputs
- confidence high, medium, or low
- data quality complete, partial, or weak
- which signals are measured, estimated, and self-reported
- why the recommendation changed today
- what missing input would improve it

### Product changes

- Add a shared `trust summary` object to all decision outputs.
- Surface that trust summary in athlete, individual, and coach hero panels.
- Add visible labels such as:
  - `Measured`
  - `Estimated`
  - `Self-reported`
  - `High confidence`
  - `Partial data`

### Engine changes

Primary files:

- `/Users/creeda/creeda-app/src/lib/engine/DecisionService.ts`
- `/Users/creeda/creeda-app/src/lib/dashboard_decisions.ts`
- `/Users/creeda/creeda-app/src/lib/engine/types.ts`

Add:

- `confidenceLevel`
- `dataQuality`
- `signalBreakdown`
- `changeDrivers`
- `recommendedNextData`

### UX rule

No important score should appear without its trust state.

## 3. Build The Daily And Weekly Retention Engine

The attached file is right to elevate this.

Creeda needs a habit architecture, not just insight architecture.

### Daily loop

Morning:

- quick readiness or guidance ritual
- one clear decision
- one key action

Evening:

- simple reflection or completion check
- actual load captured
- note on what changed

Current surface to evolve:

- `/Users/creeda/creeda-app/src/app/athlete/checkin/page.tsx`

Modification:

- keep the athlete check-in fast
- add confidence feedback after submit
- show “what improved certainty” and “what still limits certainty”

### Weekly loop

Add one polished weekly review for all roles.

For athletes:

- what went well
- where recovery broke down
- where load spiked
- next-week focus

For individuals:

- movement consistency
- sleep and energy summary
- next-week health focus

For coaches:

- squad compliance
- highest-risk clusters
- athletes needing intervention
- microcycle adjustment suggestions

New product surface recommended:

- weekly review route and reusable weekly review components for all roles

## 4. Turn The Smartphone Into A Sports-Science Lab

This should be one of Creeda’s strongest moats.

### Build order

Phase 1:

- reaction test
- balance or single-leg stability test
- breathing recovery test

Phase 2:

- jump and landing quality scan
- mobility and ROM scan
- asymmetry scan

Phase 3:

- sprint timing
- acceleration timing
- agility timing
- sport-specific capture workflows

### Why this matters

- it differentiates Creeda from generic wellness apps
- it reduces dependence on expensive hardware
- it fits India’s smartphone-heavy reality

### Code areas to evolve

- `/Users/creeda/creeda-app/src/app/athlete/scan/page.tsx`
- `/Users/creeda/creeda-app/src/app/individual/scan/page.tsx`
- `/Users/creeda/creeda-app/src/lib/vision/MediaPipeEngine.ts`
- `/Users/creeda/creeda-app/src/lib/video-analysis/*`

### Product rule

Only ship tests that are repeatable, understandable, and operationally useful.

## 5. Make The Role Split Emotional, Not Just Structural

The same data backbone should feel different depending on the user.

### Athlete product feel

Attributes:

- sharp
- focused
- competitive
- performance-led

Primary emotion:

- clarity under pressure

Key UI changes:

- stronger top-line decision language
- more training and competition context
- more direct cause-effect explanations

### Individual product feel

Attributes:

- calm
- encouraging
- low-pressure
- healthy-living-led

Primary emotion:

- confidence without shame

Key UI changes:

- simpler vocabulary
- less sports jargon
- more emphasis on energy, sleep, consistency, and small wins

### Coach product feel

Attributes:

- operational
- triage-led
- high signal
- efficient

Primary emotion:

- control and foresight

Key UI changes:

- less decoration, more queue logic
- clearer flags and sortability
- group recommendations, not just athlete cards

## 6. Upgrade The Coach Product Into A Command Center

This is where Creeda can beat consumer-first competitors.

Current foundation:

- roster intelligence
- readiness distribution
- high-risk list
- video report access

Current surfaces:

- `/Users/creeda/creeda-app/src/app/coach/dashboard/page.tsx`
- `/Users/creeda/creeda-app/src/app/coach/dashboard/components/CoachDecisionHUD.tsx`
- `/Users/creeda/creeda-app/src/app/coach/analytics/page.tsx`

### What to add

1. Squad intervention queue

- who needs attention now
- why
- recommended action
- acknowledgement state

2. Group drill or load suggestions

- by squad
- by position group
- by readiness cluster

3. Low-data and missing-data management

- absent athlete list
- stale check-in list
- weak-confidence athletes

4. Rehab and return tracker

- stage
- progression confidence
- restrictions
- readiness to progress

5. Communication and notes

- coach notes
- physio notes
- follow-up state

6. Academy support

- multi-team roster
- junior athlete flags
- parent view handoff
- low-cost workflow without hardware assumptions

## 7. Build A Stronger Individual Product, Not Just A Softer Athlete Product

Current strengths:

- FitStart has a meaningful baseline engine
- the individual dashboard already frames guidance more simply than athlete mode

Current surfaces:

- `/Users/creeda/creeda-app/src/app/fitstart/page.tsx`
- `/Users/creeda/creeda-app/src/app/individual/dashboard/components/IndividualDashboardClient.tsx`

### What to change

1. Simplify language even further

Translate sports-science logic into:

- energy
- sleep
- stress
- movement
- consistency
- health momentum

2. Strengthen the path identity

Users should feel they are on a real path:

- fat loss
- strength
- mobility
- sleep reset
- sport entry
- healthy routine rebuild

3. Add weekly momentum and habit loops

- streaks
- weekly wins
- confidence-building progress markers
- “what changed this week”

4. Make device sync optional but helpful

- never make hardware feel required
- always explain what device data improved

## 8. Make India-Native Context A Core Intelligence Layer

This should not live only in marketing copy.

### Add to the engine

- heat
- humidity
- AQI or pollution
- commute burden
- exam or academic stress
- shift work
- fasting and religious schedule context
- home meal pattern
- vegetarian, Jain, and regional dietary reality

### Primary code area to expand

- engine context building
- nutrition framework
- daily decision inputs
- individual pathway and lifestyle interpretation

Strong candidate files:

- `/Users/creeda/creeda-app/src/lib/dashboard_decisions.ts`
- `/Users/creeda/creeda-app/src/lib/engine/Prescription/NutritionGenerator.ts`
- `/Users/creeda/creeda-app/src/lib/engine/Prescription/SportsScienceKnowledge.ts`
- `/Users/creeda/creeda-app/src/lib/individual_performance_engine.ts`

### Product outcome

Creeda becomes truly native to Indian life and sport instead of being a global app with India-flavored copy.

## 9. Narrow And Deepen Supported Sports For Video And Testing

Creeda should not try to support every sport equally at the start.

### Priority sports

- cricket
- badminton
- football
- athletics
- wrestling
- kabaddi
- hockey
- strength training

### Publish support rules

For each sport:

- supported positions
- supported movements
- supported camera angles
- unsupported clip conditions
- confidence rules

### Why this matters

- improves user trust
- reduces false promises
- creates depth where India has strong demand

## 10. Refresh The Brand And Landing Surfaces To Match The Product Direction

Current landing direction is strong:

- India-first
- athlete plus individual split
- decision-engine framing

Current surfaces:

- `/Users/creeda/creeda-app/src/app/page.tsx`
- `/Users/creeda/creeda-app/src/app/features/page.tsx`

### What to change

1. Make the promise more singular

Use one dominant idea:

- Know your body. Make the right call today.

2. Present the three-product system clearly

- Athlete
- Coach
- Individual

3. Explain trust visibly

- built from check-ins, optional health data, and supported video inputs
- explainable recommendations
- confidence-aware guidance

4. Show the five-layer model publicly

- Today
- Plan
- Trends
- Technique
- Science

This will make the brand story consistent with the actual product architecture.

## 11. Add Identity Metrics That Matter

These should summarize behavior and progress over time.

Recommended identity metrics:

- resilience score
- recovery discipline score
- movement quality score
- training consistency score
- readiness reliability score
- return-to-play confidence
- health age or performance age

### Rule

These should be earned from real behavior and trends, not decorative badges.

## 12. Build Outcome Proof Into The Company

To become world-class, Creeda needs proof.

### Product proof

- confidence labels
- supported data sources
- supported sports and positions
- recommendation logic summaries

### Scientific proof

- validation methodology
- reliability studies for phone-based tests
- comparison against coach and physio judgments

### Commercial proof

- academy case studies
- adherence improvement case studies
- overload-spike reduction case studies
- return-to-play workflow case studies

## Blueprint By Product Area

## A. Core Intelligence Engine

Modify:

- `/Users/creeda/creeda-app/src/lib/engine/DecisionService.ts`
- `/Users/creeda/creeda-app/src/lib/dashboard_decisions.ts`
- `/Users/creeda/creeda-app/src/lib/explainability_layer.ts`

Add:

- trust summary object
- confidence and data quality layers
- daily change drivers
- India-context inputs
- weekly review summary generation

## B. Athlete Experience

Modify:

- `/Users/creeda/creeda-app/src/app/athlete/checkin/page.tsx`
- `/Users/creeda/creeda-app/src/app/athlete/dashboard/DecisionHUD.tsx`
- athlete dashboard components under `/Users/creeda/creeda-app/src/app/athlete/dashboard/components`

Add:

- stronger today hero
- trust strip
- weekly review
- counterfactual “what changes the score”
- phone-based testing entry points

## C. Individual Experience

Modify:

- `/Users/creeda/creeda-app/src/app/fitstart/page.tsx`
- `/Users/creeda/creeda-app/src/app/individual/dashboard/components/IndividualDashboardClient.tsx`

Add:

- clearer path identity
- calmer copy
- health momentum view
- weekly review
- device influence explanation

## D. Coach Experience

Modify:

- `/Users/creeda/creeda-app/src/app/coach/dashboard/page.tsx`
- `/Users/creeda/creeda-app/src/app/coach/dashboard/components/CoachDecisionHUD.tsx`
- `/Users/creeda/creeda-app/src/app/coach/analytics/page.tsx`

Add:

- intervention queue
- low-confidence and missing-data queue
- group suggestions
- rehab and return tracker
- academy support patterns

## E. Technique And Testing

Modify:

- video-analysis services and UI
- scan routes
- MediaPipe and capture flows

Add:

- supported-sport capture rules
- confidence-aware technique outputs
- objective test history and repeatability views

## F. Marketing And Positioning

Modify:

- `/Users/creeda/creeda-app/src/app/page.tsx`
- `/Users/creeda/creeda-app/src/app/features/page.tsx`

Add:

- simpler promise
- clearer role split
- five-layer product explanation
- trust and explainability messaging

## The Recommended Order Of Work

### Phase 1: Product-system upgrade

Focus:

- trust system
- role hero redesign
- athlete daily loop refinement
- coach command center v1

Why first:

- highest user-facing clarity improvement
- highest differentiation with lowest science risk

### Phase 2: Retention and weekly loops

Focus:

- weekly review
- identity metrics
- streaks and habit loops
- individual momentum design

Why second:

- improves retention and perceived value

### Phase 3: Phone-based testing moat

Focus:

- reaction
- balance
- breathing recovery
- jump and landing

Why third:

- higher implementation and validation burden
- major moat if done well

### Phase 4: Academy and India moat

Focus:

- academy workflows
- parent view
- richer India context
- deeper supported sports

Why fourth:

- strongest institutional differentiation

## Success Metrics For The Blueprint

Track:

- daily check-in completion rate
- weekly review completion rate
- action completion rate after recommendation
- share of recommendations with high versus low confidence
- reduction in low-data recommendations
- athlete retention and weekly active usage
- coach intervention response time
- team compliance rate
- video test repeat rate
- phone-based test completion rate

## Final Decision

The attached strategy file should not replace the earlier benchmark.
It should sharpen it.

The final unified blueprint is:

- build Creeda around `Today`, `Plan`, `Trends`, `Technique`, and `Science`
- make trust visible everywhere
- create role-specific emotional products
- own India-first sport and health context
- turn the smartphone into a practical sports-science lab
- grow the coach product into a real command center
- use weekly review and identity metrics as the retention engine

If Creeda executes those modifications in that order, it will stop feeling like an ambitious sports app and start feeling like a category-defining performance system.
