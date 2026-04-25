# Movement Test Config Guide

Movement tests live in `src/lib/diagnostics/config.ts` as `MOVEMENT_TESTS`.

Open-ended follow-up prompts also live in this file as `FOLLOW_UP_QUESTIONS`. V1 prompts should use `type: "open_text"` so the coach can parse the user's words instead of forcing closed answers.

Each test definition must include:

- `id`
- `displayName`
- `bodyRegion`
- `requiredView`
- `instructions`
- `cameraSetup`
- `repCount` or `durationSeconds`
- `contraindicationHints`
- `compatibleComplaintBuckets`
- `expectedAnalysisMetrics`
- `scoringLogicReferences`
- optional `passFailLogic`

## V1 movement screens

- `bodyweight_squat`
- `split_squat`
- `forward_lunge`
- `single_leg_balance_hold`
- `step_down`
- `overhead_reach`
- `wall_slide`
- `push_up_pattern_check`
- `vertical_jump`
- `pogo_hops`
- `basic_hip_hinge`
- `toe_touch_hamstring_hinge`

## Camera rules

- Use one angle only in V1.
- Request back camera by default.
- Use front view for symmetry, knee tracking, stance, and balance.
- Use side view for squat depth, hinge shape, trunk angle, and landing mechanics.

## Adding a new test

1. Add the test definition to `MOVEMENT_TESTS`.
2. Add selection logic in `src/lib/diagnostics/prescription.ts`.
3. Add expected metric mapping in `src/lib/diagnostics/adapter.ts` if the test needs new metric behavior.
4. Add interpretation/action-plan rules only when the metric changes user-facing guidance.
5. Add a unit test for the prescription path.

## Adding or editing follow-up prompts

Keep prompts short and conversational. The backend currently expects:

- `movement_story`: where it is felt, sensation, and side.
- `context_story`: movement trigger, sport or training context, load, speed, duration, and fatigue.
- `safety_story`: swelling, locking, numbness, sharp or worsening pain, and trouble bearing weight.

Do not add UI-only conditionals for question logic. Update `src/lib/diagnostics/followup.ts` and classifier/guardrail tests when prompt keys change.
