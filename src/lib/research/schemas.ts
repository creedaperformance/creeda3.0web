import { z } from 'zod'

import {
  researchAgeGroups,
  researchBundleStatuses,
  researchBundleStrengths,
  researchComparatorKeys,
  researchDomains,
  researchFindingDirections,
  researchFindingTypes,
  researchIngestionStatuses,
  researchMetricKeys,
  researchPopulations,
  researchRuleStatuses,
  researchSexGroups,
  researchSourceKeys,
  researchSports,
  researchStudyTypes,
  researchTagTypes,
} from '@/lib/research/taxonomy'

export const sourcePaperRecordSchema = z.object({
  sourceKey: z.enum(researchSourceKeys),
  externalId: z.string().min(1),
  sourceUrl: z.string().url().nullable().optional(),
  payloadJson: z.record(z.string(), z.unknown()),
  identifiers: z.object({
    doi: z.string().nullable().optional(),
    pmid: z.string().nullable().optional(),
    pmcid: z.string().nullable().optional(),
    openalexId: z.string().nullable().optional(),
    semanticScholarId: z.string().nullable().optional(),
  }),
  title: z.string().nullable().optional(),
  abstract: z.string().nullable().optional(),
  publicationYear: z.number().int().nullable().optional(),
  publicationDate: z.string().nullable().optional(),
  journal: z.string().nullable().optional(),
  publisher: z.string().nullable().optional(),
  studyType: z.enum(researchStudyTypes).nullable().optional(),
  population: z.enum(researchPopulations).nullable().optional(),
  sport: z.enum(researchSports).nullable().optional(),
  sexGroup: z.enum(researchSexGroups).nullable().optional(),
  ageGroup: z.enum(researchAgeGroups).nullable().optional(),
  sampleSize: z.number().int().nullable().optional(),
  isOpenAccess: z.boolean().nullable().optional(),
  license: z.string().nullable().optional(),
  fullTextUrl: z.string().nullable().optional(),
  pdfUrl: z.string().nullable().optional(),
  citationCount: z.number().int().nullable().optional(),
  referenceCount: z.number().int().nullable().optional(),
  retractionStatus: z.enum(['none', 'corrected', 'retracted', 'expression_of_concern']).nullable().optional(),
  authors: z
    .array(
      z.object({
        name: z.string().min(1),
        orcid: z.string().nullable().optional(),
        affiliation: z.string().nullable().optional(),
      })
    )
    .optional(),
  tags: z
    .array(
      z.object({
        tagType: z.enum(researchTagTypes),
        tagValue: z.string().min(1),
      })
    )
    .optional(),
})

export const findingSchema = z.object({
  paperId: z.string().min(1),
  findingType: z.enum(researchFindingTypes),
  subjectMetric: z.enum(researchMetricKeys),
  comparator: z.enum(researchComparatorKeys),
  outcomeMetric: z.enum(researchMetricKeys),
  direction: z.enum(researchFindingDirections),
  effectSize: z.string().nullable().optional(),
  confidenceText: z.string().nullable().optional(),
  findingText: z.string().min(1),
  extractionMethod: z.enum(['llm', 'rules', 'reviewer']),
  isHumanVerified: z.boolean().optional(),
})

export const evidenceBundleSchema = z.object({
  bundleKey: z.string().min(1),
  title: z.string().min(1),
  domain: z.enum(researchDomains),
  summary: z.string().min(1),
  applicablePopulation: z.enum(researchPopulations).nullable().optional(),
  applicableSport: z.enum(researchSports).nullable().optional(),
  minPapersRequired: z.number().int().min(1),
  status: z.enum(researchBundleStatuses),
  evidenceStrength: z.enum(researchBundleStrengths),
  consistencyScore: z.number().min(0).max(1),
  contradictionCount: z.number().int().min(0),
  supportingPaperIds: z.array(z.string().min(1)),
})

export const ruleConditionSchema = z.object({
  field: z.enum([
    'sleep_hours',
    'hrv_delta_pct',
    'acute_load',
    'chronic_load',
    'acute_chronic_ratio',
    'soreness',
    'mood',
    'hydration_status',
    'illness_flag',
    'sport',
    'age_group',
    'population',
  ]),
  operator: z.enum(['lt', 'lte', 'gt', 'gte', 'eq', 'neq', 'between', 'in', 'truthy', 'falsy']),
  value: z.union([z.number(), z.string(), z.boolean()]).optional(),
  values: z.array(z.union([z.number(), z.string()])).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
})

export const decisionRuleLogicSchema = z.object({
  context: z
    .object({
      sports: z.array(z.enum(researchSports)).optional(),
      ageGroups: z.array(z.enum(researchAgeGroups)).optional(),
      populations: z.array(z.enum(researchPopulations)).optional(),
    })
    .optional(),
  all: z.array(ruleConditionSchema).optional(),
  any: z.array(ruleConditionSchema).optional(),
  none: z.array(ruleConditionSchema).optional(),
})

export const decisionRuleOutputSchema = z.object({
  domain: z.enum(researchDomains),
  severity: z.enum(['low', 'moderate', 'high']),
  headline: z.string().min(1),
  body: z.string().min(1),
  actions: z.array(z.string().min(1)).min(1),
  internalCode: z.string().min(1),
})

export const userSignalsSchema = z.object({
  sleep_hours: z.number().nullable().optional(),
  hrv_delta_pct: z.number().nullable().optional(),
  acute_load: z.number().nullable().optional(),
  chronic_load: z.number().nullable().optional(),
  soreness: z.number().nullable().optional(),
  mood: z.number().nullable().optional(),
  hydration_status: z.enum(['low', 'ok', 'good', 'dehydrated']).nullable().optional(),
  illness_flag: z.boolean().nullable().optional(),
  sport: z.enum(researchSports).nullable().optional(),
  age_group: z.enum(researchAgeGroups).nullable().optional(),
  population: z.enum(researchPopulations).nullable().optional(),
})

export const publishRuleRequestSchema = z.object({
  ruleKeys: z.array(z.string().min(1)).optional(),
  autoApproveBundles: z.boolean().optional(),
})

export const syncRequestSchema = z.object({
  source: z.enum([...researchSourceKeys, 'all'] as const).default('all'),
  query: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
})

export const parseRequestSchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
})

export const researchPaperFilterSchema = z.object({
  status: z.enum(researchIngestionStatuses).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})
