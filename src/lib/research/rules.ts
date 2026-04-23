import { RESEARCH_CONFIDENCE_BY_BUNDLE, RESEARCH_RULE_PRIORITY } from '@/lib/research/config'
import { decisionRuleLogicSchema, decisionRuleOutputSchema, userSignalsSchema } from '@/lib/research/schemas'
import type {
  DecisionRuleLogic,
  RankedRecommendation,
  RuleCondition,
  RuleRecord,
  UserSignalsInput,
} from '@/lib/research/types'
import type { ResearchBundleStrength, ResearchDomain } from '@/lib/research/taxonomy'

function getComparableValue(input: UserSignalsInput & { acute_chronic_ratio?: number | null }, field: RuleCondition['field']) {
  return input[field]
}

function deriveSignals(input: UserSignalsInput) {
  const acute = input.acute_load ?? null
  const chronic = input.chronic_load ?? null

  return {
    ...input,
    acute_chronic_ratio:
      typeof acute === 'number' && typeof chronic === 'number' && chronic > 0
        ? Number((acute / chronic).toFixed(3))
        : null,
  }
}

function evaluateCondition(
  input: ReturnType<typeof deriveSignals>,
  condition: RuleCondition
) {
  const actual = getComparableValue(input, condition.field)

  if (condition.operator === 'truthy') return Boolean(actual)
  if (condition.operator === 'falsy') return !actual
  if (actual === null || actual === undefined) return false

  switch (condition.operator) {
    case 'lt':
      return typeof actual === 'number' && typeof condition.value === 'number' && actual < condition.value
    case 'lte':
      return typeof actual === 'number' && typeof condition.value === 'number' && actual <= condition.value
    case 'gt':
      return typeof actual === 'number' && typeof condition.value === 'number' && actual > condition.value
    case 'gte':
      return typeof actual === 'number' && typeof condition.value === 'number' && actual >= condition.value
    case 'eq':
      return actual === condition.value
    case 'neq':
      return actual !== condition.value
    case 'between':
      return typeof actual === 'number' && typeof condition.min === 'number' && typeof condition.max === 'number' && actual >= condition.min && actual <= condition.max
    case 'in':
      return Array.isArray(condition.values) && condition.values.includes(actual as never)
    default:
      return false
  }
}

export function matchesContext(logic: DecisionRuleLogic, input: UserSignalsInput) {
  const context = logic.context
  if (!context) return true
  if (context.sports?.length && input.sport && !context.sports.includes(input.sport)) return false
  if (context.ageGroups?.length && input.age_group && !context.ageGroups.includes(input.age_group)) return false
  if (context.populations?.length && input.population && !context.populations.includes(input.population)) return false
  return true
}

export function matchesConditions(logic: DecisionRuleLogic, input: UserSignalsInput) {
  const derived = deriveSignals(input)
  const all = (logic.all || []).every((condition) => evaluateCondition(derived, condition))
  const any = !logic.any?.length || logic.any.some((condition) => evaluateCondition(derived, condition))
  const none = !(logic.none || []).some((condition) => evaluateCondition(derived, condition))
  return all && any && none
}

export function resolveConfidenceFromBundle(bundleStrength: ResearchBundleStrength) {
  return RESEARCH_CONFIDENCE_BY_BUNDLE[bundleStrength]
}

function severityWeight(value: 'low' | 'moderate' | 'high') {
  return value === 'high' ? 3 : value === 'moderate' ? 2 : 1
}

export function rankRecommendations(recommendations: Omit<RankedRecommendation, 'rank'>[]) {
  return recommendations
    .sort((left, right) => {
      const domainPriority = RESEARCH_RULE_PRIORITY[right.domain] - RESEARCH_RULE_PRIORITY[left.domain]
      if (domainPriority !== 0) return domainPriority

      const severityPriority = severityWeight(right.severity) - severityWeight(left.severity)
      if (severityPriority !== 0) return severityPriority

      return right.confidence - left.confidence
    })
    .map((recommendation, index) => ({
      ...recommendation,
      rank: index + 1,
    }))
}

export function evaluateRules(args: {
  input: UserSignalsInput
  rules: RuleRecord[]
  bundleStrengthByBundleId: Record<string, ResearchBundleStrength>
}) {
  const normalizedInput = userSignalsSchema.parse(args.input)
  const matched = args.rules.flatMap((rule) => {
    if (rule.status !== 'approved') return []

    const logic = decisionRuleLogicSchema.parse(rule.logic)
    const output = decisionRuleOutputSchema.parse(rule.output)

    if (!matchesContext(logic, normalizedInput) || !matchesConditions(logic, normalizedInput)) {
      return []
    }

    const bundleStrength = args.bundleStrengthByBundleId[rule.bundleId] || 'limited'
    const confidence = resolveConfidenceFromBundle(bundleStrength)

    return [
      {
        ruleId: rule.id,
        ruleKey: rule.ruleKey,
        bundleId: rule.bundleId,
        bundleKey: rule.bundleKey,
        domain: output.domain as ResearchDomain,
        severity: output.severity,
        headline: output.headline,
        body: output.body,
        actions: output.actions,
        confidence,
      },
    ]
  })

  return rankRecommendations(matched)
}
