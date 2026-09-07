# ArenaSPEX Pedagogical Knowledge Core — P1D

## 1. Scope

P1D reconciles the approved Domain 1 knowledge identities with the operational references currently emitted for Grades 1–5. It is read-only: no curriculum source, Teacher plan, annual distribution, class session, notebook, memo, API, UI, or persisted data is rewritten. The P1A and P1C catalogs remain frozen.

##  2. Source-identity graph

1. 'src/data/algerianCurriculum.ts' defines each 'f_locomotion.sessionsList' entry.
2. 'seedTeacherLearningPlan()' filters seven learning sessions and emits:
   - sourceReferenceId: 'f_locomotion__{sessionNumber}'
   - objective ID: 'teacher-objective:{levelId}:f_locomotion:{sessionNumber}'
   - current source wording or a Teacher-owned wording override.
3. 'teacherPlanSequence()' retains the Teacher objective as objectiveId/objectiveGroupId and creates two meetings for Grades 1–4 or one for Grade 5.
4. 'canonicalPlanningSessions()' emits '{levelId}:f_locomotion:objective:{teacherObjectiveId}[:meeting:{1|2}]'.
5. 'buildAnnualDistributionWeeks()' projects the same identity into level/week units and slots.
6. Class materialization copies the canonical referenceSessionId into ClassPlannedSession.
7. Daily Notebook and Lesson Memo resolve the class session through that reference and canonical planning context.
8. The internal semantic adapter resolves the original sourceReferenceId only through explicit approved grade/domain mappings. Wording is never treated as identity.

The Grade 3–5 divergence originates in 'algerianCurriculum.ts' and propagates through Teacher plan seeding and canonical session generation.

## 3. Grade 1 status

All seven operational wordings exactly match frozen P1A ObjectiveConcepts. Their source IDs are deterministic aliases. The operational FinalCompetency is narrower than the canonical reference, but generated objectives align; impact is display/reference wording only.

## 4. Grade 2 reconciliation

All seven objectives are semantically compatible: three exact aliases and four reviewed wording mappings. The P1C mapping remains sufficient; no Teacher wording rewrite is needed.

## 5. Grade 3 reconciliation

The approved reference progresses through running and stationary throwing, then combines them. The operational source teaches generic postures, directional locomotion, balance, speed, and paths. Six entries require later replacement; one speed objective partially overlaps running but needs a product decision. No reference is safe to map.

## 6. Grade 4 reconciliation

The approved reference focuses on running posture/step, limb coordination, pace, and individual/group cohesion. The operational source remains generic posture/balance/locomotion. Five entries require replacement. Curved-path and speed entries need product decisions; neither can safely claim body/limb or group-cohesion requirements.

## 7. Grade 5 reconciliation

The approved reference integrates sport-specific running, jumping, throwing, transitions, and individual/team adaptation. The operational source focuses on balance, paths, obstacles, and generic compositions. Three entries require replacement and four overlaps require product decisions. No one-to-one mapping is safe.

## 8. Objective-by-objective decision matrix

The registry stores full operational wording, exact candidate ID, inherited canonical requirement IDs, evidence, and risk. The compact matrix below uses C1–C7 for the grade-scoped ObjectiveConcepts.

### Grade 1

| Source | Candidate | Classification | Decision | Alias/map | Replacement | Evidence/risk |
|---|---|---|---|---|---|---|
| __2 | C1 | EXACT_MATCH | ALIAS | yes/no | no | exact frozen wording / low |
| __3 | C2 | EXACT_MATCH | ALIAS | yes/no | no | exact frozen wording / low |
| __4 | C3 | EXACT_MATCH | ALIAS | yes/no | no | exact frozen wording / low |
| __6 | C4 | EXACT_MATCH | ALIAS | yes/no | no | exact frozen wording / low |
| __7 | C5 | EXACT_MATCH | ALIAS | yes/no | no | exact frozen wording / low |
| __8 | C6 | EXACT_MATCH | ALIAS | yes/no | no | exact frozen wording / low |
| __9 | C7 | EXACT_MATCH | ALIAS | yes/no | no | exact frozen wording / low |

### Grade 2

| Source / wording | Candidate | Classification | Decision | Alias/map | Replacement | Evidence/risk |
|---|---|---|---|---|---|---|
| __2 / varied postures under instructions | C1 | SEMANTIC_MATCH_WORDING_DIFFERS | REVIEWED_MAP | no/yes | no | examples preserve concept / low |
| __3 / organized smooth transition | C2 | EXACT_MATCH | ALIAS | yes/no | no | identical wording / low |
| __4 / forward/backward/lateral movement | C3 | EXACT_MATCH | ALIAS | yes/no | no | identical wording / low |
| __6 / direction change in bounded space | C4 | EXACT_MATCH | ALIAS | yes/no | no | identical wording / low |
| __7 / speed change by signal/situation | C5 | SEMANTIC_MATCH_WORDING_DIFFERS | REVIEWED_MAP | no/yes | no | same adaptation meaning / low |
| __8 / linked posture/movement path | C6 | SEMANTIC_MATCH_WORDING_DIFFERS | REVIEWED_MAP | no/yes | no | same organized-path meaning / low |
| __9 / combined posture/movement sequence | C7 | SEMANTIC_MATCH_WORDING_DIFFERS | REVIEWED_MAP | no/yes | no | same sequence meaning / low |

### Grade 3

| Source / wording | Candidate | Classification | Decision | Alias/map | Replacement | Evidence/risk |
|---|---|---|---|---|---|---|
| __2 / postures, balance, stability | — | DIFFERENT_MEANING | REPLACE_LATER | no/no | yes | approved start is progressive running / high |
| __3 / fast transitions between postures | — | DIFFERENT_MEANING | REPLACE_LATER | no/no | yes | not walk-to-jog progression / high |
| __4 / directional locomotion | — | DIFFERENT_MEANING | REPLACE_LATER | no/no | yes | not graded running / high |
| __6 / direction and path changes | — | DIFFERENT_MEANING | REPLACE_LATER | no/no | yes | stationary throwing absent / high |
| __7 / speed variation | C3 | PARTIAL_OVERLAP | PRODUCT_DECISION_REQUIRED | no/no | no | progression unproven / medium |
| __8 / posture-locomotion sequence | C6 | NARROWER_THAN_CORE_CONCEPT | REPLACE_LATER | no/no | yes | throwing absent / high |
| __9 / balance/direction path | C7 | DIFFERENT_MEANING | REPLACE_LATER | no/no | yes | running/throwing synthesis absent / high |

### Grade 4

| Source / wording | Candidate | Classification | Decision | Alias/map | Replacement | Evidence/risk |
|---|---|---|---|---|---|---|
| __2 / balance postures | C1 | PARTIAL_OVERLAP | REPLACE_LATER | no/no | yes | running step mechanics absent / high |
| __3 / fast precise posture transitions | C2 | PARTIAL_OVERLAP | REPLACE_LATER | no/no | yes | running limb action absent / high |
| __4 / directional locomotion | C3 | DIFFERENT_MEANING | REPLACE_LATER | no/no | yes | differs from straight-axis running / high |
| __6 / curved and changing paths | C4 | PARTIAL_OVERLAP | PRODUCT_DECISION_REQUIRED | no/no | no | movement/body control unspecified / medium |
| __7 / speed variation | C6 | NARROWER_THAN_CORE_CONCEPT | PRODUCT_DECISION_REQUIRED | no/no | no | group synchronization absent / medium |
| __8 / balance-locomotion sequence | C7 | DIFFERENT_MEANING | REPLACE_LATER | no/no | yes | group-running synthesis absent / high |
| __9 / posture-balance path | C7 | DIFFERENT_MEANING | REPLACE_LATER | no/no | yes | pace/cohesion absent / high |

### Grade 5

| Source / wording | Candidate | Classification | Decision | Alias/map | Replacement | Evidence/risk |
|---|---|---|---|---|---|---|
| __2 / static and dynamic balance | C3 | BROADER_THAN_CORE_CONCEPT | PRODUCT_DECISION_REQUIRED | no/no | no | not specifically jump/landing / medium |
| __3 / balanced posture transitions | C1 | PARTIAL_OVERLAP | PRODUCT_DECISION_REQUIRED | no/no | no | sport context absent / medium |
| __4 / straight/curved paths | C1 | DIFFERENT_MEANING | REPLACE_LATER | no/no | yes | run/jump/throw adaptation absent / high |
| __6 / obstacles and balance | C3 | PARTIAL_OVERLAP | PRODUCT_DECISION_REQUIRED | no/no | no | jumping phases/landing unproven / medium |
| __7 / locomotion-jump sequence | C5 | NARROWER_THAN_CORE_CONCEPT | PRODUCT_DECISION_REQUIRED | no/no | no | throwing absent / medium |
| __8 / balance-locomotion composition | C6 | NARROWER_THAN_CORE_CONCEPT | REPLACE_LATER | no/no | yes | sport/team scope absent / high |
| __9 / invented complex path | C7 | DIFFERENT_MEANING | REPLACE_LATER | no/no | yes | coherent sport/team execution absent / high |

## 9. Safe aliases

Ten aliases are safe: all seven Grade 1 references and Grade 2 references __3, __4, and __6. They express identity only and do not rewrite persisted IDs or wording.

## 10. Reviewed mappings

Four Grade 2 references are reviewed wording mappings: __2, __7, __8, and __9. P1C already contains the complete approved Grade 2 mapping set, so P1D adds no duplicate and does not change the frozen catalog.

## 11. Unsafe mappings

All 21 Grade 3–5 references remain unmapped. A candidate in the matrix is analytical evidence only; it grants no coverage. Textual similarity and partial overlap are never authoritative.

## 12. Operational references requiring later replacement

Fourteen references are REPLACE_LATER:

- Grade 3: __2, __3, __4, __6, __8, __9.
- Grade 4: __2, __3, __4, __8, __9.
- Grade 5: __4, __8, __9.

Replacement must occur in a separate approved source/runtime sprint, with compatibility for saved Teacher-owned data.

## 13. Adapter results before/after mappings

| Grade | Before reviewed mappings | After safe mappings | Resolved | Unmapped | Ambiguous | Coverage |
|---|---|---|---:|---:|---:|---|
| G1 | existing frozen P1B mapping | unchanged | 7 | 0 | 0 | complete 4/4 |
| G2 | 0 resolved / unmapped | approved P1C source map | 7 | 0 | 0 | complete 4/4 |
| G3 | unmapped | unchanged | 0 | 7 | 0 | unmapped |
| G4 | unmapped | unchanged | 0 | 7 | 0 | unmapped |
| G5 | unmapped | unchanged | 0 | 7 | 0 | unmapped |

## 14. FinalCompetency conflict impact

| Grade | Classification | Impact |
|---|---|---|
| G1 | DISPLAY_ONLY | Narrower operational FinalCompetency; learning objectives align. |
| G2 | DISPLAY_ONLY | Wording differs, but all objectives map safely. |
| G3 | DOWNSTREAM_BEHAVIOR_CONFLICT | Source conflict changes generated Teacher objectives and downstream session content. |
| G4 | DOWNSTREAM_BEHAVIOR_CONFLICT | Source conflict changes generated Teacher objectives and downstream session content. |
| G5 | DOWNSTREAM_BEHAVIOR_CONFLICT | Source conflict changes generated Teacher objectives and downstream session content. |

## 15. Objective 7 root-cause analysis

Each Domain 1 source has one explicit integration entry. During Teacher plan seeding, 'integrationPoints.length < 2' triggers a shared fallback. The second integration is anchored to 'objectives.at(-2)', the sixth of seven objectives. The adapter therefore derives:

- Cycle 1: objectives 1–3.
- Cycle 2: objectives 4–6.
- Objective 7: outside both cycles.

This is caused by fallback anchor placement, not objective order, summative handling, or class materialization.

## 16. Integration-cycle decision

The coherent conceptual model is that Cycle 1 contains objectives before Integration 1 and Cycle 2 contains objectives after Integration 1 through Integration 2. Every learning objective should be integrated before summative unless an explicit pedagogical exception exists. No such justification was found for Objective 7, so the current state is classified PLACEMENT_DEFECT. P1D does not move it.

## 17. Shared cross-grade root cause

The same 'seedTeacherLearningPlan()' fallback is reused for Grades 1–5, producing anchors [3, 6] and leaving objective 7 outside. The cause is shared and deterministic.

## 18. Teacher-data compatibility implications

Future source correction must preserve Teacher-created objective count, wording, order, notes, situations, and integration positions. Reference correction applies to future/default source generation. Existing Teacher-owned values require explicit opt-in migration rules and must never be overwritten by positional matching.

## 19. Exact production migration candidates

1. Replace the 14 REPLACE_LATER default operational objectives listed in section 12.
2. Resolve the seven PRODUCT_DECISION_REQUIRED entries before deciding replacement or reviewed mapping:
   - G3 __7.
   - G4 __6 and __7.
   - G5 __2, __3, __6, and __7.
3. Reconcile Grade 3–5 operational FinalCompetency display/source wording with the approved canonical identities.
4. Correct the shared default Integration 2 anchor only after product/pedagogical approval.
5. Preserve legacy sourceReferenceId compatibility through deterministic grade/domain metadata.

## 20. Items that must NOT be migrated

- Teacher-authored wording, order, counts, notes, situations, or explicit integration positions.
- Existing ClassPlannedSession dates, status, timetable realization, attendance, notebook, memo, or assessment data.
- Grade 1 frozen semantic identities.
- Grade 2 wording, which is already safely reconciled by identity metadata.
- Objective IDs by array position.

## 21. Product decisions still required

- Whether each of the seven partial/broader/narrower overlaps should be replaced or approved as a deliberately narrower operational variant.
- Whether Objective 7 must move inside Integration 2 for all grades or whether an explicit post-integration pedagogical phase is intended.
- Whether Grade 3–5 default source correction applies only to newly seeded plans or is offered as a reviewed migration for untouched historical defaults.
- How to distinguish untouched defaults from Teacher-edited wording before any migration.

## 22. Recommended P1E

Run an approval-gated migration-design sprint. Freeze an authoritative Grade 3–5 replacement table, decide the seven overlap cases and Integration 2 boundary, design stable compatibility aliases, detect untouched defaults without positional heuristics, and dry-run impact on saved plans. Production activation should remain a separate sprint after the dry-run and Teacher-data safeguards pass.
