# Interpretation Rules Guide

Interpretation rules live in:

- `src/lib/diagnostics/adapter.ts`
- `src/lib/diagnostics/interpretation.ts`
- `src/lib/diagnostics/action-plan.ts`

## Rule principles

- Never output a definitive medical diagnosis.
- Use movement language such as "movement pattern suggests", "may indicate", and "possible contributor".
- Prefer simple contributor statements over dense biomechanics.
- Keep action plans small enough to execute.

## Current examples

Low `kneeTrackingScore`:

- Contributor: knee tracking control
- Example language: the knee may be drifting inward or losing its line over the foot
- Drills: banded knee-control squats, assisted split squats

Low `ankleMobilityIndicator` or `depthScore`:

- Contributor: range or ankle-mobility constraint
- Drills: ankle dorsiflexion rocks

Low `hipControlScore` or `balanceScore`:

- Contributor: single-side control
- Drills: single-leg holds, glute bridge

Low `trunkControlScore` or `hingePatternScore`:

- Contributor: trunk and hinge control
- Drills: hip-hinge wall drill, dead bug

Low `shoulderMobilityScore`:

- Contributor: overhead shoulder range
- Drills: wall slides, thoracic extension breathing

Low `landingControlScore` or `explosivenessIndicator`:

- Contributor: landing or explosive pattern quality
- Drills: pogo mechanics drill, drop squat landing stick

## Extending rules

Add metric mapping in the adapter first. Then add one contributor rule and one action-plan rule. Avoid adding UI conditionals for new diagnostic logic.
