import type { AnswerRecord, FormFieldDefinition, FormFlowDefinition, TriggerCondition } from '@/forms/types'

export interface AdaptiveRule {
  id: string
  description: string
  when: TriggerCondition[]
  showFields: string[]
  severity: 'info' | 'guard' | 'required'
}

export const ADAPTIVE_RULES: AdaptiveRule[] = [
  {
    id: 'athlete-high-soreness-pain-location',
    description: 'If soreness is high, ask for pain location.',
    when: [{ field: 'soreness', operator: 'gte', value: 4 }],
    showFields: ['painLocation'],
    severity: 'guard',
  },
  {
    id: 'athlete-low-energy-sleep',
    description: 'If energy is low, ask for sleep quality and duration.',
    when: [{ field: 'energy', operator: 'lte', value: 2 }],
    showFields: ['sleepQuality', 'sleepDuration'],
    severity: 'info',
  },
  {
    id: 'athlete-high-stress-sleep',
    description: 'If stress is very high, ask whether sleep explains the drop.',
    when: [{ field: 'stress', operator: 'gte', value: 4 }],
    showFields: ['sleepQuality', 'sleepDuration'],
    severity: 'info',
  },
  {
    id: 'athlete-under-18-guardian-consent',
    description: 'If athlete is under 18, require guardian or coach consent.',
    when: [{ field: 'age', operator: 'lte', value: 17 }],
    showFields: ['minorGuardianConsent'],
    severity: 'required',
  },
  {
    id: 'athlete-current-injury-capture',
    description: 'If the athlete reports a current issue, capture severity and location.',
    when: [{ field: 'currentIssue', operator: 'eq', value: 'Yes' }],
    showFields: ['injurySeverity', 'injuryLocations'],
    severity: 'guard',
  },
  {
    id: 'individual-limitation-capture',
    description: 'If an individual reports current limitation, capture the main area.',
    when: [{ field: 'injuryStatus', operator: 'ne', value: 'none' }],
    showFields: ['limitationArea'],
    severity: 'guard',
  },
  {
    id: 'coach-multi-team-structure',
    description: 'If the coach manages multiple teams, collect team structure details.',
    when: [{ field: 'teamType', operator: 'eq', value: 'Multiple Teams / Age Groups' }],
    showFields: ['teamStructure'],
    severity: 'info',
  },
  {
    id: 'daily-session-load-follow-up',
    description: 'If a session was completed, capture session load.',
    when: [{ field: 'sessionCompletion', operator: 'in', value: ['completed', 'competition', 'partial', 'complete', 'crushed'] }],
    showFields: ['sessionRPE', 'sessionDuration', 'trainingMinutes'],
    severity: 'info',
  },
]

function readSourceValue(
  condition: TriggerCondition,
  answers: AnswerRecord,
  context: AnswerRecord = {}
) {
  return condition.source === 'context' ? context[condition.field] : answers[condition.field]
}

export function evaluateCondition(
  condition: TriggerCondition,
  answers: AnswerRecord,
  context: AnswerRecord = {}
) {
  const sourceValue = readSourceValue(condition, answers, context)

  switch (condition.operator) {
    case 'eq':
      return sourceValue === condition.value
    case 'ne':
      return sourceValue !== condition.value
    case 'in':
      return Array.isArray(condition.value) ? condition.value.includes(sourceValue) : false
    case 'gte':
      return Number(sourceValue) >= Number(condition.value)
    case 'lte':
      return Number(sourceValue) <= Number(condition.value)
    case 'truthy':
      return Boolean(sourceValue)
    case 'falsy':
      return !sourceValue
    case 'includes':
      return Array.isArray(sourceValue) ? sourceValue.includes(condition.value) : false
    case 'exists':
      return sourceValue !== undefined && sourceValue !== null && sourceValue !== ''
    default:
      return false
  }
}

export function shouldShowField(
  field: FormFieldDefinition,
  answers: AnswerRecord,
  context: AnswerRecord = {}
) {
  if (!field.triggerConditions?.length) return true

  const hasOrGroup = field.triggerConditions.some((condition) =>
    ['energy', 'stress'].includes(condition.field) && field.id === 'sleepQuality'
  )

  if (hasOrGroup) {
    return field.triggerConditions.some((condition) => evaluateCondition(condition, answers, context))
  }

  return field.triggerConditions.every((condition) => evaluateCondition(condition, answers, context))
}

export function getVisibleFields(
  fields: FormFieldDefinition[],
  answers: AnswerRecord,
  context: AnswerRecord = {}
) {
  return fields.filter((field) => shouldShowField(field, answers, context))
}

export function getVisibleSteps(
  flow: FormFlowDefinition,
  answers: AnswerRecord,
  context: AnswerRecord = {}
) {
  const visibleIds = new Set(getVisibleFields(flow.fields, answers, context).map((field) => field.id))
  return flow.steps.filter((step) => step.fieldIds.some((fieldId) => visibleIds.has(fieldId)))
}

export function getTriggeredRules(answers: AnswerRecord, context: AnswerRecord = {}) {
  return ADAPTIVE_RULES.filter((rule) =>
    rule.when.every((condition) => evaluateCondition(condition, answers, context))
  )
}

export function getTriggeredFieldIds(
  flow: FormFlowDefinition,
  answers: AnswerRecord,
  context: AnswerRecord = {}
) {
  const visibleFieldIds = getVisibleFields(flow.fields, answers, context).map((field) => field.id)
  const ruleFieldIds = getTriggeredRules(answers, context).flatMap((rule) => rule.showFields)
  return [...new Set([...visibleFieldIds, ...ruleFieldIds])]
}

export function getNextQuestion(
  flow: FormFlowDefinition,
  answers: AnswerRecord,
  context: AnswerRecord = {}
) {
  const visibleFields = getVisibleFields(flow.fields, answers, context)
  return visibleFields.find((field) => {
    const value = answers[field.id]
    return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
  })
}

