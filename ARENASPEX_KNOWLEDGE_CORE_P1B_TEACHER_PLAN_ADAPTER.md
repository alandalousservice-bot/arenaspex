# ArenaSPEX Knowledge Core P1B — Read-only Teacher Plan Semantic Adapter

## Purpose

P1B provides an internal, deterministic semantic projection of an existing Teacher Learning Plan against one Pedagogical Knowledge Core release. It explains safe ObjectiveConcept resolution, LearningRequirement coverage, unmapped or ambiguous objectives, and integration-cycle coverage without changing the source plan.

The Grade 1 / Domain 1 P1A catalog remains the frozen gold pilot: three CompetencyComponents, four approved LearningRequirements, seven ObjectiveConcepts, seven approved ObjectiveVariants, no approved ObjectiveKeys, and a complete requirement set.

## Input contract

`projectTeacherPlanSemantics` accepts:

- the requested immutable catalog and `coreReleaseId`;
- `gradeId`, `domainId`, and `finalCompetencyId`;
- one normalized Teacher Learning Plan domain;
- its existing objectives, `sourceReferenceId` values, optional future/test-only explicit `objectiveConceptId`, and integration anchors.

The contract reuses the existing Teacher Learning Plan objective and integration shapes. It does not duplicate or replace the persisted plan model.

## Resolution precedence

Resolution is deterministic and stops at the first safe match:

1. A compatible explicit ObjectiveConcept reference receives `exact`.
2. One of the seven approved stable Grade 1 / Domain 1 `sourceReferenceId` mappings receives `source_reference`.
3. A single compatible approved catalog alias receives `alias`.
4. An explicit reviewed historical mapping receives `reviewed_mapping`.
5. Otherwise the objective receives `unmapped`.

The reviewed historical mapping table is deliberately empty in P1B because no additional evidence-backed historical identifier was found. P1B does not invent one merely to improve coverage.

Text is never authoritative identity. No fuzzy matching is used. Teacher wording can change freely while a stable safe source reference continues to identify the same ObjectiveConcept.

## Output contract

The immutable projection reports:

- scope identity and release;
- one resolution per TeacherObjective, including status, reason, concept, requirements, and components;
- required, covered, missing, and reinforced LearningRequirements;
- unmapped and ambiguous objectives;
- authoritative coverage status and explanatory percentage;
- derived integration cycles;
- diagnostic and summative semantic scopes;
- structured errors and warnings.

The adapter delegates requirement completeness to the existing Competency Coverage Engine. It does not implement a second coverage algorithm.

## Historical compatibility

Historical plans with only `sourceReferenceId` remain resolvable. Teacher-edited wording does not invalidate a stable source reference. Enriched fields and competency component snapshots are retained in the input but never rewritten. Custom counts of 6, 7, 8, or 10 objectives can all be semantically complete when their resolved concepts collectively cover the same four requirements.

Malformed or incompatible identities are reported rather than repaired. Unknown releases, wrong grade/domain scope, mismatched FinalCompetency, duplicate objective IDs, broken integration anchors, and anchors without preceding objectives produce structured errors and an indeterminate projection.

## Alias behavior

Aliases are accepted only when one legacy ID resolves to one compatible, approved ObjectiveConcept in the requested release and scope. Multiple targets produce `ambiguous`; the adapter never selects one silently. Unknown aliases remain unmapped and cannot satisfy coverage.

## Custom objective behavior

A custom TeacherObjective remains valid planning content. Without an explicit semantic reference, approved source reference, approved alias, or reviewed mapping, it is classified `unmapped`. This does not throw, reject the plan, block saving, or mutate the objective. It contributes no false requirement evidence.

## Coverage integration

Resolved ObjectiveConcept IDs are converted to the existing Coverage Engine input. Only approved authoritative concepts and requirements can satisfy coverage. The engine continues to decide `complete`, `partial`, `unmapped`, or `indeterminate`; percentage is explanatory only.

## Integration-cycle derivation

Integration cycles are computed from the current ordered objectives and `afterObjectiveId` anchors. Each projection lists the TeacherObjectives, resolved ObjectiveConcepts, and union of previously constructed LearningRequirements in that cycle. No LearningCycle is persisted and integration introduces no new requirement.

Moving an anchor changes only the returned projection. P1B never moves or saves the anchor.

## Objective 7 mismatch

The canonical current plan places the second integration anchor after Objective 6. Objective 7 therefore remains outside both derived integration cycles. P1B reports `objective_outside_integration_cycles` with the affected objective ID. It does not automatically move Objective 7 or change production planning behavior.

## Diagnostic and summative scope

Read-only helpers project both diagnostic and summative scope as the FinalCompetency plus all four approved LearningRequirements. They do not create observations, assessment sessions, CriterionResults, or Gradebook mappings.

## Validation rules

- Requested release, grade, domain, and FinalCompetency must agree with the catalog and plan domain.
- Explicit semantic references must identify approved concepts in the requested scope.
- TeacherObjective IDs must be unique.
- Integration anchors must identify an objective at or after the current cycle boundary.
- A null anchor is reported as an integration with no preceding objectives.
- Objectives not included in any valid cycle are reported as warnings.
- Normal custom objectives and unknown source references remain non-throwing.

## Purity and non-mutation

The adapter is synchronous, side-effect free, database independent, network independent, and deterministic. It performs no writes and does not mutate the plan or catalog. Equivalent input produces equivalent output.

## Known limitations

- The pilot supports only the completed P1A Grade 1 / Domain 1 catalog.
- There are no additional reviewed historical mappings beyond the approved stable source references and aliases.
- Text similarity is diagnostic-only and is not currently emitted as a score.
- Objective 7 placement is reported but intentionally unresolved.
- SituationAlignment, criteria/indicator mapping, assessment evidence, and runtime UI are outside P1B.
- Invalid scope yields a diagnostic projection, not automatic catalog discovery.

## Boundary between P1B and runtime integration

P1B is exported only from the knowledge-core boundary and consumed by tests. It is not imported by React components, API routes, Teacher Learning Plan persistence, Annual Plan, Annual Distribution, Daily Notebook, Lesson Memo, Gradebook, Assessment, or Educational Situation selection. It adds no Prisma model, migration, database read/write, endpoint, UI, or saved semantic ID.

## Recommended P1C

Before any production activation, complete a read-only compatibility audit over de-identified historical plan shapes and approve any genuinely required historical mapping identifiers. Then design an explicit opt-in internal observability boundary that can calculate P1B projections without affecting saves, generation, scheduling, assessment, or teacher-visible behavior. SituationAlignment and criteria/indicator activation should remain separate governed phases.
