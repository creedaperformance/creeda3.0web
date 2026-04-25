# Creeda Six-Month End-to-End User Journeys

Date: 2026-04-25

Scope: This document maps how Creeda is used over six months by the three primary roles:

- Athlete
- Individual
- Coach

The journeys begin at the signup page and follow the user through onboarding, first value, daily use, weekly review, monthly progress, and six-month retention.

## Source Basis

This is a product journey document grounded in the current Creeda app structure in this checkout.

Current role entry points:

- Signup: `/signup`
- Login: `/login`
- Email verification: `/verify-email`, `/verification-success`, `/auth/callback`
- Athlete onboarding: `/athlete/onboarding`
- Individual onboarding: `/fitstart`
- Coach onboarding: `/coach/onboarding`
- Athlete home: `/athlete/dashboard`
- Individual home: `/individual/dashboard`
- Coach home: `/coach/dashboard`

Current athlete execution surfaces:

- `/athlete/checkin`
- `/athlete/sessions/today`
- `/athlete/plans`
- `/athlete/exercises`
- `/athlete/scan`
- `/athlete/diagnostic`
- `/athlete/tests`
- `/athlete/progress`
- `/athlete/review`
- `/athlete/integrations`
- `/athlete/family`
- `/athlete/nutrition-safety`
- `/athlete/settings`
- `/athlete/legal`

Current individual execution surfaces:

- `/individual/logging`
- `/individual/sessions/today`
- `/individual/plans`
- `/individual/exercises`
- `/individual/scan`
- `/individual/diagnostic`
- `/individual/tests`
- `/individual/review`
- `/individual/nutrition-safety`
- `/individual/legal`

Current coach execution surfaces:

- `/coach/dashboard`
- `/coach/execution`
- `/coach/review`
- `/coach/analytics`
- `/coach/academy`
- `/coach/reports`
- `/coach/settings`
- `/coach/legal`

Important boundary: the six-month journey describes the intended user experience using currently visible routes and product loops. Where a route exists but depends on Supabase data, applied migrations, connected users, accepted camera permissions, or connected health sources, the journey assumes those dependencies are available in production.

## Product Mental Model

Creeda should not feel like a dashboard the user visits once. It should feel like a six-month decision-support loop.

The repeated loop is:

1. Sense: collect the smallest useful signal.
2. Understand: translate readiness, training, recovery, context, and movement quality into a decision.
3. Decide: choose the best action for today.
4. Execute: guide the user through the actual session or coaching action.
5. Improve: save proof, adjust tomorrow, and surface progress.

For a user, this becomes:

1. Sign up.
2. Tell Creeda enough to be useful.
3. Get today's decision.
4. Do the session or coaching action.
5. Log what actually happened.
6. Review what changed.
7. Repeat with less friction and more precision.

## Shared Signup Journey For All Roles

### Step 1: User Opens Signup

Route: `/signup`

The user sees the role selection stage unless the role is preselected through a query parameter.

Choices:

- Individual: healthy-living guidance, FitStart, daily recovery, movement habits, simpler entry into fitness.
- Athlete: performance diagnostics, readiness, workload, rehab context, sharper training decisions.
- Coach: squad oversight, athlete monitoring, decision support for coaches and practitioners.

If the user came from a coach invite link, the flow may start from:

- `/join/[lockerCode]`
- Then the CTA sends the athlete to `/signup?role=athlete&coach=[lockerCode]`

In that invited-athlete path, signup opens with athlete selected and the coach code prefilled.

### Step 2: User Creates Account

The user fills:

- Full name
- Email
- Password
- Role
- Optional coach locker code for athletes

Required acknowledgements:

- Terms and Privacy Policy
- Medical disclaimer
- Data processing consent
- AI and rules-based advisory acknowledgement

Optional acknowledgement:

- Marketing and educational product updates

### Step 3: System Validates Signup

System behavior:

- Rate-limits signup attempts by email.
- Validates required fields.
- Validates required legal acknowledgements.
- Validates athlete coach locker code if provided.
- Creates Supabase auth user.
- Stores legal consent metadata.
- Persists a legal consent bundle when admin credentials are available.

### Step 4: User Lands In Verification Or Onboarding

If the Supabase signup returns an active session:

- Athlete is redirected to `/athlete/onboarding`.
- Individual is redirected to `/fitstart`.
- Coach is redirected to `/coach/onboarding`.

If email verification is required:

- User is redirected to `/verify-email`.
- User opens email verification link.
- Auth callback routes through `/auth/callback?next=/verification-success`.
- User then continues into the correct role onboarding.

### Step 5: Role Guarding After Login

After login, Creeda sends users to the correct role home:

- Athlete: `/athlete` -> `/athlete/dashboard`
- Individual: `/individual` -> `/individual/dashboard`
- Coach: `/coach` -> `/coach/dashboard`

If a logged-in user tries to open another role's route, role checks redirect them back to the proper role home.

## Persona 1: Athlete Journey

### Persona

Name: Aarav

Profile:

- 17-year-old cricket fast bowler
- Plays at district or state level
- Wants to improve performance without increasing injury risk
- Has an academy coach who may invite him through a locker code
- Uses mobile most days and desktop occasionally

Primary six-month goal:

- Build consistency, improve movement quality, stay available, and arrive at competitions prepared.

Core question Aarav asks Creeda every day:

- "What should I do today, and why?"

## Athlete Journey: First Session To First Dashboard

### A0. Signup

Route: `/signup`

Step-by-step:

1. Aarav opens `/signup`.
2. He chooses Athlete.
3. If invited by coach, he may arrive through `/join/[lockerCode]`, tap Join Squad, and land on `/signup?role=athlete&coach=[lockerCode]`.
4. He enters full name, email, and password.
5. If he has a coach code, he enters the six-digit code and taps Verify.
6. Creeda validates the code and shows the linked coach name.
7. He accepts required legal acknowledgements.
8. He optionally opts into product updates.
9. He submits the form.
10. Creeda either sends him to email verification or directly to `/athlete/onboarding`.

### A1. Athlete Fast Start Onboarding

Route: `/athlete/onboarding`

Creeda promise on screen:

- "Set up in under 90 seconds."
- The app asks the smallest useful set of answers first and improves accuracy later.

Step-by-step:

1. Profile Name
   - Aarav enters display name.
   - Aarav chooses a Creeda handle.

2. Sport Context
   - Aarav selects primary sport.
   - If the sport needs position context, he enters role such as bowler, batter, midfielder, setter, etc.

3. Athlete Snapshot
   - Aarav enters age.
   - Aarav selects biological sex.
   - Aarav selects playing level.
   - Aarav enters height and weight.

4. Primary Goal
   - Aarav selects one first priority:
     - Performance Enhancement
     - Injury Prevention
     - Recovery Efficiency
     - Return from Injury
     - Competition Prep

5. Pain Check
   - Aarav answers whether something is off right now.
   - If no issue, the flow stays short.
   - If yes, Creeda asks severity and up to two body regions.

6. Finish Setup
   - Aarav may enter coach locker code if he skipped it during signup.
   - Aarav confirms platform consent.
   - Aarav confirms medical disclaimer consent.
   - If under 18, Aarav confirms guardian or coach consent.
   - Aarav taps Finish.

7. System saves the profile.
   - Adaptive profile is stored.
   - Legacy athlete profile fields are mapped.
   - Dashboard and onboarding paths are revalidated.

8. Aarav taps Open dashboard or is redirected to `/athlete/dashboard`.

### A2. First Athlete Dashboard

Route: `/athlete/dashboard`

What Aarav sees:

- Today decision
- Daily operating system
- Readiness and confidence
- Today's plan
- Video review and movement quality
- Nutrition safety context if available
- Trust and explainability summary
- Profile accuracy card for future enrichment

Step-by-step:

1. Aarav reads the top daily decision.
2. He checks whether Creeda recommends:
   - Train hard
   - Train light
   - Recovery focus
   - Mobility only
   - Deload
   - Full rest
3. He reads the "why today changed" or confidence explanation.
4. He checks the Daily Operating System panel:
   - Sense: data sources and manual signals
   - Understand: readiness score and confidence
   - Decide: recommended action
   - Execute: today's session link
   - Improve: streak and weekly compliance
5. If dashboard confidence is low, he follows the next best input:
   - Daily check-in
   - Objective test
   - Movement scan
   - Integration setup
6. If confidence is acceptable, he taps Open Today's Session.

### A3. First Daily Check-In

Route: `/athlete/checkin`

Purpose:

- Make the day usable in under 10 seconds.

Step-by-step:

1. Aarav opens Daily Check-In.
2. He answers energy.
3. He answers body feel or soreness.
4. He answers stress.
5. If energy is low or stress is high, Creeda asks about sleep.
6. If soreness is high, Creeda asks where the issue is.
7. If Aarav turns on training details, Creeda asks:
   - Did he complete the planned session?
   - How hard did it feel?
   - How long was it?
   - Any unusual notes?
8. Aarav taps Finish.
9. Creeda returns a readiness score and sends him back to `/athlete/dashboard`.
10. The dashboard updates today's recommendation.

### A4. First Guided Session

Route: `/athlete/sessions/today`

Purpose:

- Convert a recommendation into executable work.

Step-by-step:

1. Aarav opens the session overview.
2. He sees:
   - Session mode
   - Personalized title
   - Readiness score and band
   - Expected duration
   - Focus
   - Difficulty
   - Reasons and warnings
   - Warm-up, main, accessory, conditioning, cooldown, recovery, or rehab blocks as relevant
3. He reads why this session exists.
4. He taps Start session.
5. For each exercise, he sees:
   - Exercise name
   - Instructions
   - Coaching cues
   - Common mistakes
   - Prescribed reps, sets, duration, rest, tempo, or RPE
   - Demo media when available
   - Substitution options
6. He logs:
   - Actual reps
   - Load
   - Duration
   - Completed sets
   - Substitution used
   - Notes
7. If the exercise needs form feedback, he opens Camera Coach from inside the session.
8. When all work is done, he reviews total completed sets.
9. He flags pain or discomfort if needed.
10. He adds session notes.
11. He taps Save session.
12. Creeda saves:
   - Session completion
   - Compliance percent
   - Exercise logs
   - Pain flags
   - Notes
13. Aarav sees that history and coach view are up to date.

### A5. First Movement Scan Or Diagnostic

Routes:

- `/athlete/scan`
- `/athlete/diagnostic`

Use `/athlete/scan` when:

- Aarav wants form analysis, movement quality review, or a saved technique report.

Use `/athlete/diagnostic` when:

- Aarav says something feels weak, painful, unstable, slow, stiff, or wrong and wants guided movement support.

Scan flow:

1. Aarav opens Video Analysis.
2. Creeda shows the upload or camera analysis workspace.
3. Aarav captures or uploads a movement clip.
4. Creeda runs browser-based movement analysis when supported.
5. Creeda returns score, positives, warnings, correction cues, and next focus.
6. The report is saved.
7. The report becomes a movement-quality signal for future planning.

Diagnostic coach flow:

1. Aarav opens Diagnostic.
2. He describes the movement complaint in plain language.
3. Creeda classifies the complaint.
4. Creeda asks open follow-up questions one at a time.
5. Creeda checks safety guardrails.
6. If symptoms are sharp, worsening, swollen, numb, locked, or unsafe, Creeda blocks movement testing and recommends a qualified professional.
7. If safe to continue, Creeda prescribes one movement screen.
8. Aarav records one guided clip.
9. Creeda analyzes the clip with the existing pose-analysis path.
10. Creeda returns movement guidance, possible contributors, drills, load modifications, retest guidance, and escalation guidance.

Safety language:

- Creeda is movement guidance and decision support.
- It is not a medical diagnosis system.
- It should use language such as "may indicate" or "movement pattern suggests."

### A6. First Plan Calendar And Exercise Library

Routes:

- `/athlete/plans`
- `/athlete/exercises`

Plan calendar steps:

1. Aarav opens `/athlete/plans`.
2. He sees today's executable plan.
3. He sees weekly rhythm, recovery days, missed-session carry-forward, and completed days.
4. He checks average compliance, streak, completed this week, and today's mode.
5. He reviews session history.
6. He reviews exercise progression.
7. He opens coach feedback if available.
8. He either starts today's session or opens the exercise library.

Exercise library steps:

1. Aarav opens `/athlete/exercises`.
2. He sees recommended exercises from today's session.
3. He filters the library by block type, category, equipment, sport, or goal.
4. He uses the library to understand cues, mistakes, substitutions, regressions, progressions, and media.
5. He returns to the session or plan calendar.

## Athlete Journey: Six-Month Timeline

### Month 1: Activation And Baseline

Goal:

- Make Creeda part of the daily training rhythm.

User actions:

1. Completes signup and onboarding.
2. Logs daily check-in most days.
3. Opens dashboard after check-in.
4. Starts guided sessions from `/athlete/sessions/today`.
5. Saves every completed or partial session.
6. Opens `/athlete/plans` once or twice per week.
7. Records one baseline movement scan.
8. Uses `/athlete/tests` only if he wants a measured phone-based signal.
9. Opens `/athlete/review` at the end of each week.

System response:

1. Builds first readiness baseline.
2. Generates executable sessions using sport, position, goal, pain, readiness, and available context.
3. Learns compliance from saved sessions.
4. Creates first exercise history.
5. Creates first movement-quality baseline.
6. Surfaces low-confidence warnings when data is thin.

End of month outcome:

- Aarav trusts the daily recommendation because it explains why he should push, modify, or recover.
- Creeda knows his baseline sport context, adherence, readiness pattern, and first movement constraints.

### Month 2: Consistency And Correction

Goal:

- Move from "try the app" to "use Creeda to protect training consistency."

User actions:

1. Checks in before training.
2. Follows modified sessions on low readiness days instead of ignoring the app.
3. Uses substitutions when equipment or pain changes.
4. Flags pain when discomfort appears.
5. Uses Camera Coach on selected exercises.
6. Opens Progress Proof after two or more saved weeks.
7. Opens weekly review every weekend.
8. Enriches profile when the profile accuracy card asks a useful next question.

System response:

1. Adjusts session mode from train hard to train light, recovery, or rehab when needed.
2. Carries missed work forward without pretending it was completed.
3. Converts video findings into skill priorities and correction drills.
4. Shows confidence level and next best input.
5. Tracks streak and weekly compliance.

End of month outcome:

- Aarav sees that Creeda is not just generating workouts. It is changing training based on readiness, pain, and actual execution.

### Month 3: Performance Pattern Recognition

Goal:

- Identify what reliably improves or hurts performance.

User actions:

1. Uses `/athlete/review` to compare readiness, adherence, load, objective tests, and context.
2. Opens `/athlete/progress` to inspect before-vs-now movement scores.
3. Compares repeated exercise logs.
4. Records a second or third movement scan.
5. Uses `/athlete/diagnostic` if recurring pain or instability appears.
6. Connects integrations from `/athlete/integrations` if available.

System response:

1. Strengthens readiness confidence with more data.
2. Shows bottleneck and biggest win each week.
3. Uses movement scan history to highlight skill trend.
4. Adjusts plan focus based on skill gaps.
5. Shows whether objective tests support or contradict the subjective readiness story.

End of month outcome:

- Aarav understands his own pattern: what training load he tolerates, what soreness predicts, and which movement gaps affect his plan.

### Month 4: Coach-Athlete Feedback Loop

Goal:

- Make coach feedback visible and actionable.

User actions:

1. Ensures coach connection is active through locker code or invite.
2. Continues daily check-ins.
3. Saves sessions honestly, including partial or missed sessions.
4. Reads coach notes inside plan or execution context when available.
5. Records scans for coach review before key training blocks.
6. Uses weekly review to prepare for coach conversation.

System response:

1. Coach sees readiness, compliance, missed sessions, recovery debt, pain reports, and latest session context.
2. Coach can assign or refresh sessions.
3. Coach can add completion feedback.
4. Athlete receives better-aligned next sessions.

End of month outcome:

- Aarav and coach share the same performance truth instead of relying on memory or vague check-ins.

### Month 5: Competition Or Goal Block

Goal:

- Use Creeda for peak, taper, recovery, and competition readiness.

User actions:

1. Keeps daily check-ins short but consistent.
2. Uses plan calendar to understand harder days and recovery days.
3. Runs scans when technique quality matters.
4. Uses diagnostic coach only when something feels wrong.
5. Opens progress proof before competition or review conversations.
6. Uses nutrition safety if supplement, dietary restriction, or fueling risk is relevant.

System response:

1. Adjusts goal phase where event or goal data exists.
2. Reduces load when recovery debt or pain risk rises.
3. Shows why confidence is high, medium, or low.
4. Maintains proof of consistency, movement quality, and exercise progression.

End of month outcome:

- Aarav can explain why he is pushing, tapering, modifying, or recovering.

### Month 6: Retention, Proof, And Next Cycle

Goal:

- Make six months of use visible and valuable.

User actions:

1. Opens `/athlete/progress`.
2. Reviews compliance, streak, training days, best movement score, exercise progression, and scan history.
3. Opens `/athlete/review` for the latest weekly summary.
4. Updates profile accuracy questions.
5. Reviews settings, legal, connected sources, and coach connection.
6. Chooses next six-month goal:
   - Performance enhancement
   - Competition prep
   - Injury prevention
   - Return from injury
   - Recovery efficiency

System response:

1. Shows before, now, and what changed.
2. Shows which habits are now reliable.
3. Shows what still reduces confidence.
4. Uses the next goal to shape the next training block.

Six-month athlete success moment:

- Aarav can say: "Creeda helped me know when to push, when to back off, what to fix, and whether I am actually improving."

## Persona 2: Individual Journey

### Persona

Name: Meera

Profile:

- 31-year-old working professional
- Wants fat loss, general fitness, better energy, or a return to sport
- Has inconsistent schedule, desk-heavy work, and moderate stress
- Wants simple daily guidance without feeling like an athlete

Primary six-month goal:

- Build a sustainable fitness rhythm, improve body confidence, and turn small daily signals into better movement decisions.

Core question Meera asks Creeda every day:

- "What is the right amount for me today?"

## Individual Journey: First Session To First Dashboard

### I0. Signup

Route: `/signup`

Step-by-step:

1. Meera opens `/signup`.
2. She chooses Individual.
3. She enters full name, email, and password.
4. She accepts required legal acknowledgements.
5. She optionally accepts product updates.
6. She submits.
7. Creeda sends her to verification or directly to `/fitstart`.

### I1. FitStart Onboarding

Route: `/fitstart`

Creeda promise on screen:

- "Start simple. Improve accuracy later."
- The app asks only what changes the first plan.

Step-by-step:

1. Quick Snapshot
   - Meera enters age.
   - Meera selects gender.
   - Meera enters height and weight.

2. Day Shape
   - Meera selects occupation or normal day type:
     - Desk or study heavy
     - Mixed day
     - On feet most of the day
     - Shift work
   - Meera selects activity level:
     - Mostly seated
     - Some movement
     - Active most days

3. Main Goal
   - Meera selects primary goal:
     - Fat loss
     - Muscle gain
     - Endurance
     - General fitness
     - Sport-specific
   - Meera selects time horizon:
     - 4 weeks
     - 8 weeks
     - 12 weeks
     - Long term
   - Meera selects intensity preference:
     - Low
     - Moderate
     - High

4. What You Have
   - Meera selects equipment she can reliably use:
     - Bodyweight
     - Home weights
     - Gym access
     - Cardio machine
     - Pool

5. Any Limitation
   - Meera answers whether pain, injury, or movement limitation exists.
   - If yes, she selects the main limitation area.

6. Creeda saves FitStart profile.
7. Meera opens `/individual/dashboard`.

### I2. First Individual Dashboard

Route: `/individual/dashboard`

What Meera sees:

- Today at a glance
- Start Today's Session
- Plan Calendar
- Exercise Library
- Daily Check-In
- Weekly Review
- Objective Tests
- Today's plan
- Movement prescription
- Nutrition prescription
- Why this plan exists
- Trust and confidence summary
- Profile accuracy card

Step-by-step:

1. Meera reads today's readiness and plan recommendation.
2. She reviews the simple reason behind the plan.
3. She opens Start Today's Session if she has time.
4. If not ready to train, she opens Daily Check-In first.
5. She checks nutrition guidance if relevant.
6. She opens Exercise Library if she wants to understand a movement before starting.

### I3. First Daily Pulse

Route: `/individual/logging`

Purpose:

- Log in roughly 10 seconds.

Step-by-step:

1. Meera opens Daily Pulse.
2. She answers energy.
3. She answers stress.
4. She answers body feel.
5. If energy is low or stress is high, Creeda asks sleep quality.
6. If she turns on "Add training details too", Creeda asks:
   - Did you train today?
   - How many minutes?
   - How hard did it feel?
7. Optional hydration may be captured for tighter recovery guidance.
8. Meera taps Finish.
9. Creeda updates daily readiness and returns her to `/individual/dashboard`.

### I4. First Individual Guided Session

Route: `/individual/sessions/today`

Step-by-step:

1. Meera opens today's session.
2. She sees a guided plan based on FitStart, readiness, equipment, limitation, and goal.
3. She reviews:
   - Expected duration
   - Session mode
   - Focus
   - Reasons
   - Warnings
   - Exercise blocks
4. She starts session.
5. She follows exercise media, instructions, cues, and mistakes.
6. She logs actual reps, duration, load, sets, substitutions, and notes as needed.
7. She flags pain or discomfort if needed.
8. She saves session.
9. Creeda updates history, compliance, plan calendar, and exercise progression.

### I5. First Plan And Library Use

Routes:

- `/individual/plans`
- `/individual/exercises`

Step-by-step:

1. Meera opens Plan Calendar.
2. She sees today's executable plan, weekly rhythm, recovery days, missed-session carry-forward, history, and exercise progression.
3. She opens the Exercise Library.
4. She filters by goal, equipment, block type, or difficulty.
5. She uses substitutions if a movement is uncomfortable or equipment is unavailable.

### I6. First Movement Analysis Or Diagnostic

Routes:

- `/individual/scan`
- `/individual/diagnostic`

Step-by-step:

1. Meera opens Movement Analysis if she wants technique feedback.
2. She opens Diagnostic if something feels stiff, weak, painful, unstable, or wrong.
3. Creeda asks plain-language intake and safety follow-ups.
4. If safe, Creeda prescribes one movement screen.
5. Meera records one guided clip.
6. Creeda returns practical movement guidance, not medical diagnosis.
7. Meera uses the action plan to adjust training or recovery.

## Individual Journey: Six-Month Timeline

### Month 1: FitStart And Habit Formation

Goal:

- Make fitness feel doable.

User actions:

1. Completes signup and FitStart.
2. Checks dashboard daily or near daily.
3. Logs Daily Pulse most days.
4. Completes two to four guided sessions per week depending on plan.
5. Uses Exercise Library for unfamiliar movements.
6. Opens Plan Calendar to see the week.

System response:

1. Builds a simple readiness and adherence baseline.
2. Generates sessions that match equipment, activity level, limitation, and intensity preference.
3. Avoids overwhelming the user with athlete-style complexity.
4. Uses missed sessions to adjust calendar truthfully.

End of month outcome:

- Meera understands that Creeda is not judging her. It is helping her choose the right dose for real life.

### Month 2: Routine Stability

Goal:

- Keep going without all-or-nothing failure.

User actions:

1. Uses daily pulse on busy days.
2. Chooses shorter sessions when readiness is low.
3. Saves partial sessions instead of abandoning the day.
4. Uses substitutions.
5. Opens weekly review to see consistency.
6. Answers one or two profile enrichment questions.

System response:

1. Learns realistic compliance.
2. Adjusts session duration and difficulty.
3. Maintains weekly rhythm.
4. Uses profile confidence to ask only useful next questions.

End of month outcome:

- Meera has a realistic pattern, not a perfect streak that collapses.

### Month 3: Measurable Progress

Goal:

- Show proof without needing gym-athlete metrics.

User actions:

1. Opens `/individual/review`.
2. Reviews plan adherence, readiness, and weekly training.
3. Uses objective test if she wants a simple measured signal.
4. Records movement analysis if she wants form confidence.
5. Opens `/individual/plans` to compare recent sessions.

System response:

1. Shows whether energy, stress, soreness, and training minutes are improving.
2. Shows which habits are working.
3. Uses session logs to adjust future intensity.
4. Shows movement or objective testing as optional confidence boosters.

End of month outcome:

- Meera sees progress as consistency, energy, movement confidence, and completed sessions, not only weight.

### Month 4: Lifestyle Integration

Goal:

- Fit training around real schedule, stress, and recovery.

User actions:

1. Logs stress honestly.
2. Uses low-readiness days for mobility or recovery.
3. Opens nutrition safety when dietary constraints or supplement concerns matter.
4. Uses diagnostic if recurring pain appears.
5. Updates equipment or goal if life changes.

System response:

1. Reduces plan aggression during high stress or poor sleep periods.
2. Keeps missed-session carry-forward honest.
3. Suggests recovery or lighter movement when needed.
4. Maintains explainability so the plan feels fair.

End of month outcome:

- Creeda becomes a practical life-aware coach, not a rigid workout calendar.

### Month 5: Confidence And Autonomy

Goal:

- User becomes more self-aware.

User actions:

1. Opens dashboard for quick daily decision.
2. Uses Exercise Library more independently.
3. Chooses substitutions confidently.
4. Reviews weekly plan and adjusts timing.
5. Checks movement analysis when trying harder exercises.

System response:

1. Keeps recommending the next right dose.
2. Shows confidence level and why.
3. Uses repeated exercise logs to show progression.
4. Encourages small accuracy improvements.

End of month outcome:

- Meera can train without guessing and without feeling dependent on a human trainer every day.

### Month 6: Sustainable Identity

Goal:

- Turn six months into a durable next cycle.

User actions:

1. Opens Plan Calendar and Weekly Review.
2. Looks at total completed sessions, streaks, compliance, and training rhythm.
3. Updates goal:
   - Keep going
   - Fat loss
   - Strength
   - Endurance
   - Return to sport
4. Reviews limitations and movement status.
5. Uses the next plan block as the continuation point.

System response:

1. Summarizes what changed.
2. Identifies the most reliable habit.
3. Identifies the biggest limiter.
4. Adjusts next block around the updated goal.

Six-month individual success moment:

- Meera can say: "Creeda helped me turn inconsistent effort into a repeatable health routine."

## Persona 3: Coach Journey

### Persona

Name: Coach Anil

Profile:

- Cricket academy or club coach
- Manages 15 to 30 athletes
- Wants to know who is ready, who is at risk, who needs follow-up, and what should change today
- Needs practical roster decisions, not decorative dashboards

Primary six-month goal:

- Turn a squad into a decisionable, auditable performance system.

Core question Coach Anil asks Creeda every day:

- "Who needs my attention, and what should I do about it?"

## Coach Journey: First Session To First Dashboard

### C0. Signup

Route: `/signup`

Step-by-step:

1. Coach Anil opens `/signup`.
2. He chooses Coach.
3. He enters full name, email, and password.
4. He accepts required legal acknowledgements.
5. He optionally accepts product updates.
6. He submits.
7. Creeda sends him to verification or directly to `/coach/onboarding`.

### C1. Coach Fast Start Onboarding

Route: `/coach/onboarding`

Creeda promise on screen:

- "Build the dashboard first, enrich the structure later."

Step-by-step:

1. Coach Identity
   - Coach enters professional name.
   - Coach chooses handle.
   - Coach enters WhatsApp or mobile number.

2. Squad Setup
   - Coach enters team name.
   - Coach selects sport coached.
   - Coach selects coaching level:
     - Private Pro Coach
     - Academy / Club Coach
     - School / University Coach

3. Team Structure
   - Coach selects how he coaches:
     - Single team
     - Multiple teams / age groups
     - Individual athletes
   - Coach selects number of active athletes:
     - 1-5
     - 6-15
     - 16-30
     - 30+
   - If multiple teams, Coach adds team structure detail later or when prompted.

4. Main Focus
   - Coach selects one priority:
     - Injury Risk Reduction
     - Peak Performance Optimization
     - Player Compliance
     - Scouting / Talent ID

5. System saves coach profile.
6. Coach opens `/coach/dashboard`.

### C2. First Coach Dashboard

Route: `/coach/dashboard`

What Coach sees:

- CoachINTEL command center
- Squad decision HUD
- Command queue
- Athletes needing coaching decision
- Average readiness
- Average compliance
- Intervention queue
- Low-data athletes
- Recent comments
- Squad technical repository
- Locker code
- Weekly operating view
- Academy layer
- Profile accuracy card

Step-by-step:

1. Coach reads the top command center.
2. Coach checks the Command Queue.
3. If no athletes are linked, Coach uses the locker code card.
4. Coach copies the permanent access code.
5. Coach sends invite link or WhatsApp invite.
6. Athletes join through `/join/[lockerCode]` or `/signup?role=athlete&coach=[lockerCode]`.
7. Coach returns to dashboard as athletes connect.

### C3. First Athlete Connection

Routes:

- `/coach/dashboard`
- `/join/[lockerCode]`

Connection paths:

1. Coach shares permanent access code.
2. Athlete enters code during signup or onboarding.
3. Or Coach shares invite link.
4. Athlete opens join page, sees team name and coach, and taps Join Squad.
5. Athlete signs up as athlete with coach code prefilled.
6. Coach can approve pending requests if a request approval path is involved.
7. Athlete appears in active squad once linked.

Coach management actions:

1. Copy code.
2. Regenerate or fetch locker code.
3. Send WhatsApp invite.
4. Copy invite link.
5. Enter athlete code to connect.
6. Approve or deny pending requests.
7. Archive, restore, or remove roster athletes where allowed.

### C4. First Operational Review

Route: `/coach/dashboard`

Step-by-step:

1. Coach scans Active Alerts.
2. Coach checks team readiness.
3. Coach sees ready, caution, and critical counts.
4. Coach checks systemic limiters.
5. Coach reads squad trends.
6. Coach opens athlete analytics when a row requires deeper review.
7. Coach searches athlete, team, or reason in the command center.

### C5. First Execution Board Use

Route: `/coach/execution`

Purpose:

- Make coach operations action-oriented.

Step-by-step:

1. Coach opens Execution Board from dashboard or nav.
2. Coach sees linked athletes.
3. For each athlete, Coach sees:
   - Name
   - Sport and position
   - Latest session title
   - Latest mode
   - Latest status
   - Compliance
   - Focus
   - Top exercises
4. Coach reviews compliance.
5. Coach chooses an assignment mode:
   - Use system-recommended mode
   - Train hard
   - Train light
   - Recovery
   - Rehab
6. Coach writes assignment note.
7. Coach taps Assign today's session.
8. Coach writes completion review feedback after athlete logs.
9. Coach taps Save coach feedback.
10. Athlete's session and coach view update.

### C6. First Video Report Review

Routes:

- `/coach/reports`
- `/coach/reports/[id]`

Step-by-step:

1. Coach opens Reports.
2. If no scans exist, Coach sees empty state explaining athlete scans will appear with score, faults, and correction plans.
3. Once athletes upload scans, Coach sees report cards by athlete.
4. Coach opens a report.
5. Coach reviews:
   - Movement score
   - Status
   - Corrections
   - Positives
   - Frame count
   - Recommendations
6. Coach uses report to adjust drill emphasis, reduce chaos, or request rescan.

### C7. First Weekly Coach Review

Routes:

- `/coach/review`
- `/coach/analytics`

Step-by-step:

1. Coach opens Weekly Review.
2. Coach reviews squad-level readiness, compliance, missed sessions, and intervention needs.
3. Coach opens Analytics for a specific athlete.
4. Coach compares trend, readiness, risk, compliance, and recent scan context.
5. Coach uses this to plan the next microcycle.

## Coach Journey: Six-Month Timeline

### Month 1: Setup And Roster Activation

Goal:

- Get the squad into Creeda and create the first operational truth.

Coach actions:

1. Completes signup and onboarding.
2. Copies locker code.
3. Sends code or invite link to athletes.
4. Tracks who has joined.
5. Approves pending requests if required.
6. Opens dashboard daily to see whether data is arriving.
7. Uses low-data athlete list to follow up with athletes who have not logged.

Athlete actions required:

1. Sign up.
2. Complete athlete onboarding.
3. Connect via code.
4. Start daily check-ins.
5. Save sessions.

System response:

1. Builds active squad.
2. Shows team size.
3. Separates ready, caution, critical, no-data, and low-data states.
4. Starts command queue.

End of month outcome:

- Coach has a roster and a basic data habit forming across athletes.

### Month 2: Daily Coaching Decisions

Goal:

- Use Creeda to decide who needs modification.

Coach actions:

1. Opens dashboard before training.
2. Checks command queue.
3. Reviews athletes with low readiness, missed sessions, pain flags, or recovery debt.
4. Opens Execution Board.
5. Assigns session mode to selected athletes.
6. Writes brief assignment notes.
7. Sends reminders to low-data athletes outside the app if needed.

System response:

1. Prioritizes athletes by readiness, compliance, missed sessions, recovery debt, and pain reports.
2. Gives average readiness and compliance.
3. Shows latest session context.
4. Enables assignment and feedback loop.

End of month outcome:

- Coach stops treating every athlete the same on the same day.

### Month 3: Technique And Reports

Goal:

- Bring video and movement quality into coaching decisions.

Coach actions:

1. Instructs selected athletes to record scans.
2. Opens `/coach/reports`.
3. Reviews video reports.
4. Uses corrections to guide technical drills.
5. Requests rescan when movement should have changed.
6. Links reports to weekly review discussions.

System response:

1. Aggregates athlete scans into coach report list.
2. Shows movement scores, warnings, positives, and correction plans.
3. Keeps movement reports tied to athlete profile and planning context.

End of month outcome:

- Coach can explain technical priorities with evidence from athlete scans.

### Month 4: Intervention Discipline

Goal:

- Make interventions consistent and auditable.

Coach actions:

1. Reviews intervention queue daily.
2. Assigns train-light, recovery, or rehab modes for at-risk athletes.
3. Writes feedback after completion.
4. Uses analytics to inspect recurring low readiness or compliance.
5. Uses Academy Ops for teams, junior athletes, and operational structure.

System response:

1. Maintains recent comments.
2. Tracks completion feedback.
3. Shows low-data athletes.
4. Keeps the coach action loop visible.

End of month outcome:

- Coach actions are visible, repeatable, and tied to athlete signals.

### Month 5: Squad Planning

Goal:

- Move from daily triage to weekly and monthly planning.

Coach actions:

1. Opens Weekly Review.
2. Opens Analytics.
3. Reviews trends across squad readiness and compliance.
4. Identifies systemic limiters.
5. Adjusts training emphasis for the next week.
6. Uses reports to guide technique blocks.
7. Checks whether low-data athletes need education, reminders, or reduced automation.

System response:

1. Shows weekly operating view.
2. Shows squad trend and operational compliance.
3. Shows technical repository.
4. Helps Coach prioritize limited attention.

End of month outcome:

- Coach uses Creeda as a planning assistant, not just an athlete list.

### Month 6: Program Review And Next Cycle

Goal:

- Use six months of data to improve the program.

Coach actions:

1. Reviews active roster.
2. Reviews average readiness and compliance.
3. Reviews athlete readiness distribution.
4. Reviews repeated intervention categories.
5. Reviews scan report improvements.
6. Reviews which athletes have low data and why.
7. Archives inactive athletes.
8. Refreshes squad focus for the next block:
   - Injury risk reduction
   - Peak performance optimization
   - Player compliance
   - Scouting / talent ID
9. Sends next-block expectations to athletes.

System response:

1. Provides roster truth.
2. Shows readiness and compliance patterns.
3. Keeps athlete-level evidence available.
4. Supports the next six-month operating cycle.

Six-month coach success moment:

- Coach Anil can say: "Creeda tells me who needs attention, what changed, what I assigned, and whether the squad is actually responding."

## Cross-Role Six-Month Rhythm

The product should create a repeated rhythm that users can remember.

### Daily

Athlete:

1. Open dashboard.
2. Complete check-in.
3. Read today's recommendation.
4. Execute session or recovery.
5. Save session honestly.
6. Use scan or diagnostic only when needed.

Individual:

1. Open dashboard.
2. Complete Daily Pulse.
3. Start today's session or choose lighter movement.
4. Save session or log reality.
5. Use library for confidence.

Coach:

1. Open dashboard.
2. Check command queue.
3. Review low-data and at-risk athletes.
4. Assign or modify sessions.
5. Add feedback where needed.

### Weekly

Athlete:

1. Open Weekly Review.
2. Understand readiness trend, adherence, load, and bottleneck.
3. Open Plan Calendar.
4. Adjust next week with confidence.

Individual:

1. Open Weekly Review.
2. Check consistency and body response.
3. Use Plan Calendar to keep schedule realistic.
4. Update goal or constraints if needed.

Coach:

1. Open Weekly Review.
2. Open Analytics.
3. Review squad trend.
4. Plan the next training week.
5. Use reports and execution history in decisions.

### Monthly

Athlete:

1. Open Progress Proof.
2. Review compliance, streak, training days, movement best, and exercise progression.
3. Record a fresh scan if needed.
4. Update goal or profile accuracy.

Individual:

1. Review completed sessions and weekly rhythm.
2. Adjust intensity preference or goal.
3. Use movement analysis if confidence is low.

Coach:

1. Review roster quality.
2. Review readiness distribution.
3. Review intervention themes.
4. Clean roster.
5. Set squad focus for the next month.

## End-To-End Journey State Machine

### Athlete State Machine

1. Visitor
2. Signup started
3. Signup completed
4. Email verification pending or complete
5. Athlete onboarding started
6. Athlete onboarding complete
7. Dashboard active
8. Daily check-in complete
9. Today's session generated
10. Session in progress
11. Session saved
12. Plan calendar updated
13. Optional scan or diagnostic complete
14. Weekly review complete
15. Progress proof reviewed
16. Next block selected

### Individual State Machine

1. Visitor
2. Signup started
3. Signup completed
4. Email verification pending or complete
5. FitStart started
6. FitStart complete
7. Individual dashboard active
8. Daily Pulse complete
9. Today's personal session generated
10. Session saved
11. Plan calendar updated
12. Optional movement analysis complete
13. Weekly review complete
14. Goal refreshed

### Coach State Machine

1. Visitor
2. Signup started
3. Signup completed
4. Email verification pending or complete
5. Coach onboarding started
6. Coach onboarding complete
7. Coach dashboard active
8. Locker code shared
9. Athlete connection pending
10. Athlete linked
11. Command queue active
12. Execution assignment sent
13. Athlete completion reviewed
14. Coach feedback saved
15. Report reviewed
16. Weekly planning complete
17. Next squad block selected

## Product Requirements Implied By These Journeys

### Must Be True For Athlete Journey To Work

1. Signup and email verification must reliably route to athlete onboarding.
2. Athlete onboarding must save profile and mark onboarding complete.
3. Dashboard must always show one clear primary action.
4. Daily check-in must stay under 10 seconds by default.
5. Today's session must generate even with sparse data.
6. Session save must persist logs, pain flags, notes, and compliance.
7. Plan calendar must reflect completed, missed, planned, and carry-forward states.
8. Movement scan output must feed skill intelligence and future plans.
9. Diagnostic flow must remain safety-first and non-medical.
10. Progress proof must use saved data, not fake metrics.

### Must Be True For Individual Journey To Work

1. Signup must route individual users to FitStart.
2. FitStart must stay short and useful.
3. Dashboard must avoid athlete-only language.
4. Daily Pulse must be three signals by default.
5. Personal session generation must work with home, gym, and bodyweight contexts.
6. Exercise library must support beginner confidence.
7. Plan calendar must tolerate missed days without shame.
8. Nutrition and movement guidance must be practical and safe.
9. Weekly review must frame progress as consistency and recovery, not only intensity.

### Must Be True For Coach Journey To Work

1. Coach onboarding must create a usable squad workspace quickly.
2. Locker code and invite link must be reliable.
3. Coach must see low-data states honestly.
4. Roster must separate active, archived, pending, and unlinked athletes.
5. Command queue must prioritize action, not just display metrics.
6. Execution board must allow assignment and feedback.
7. Coach reports must only show real athlete scans.
8. Weekly review and analytics must help plan the next week.
9. Coach actions should leave an auditable trail where applicable.

## Key First-Week Experience

### Athlete First Week

Day 0:

1. Signup.
2. Onboarding.
3. Dashboard.
4. First check-in.
5. First guided session.

Day 1:

1. Check in.
2. See if Creeda changes session based on soreness.
3. Complete or modify session.

Day 2:

1. Open Plan Calendar.
2. See weekly rhythm.
3. Use Exercise Library for unfamiliar movement.

Day 3:

1. Record first scan or skip if not needed.
2. Understand correction cues.

Day 4:

1. Check in.
2. Save session with honest compliance.

Day 5:

1. Review plan carry-forward or recovery day.

Day 6:

1. Open Weekly Review.
2. See first readiness trend and bottleneck.

Day 7:

1. Start next week with better confidence.

### Individual First Week

Day 0:

1. Signup.
2. FitStart.
3. Dashboard.
4. Daily Pulse.
5. First personal session.

Day 1:

1. Daily Pulse.
2. Short session or recovery depending on readiness.

Day 2:

1. Exercise Library for substitutions.

Day 3:

1. Plan Calendar.
2. Adjust expectation around real schedule.

Day 4:

1. Daily Pulse with training details if session happened.

Day 5:

1. Movement analysis only if unsure about form.

Day 6:

1. Weekly Review.

Day 7:

1. Continue with a realistic next week.

### Coach First Week

Day 0:

1. Signup.
2. Coach onboarding.
3. Dashboard.
4. Copy locker code.
5. Share invite.

Day 1:

1. Check joined athletes.
2. Follow up with low-data athletes.

Day 2:

1. Open command queue.
2. Review early readiness.

Day 3:

1. Open Execution Board.
2. Assign sessions to athletes with enough data.

Day 4:

1. Review completion.
2. Save feedback.

Day 5:

1. Ask selected athletes to record scans.

Day 6:

1. Open Reports if scans exist.
2. Use corrections in training plan.

Day 7:

1. Open Weekly Review and plan next week.

## Six-Month End State

At the end of six months, each user role should have a clear answer to a different question.

Athlete:

- Did I train better, recover smarter, move better, and stay more available?

Individual:

- Did I build a sustainable health and fitness rhythm that fits my real life?

Coach:

- Did I make better squad decisions with evidence, consistency, and follow-through?

Creeda's job across all three journeys is to make those answers visible through saved actions, not decorative summaries.
