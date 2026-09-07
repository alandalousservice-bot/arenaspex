# ArenaSPEX Pedagogical Knowledge Core — P1C Domain 1 Grades 2–5

## 1. Scope

This sprint expands the read-only Pedagogical Knowledge Core for `f_locomotion` from the frozen Grade 1 pilot to Grades 2–5. It models grade-scoped competency identity, components, learning requirements, objective concepts, wording variants, semantic coverage, integration-cycle audits, and diagnostic/summative scopes. It does not activate the adapter in production and does not change Prisma, migrations, APIs, UI, persistence, planning behavior, assessment, or situations.

Source priority was preserved: the attached ArenaSPEX knowledge-core reference establishes the conceptual rules; `annualPlanReference.ts` supplies the official grade/domain wording; `domainOneLearningSectionReference.ts` supplies adopted stable component identities; and `algerianCurriculum.ts` is operational evidence rather than automatically canonical. Provenance therefore remains explicit rather than collapsing all sources into one authority level.

## 2–5. Identity reconciliation

| Grade | Canonical FinalCompetency | Official wording | Operational representation | Classification |
|---|---|---|---|---|
| Grade 2 | `fc_lvl_p2_f_locomotion` | يعدل في الوقت المناسب وضعيته وتنقلاته من موقف إلى آخر. | التحكم في وضعيات الجسم والتنقلات الأساسية. | `SEMANTIC_MATCH_WORDING_DIFFERS` |
| Grade 3 | `fc_lvl_p3_f_locomotion` | يركب جملة من العمليات وينفذها وفق ما يتطلبه الموقف. | التحكم في التنقلات المختلفة واستعمال الفضاء بطريقة فعالة. | `CONFLICT` |
| Grade 4 | `fc_lvl_p4_f_locomotion` | ينجز مختلف الحركات فرديا وجماعيا ويحافظ على ترابطها. | إتقان التنقلات المركبة والتكيف مع مختلف الوضعيات الحركية. | `CONFLICT` |
| Grade 5 | `fc_lvl_p5_f_locomotion` | ينجز مختلف الوضعيات والتنقلات في الرياضات الفردية والألعاب الجماعية محافظا على ترابطها، ويلائم وضعية جسمه حسب الموقف. | توظيف الوضعيات والتنقلات المركبة في مواقف إدماجية مع التحكم في الجسم. | `CONFLICT` |

The canonical identities are grade-scoped. The two reviewed source representations per grade are retained as aliases to the canonical FinalCompetency. No cross-grade identity is collapsed.

## 6. FinalCompetencies

All four FinalCompetencies are `official_source`, `approved`, and linked to the official annual-plan reference. Each has its own `requirementSetStatus: complete`. Operational wording is retained as metadata, not substituted for the canonical wording.

## 7. CompetencyComponents

Each grade preserves the three stable component IDs already adopted by the Domain 1 Learning Section reference:

- `learning-section:{gradeId}:f_locomotion:component:1`
- `learning-section:{gradeId}:f_locomotion:component:2`
- `learning-section:{gradeId}:f_locomotion:component:3`

Their provenance is conservatively classified as `reviewed_derived / approved`; they are not claimed as verbatim official text.

## 8–9. LearningRequirement matrices and completeness

### Grade 2

| Requirement | Component links |
|---|---|
| posture-and-movement-selection | 1, 2 |
| body-control-and-transition | 1, 2 |
| spatial-and-organizational-adaptation | 1, 2, 3 |
| peer-safety-and-rules | 2, 3 |

### Grade 3

| Requirement | Component links |
|---|---|
| progressive-running-control | 1, 2 |
| stationary-throwing-control | 1, 2 |
| operation-sequencing-and-adaptation | 1, 2 |
| instructions-and-safety | 2, 3 |

### Grade 4

| Requirement | Component links |
|---|---|
| running-posture-and-step | 1, 2 |
| limb-coordination-across-paths | 1, 2 |
| pace-and-group-cohesion | 1, 2, 3 |
| linked-individual-and-collective-execution | 1, 2, 3 |

### Grade 5

| Requirement | Component links |
|---|---|
| sport-specific-body-positioning | 1, 2, 3 |
| coordination-balance-and-flow | 1, 2 |
| propulsion-sequence-and-transition | 1, 2 |
| coherent-individual-and-team-adaptation | 1, 2, 3 |

Evidence review yielded four non-redundant requirements for each grade; equal counts are an evidence result, not a structural constraint. Every requirement is stable across lesson wording/count, broader than one exercise, and linked N:M with components. All four grade sets are `complete`; draft and unresolved counts are zero.

## 10. ObjectiveConcept mappings

Each grade has seven grade-scoped, approved `reviewed_derived` ObjectiveConcepts. Concepts map N:M to requirements and components. The canonical explicit-concept fixtures resolve exactly and cover all four requirements. Split fixtures with eight objectives and merged fixtures with six objectives also cover 4/4, proving that completeness depends on requirement coverage rather than objective count.

Safe operational `sourceReferenceId` mappings were added only for Grade 2 (`f_locomotion__2`, `__3`, `__4`, `__6`, `__7`, `__8`, `__9`). Grades 3–5 intentionally have no authoritative source-reference mapping because their current runtime wording conflicts with the annual-plan/domain reference. Their current operational fixtures remain visibly `unmapped` and non-blocking rather than receiving false matches.

## 11. ObjectiveVariant audit

Each canonical concept has one approved Arabic (`ar-DZ`) reference variant, for 28 approved variants total. Variants are exact reviewed semantic representations; no fuzzy or text-similarity authority is introduced.

## 12. ObjectiveKey status

No ObjectiveKeys were created: approved 0, draft 0, rejected/speculative 0. Evidence remains insufficient, and keys are not required for requirement completeness.

## 13. Teacher Plan Adapter results

The P1B precedence remains unchanged: explicit concept → stable source reference → approved alias → reviewed mapping → unmapped. Catalog-supplied source mappings now support expansion without hard-coding Grades 2–5 into adapter logic. Grade 1 retains its frozen fallback mappings and tests. The adapter still has zero production imports.

| Fixture | G2 | G3 | G4 | G5 |
|---|---|---|---|---|
| Canonical explicit concepts | complete 4/4 | complete 4/4 | complete 4/4 | complete 4/4 |
| Split equivalent (8 objectives) | complete 4/4 | complete 4/4 | complete 4/4 | complete 4/4 |
| Merged equivalent (6 objectives) | complete 4/4 | complete 4/4 | complete 4/4 | complete 4/4 |
| Current runtime source references | safely resolved | unmapped conflict | unmapped conflict | unmapped conflict |

An unknown custom objective remains `unmapped`, does not fabricate coverage, and does not throw.

## 14. Integration semantic audits

For each grade, the canonical seven-objective fixture was audited read-only with two integration anchors after objectives 3 and 6. It produces two cycles of three objectives each; objective 7 remains outside both cycles and is reported as a warning. Every cycle's requirements are derived solely from its objectives, and integration introduces no new requirement. No anchors are moved automatically. The existing Grade 1 objective-7 warning remains unchanged.

## 15–16. Diagnostic and summative scopes

For every completed grade, both scopes contain the canonical FinalCompetency plus the full four-item approved LearningRequirement set. No runtime assessment or Gradebook integration was introduced.

## 17. Domain 1 Grades 1–5 progression matrix

| Grade | Semantic emphasis | Supported progression from prior grade |
|---|---|---|
| G1 | Natural postures, basic locomotion, simple direction/path, safe organization | Gold pilot foundation |
| G2 | Timely selection and adjustment of posture/movement, transitions, spatial organization, peer safety | Increased control and adaptation to the immediate situation |
| G3 | Progressive running, stationary throwing, sequencing both operations, safety instructions | Moves from selecting locomotion to composing running/throwing operations |
| G4 | Running posture/step, limb coordination across paths, pace, individual/group cohesion | Increased technical control, path complexity, pace, and collective synchronization |
| G5 | Sport-specific positioning, coordination/balance/flow, propulsion transitions, individual/team adaptation | Integrates running, jumping, and throwing into coherent individual and team sport situations |

This progression is evidence-backed and descriptive; it is not a synthetic taxonomy and does not merge grade-specific identities.

## 18. Cross-grade conflicts

- Grade 2 official and operational representations are semantically compatible but differ in wording and breadth.
- Grade 3 official/adopted evidence centers on composing running and throwing; current runtime objectives remain generic posture/movement/path objectives.
- Grade 4 official/adopted evidence centers on running mechanics, paths, pace, and group cohesion; current runtime objectives remain generic positions and paths.
- Grade 5 official/adopted evidence integrates running, jumping, and throwing in individual/team sport; current runtime objectives remain generic complex positions and paths.

These conflicts block automatic source-reference mapping for Grades 3–5 but do not block canonical knowledge modeling or explicit-concept semantic coverage.

## 19. Unresolved evidence

- The current Grades 3–5 runtime objective sequence/source identities require a separate pedagogical reconciliation before authoritative mapping or activation.
- Exact page-level citations to originating ministry documents are not encoded in the repository transcription.
- Criteria and indicators remain documented annual-plan knowledge only and are not activated or mapped.
- ObjectiveKeys remain unsupported.
- Objective 7 placement outside current two-cycle integration anchors remains a planning issue.
- SituationAlignment remains unimplemented by design.

## 20. Recommended next sprint

P1D should be a read-only Grades 3–5 runtime reconciliation sprint: compare each operational objective and stable source ID with the approved P1C concepts, propose retain/replace/alias decisions, and obtain pedagogical review before any production mapping or activation. It should preserve planning persistence and execution rules until that review closes the documented conflicts.
