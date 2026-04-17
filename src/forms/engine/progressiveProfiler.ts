import { getVisibleFields } from '@/forms/engine/adaptiveQuestionEngine'
import type { FormFieldDefinition, ProgressiveProfileState } from '@/forms/types'

const LAYER_WEIGHTS = {
  layer1: 0.6,
  layer2: 0.25,
  layer3: 0.15,
} as const

function isAnswered(value: unknown) {
  if (Array.isArray(value)) return value.length > 0
  return value !== undefined && value !== null && value !== ''
}

function getLayerFields(fields: FormFieldDefinition[], layer: keyof typeof LAYER_WEIGHTS) {
  return fields.filter((field) => field.layer === layer)
}

export function getMissingCriticalFields(profile: ProgressiveProfileState) {
  const visibleFields = getVisibleFields(profile.flow.fields, profile.answers, profile.context)
  return visibleFields.filter((field) => field.layer === 'layer1' && field.required && !isAnswered(profile.answers[field.id]))
}

export function getCompletionPercentage(profile: ProgressiveProfileState) {
  const visibleFields = getVisibleFields(profile.flow.fields, profile.answers, profile.context)

  const weightedScore = (Object.keys(LAYER_WEIGHTS) as Array<keyof typeof LAYER_WEIGHTS>).reduce(
    (total, layer) => {
      const layerFields = getLayerFields(visibleFields, layer)
      if (!layerFields.length) return total + LAYER_WEIGHTS[layer]

      const answeredCount = layerFields.filter((field) => isAnswered(profile.answers[field.id])).length
      const ratio = answeredCount / layerFields.length
      return total + ratio * LAYER_WEIGHTS[layer]
    },
    0
  )

  return Math.round(weightedScore * 100)
}

export function getNextQuestions(profile: ProgressiveProfileState) {
  const visibleFields = getVisibleFields(profile.flow.fields, profile.answers, profile.context)
  const priorityOrder = ['layer1', 'layer2', 'layer3'] as const

  return visibleFields
    .filter((field) => !isAnswered(profile.answers[field.id]))
    .sort((a, b) => priorityOrder.indexOf(a.layer) - priorityOrder.indexOf(b.layer))
    .slice(0, 3)
}

