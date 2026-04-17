export type UserType = 'athlete' | 'individual' | 'coach'
export type FlowKind = 'onboarding' | 'daily'
export type InputType =
  | 'text'
  | 'number'
  | 'phone'
  | 'time'
  | 'chips'
  | 'multi-chip'
  | 'emoji'
  | 'slider'
  | 'toggle'
  | 'body-map'
  | 'textarea'

export type FieldCategory = 'baseline' | 'progressive' | 'conditional' | 'inferred'
export type ProfileLayer = 'layer1' | 'layer2' | 'layer3'
export type ConditionOperator =
  | 'eq'
  | 'ne'
  | 'in'
  | 'gte'
  | 'lte'
  | 'truthy'
  | 'falsy'
  | 'includes'
  | 'exists'

export type AnswerRecord = Record<string, unknown>

export interface FormOption {
  label: string
  value: string | number | boolean
  description?: string
  emoji?: string
}

export interface TriggerCondition {
  field: string
  operator: ConditionOperator
  value?: unknown
  source?: 'answers' | 'context'
}

export interface FormFieldDefinition<TId extends string = string> {
  id: TId
  label: string
  helper: string
  inputType: InputType
  category: FieldCategory
  layer: ProfileLayer
  required: boolean
  backendMappingKey: string | string[]
  triggerConditions?: TriggerCondition[]
  options?: FormOption[]
  min?: number
  max?: number
  step?: number
  unit?: string
  placeholder?: string
  maxSelections?: number
}

export interface FlowStepDefinition {
  id: string
  title: string
  goal: string
  fieldIds: string[]
  mandatory: boolean
  optional: boolean
  conditional: boolean
  expectedSeconds: number
  interactionPattern: string
  helperCopy?: string
}

export interface FormFlowDefinition {
  id: string
  version: string
  userType: UserType
  kind: FlowKind
  title: string
  description: string
  completionTargetSeconds: number
  fields: FormFieldDefinition[]
  steps: FlowStepDefinition[]
  defaultQuickSignalIds?: string[]
  advancedSignalIds?: string[]
}

export interface ProgressiveProfileState {
  flow: FormFlowDefinition
  answers: AnswerRecord
  context?: AnswerRecord
}

export interface ConfidenceResult {
  score: number
  level: 'low' | 'medium' | 'high'
  recommendations: string[]
}

export interface DailySignalResult {
  readinessScore: number
  readinessBand: 'low' | 'guarded' | 'stable' | 'high'
  confidenceScore: number
  shouldExpand: boolean
  anomalyFlags: string[]
  followUpFieldIds: string[]
}

export interface AdaptiveProfileSummary {
  flowId: string
  flowVersion: string
  completionScore: number
  confidenceScore: number
  confidenceLevel: 'low' | 'medium' | 'high'
  confidenceRecommendations: string[]
  nextQuestionIds: string[]
  nextQuestionLabels: string[]
  updatedAt: string | null
}

export interface AdaptiveProfilePrefill {
  summary: AdaptiveProfileSummary | null
  answers: Record<string, unknown>
}
