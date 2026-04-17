# 1. Executive Summary

CREEDA’s current onboarding and wellness system is asking for too much, too early, in the wrong format. The core issue is not just form length. It is a structural mismatch between when the product asks for information and when that information actually becomes useful.

The redesign direction is:

- Front-load only the variables that change the first recommendation.
- Push everything else into progressive profiling.
- Use adaptive branching so follow-ups appear only when risk, ambiguity, or role complexity justifies them.
- Make daily logging default to 3 taps, with deeper capture triggered only by anomalies or deliberate “advanced logging.”
- Preserve the backend engine by translating simplified UI inputs into legacy fields with explicit confidence assumptions.

This rebuild cuts onboarding by roughly 50% to 70% depending on journey and cuts default daily logging by roughly 70% to 85%.

# 2. Key Problems In Current Forms

## Cross-cutting problems

- Too many questions are treated as “required upfront” even though many only improve confidence, not first-run decision quality.
- Current forms mix baseline profile, risk screening, detailed performance profiling, and preference capture into one uninterrupted intake.
- Daily check-ins ask low-frequency environmental and context questions every day instead of only when relevant.
- The experience feels administrative and clinical instead of guided, responsive, and rewarding.
- There is no visible value exchange. Users give a lot before seeing the dashboard.

## Athlete

- Current athlete onboarding collects detailed physiology self-ratings before proving value.
- The 9-domain capacity block is too cognitively heavy for first setup.
- Injury, illness, historical injury, training reality, sleep baseline, and goals are all stacked together.
- Daily flow captures sleep, energy, soreness, stress, motivation, pain, session completion, session type, load, competition, environment, commute, fasting, shift work, and notes in one pass.

## Individual / FitStart

- Current FitStart asks basic profile, physiology, lifestyle, schedule, equipment, recovery, injury, mobility, experience, and goals too early.
- Training experience, mobility, nutrition habits, and physiology self-ratings are useful, but not all need to block the first plan.
- Daily logging asks too many context fields for users who mostly want a fast “should I push or back off?” answer.

## Coach

- Coach onboarding includes structure, operational context, frequency, focus, and risk priorities all at once.
- Risk priorities are editable settings, not first-run essentials.
- Multi-team complexity is treated as if every coach needs it.

# 3. Redesign Principles

- Ask less, infer more.
- Ask only what changes the first recommendation.
- Replace broad profile capture with confidence-based enrichment.
- Group tightly related inputs on one screen only when they improve speed.
- Use conditional follow-ups for pain, sleep, guardian consent, session load, and team complexity.
- Daily check-in should default to 3 signals.
- Optional deeper profiling must be framed as “Improve accuracy.”
- Hide sports science sophistication behind plain-language UI.
- Preserve backend compatibility with mapper and confidence layers rather than preserving bloated UI.

# 4. Recommended Architecture By User Journey

## Athlete

### Current friction points

- Too many baseline questions before first dashboard.
- Heavy self-rating burden on physiology domains.
- Position, sleep, soreness baseline, training reality, and injury history are asked with equal urgency even though they do not carry equal first-run value.
- Daily flow over-captures context.

### Redundant or low-value upfront questions

- Full 9-domain self-rating battery.
- Reaction self-perception and reaction time.
- Past injury detail unless current issue exists.
- Typical wake time.
- Daily commute, AQI, humidity, fasting, and shift work every day.

### Field strategy

Kept mandatory upfront:

- Identity: name, username
- Sport
- Age
- Biological sex
- Level
- Height, weight
- Primary goal
- Current pain/injury yes-no
- Consent

Moved to progressive profiling:

- Training frequency
- Weekly hours
- Typical RPE
- Typical sleep baseline
- Typical energy baseline
- Typical soreness baseline
- Season phase
- Dominant side

Asked only conditionally:

- Position only for role-sensitive sports
- Injury severity and body location only if current issue = yes
- Guardian consent only if age < 18
- Coach code only if the athlete has one

Inferred or auto-filled:

- Avg intensity from playing level
- Initial physiology domains from sport + level + injury state
- Health connection preference = later by default
- Neutral sleep and recovery baseline until real data arrives

Removed entirely from fast start:

- Full physiology questionnaire
- Historical injury detail
- Illness detail unless surfaced later through daily or clinician flows

## Individual

### Current friction points

- FitStart tries to capture too much physiology and lifestyle nuance before the user sees a plan.
- Too many “nice to have” questions are bundled with essentials.
- Daily logging includes optional lifestyle/context inputs that should not be mandatory.

### Redundant or low-value upfront questions

- Full physiology self-rating battery
- Detailed mobility severity
- Nutrition habit detail
- Sedentary hours exact number
- Detailed training experience

### Field strategy

Kept mandatory upfront:

- Age
- Gender
- Height, weight
- Occupation / day shape
- Activity level
- Primary goal
- Time horizon
- Intensity preference
- Equipment access
- Current limitation / injury status

Moved to progressive profiling:

- Training experience
- Sleep baseline
- Nutrition habits
- Sedentary hours
- Detailed schedule windows

Asked only conditionally:

- Limitation area only if injury/limitation exists
- Training detail only if user opts into advanced logging

Inferred or auto-filled:

- Default schedule constraint from occupation type
- Default pathway from primary goal
- Initial physiology seed from activity level
- Neutral recovery baseline

Removed entirely from fast start:

- Large recovery/performance questionnaire
- Full movement robustness block

## Coach

### Current friction points

- Too much operational detail before dashboard access.
- Risk priorities are treated as mandatory instead of editable defaults.
- Multi-team structure fields appear too early.

### Redundant or low-value upfront questions

- Full critical risk matrix
- Training frequency detail
- Complex structure detail for coaches managing a single squad

### Field strategy

Kept mandatory upfront:

- Name
- Username
- Mobile number
- Team name
- Sport coached
- Coaching level
- Team type
- Squad size bucket
- Main coaching focus

Moved to progressive profiling:

- Training frequency
- Custom risk priorities
- Detailed team structure

Asked only conditionally:

- Team structure only if team type = multiple teams / age groups

Inferred or auto-filled:

- Initial risk priorities from coaching focus
- Default training frequency if not provided

Removed entirely from fast start:

- Deep risk configuration before the first dashboard

# 5. Progressive Profiling Model

## Layer 1: Ultra-Fast Initial Setup

Purpose: Create the first useful output.

Athlete:

- Identity
- Sport
- Age
- Biological sex
- Level
- Height, weight
- Goal
- Current injury status
- Consent

Individual:

- Age
- Gender
- Height, weight
- Occupation
- Activity level
- Goal
- Time horizon
- Intensity preference
- Equipment access
- Current limitation status

Coach:

- Identity
- Team name
- Sport
- Coaching level
- Team type
- Squad size
- Main focus

## Layer 2: Post-Onboarding Profile Enrichment

Purpose: Improve confidence without blocking activation.

Athlete:

- Training frequency
- Weekly hours
- Typical RPE
- Sleep baseline
- Typical soreness / energy
- Coach link

Individual:

- Training experience
- Sleep baseline
- Nutrition habits
- Sedentary time
- Schedule constraints

Coach:

- Training frequency
- Team structure detail
- Editable risk priorities

## Layer 3: Ongoing Intelligence Enrichment

Purpose: Replace assumptions with observed or higher-fidelity inputs.

Athlete:

- Physiology self-ratings
- Objective tests
- Load tolerance
- Movement robustness
- Detailed injury history
- Health-device integrations

Individual:

- Detailed physiology self-ratings
- Movement quality
- Device recovery signals
- Nutrition and hydration patterns

Coach:

- Team hierarchy
- Multi-squad workflow
- Custom monitoring priorities
- Reporting preferences

# 6. Adaptive Questioning Rules

## Product logic

- If athlete age is under 18, require guardian consent before finishing setup.
- If current injury/pain is yes, open injury severity and location.
- If soreness is high, open pain-location capture.
- If energy is very low or stress is very high, ask about sleep.
- If a training session was completed, ask duration and RPE.
- If coach manages multiple teams, ask for group structure.
- If individual reports limitation, open body-area selection.
- If profile confidence stays low for multiple days, prompt one enrichment question instead of reopening the whole form.

## Implementation-ready rules

```ts
[
  {
    id: 'athlete-under-18-guardian-consent',
    when: [{ field: 'age', operator: 'lte', value: 17 }],
    showFields: ['minorGuardianConsent'],
    severity: 'required',
  },
  {
    id: 'athlete-current-injury-capture',
    when: [{ field: 'currentIssue', operator: 'eq', value: 'Yes' }],
    showFields: ['injurySeverity', 'injuryLocations'],
    severity: 'guard',
  },
  {
    id: 'athlete-high-soreness-pain-location',
    when: [{ field: 'soreness', operator: 'gte', value: 4 }],
    showFields: ['painLocation'],
    severity: 'guard',
  },
  {
    id: 'athlete-low-energy-sleep',
    when: [{ field: 'energy', operator: 'lte', value: 2 }],
    showFields: ['sleepQuality', 'sleepDuration'],
    severity: 'info',
  },
  {
    id: 'athlete-high-stress-sleep',
    when: [{ field: 'stress', operator: 'gte', value: 4 }],
    showFields: ['sleepQuality', 'sleepDuration'],
    severity: 'info',
  },
  {
    id: 'daily-session-load-follow-up',
    when: [{ field: 'sessionCompletion', operator: 'in', value: ['completed', 'competition', 'partial', 'complete', 'crushed'] }],
    showFields: ['sessionRPE', 'sessionDuration', 'trainingMinutes'],
    severity: 'info',
  },
  {
    id: 'coach-multi-team-structure',
    when: [{ field: 'teamType', operator: 'eq', value: 'Multiple Teams / Age Groups' }],
    showFields: ['teamStructure'],
    severity: 'info',
  },
]
```

# 7. Final Reduced Question Sets

## Athlete onboarding

| Question | Input type | Mandatory | Why ask | Timing |
|---|---|---:|---|---|
| What should we call you? | Text | Yes | Profile identity | Upfront |
| Choose a CREEDA handle | Text | Yes | Coach/team discoverability | Upfront |
| What do you compete in most seriously? | Chips | Yes | Sport model anchor | Upfront |
| What role do you usually play? | Text | Conditional | Role-sensitive load differences | On trigger |
| How old are you? | Number | Yes | Recovery, safeguarding, load logic | Upfront |
| Biological sex | Chips | Yes | Baseline physiology assumption | Upfront |
| What level are you currently playing at? | Chips | Yes | Infer training density/intensity | Upfront |
| Height | Number | Yes | Baseline body-size model | Upfront |
| Weight | Number | Yes | Baseline load/fueling model | Upfront |
| What do you want CREEDA to help with first? | Chips | Yes | First dashboard focus | Upfront |
| Are you dealing with any pain or injury right now? | Chips | Yes | Early protection logic | Upfront |
| How much is it affecting you? | Chips | Conditional | Severity routing | On trigger |
| Where is the issue? | Body map | Conditional | Protection and specificity | On trigger |
| Coach or academy code | Text | No | Team link | Upfront optional |
| Allow CREEDA to personalize guidance with your data | Toggle | Yes | Legal/data use | Upfront |
| I understand this is not medical diagnosis | Toggle | Yes | Safety/legal | Upfront |
| Guardian or coach consent confirmed | Toggle | Conditional | Minor safeguarding | On trigger |
| Send updates and tips | Toggle | No | Marketing | Later |

## Athlete daily

| Question | Input type | Mandatory | Why ask | Timing |
|---|---|---:|---|---|
| How is your energy right now? | Emoji | Yes | Strongest fast readiness signal | Upfront |
| How heavy does your body feel? | Emoji | Yes | Neuromuscular readiness / pain risk | Upfront |
| How heavy does the day feel mentally? | Emoji | Yes | Non-training load | Upfront |
| How was last night’s sleep? | Chips | Conditional | Explain low-energy / high-stress days | On trigger |
| Roughly how long did you sleep? | Chips | Conditional | Improve signal confidence | On trigger |
| Where is the issue? | Body map | Conditional | Pain protection | On trigger |
| Did you complete the planned session? | Chips | Conditional | Learn from load | On trigger or advanced |
| How hard did it feel? | Slider | Conditional | Estimate internal load | On trigger |
| How long was the session? | Slider | Conditional | Estimate external volume | On trigger |
| Anything unusual today? | Textarea | No | Edge cases only | Later |

## Individual onboarding

| Question | Input type | Mandatory | Why ask | Timing |
|---|---|---:|---|---|
| How old are you? | Number | Yes | Progression assumptions | Upfront |
| Gender | Chips | Yes | Baseline physiology assumption | Upfront |
| Height | Number | Yes | Body-size anchor | Upfront |
| Weight | Number | Yes | Body-size anchor | Upfront |
| What does your normal day look like? | Chips | Yes | Schedule/fatigue inference | Upfront |
| How active are you most weeks? | Chips | Yes | Initial load seed | Upfront |
| What are you trying to improve first? | Chips | Yes | Plan direction | Upfront |
| When do you want to feel a real change? | Chips | Yes | Time-pressure framing | Upfront |
| How hard do you want this to feel? | Chips | Yes | Adherence fit | Upfront |
| What can you reliably use? | Multi-chip | Yes | Equipment-constrained planning | Upfront |
| Any pain, injury, or movement limitation right now? | Chips | Yes | Safety routing | Upfront |
| Where is it affecting you most? | Body map | Conditional | Safety specificity | On trigger |
| Training experience | Chips | No | Progression accuracy | Later |
| Normal sleep quality | Slider | No | Recovery accuracy | Later |

## Individual daily

| Question | Input type | Mandatory | Why ask | Timing |
|---|---|---:|---|---|
| How is your energy right now? | Emoji | Yes | Fast trainability signal | Upfront |
| How heavy does life feel today? | Emoji | Yes | Non-training load | Upfront |
| How does your body feel? | Emoji | Yes | Physical readiness | Upfront |
| How was last night’s sleep? | Chips | Conditional | Explain low-readiness days | On trigger |
| Did you train today? | Chips | Conditional | Optional load learning | Advanced / trigger |
| How many minutes did you train? | Slider | Conditional | Volume capture | On trigger |
| How hard did it feel? | Slider | Conditional | Intensity capture | On trigger |
| How much water did you drink? | Slider | No | Optional recovery detail | Later |

## Coach onboarding

| Question | Input type | Mandatory | Why ask | Timing |
|---|---|---:|---|---|
| What should athletes see as your name? | Text | Yes | Profile identity | Upfront |
| Choose your coach handle | Text | Yes | Discoverability | Upfront |
| WhatsApp or mobile number | Phone | Yes | Verification / squad coordination | Upfront |
| What is your main squad or setup called? | Text | Yes | Dashboard and invites | Upfront |
| What sport do you coach? | Chips | Yes | Sport model | Upfront |
| What best describes your setup? | Chips | Yes | Dashboard configuration | Upfront |
| How do you coach today? | Chips | Yes | Structure logic | Upfront |
| How many athletes are active right now? | Chips | Yes | Scale logic | Upfront |
| What do you care about most right now? | Chips | Yes | Prioritize alerts and insights | Upfront |
| How often do your athletes train with you? | Chips | No | Better load context | Later |
| How many groups or age bands do you run? | Text | Conditional | Multi-team structure | On trigger |

# 8. Screen-By-Screen UX Flows

## Athlete onboarding

1. Screen title: Profile Name
Helper copy: “Your athlete profile, kept simple.”
Interaction: 2 text inputs
Choices: Open text
Validation: Full name 2+ chars, username 3+ chars
Skip: No
Transition: Next when both valid
After completion: Sport screen

2. Screen title: Sport Context
Helper copy: “Pick your main sport. Position only shows if it matters.”
Interaction: Chips + optional text
Choices: Sports list + optional position
Validation: Sport required
Skip: Position skippable
Transition: Next to athlete snapshot
After completion: Snapshot screen

3. Screen title: Athlete Snapshot
Helper copy: “We use this to stop guessing body size and training level.”
Interaction: Numbers + chips
Choices: Age, sex, level, height, weight
Validation: All required
Skip: No
Transition: Goal screen
After completion: Goal screen

4. Screen title: Primary Goal
Helper copy: “This shapes what the first dashboard optimizes.”
Interaction: Goal cards
Choices: 5
Validation: One required
Skip: No
Transition: Pain check
After completion: Pain screen

5. Screen title: Pain Check
Helper copy: “Only expands if something is currently off.”
Interaction: Chips, then conditional chips + body map
Choices: Yes/no, severity, up to 2 body areas
Validation: If yes, require body area
Skip: No
Transition: Finish setup
After completion: Consent screen

6. Screen title: Finish Setup
Helper copy: “One last check and you’re in.”
Interaction: Toggle(s) + optional text
Choices: Consent, medical disclaimer, guardian if needed, coach code optional
Validation: Required toggles on
Skip: Coach code skippable
Transition: Dashboard
After completion: Dashboard with accuracy meter prompt

## Athlete daily

1. Energy
2. Body Feel
3. Stress
4. Sleep follow-up only if low energy or high stress
5. Pain location only if soreness high
6. Load capture only if advanced logging or missing training capture

What user sees after completion:

- Readiness score
- Decision label
- One-line reason
- Return to dashboard CTA

## Individual onboarding

1. Quick Snapshot
2. Day Shape
3. Main Goal
4. What You Have
5. Any Limitation?

After completion:

- FitStart summary
- Starting readiness
- Main opportunity area
- Dashboard CTA

## Individual daily

1. Energy
2. Stress
3. Body Feel
4. Sleep only when needed
5. Training capture only when advanced logging is on

After completion:

- Daily readiness status
- Simple action direction
- Dashboard CTA

## Coach onboarding

1. Coach Identity
2. Squad Setup
3. Team Structure
4. Main Focus

After completion:

- Coach dashboard unlocked
- Invite/team setup can continue later

# 9. Science-Preserving Backend Mapping

## Simplified interactions and backend translation

### Energy emoji, 1 to 5

- Frontend input: single emoji scale
- Backend mapping: `energyLevel`, `motivation`, readiness proxy
- Confidence limit: medium if no sleep context
- Engine inference: central readiness, motivational bias
- Ask for more precision when: energy <= 2 for 2 to 3 days or conflict with objective/device signals

### Soreness emoji, 1 to 5

- Frontend input: body-feel emoji
- Backend mapping: `muscleSoreness`, `painStatus`
- Confidence limit: medium without pain location
- Engine inference: neuromuscular recovery, soft-tissue caution
- Ask for more precision when: soreness >= 4

### Stress emoji, 1 to 5

- Frontend input: mental-load emoji
- Backend mapping: `lifeStress`, `examStressScore`
- Confidence limit: medium because source is broad
- Engine inference: cognitive load, recovery drag, adherence risk
- Ask for more precision when: stress >= 4 or repeated readiness drop

### Body map

- Frontend input: up to 2 selected regions
- Backend mapping: `activeInjuries.region` or `painLocation`
- Confidence limit: low on diagnosis, high on region routing
- Engine inference: localized protection, risk guardrails
- Ask for more precision when: same area repeats for 3+ days

### Goal cards

- Frontend input: 1 selected goal
- Backend mapping: `primaryGoal`
- Confidence limit: high
- Engine inference: dashboard weighting, pathway defaults
- Ask for more precision when: adherence drops or goals conflict with behavior

## Minimum viable daily signal model

### Athlete

Use:

- Energy
- Soreness
- Stress
- Sleep quality only on low-confidence days

Why enough:

- Energy gives central readiness.
- Soreness gives physical readiness and pain risk.
- Stress explains non-training recovery drag.
- Sleep quality resolves ambiguity when the first three conflict.

### Individual

Use:

- Energy
- Stress
- Soreness
- Session completion only when advanced logging is on

Why enough:

- General users need a “push / maintain / recover” decision more than a full sports-science trace.
- These signals cover most day-to-day variance without form fatigue.

# 10. Engineering Implementation Plan

## Form schema refactor

- Introduce a new `src/forms` layer with explicit field metadata.
- Each field now has category, layer, required status, trigger rules, and backend mapping key.
- Keep the legacy backend contracts unchanged by mapping new payloads to old schemas in mapper files.

## Required vs optional split

- Layer 1 fields are activation-critical.
- Layer 2 fields improve confidence but never block the first dashboard.
- Layer 3 fields replace assumptions over time.

## Adaptive branching

- Trigger conditions live in schema metadata.
- A shared adaptive engine evaluates field visibility and rule activation.
- Step visibility is recomputed live from answer state.

## Partial completion

- Persist drafts locally by flow id + user id + version.
- Clear drafts on successful submit.
- Future backend sync should mirror drafts into a JSON draft column or `form_drafts` table.

## Confidence scores

- Calculate confidence from completion, consistency, critical missing fields, and inferred-field ratio.
- Expose confidence score in UI as “accuracy” instead of technical uncertainty language.

## Form versioning

- Every flow and migration output carries a `version`.
- Mappers become the compatibility boundary.
- Analytics should record both `flow_id` and `flow_version`.

## Avoid breaking analytics and recommendations

- Preserve old downstream engine payload shape.
- Keep old field names in mapper output.
- Add new analytics dimensions rather than replacing old event names immediately.

## Migration strategy

- Export old onboarding/daily payloads.
- Convert them into new `core_fields`, `optional_fields`, `inferred_fields`, `minimal_signals`, and `inferred_signals`.
- Backfill completion and confidence scores during migration.
- Use a read-through compatibility period where old records still hydrate new UI when new-format data is missing.

# 11. Gamification And Engagement Layer

- Progress states: “Fast Start”, “Accuracy Boost”, “Locked In”
- Streaks: wellness streak counts only for completed quick check-ins, not for optional enrichment
- Accuracy meter: visible meter that increases when users answer useful enrichment prompts
- Unlocks: “Coach linked”, “Better readiness confidence”, “Training pattern learned”
- Performance avatar: use subtle status states like “Fresh”, “Guarded”, “Building”, “Locked In”
- Instant feedback: after check-in show readiness label + one sentence, never a wall of copy
- Athlete microcopy:
  - “Fast start first. Fine-tune later.”
  - “Sharp enough to decide. Add more later to improve accuracy.”
  - “Body says steady. Let’s build.”
- Individual microcopy:
  - “Quick pulse captured.”
  - “Good enough for today’s call.”
  - “Add one more detail next time to sharpen your plan.”
- Coach microcopy:
  - “Dashboard ready. Team detail can wait.”
  - “Start with one squad. Expand structure later.”

# 12. Rollout Recommendation

- Phase 1: Ship new schemas, mappers, wizard UI, and draft persistence behind a feature flag.
- Phase 2: Route new users to fast-start flows; keep legacy flows only for rollback.
- Phase 3: Turn on confidence prompts and progressive enrichment cards.
- Phase 4: Migrate old records into new profile containers and switch dashboards to prefer the new structure.
- Phase 5: Remove the old static forms after completion, activation, and daily retention metrics improve for two stable release cycles.

## Success metrics

- Athlete onboarding median completion time: < 90 seconds
- Individual onboarding median completion time: < 75 seconds
- Coach onboarding median completion time: < 60 seconds
- Athlete daily check-in median completion time: < 10 seconds
- Individual daily check-in median completion time: < 10 seconds
- Onboarding completion rate improvement: +25% or better
- Daily logging retention improvement: +15% or better
