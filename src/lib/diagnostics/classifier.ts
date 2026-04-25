import type {
  BodyRegion,
  ComplaintBucket,
  ComplaintClassification,
  DiagnosticFollowUpAnswer,
} from '@/lib/diagnostics/types'

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term))
}

function isNegatedOccurrence(text: string, index: number, term: string) {
  const before = text.slice(Math.max(0, index - 80), index).trim()
  const after = text.slice(index + term.length, index + term.length + 24).trim()

  return (
    /\b(no|not|none|without|denies|deny|never|do not|don t|does not|doesn t|free of)\b(?:\s+\w+){0,8}$/.test(before) ||
    /^(free|free movement|free today)\b/.test(after)
  )
}

function hasAffirmedAny(text: string, terms: string[]) {
  return terms.some((term) => {
    const normalizedTerm = normalize(term)
    let index = text.indexOf(normalizedTerm)

    while (index >= 0) {
      if (!isNegatedOccurrence(text, index, normalizedTerm)) return true
      index = text.indexOf(normalizedTerm, index + normalizedTerm.length)
    }

    return false
  })
}

function parseSeverityFromText(value: string) {
  const raw = value.toLowerCase()
  const text = normalize(value)
  const match =
    raw.match(/\b([0-9]|10)\s*(?:\/\s*10|out\s+of\s+10)\b/) ||
    text.match(/\b(?:pain|severity|intensity|level)\s*(?:is|feels|around|about|at)?\s*([0-9]|10)\b/)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? Math.max(0, Math.min(10, parsed)) : null
}

function severityFlag(severity: number | null, urgentSignal: boolean) {
  if (urgentSignal || (severity !== null && severity >= 8)) return 'urgent' as const
  if (severity !== null && severity >= 6) return 'high' as const
  if (severity !== null && severity >= 3) return 'moderate' as const
  if (severity !== null && severity > 0) return 'mild' as const
  return 'none' as const
}

function detectBodyRegion(text: string): BodyRegion {
  if (includesAny(text, ['ankle', 'achilles', 'foot', 'feet'])) return 'ankle'
  if (includesAny(text, ['knee', 'knees', 'patella'])) return 'knee'
  if (includesAny(text, ['hip', 'hips', 'groin'])) return 'hip'
  if (includesAny(text, ['hamstring', 'hamstrings'])) return 'hamstring'
  if (includesAny(text, ['calf', 'calves'])) return 'calf'
  if (includesAny(text, ['back', 'lower back', 'lumbar'])) return 'lower_back'
  if (includesAny(text, ['core', 'trunk', 'abs'])) return 'trunk'
  if (includesAny(text, ['shoulder', 'shoulders', 'overhead'])) return 'shoulder'
  if (includesAny(text, ['elbow'])) return 'elbow'
  if (includesAny(text, ['wrist'])) return 'wrist'
  if (includesAny(text, ['neck'])) return 'neck'
  if (includesAny(text, ['tired', 'fatigue', 'exhausted', 'slow', 'unstable', 'weak'])) return 'whole_body'
  return 'unknown'
}

function detectActivity(text: string) {
  if (includesAny(text, ['squat', 'squats'])) return 'squat'
  if (includesAny(text, ['run', 'running', 'sprint', 'sprinting'])) return 'run'
  if (includesAny(text, ['jump', 'jumping', 'landing', 'hop', 'hops'])) return 'jump'
  if (includesAny(text, ['overhead', 'throw', 'serve', 'reach'])) return 'overhead'
  if (includesAny(text, ['lift', 'deadlift', 'hinge', 'bend', 'row'])) return 'hinge'
  if (includesAny(text, ['push up', 'pushup', 'press'])) return 'push'
  return null
}

function detectSide(text: string): ComplaintClassification['side'] {
  if (includesAny(text, ['left'])) return 'left'
  if (includesAny(text, ['right'])) return 'right'
  if (includesAny(text, ['both', 'bilateral'])) return 'both'
  if (includesAny(text, ['center', 'middle'])) return 'center'
  return 'unknown'
}

function detectSportContext(text: string) {
  if (includesAny(text, ['gym', 'lifting', 'weightlifting', 'strength training'])) return 'gym'
  if (includesAny(text, ['run', 'running', 'sprint', 'sprinting'])) return 'running'
  if (includesAny(text, ['cricket', 'bowling', 'batting'])) return 'cricket'
  if (includesAny(text, ['football', 'soccer'])) return 'football'
  if (includesAny(text, ['basketball', 'hoop'])) return 'basketball'
  if (includesAny(text, ['tennis', 'badminton', 'serve'])) return 'racquet sport'
  if (includesAny(text, ['general fitness', 'fitness'])) return 'general fitness'
  return null
}

function detectPrimaryBucket(text: string, bodyRegion: BodyRegion, activityTrigger: string | null, painFlag: boolean): ComplaintBucket {
  const lowerBody = ['ankle', 'knee', 'hip', 'hamstring', 'calf', 'lower_back'].includes(bodyRegion)
  const upperBody = ['shoulder', 'elbow', 'wrist', 'neck'].includes(bodyRegion)

  if (painFlag && lowerBody) return 'lower_body_pain_with_movement'
  if (painFlag && upperBody) return 'upper_body_pain_with_movement'
  if (includesAny(text, ['unstable', 'wobble', 'giving way', 'balance', 'falling'])) return 'balance_and_control'
  if (includesAny(text, ['one side', 'left', 'right', 'uneven', 'asymmetry', 'imbalanced'])) return 'asymmetry'
  if (includesAny(text, ['slow', 'explosive', 'power', 'jump', 'cannot jump', 'speed'])) return 'speed_and_explosiveness'
  if (includesAny(text, ['tired', 'fatigue', 'exhausted', 'gassed', 'recovery'])) return 'fatigue_and_recovery'
  if (includesAny(text, ['tight', 'stiff', 'mobility', 'range', 'cannot reach'])) {
    return upperBody ? 'upper_body_mobility' : 'lower_body_mobility'
  }
  if (includesAny(text, ['form', 'technique', 'breakdown', 'collapse', 'tracking']) || activityTrigger) return 'technique_breakdown'
  if (lowerBody) return 'lower_body_stability'
  if (upperBody) return 'upper_body_mobility'
  return 'unknown_general'
}

function secondaryBucketFor(primaryBucket: ComplaintBucket, text: string, painFlag: boolean): ComplaintBucket | null {
  if (primaryBucket !== 'balance_and_control' && includesAny(text, ['unstable', 'balance', 'wobble'])) return 'balance_and_control'
  if (primaryBucket !== 'asymmetry' && includesAny(text, ['one side', 'left', 'right', 'uneven'])) return 'asymmetry'
  if (primaryBucket !== 'fatigue_and_recovery' && includesAny(text, ['tired', 'fatigue', 'recovery'])) return 'fatigue_and_recovery'
  if (primaryBucket !== 'technique_breakdown' && includesAny(text, ['form', 'technique', 'collapse', 'tracking'])) return 'technique_breakdown'
  if (painFlag && primaryBucket !== 'lower_body_pain_with_movement') return 'lower_body_pain_with_movement'
  return null
}

export function classifyComplaint(input: {
  complaintText: string
  sportContext?: string | null
  userContext?: Record<string, unknown> | null
}): ComplaintClassification {
  const rawText = input.complaintText
  const text = normalize(input.complaintText)
  const painFlag = hasAffirmedAny(text, [
    'pain',
    'hurt',
    'hurts',
    'ache',
    'aching',
    'uncomfortable',
    'sharp',
    'sore',
    'swelling',
  ])
  const urgentSignal = hasAffirmedAny(text, ['swelling', 'locking', 'numb', 'numbness', 'sharp', 'cannot bear', 'can t bear', 'unable to bear'])
  const bodyRegion = detectBodyRegion(text)
  const activityTrigger = detectActivity(text)
  const primaryBucket = detectPrimaryBucket(text, bodyRegion, activityTrigger, painFlag)
  const secondaryBucket = secondaryBucketFor(primaryBucket, text, painFlag)
  const severity = parseSeverityFromText(rawText)
  const matchedSignals = [
    painFlag ? 'pain_language' : '',
    urgentSignal ? 'red_flag_language' : '',
    bodyRegion !== 'unknown' ? `region:${bodyRegion}` : '',
    activityTrigger ? `activity:${activityTrigger}` : '',
    primaryBucket !== 'unknown_general' ? `bucket:${primaryBucket}` : '',
  ].filter(Boolean)

  return {
    primaryBucket,
    secondaryBucket,
    bodyRegion,
    painFlag,
    severity,
    severityFlag: severityFlag(severity, urgentSignal),
    activityTrigger,
    side: detectSide(text),
    sportRelevance: input.sportContext || detectSportContext(text),
    confidence: Math.min(0.95, 0.42 + matchedSignals.length * 0.11),
    matchedSignals,
  }
}

function answerValue(answers: DiagnosticFollowUpAnswer[], key: string) {
  return answers.find((answer) => answer.questionKey === key)?.answerValue
}

function answerNarrative(answer: DiagnosticFollowUpAnswer) {
  const value = Array.isArray(answer.answerValue)
    ? answer.answerValue.join(' ')
    : String(answer.answerValue ?? '')

  if (answer.questionKey === 'severity_scale') return `pain level ${value}/10`
  if (answer.questionKey === 'body_side') return `${value} side`
  if (answer.questionKey === 'activity_trigger') return `during ${value}`
  if (answer.questionKey === 'sensation_type') return `feels like ${value}`
  if (answer.questionKey === 'sport_context') return `sport context ${value}`
  if (answer.questionKey === 'training_context') return `training context ${value}`
  return value
}

export function refineClassificationWithAnswers(
  classification: ComplaintClassification,
  answers: DiagnosticFollowUpAnswer[]
): ComplaintClassification {
  const answerText = answers.map(answerNarrative).join(' ')
  const baseContext = [
    classification.bodyRegion !== 'unknown' ? classification.bodyRegion : '',
    classification.activityTrigger || '',
    classification.painFlag ? 'pain' : '',
    classification.primaryBucket.replace(/_/g, ' '),
  ].filter(Boolean).join(' ')
  const sportContext = String(answerValue(answers, 'sport_context') || classification.sportRelevance || '')
  const parsed = classifyComplaint({
    complaintText: `${baseContext} ${answerText}`.trim(),
    sportContext: sportContext || undefined,
  })
  const structuredSide = String(answerValue(answers, 'body_side') || '')
  const structuredTrigger = String(answerValue(answers, 'activity_trigger') || '')
  const structuredSeverity = answerValue(answers, 'severity_scale')
  const parsedSeverity =
    typeof structuredSeverity === 'number'
      ? structuredSeverity
      : structuredSeverity
        ? Number(structuredSeverity)
        : parsed.severity ?? classification.severity
  const severity = Number.isFinite(parsedSeverity) ? Math.max(0, Math.min(10, Number(parsedSeverity))) : classification.severity
  const bodyRegion = parsed.bodyRegion !== 'unknown' ? parsed.bodyRegion : classification.bodyRegion
  const painFlag = classification.painFlag || parsed.painFlag
  const primaryBucket = parsed.primaryBucket !== 'unknown_general' ? parsed.primaryBucket : classification.primaryBucket
  const sportFromAnswers = detectSportContext(normalize(answerText))

  return {
    ...classification,
    primaryBucket,
    secondaryBucket: parsed.secondaryBucket || classification.secondaryBucket,
    bodyRegion,
    painFlag,
    severity,
    severityFlag: severityFlag(severity, parsed.severityFlag === 'urgent'),
    activityTrigger: structuredTrigger || parsed.activityTrigger || classification.activityTrigger,
    side:
      structuredSide === 'left' || structuredSide === 'right' || structuredSide === 'both' || structuredSide === 'center'
        ? structuredSide
        : parsed.side !== 'unknown'
          ? parsed.side
          : classification.side,
    sportRelevance: sportContext || sportFromAnswers || parsed.sportRelevance || null,
    confidence: Math.min(0.98, Math.max(classification.confidence, parsed.confidence) + answers.length * 0.03),
    matchedSignals: Array.from(new Set([...classification.matchedSignals, ...parsed.matchedSignals, ...answers.map((answer) => `answer:${answer.questionKey}`)])),
  }
}
