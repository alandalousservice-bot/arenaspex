# ArenaSPEX Pedagogical Knowledge Core — P0 Foundation

## Implementation boundary

P0 adds a code-hosted, typed pedagogical knowledge foundation. It is isolated from current runtime UI, APIs, Prisma models, Teacher Learning Plan persistence, planning/session generation, print documents, Gradebook, and the Educational Situations Bank.

No existing production module imports the new bounded module. P0 therefore provides validation and domain contracts without changing current product behavior.

## Catalog layout

```text
src/domain/pedagogicalKnowledge/
  aliases.ts
  catalog.ts
  index.ts
  provenance.ts
  types.ts
  engine/
    competencyCoverage.service.ts
  releases/
    p0GradeOneDomainOne.ts
```

The module supports Grades 1–5 and Domains 1–3 through generic IDs and scope fields. Only Grade 1 / Domain 1 is populated in the P0 pilot.

## CurriculumRelease format

The pilot manifest is `knowledge-core:v1.0-pilot`, version `1.0.0-pilot.0`.

It records:

- lifecycle status independent from academic year;
- optional applicable academic years;
- source-document metadata;
- provenance policy;
- creation/release dates;
- deterministic `fnv1a32-stable-json-v1` catalog hash.

The hash excludes the `catalogHash` field itself, sorts object keys, and preserves array order. It detects unintended catalog-content drift; it is not a cryptographic signature.

## Identity policy

- IDs are stable machine identities and never Arabic display text.
- Existing `lvl_p1` and `f_locomotion` IDs are preserved.
- Existing final competency ID `fc_lvl_p1_f_locomotion` is preserved.
- Existing Domain 1 component IDs are preserved exactly.
- Existing Teacher Learning Plan `sourceReferenceId` values resolve through an alias manifest.
- ObjectiveConcept identity remains stable if an approved wording changes or gains another ObjectiveVariant.

## Provenance policy

Supported origins:

- `official_source`
- `platform_decision`
- `reviewed_derived`
- `teacher_owned`
- `unresolved`

Supported review states:

- `draft`
- `reviewed`
- `approved`
- `deprecated`

Only approved `official_source`, `platform_decision`, or `reviewed_derived` records can satisfy authoritative coverage. Draft, reviewed-but-not-approved, unresolved, teacher-owned, and deprecated records cannot satisfy it. Approved records require reviewer and review-date metadata. Deprecated records remain historically resolvable.

## Alias strategy

Aliases map one historical ID to one canonical ID. Resolution:

- is deterministic;
- follows alias chains;
- rejects self-references;
- rejects cycles;
- rejects one legacy ID mapped to multiple canonical IDs;
- validates that catalog targets exist.

The P0 manifest maps the seven current `f_locomotion__N` learning-objective source references to seven ObjectiveConcept IDs. Existing saved plans are not rewritten.

## Grade 1 / Domain 1 pilot

The pilot contains:

- 1 CurriculumGrade;
- 1 OverallCompetency;
- 1 Domain;
- 1 FinalCompetency;
- 3 preserved CompetencyComponents;
- 3 approved reviewed-derived LearningRequirements;
- 2 ResourceDefinitions;
- 7 approved ObjectiveConcepts;
- 7 approved Arabic ObjectiveVariants;
- 7 draft ObjectiveKeys;
- 7 historical aliases;
- 0 populated CriterionDefinitions and IndicatorDefinitions pending reconciliation.

The three requirements cover only meanings safely reconciled from current source material:

1. recognizing and taking familiar/unfamiliar natural positions;
2. coordinating limbs, transitions, and movement according to the situation;
3. respecting instructions, general rules, and safety controls.

The final competency explicitly has `requirementSetStatus = incomplete`. P0 does not claim that these three records are the complete official requirement bank.

## Resource boundary

`ResourceDefinition` taxonomy exists in the catalog contract, but P0 does not migrate or reinterpret:

- `learningContent`;
- `pedagogicalKnowledge` / mobilized knowledge;
- `executionContent`;
- equipment;
- guidance;
- educational situations.

These remain distinct current fields and concepts.

## Criteria and indicators boundary

Typed `CriterionDefinition` and `IndicatorDefinition` contracts exist, but the pilot does not populate them because current sources differ. No relationship is assumed between canonical definitions and runtime `CriterionResult` / `C1`–`C4` identifiers. Assessment and Smart Gradebook remain unchanged.

## Coverage Engine contract

`calculateCompetencyCoverage` is a pure domain function. Its input includes:

- catalog and core release ID;
- grade, domain, and final competency IDs;
- teacher objectives with optional ObjectiveConcept ID;
- optional explicitly reviewed requirement IDs.

Its output includes:

- required, covered, missing, and reinforcement requirements;
- unmapped teacher-objective IDs;
- evidence grouped by requirement;
- optional explanatory percentage;
- status: `complete`, `partial`, `unmapped`, or `indeterminate`;
- reasons for an indeterminate result.

Completeness is set-based: every approved required LearningRequirement must be covered. Objective, lesson, week, and A/B meeting counts are irrelevant. The percentage is metadata, never the source of truth.

An ObjectiveConcept contributes only when both it and its linked requirement are valid, approved, in the requested active release, and in the requested grade/domain/final-competency scope. Custom unmapped teacher objectives remain valid teacher planning but do not create false semantic coverage.

## Indeterminate protection

The engine returns `indeterminate` when:

- the requested release is not active;
- the final competency is absent;
- the final competency's approved requirement set is incomplete or unresolved;
- no approved authoritative required records exist.

The P0 pilot therefore remains `indeterminate` even when all three currently encoded requirements are covered and the explanatory percentage is 100%.

## Validation and tests

Focused tests cover:

- catalog integrity, immutability, and deterministic hash;
- provenance rules;
- stable IDs;
- deterministic aliases, cycles, and ambiguity;
- Grade 1 / Domain 1 pilot scope;
- ObjectiveConcept-to-requirement links;
- N:M component/requirement relationships;
- complete, partial, reinforcement, unmapped, and indeterminate coverage;
- exclusion of draft, unresolved, and deprecated records;
- equal semantic completeness for six and ten objectives covering the same requirement set.

Existing suites remain the compatibility authority for Teacher Learning Plan, Learning Sections, Annual Distribution, Daily Notebook, Lesson Memo, Educational Situations, Gradebook/assessment, A/B behavior, and Grade 5 behavior.

## Unresolved pedagogical content

- The complete reviewed LearningRequirement set for Grade 1 / Domain 1.
- The complete ObjectiveKey wording and approval.
- Canonical criteria/indicator identity and their mapping to requirements.
- Any linkage between canonical criteria and runtime `C1`–`C4` results.
- Situation-to-requirement relevance and governance rules.
- Governance override policy for incomplete coverage.

None of these unresolved items participates in authoritative P0 coverage.

## Recommended P1 boundary

P1 should remain code-hosted and additive:

1. pedagogically review and complete the Grade 1 / Domain 1 requirement set;
2. approve or replace ObjectiveKeys;
3. add a read-only coverage preview adapter behind a disabled/internal feature boundary;
4. validate compatibility against historical Teacher Learning Plans using aliases;
5. define, but do not yet persist, the governed SituationAlignment contract centered on a required LearningRequirement.

Prisma SituationAlignment, DiagnosticObservation, visible teacher warnings, blocking validation, and runtime API switching remain outside P1 until separately approved.
