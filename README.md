# CREEDA Research Intelligence System

CREEDA is not a research viewer. This subsystem exists so CREEDA can make athlete, coach, and individual recommendations that are internally evidence-backed without ever exposing raw papers, citations, journals, or academic wording to end users.

The core rule is simple:

- research stays hidden
- user-facing output stays short and action-oriented
- recommendations only come from approved evidence bundles and approved decision rules

## What This Adds

This implementation adds an internal, production-oriented research layer to the app:

- Prisma schema and migration for research sources, canonical papers, provenance, findings, bundles, rules, audits, and checkpoints
- metadata-first ingestion adapters for PubMed, Crossref, Europe PMC, OpenAlex, and optional Semantic Scholar enrichment
- a license and access-policy gate that blocks unauthorized full-text parsing and snippet storage
- deterministic taxonomy normalization for CREEDA metrics and outcomes
- rule-based parsing of abstracts and permitted full text into normalized findings
- paper scoring, bundle consistency, and bundle strength calculation
- a deterministic rule engine that evaluates approved rules against user signals
- audit logging and evidence-chain tracing for internal review
- protected internal API routes for research operations
- BullMQ queue scaffolding for sync, parse, score, bundle, and publish jobs
- starter seed data and Jest coverage

## Architecture

### 1. Persistence

- Prisma schema: [prisma/schema.prisma](/Users/creeda/creeda-app/prisma/schema.prisma)
- Migration: [prisma/migrations/20260422120000_research_intelligence_system/migration.sql](/Users/creeda/creeda-app/prisma/migrations/20260422120000_research_intelligence_system/migration.sql)
- Prisma client singleton: [src/lib/research/prisma.ts](/Users/creeda/creeda-app/src/lib/research/prisma.ts)

The research schema stores:

- `research_sources`
- `research_papers`
- `research_authors`
- `research_paper_authors`
- `research_tags`
- `research_paper_tags`
- `research_findings`
- `research_evidence_passages`
- `research_evidence_bundles`
- `research_bundle_papers`
- `decision_rules`
- `decision_audit_logs`
- `research_paper_source_records`
- `research_paper_field_provenance`
- `research_sync_checkpoints`

### 2. Taxonomy And Normalization

Taxonomy lives in [src/lib/research/taxonomy.ts](/Users/creeda/creeda-app/src/lib/research/taxonomy.ts).

It provides:

- metric normalization such as `HRV`, `heart rate variability`, and `vagal indices` -> `hrv`
- training-load normalization such as `training load`, `session load`, `acute load` -> `acute_load`
- outcome normalization such as `preparedness` -> `readiness`
- sport taxonomy
- age-group taxonomy
- population taxonomy
- study-type taxonomy
- unit-safe parsing helpers for hours, percentages, and sample size

### 3. Ingestion

Source adapters live under [src/lib/research/sources](/Users/creeda/creeda-app/src/lib/research/sources).

Implemented adapters:

- `PubMedSourceAdapter`
- `CrossrefSourceAdapter`
- `EuropePmcSourceAdapter`
- `OpenAlexSourceAdapter`
- `SemanticScholarSourceAdapter`

Every adapter is metadata-first. Full text is only fetched later if the access-policy layer explicitly allows it.

### 4. Canonicalization

Canonicalization lives in [src/lib/research/canonicalization.ts](/Users/creeda/creeda-app/src/lib/research/canonicalization.ts).

Rules:

- prefer DOI first
- fall back to PMID, PMCID, OpenAlex ID, or Semantic Scholar ID
- merge metadata conservatively
- preserve field provenance
- never create a second canonical paper for the same identifier set

### 5. Access Policy

License and access control lives in [src/lib/research/access-policy.ts](/Users/creeda/creeda-app/src/lib/research/access-policy.ts).

Supported decisions:

- `metadata_only`
- `open_access_fulltext_allowed`
- `licensed_fulltext_allowed`
- `blocked_fulltext`

This policy decides:

- whether full text may be fetched
- whether passage snippets may be stored
- why the decision was made

### 6. Parsing And Findings

Parsing lives in [src/lib/research/parsing.ts](/Users/creeda/creeda-app/src/lib/research/parsing.ts).

The parser converts abstract or permitted full text into normalized internal findings such as:

- `sleep_duration lt_6h -> fatigue_risk increases`
- `hrv downward_trend -> readiness decreases`
- `hydration_status dehydrated -> sprint_performance decreases`
- `acute_load spike_above_baseline -> injury_risk increases`

Unknown or malformed findings are rejected rather than silently accepted.

### 7. Scoring, Bundles, And Rules

- scoring: [src/lib/research/scoring.ts](/Users/creeda/creeda-app/src/lib/research/scoring.ts)
- bundles: [src/lib/research/bundles.ts](/Users/creeda/creeda-app/src/lib/research/bundles.ts)
- rules: [src/lib/research/rules.ts](/Users/creeda/creeda-app/src/lib/research/rules.ts)

Scoring considers:

- study type
- sample size
- recency
- sport match
- population match
- replication count
- retraction or correction status

Bundles are the unit of trust for CREEDA. Single papers do not directly power recommendations.

Rules are deterministic JSON-based conditions evaluated against user signals. The rule engine decides the recommendation. An LLM may rewrite tone later, but it must not change the logic.

### 8. Service Layer

The orchestration layer lives in [src/lib/research/service.ts](/Users/creeda/creeda-app/src/lib/research/service.ts).

Implemented internal services:

- `syncPubMed()`
- `syncCrossref()`
- `syncEuropePMC()`
- `syncOpenAlex()`
- `syncSemanticScholar()`
- `canonicalizeNewRecords()`
- `parsePendingResearch()`
- `scorePendingPapers()`
- `buildPendingBundles()`
- `publishApprovedRules()`
- `evaluateUserSignals()`
- `writeDecisionAuditLog()`
- `traceRecommendationToBundle()`
- `traceBundleToPapers()`

### 9. Internal Admin Routes

Protected internal routes:

- `GET /api/internal/research/papers`
- `GET /api/internal/research/bundles`
- `GET /api/internal/research/rules`
- `GET /api/internal/research/trace`
- `POST /api/internal/research/sync`
- `POST /api/internal/research/parse`
- `POST /api/internal/research/publish`

All of these require `RESEARCH_INTERNAL_API_TOKEN`.

## Environment Variables

Required:

- `DATABASE_URL`
- `RESEARCH_INTERNAL_API_TOKEN`

Optional:

- `RESEARCH_REDIS_URL`
- `RESEARCH_OPENALEX_API_KEY`
- `RESEARCH_SEMANTIC_SCHOLAR_API_KEY`
- `RESEARCH_ENABLE_OPENALEX=true|false`
- `RESEARCH_ENABLE_SEMANTIC_SCHOLAR=true|false`
- `RESEARCH_ENABLE_SEMANTIC_RETRIEVAL=true|false`
- `RESEARCH_CONTACT_EMAIL`
- `RESEARCH_PUBMED_QUERY`

## Local Setup

Install dependencies:

```bash
npm install
```

Validate and generate Prisma:

```bash
npm run prisma:validate
npm run prisma:generate
```

Apply migrations:

```bash
npx prisma migrate deploy
```

Seed the research subsystem:

```bash
npm run seed:research-intelligence
```

Run tests:

```bash
npm test
```

Typecheck:

```bash
npm run typecheck
```

## Ingestion Flow

1. Source adapter fetches metadata.
2. Raw source payload is stored in `research_paper_source_records`.
3. `canonicalizeNewRecords()` merges duplicate records into `research_papers`.
4. Access policy is resolved.
5. Abstracts are parsed immediately.
6. Full text is fetched only if policy allows it.
7. Findings are normalized into `research_findings`.
8. Papers are scored.
9. Bundles are built from multiple supporting papers.
10. Only approved bundles can back approved rules.
11. `evaluateUserSignals()` executes rules and writes audit logs.

## Access Policy Rules

- metadata may be stored when source terms allow it
- full text may only be fetched when open access or explicitly licensed
- blocked full text never enters the parser
- evidence passages are only stored when passage storage is allowed
- access decisions keep a stored reason and audit payload

## Starter Bundles

The initial bundle templates are defined in [src/lib/research/config.ts](/Users/creeda/creeda-app/src/lib/research/config.ts):

- `fatigue_sleep_load_v1`
- `readiness_hrv_soreness_mood_v1`
- `hydration_status_performance_v1`
- `illness_recovery_redflags_v1`
- `injury_risk_load_spike_v1`

## Starter Rules

The starter seeded rules are defined in [src/lib/research/seed.ts](/Users/creeda/creeda-app/src/lib/research/seed.ts) and cover:

- low sleep + high load + low HRV
- low HRV + high soreness + low mood
- low hydration
- illness flag
- acute load spike over chronic baseline

## Output Rules

End users should only see short, supportive, action-ready phrasing such as:

- `Recovery is reduced today. Keep training light.`
- `Fatigue is building. Prioritize recovery.`
- `Hydration is below target. Rehydrate before your next session.`

They must not see:

- paper titles
- journals
- citations
- effect sizes
- academic uncertainty language

The athlete and individual dashboard copy was adjusted so the product no longer exposes research references directly in those user-facing paths.

## Queue System

BullMQ scaffolding lives in [src/lib/research/queues.ts](/Users/creeda/creeda-app/src/lib/research/queues.ts).

Queues:

- `research-sync`
- `research-parse`
- `research-score`
- `research-bundle`
- `research-publish`

These require `RESEARCH_REDIS_URL`.

## Example JSON

Example files live in [docs/research-intelligence/examples](/Users/creeda/creeda-app/docs/research-intelligence/examples):

- [canonical-paper.example.json](/Users/creeda/creeda-app/docs/research-intelligence/examples/canonical-paper.example.json)
- [finding.example.json](/Users/creeda/creeda-app/docs/research-intelligence/examples/finding.example.json)
- [bundle.example.json](/Users/creeda/creeda-app/docs/research-intelligence/examples/bundle.example.json)
- [rule.example.json](/Users/creeda/creeda-app/docs/research-intelligence/examples/rule.example.json)
- [decision-audit-log.example.json](/Users/creeda/creeda-app/docs/research-intelligence/examples/decision-audit-log.example.json)

## Test Coverage

Jest coverage in [src/lib/research/__tests__](/Users/creeda/creeda-app/src/lib/research/__tests__) includes:

- taxonomy normalization
- access policy
- canonicalization and deduplication
- scoring
- rule evaluation
- parsing snapshots
- source-ingestion adapters with mocked APIs
- seeded rule regressions

## Notes On Indian Research Coverage

Indian sports science, physiotherapy, and medical journals are supported through the metadata adapters and the normalization layer. This system does not assume blanket full-text reuse rights for those journals. They are discoverable and enrichable, but full-text parsing still depends on explicit license and access-policy approval.
