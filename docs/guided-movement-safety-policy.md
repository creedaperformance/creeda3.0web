# Guided Movement Diagnostic Safety Policy

The diagnostic coach is a movement, performance, and recovery guidance system. It is not a medical diagnosis system.

## Required language

Use careful wording:

- "may indicate"
- "possible contributor"
- "movement pattern suggests"
- "consider seeing a clinician if pain is sharp, worsening, persistent, or accompanied by swelling"

Do not use:

- "you have"
- "diagnosed"
- "injury confirmed"
- "tear"
- "impingement confirmed"
- definitive pathology claims

## Stop-test triggers

If any of the following are reported, show prominent stop-test guidance:

- severe pain
- swelling
- locking
- numbness
- inability to bear weight
- sharp pain getting worse

Required message:

> This tool cannot assess serious injury. Please stop the test and consult a qualified medical professional.

## Where guardrails run

- Intake: `classifyComplaint` and `evaluateDiagnosticSafety`
- Follow-up flow: open-ended `safety_story` answers with negation-aware red-flag parsing
- Test prescription: safety notes travel with the prescribed movement screen
- Results screen: caution/professional escalation section always appears

## V1 behavior

V1 blocks testing when affirmative red flags or high severity are detected. It should not block for negated language such as "no swelling" or "no numbness." For lower-severity pain language, it allows a screen only with pain-aware cautions and instructions to stop if symptoms worsen.
