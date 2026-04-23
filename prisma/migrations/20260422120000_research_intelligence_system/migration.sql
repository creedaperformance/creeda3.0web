CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ResearchSourceKey" AS ENUM ('pubmed', 'crossref', 'europe_pmc', 'openalex', 'semantic_scholar');

-- CreateEnum
CREATE TYPE "ResearchSourceType" AS ENUM ('metadata_api', 'fulltext_api', 'bulk_dump', 'enrichment_api');

-- CreateEnum
CREATE TYPE "ResearchStudyType" AS ENUM ('meta_analysis', 'systematic_review', 'rct', 'cohort', 'case_control', 'cross_sectional', 'review', 'narrative_review', 'consensus_statement', 'guideline', 'case_series', 'qualitative', 'mechanistic', 'diagnostic_validation', 'other');

-- CreateEnum
CREATE TYPE "ResearchPopulation" AS ENUM ('elite_athletes', 'youth_athletes', 'general_adults', 'recreational_athletes', 'clinical_rehab', 'female_athletes', 'male_athletes', 'indian_athletes', 'mixed', 'other');

-- CreateEnum
CREATE TYPE "ResearchSport" AS ENUM ('general', 'football', 'cricket', 'basketball', 'badminton', 'athletics', 'hockey', 'kabaddi', 'rugby', 'tennis', 'swimming', 'cycling', 'combat', 'mixed', 'other');

-- CreateEnum
CREATE TYPE "ResearchSexGroup" AS ENUM ('male', 'female', 'mixed', 'unknown');

-- CreateEnum
CREATE TYPE "ResearchAgeGroup" AS ENUM ('youth', 'adult', 'masters', 'mixed', 'unknown');

-- CreateEnum
CREATE TYPE "ResearchAccessPolicy" AS ENUM ('metadata_only', 'open_access_fulltext_allowed', 'licensed_fulltext_allowed', 'blocked_fulltext');

-- CreateEnum
CREATE TYPE "ResearchRetractionStatus" AS ENUM ('none', 'corrected', 'retracted', 'expression_of_concern');

-- CreateEnum
CREATE TYPE "ResearchIngestionStatus" AS ENUM ('raw', 'normalized', 'parsed', 'reviewed', 'rejected');

-- CreateEnum
CREATE TYPE "ResearchEvidenceLevel" AS ENUM ('excluded', 'very_low', 'low', 'moderate', 'high', 'very_high');

-- CreateEnum
CREATE TYPE "ResearchTagType" AS ENUM ('metric', 'outcome', 'intervention', 'sport', 'body_system', 'risk', 'population');

-- CreateEnum
CREATE TYPE "ResearchFindingType" AS ENUM ('association', 'threshold', 'intervention_effect', 'risk_factor', 'prediction');

-- CreateEnum
CREATE TYPE "ResearchMetricKey" AS ENUM ('sleep_duration', 'sleep_quality', 'hrv', 'acute_load', 'chronic_load', 'acute_chronic_ratio', 'soreness', 'mood', 'hydration_status', 'illness_flag', 'fatigue_risk', 'readiness', 'sprint_performance', 'injury_risk', 'recovery_quality', 'performance_reduction', 'training_tolerance', 'wellness');

-- CreateEnum
CREATE TYPE "ResearchComparatorKey" AS ENUM ('lt_6h', 'downward_trend', 'high', 'low', 'rising', 'falling', 'spike_above_baseline', 'present', 'absent', 'poor', 'low_target', 'reduced', 'elevated', 'lte_neg_8_pct', 'baseline', 'mixed', 'unknown', 'dehydrated');

-- CreateEnum
CREATE TYPE "ResearchFindingDirection" AS ENUM ('increases', 'decreases', 'mixed', 'neutral');

-- CreateEnum
CREATE TYPE "ResearchExtractionMethod" AS ENUM ('llm', 'rules', 'reviewer');

-- CreateEnum
CREATE TYPE "ResearchDomain" AS ENUM ('fatigue', 'readiness', 'hydration', 'injury', 'recovery', 'illness');

-- CreateEnum
CREATE TYPE "ResearchBundleStatus" AS ENUM ('draft', 'approved', 'deprecated');

-- CreateEnum
CREATE TYPE "ResearchBundleStrength" AS ENUM ('insufficient', 'limited', 'moderate', 'strong', 'very_strong');

-- CreateEnum
CREATE TYPE "DecisionRuleStatus" AS ENUM ('draft', 'approved', 'disabled');

-- CreateTable
CREATE TABLE "research_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" "ResearchSourceKey" NOT NULL,
    "name" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "source_type" "ResearchSourceType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_papers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "doi" TEXT,
    "pmid" TEXT,
    "pmcid" TEXT,
    "openalex_id" TEXT,
    "semantic_scholar_id" TEXT,
    "title" TEXT NOT NULL,
    "abstract" TEXT,
    "publication_year" INTEGER,
    "publication_date" DATE,
    "journal" TEXT,
    "publisher" TEXT,
    "study_type" "ResearchStudyType",
    "population" "ResearchPopulation",
    "sport" "ResearchSport",
    "sex_group" "ResearchSexGroup",
    "age_group" "ResearchAgeGroup",
    "sample_size" INTEGER,
    "is_open_access" BOOLEAN NOT NULL DEFAULT false,
    "license" TEXT,
    "access_policy" "ResearchAccessPolicy" NOT NULL DEFAULT 'metadata_only',
    "access_policy_reason" TEXT,
    "access_policy_audit_json" JSONB,
    "full_text_url" TEXT,
    "pdf_url" TEXT,
    "citation_count" INTEGER,
    "reference_count" INTEGER,
    "retraction_status" "ResearchRetractionStatus" NOT NULL DEFAULT 'none',
    "quality_score" DOUBLE PRECISION,
    "evidence_level" "ResearchEvidenceLevel",
    "ingestion_status" "ResearchIngestionStatus" NOT NULL DEFAULT 'raw',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_papers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_authors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "orcid" TEXT,
    "affiliation" TEXT,

    CONSTRAINT "research_authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_paper_authors" (
    "paper_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "author_order" INTEGER NOT NULL,

    CONSTRAINT "research_paper_authors_pkey" PRIMARY KEY ("paper_id","author_id")
);

-- CreateTable
CREATE TABLE "research_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tag_type" "ResearchTagType" NOT NULL,
    "tag_value" TEXT NOT NULL,

    CONSTRAINT "research_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_paper_tags" (
    "paper_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "research_paper_tags_pkey" PRIMARY KEY ("paper_id","tag_id")
);

-- CreateTable
CREATE TABLE "research_findings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "paper_id" UUID NOT NULL,
    "finding_type" "ResearchFindingType" NOT NULL,
    "subject_metric" "ResearchMetricKey" NOT NULL,
    "comparator" "ResearchComparatorKey" NOT NULL,
    "outcome_metric" "ResearchMetricKey" NOT NULL,
    "direction" "ResearchFindingDirection" NOT NULL,
    "effect_size" TEXT,
    "confidence_text" TEXT,
    "finding_text" TEXT NOT NULL,
    "extraction_method" "ResearchExtractionMethod" NOT NULL,
    "is_human_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_evidence_passages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "paper_id" UUID NOT NULL,
    "section_name" TEXT NOT NULL,
    "snippet_text" TEXT NOT NULL,
    "char_start" INTEGER NOT NULL,
    "char_end" INTEGER NOT NULL,
    "license_ok" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_evidence_passages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_evidence_bundles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bundle_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "domain" "ResearchDomain" NOT NULL,
    "summary" TEXT NOT NULL,
    "applicable_population" "ResearchPopulation",
    "applicable_sport" "ResearchSport",
    "evidence_strength" "ResearchBundleStrength",
    "min_papers_required" INTEGER NOT NULL DEFAULT 2,
    "status" "ResearchBundleStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_evidence_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_bundle_papers" (
    "bundle_id" UUID NOT NULL,
    "paper_id" UUID NOT NULL,
    "contribution_weight" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "research_bundle_papers_pkey" PRIMARY KEY ("bundle_id","paper_id")
);

-- CreateTable
CREATE TABLE "decision_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rule_key" TEXT NOT NULL,
    "domain" "ResearchDomain" NOT NULL,
    "name" TEXT NOT NULL,
    "logic_json" JSONB NOT NULL,
    "output_json" JSONB NOT NULL,
    "bundle_id" UUID NOT NULL,
    "status" "DecisionRuleStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "rule_id" UUID NOT NULL,
    "bundle_id" UUID NOT NULL,
    "input_snapshot" JSONB NOT NULL,
    "output_snapshot" JSONB NOT NULL,
    "engine_confidence" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_paper_source_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "paper_id" UUID,
    "source_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "source_url" TEXT,
    "payload_json" JSONB NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_paper_source_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_paper_field_provenance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "paper_id" UUID NOT NULL,
    "source_record_id" UUID NOT NULL,
    "field_name" TEXT NOT NULL,
    "field_value" TEXT,
    "is_selected" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_paper_field_provenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_sync_checkpoints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_id" UUID NOT NULL,
    "checkpoint_key" TEXT NOT NULL,
    "cursor" TEXT,
    "state_json" JSONB,
    "last_attempted_at" TIMESTAMP(3),
    "last_successful_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_sync_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "research_sources_key_key" ON "research_sources"("key");

-- CreateIndex
CREATE UNIQUE INDEX "research_papers_doi_key" ON "research_papers"("doi");

-- CreateIndex
CREATE UNIQUE INDEX "research_papers_pmid_key" ON "research_papers"("pmid");

-- CreateIndex
CREATE UNIQUE INDEX "research_papers_pmcid_key" ON "research_papers"("pmcid");

-- CreateIndex
CREATE UNIQUE INDEX "research_papers_openalex_id_key" ON "research_papers"("openalex_id");

-- CreateIndex
CREATE UNIQUE INDEX "research_papers_semantic_scholar_id_key" ON "research_papers"("semantic_scholar_id");

-- CreateIndex
CREATE INDEX "research_papers_publication_year_idx" ON "research_papers"("publication_year");

-- CreateIndex
CREATE INDEX "research_papers_study_type_idx" ON "research_papers"("study_type");

-- CreateIndex
CREATE INDEX "research_papers_sport_idx" ON "research_papers"("sport");

-- CreateIndex
CREATE INDEX "research_papers_access_policy_idx" ON "research_papers"("access_policy");

-- CreateIndex
CREATE INDEX "research_papers_ingestion_status_idx" ON "research_papers"("ingestion_status");

-- CreateIndex
CREATE INDEX "research_paper_authors_author_order_idx" ON "research_paper_authors"("author_order");

-- CreateIndex
CREATE UNIQUE INDEX "research_tags_tag_type_tag_value_key" ON "research_tags"("tag_type", "tag_value");

-- CreateIndex
CREATE INDEX "research_findings_subject_metric_idx" ON "research_findings"("subject_metric");

-- CreateIndex
CREATE INDEX "research_findings_outcome_metric_idx" ON "research_findings"("outcome_metric");

-- CreateIndex
CREATE UNIQUE INDEX "research_evidence_bundles_bundle_key_key" ON "research_evidence_bundles"("bundle_key");

-- CreateIndex
CREATE INDEX "research_evidence_bundles_status_idx" ON "research_evidence_bundles"("status");

-- CreateIndex
CREATE UNIQUE INDEX "decision_rules_rule_key_key" ON "decision_rules"("rule_key");

-- CreateIndex
CREATE INDEX "decision_rules_status_idx" ON "decision_rules"("status");

-- CreateIndex
CREATE INDEX "decision_rules_logic_json_gin_idx" ON "decision_rules" USING GIN ("logic_json");

-- CreateIndex
CREATE INDEX "decision_audit_logs_user_id_idx" ON "decision_audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "decision_audit_logs_rule_id_idx" ON "decision_audit_logs"("rule_id");

-- CreateIndex
CREATE INDEX "decision_audit_logs_bundle_id_idx" ON "decision_audit_logs"("bundle_id");

-- CreateIndex
CREATE INDEX "decision_audit_logs_created_at_idx" ON "decision_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "research_paper_source_records_paper_id_idx" ON "research_paper_source_records"("paper_id");

-- CreateIndex
CREATE UNIQUE INDEX "research_paper_source_records_source_id_external_id_key" ON "research_paper_source_records"("source_id", "external_id");

-- CreateIndex
CREATE INDEX "research_paper_field_provenance_field_name_idx" ON "research_paper_field_provenance"("field_name");

-- CreateIndex
CREATE UNIQUE INDEX "research_paper_field_provenance_unique" ON "research_paper_field_provenance"("paper_id", "source_record_id", "field_name");

-- CreateIndex
CREATE UNIQUE INDEX "research_sync_checkpoints_source_id_checkpoint_key_key" ON "research_sync_checkpoints"("source_id", "checkpoint_key");

-- AddForeignKey
ALTER TABLE "research_paper_authors" ADD CONSTRAINT "research_paper_authors_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "research_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_paper_authors" ADD CONSTRAINT "research_paper_authors_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "research_authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_paper_tags" ADD CONSTRAINT "research_paper_tags_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "research_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_paper_tags" ADD CONSTRAINT "research_paper_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "research_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_findings" ADD CONSTRAINT "research_findings_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "research_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_evidence_passages" ADD CONSTRAINT "research_evidence_passages_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "research_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_bundle_papers" ADD CONSTRAINT "research_bundle_papers_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "research_evidence_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_bundle_papers" ADD CONSTRAINT "research_bundle_papers_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "research_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_rules" ADD CONSTRAINT "decision_rules_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "research_evidence_bundles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_audit_logs" ADD CONSTRAINT "decision_audit_logs_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "decision_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_audit_logs" ADD CONSTRAINT "decision_audit_logs_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "research_evidence_bundles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_paper_source_records" ADD CONSTRAINT "research_paper_source_records_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "research_papers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_paper_source_records" ADD CONSTRAINT "research_paper_source_records_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "research_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_paper_field_provenance" ADD CONSTRAINT "research_paper_field_provenance_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "research_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_paper_field_provenance" ADD CONSTRAINT "research_paper_field_provenance_source_record_id_fkey" FOREIGN KEY ("source_record_id") REFERENCES "research_paper_source_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_sync_checkpoints" ADD CONSTRAINT "research_sync_checkpoints_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "research_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
