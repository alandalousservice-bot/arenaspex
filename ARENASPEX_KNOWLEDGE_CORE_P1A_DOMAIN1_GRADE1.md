# ArenaSPEX Knowledge Core P1A Grade 1 Domain 1 Semantic Completion

## 1 Frozen canonical identity

- Grade: `lvl_p1`
- Domain: `f_locomotion`
- FinalCompetency: `fc_lvl_p1_f_locomotion`
- Canonical wording: `يتخذ وضعيات وهيآت طبيعية لها علاقة مع محيطه المباشر.`
- Release: `knowledge-core:v1.1-g1-d1`

P1A is a new immutable catalog release. The closed P0 release remains unchanged and retains its `incomplete` requirement-set status.

## 2 FinalCompetency

The final competency requires the learner to recognize and assume natural positions and postures in relation to the immediate environment. Its meaning includes the bodily organization and movement resources identified by the adopted components and the Annual Plan source. P1A does not replace the narrower operational wording still used by `algerianCurriculum.ts`.

The P1A final competency has `requirementSetStatus = complete` because the four approved requirements below collectively cover every distinct meaning evidenced by the three components, the reference resources, and the seven adopted ObjectiveConcepts.

## 3 CompetencyComponents

| ID | Wording | Provenance | Status |
|---|---|---|---|
| `learning-section:lvl_p1:f_locomotion:component:1` | يتعرف على مختلف الوضعيات الطبيعية المألوفة وغير المألوفة في محيطه المباشر. | `reviewed_derived` | `approved` |
| `learning-section:lvl_p1:f_locomotion:component:2` | يوظف تكامل أطرافه ويستثمرها في الوضعيات المألوفة وغير المألوفة حسب الموقف. | `reviewed_derived` | `approved` |
| `learning-section:lvl_p1:f_locomotion:component:3` | يحترم القواعد العامة عند أخذ مختلف الوضعيات. | `reviewed_derived` | `approved` |

All IDs and wording remain frozen. P1A changes neither their identity nor their adopted text.

## 4 Original P0 LearningRequirement audit

| P0 ID | P0 meaning | Decision | Reason |
|---|---|---|---|
| `learning-requirement:lvl_p1:f_locomotion:1` | Distinguish and assume familiar/unfamiliar positions | `REFINE_WORDING` | The identity is valid; wording now states adaptation to both instruction and situation and adds an evidence-backed description. |
| `learning-requirement:lvl_p1:f_locomotion:2` | Limb integration, transition, and movement | `SPLIT` | It combined bodily organization with spatial movement adaptation. The stable ID remains with limb integration; spatial movement receives a new semantic ID. |
| `learning-requirement:lvl_p1:f_locomotion:3` | Rules and safety | `REFINE_WORDING` | The identity is valid; wording now includes adaptation to others as supported by transversal resources. |

No P0 requirement was rejected or merged away.

## 5 Candidate requirements

The audit considered four distinct candidate meanings:

1. Variety and situational selection of familiar and unfamiliar natural positions.
2. Functional limb integration, bodily organization, balance, and transition between positions.
3. Spatial adaptation of basic movement patterns, directions, and paths.
4. Rules, instructions, safety, and adaptation to others during execution.

Each candidate is supported by the adopted components and/or the Annual Plan knowledge and transversal resources. No candidate is based only on one exercise or one lesson wording.

## 6 Final approved requirements

| Order | ID | Label | Description | SourceRef | Provenance |
|---|---|---|---|---|---|
| 1 | `learning-requirement:lvl_p1:f_locomotion:1` | تمييز الوضعيات الطبيعية المألوفة وغير المألوفة واتخاذها بما يلائم التعليمة والموقف. | Covers representative standing, sitting, prone, upright, and support postures without binding the meaning to one exercise. | `annual-plan-reference:lvl_p1:f_locomotion:components+knowledge-resources:postures` | `reviewed_derived / approved` |
| 2 | `learning-requirement:lvl_p1:f_locomotion:2` | توظيف تكامل الأطراف والمحافظة على تنظيم الجسم وتوازنه أثناء التحول بين الوضعيات. | Covers functional body organization linking one posture to another in a controlled and balanced manner. | `annual-plan-reference:lvl_p1:f_locomotion:components+knowledge-resources:limb-integration` | `reviewed_derived / approved` |
| 3 | `learning-requirement:lvl_p1:f_locomotion:spatial-movement-adaptation` | تكييف أنماط التنقل الأساسية واتجاهاتها ومساراتها مع فضاء الممارسة والموقف. | Covers walking, jogging, forward/backward/lateral movement, direction changes, and bounded paths. | `annual-plan-reference:lvl_p1:f_locomotion:knowledge-resources:movement-patterns` | `reviewed_derived / approved` |
| 4 | `learning-requirement:lvl_p1:f_locomotion:3` | احترام التعليمات والقواعد العامة وضوابط السلامة والتكيف مع الآخرين أثناء الوضعيات والتنقلات. | Covers the value and organizational dimension inherent in execution, not generic guidance or equipment handling. | `annual-plan-reference:lvl_p1:f_locomotion:components+transversal-resources:rules` | `reviewed_derived / approved` |

## 7 Rejected merged and split requirements

- Rejected requirements: none.
- Merged requirements: none.
- Split requirement: P0 requirement 2 was separated into preserved limb-integration identity and new spatial-movement identity.
- The seven generic P0 ObjectiveKey placeholders were rejected as keys, but this does not delete or alter any LearningRequirement.

## 8 Evidence and granularity matrix

| Requirement | Evidence | A stable wording | B reinforcement | C joint coverage | D removal creates gap | E session independent | F not component synonym | G narrower than final competency | H broader than exercise |
|---|---|---|---|---|---|---|---|---|---|
| Posture variety | Component 1; standing/sitting/unfamiliar posture resources; Objectives 1, 2, 6, 7 | Pass | Pass | Pass | Pass: posture repertoire disappears | Pass | Pass: defines required meaning and examples rather than component ownership | Pass | Pass |
| Limb integration | Components 1–2; functions/integration resource; transition and balance objectives | Pass | Pass | Pass | Pass: organized balanced transition disappears | Pass | Pass | Pass | Pass |
| Spatial movement | Components 1–2; walking/jogging resources; direction/path objectives | Pass | Pass | Pass | Pass: environmental movement adaptation disappears | Pass | Pass | Pass | Pass |
| Rules and safety | Components 2–3; methodological, communicative, and social resources | Pass | Pass | Pass | Pass: value/organizational dimension disappears | Pass | Pass | Pass | Pass |

## 9 Component to Requirement matrix

| Component | Posture variety | Limb integration | Spatial movement | Rules and safety |
|---|---:|---:|---:|---:|
| Component 1 recognition | Yes | Yes | Yes | No |
| Component 2 functional mobilization | No | Yes | Yes | Yes |
| Component 3 rules | No | No | No | Yes |

The relation is genuinely N:M: three requirements link to more than one component, and Components 1 and 2 each support several requirements.

## 10 ObjectiveConcept to Requirement matrix

| Concept | Meaning | Audit | Requirements |
|---|---|---|---|
| `objective-concept:lvl_p1:f_locomotion:1` | Basic body positions | `KEEP` | Posture variety |
| `objective-concept:lvl_p1:f_locomotion:2` | Organized transition in response to a signal | `KEEP` | Posture variety, limb integration, rules and safety |
| `objective-concept:lvl_p1:f_locomotion:3` | Simple movement in different directions | `KEEP` | Spatial movement |
| `objective-concept:lvl_p1:f_locomotion:4` | Forward/backward movement with balance | `KEEP` | Limb integration, spatial movement |
| `objective-concept:lvl_p1:f_locomotion:5` | Lateral movement and direction change in a bounded space | `KEEP` | Spatial movement, rules and safety |
| `objective-concept:lvl_p1:f_locomotion:6` | Linking positions and movement in a simple path | `KEEP` | Posture variety, limb integration, spatial movement |
| `objective-concept:lvl_p1:f_locomotion:7` | A movement sequence combining several positions and movements | `KEEP` | All four requirements |

All seven stable IDs remain unchanged. No requirement was created merely to mirror an one ObjectiveConcept.

## 11 ObjectiveVariant audit

Each ObjectiveConcept has exactly one Arabic `ar-DZ` variant. It is the adopted canonical teacher-facing wording, maps to one concept only, and has `reviewed_derived / approved` provenance.

- `APPROVED_VARIANT`: 7
- `NEEDS_REVIEW`: 0
- `NOT_A_VARIANT`: 0

P1A adds no unnecessary wording variants.

## 12 ObjectiveKey audit

All seven P0 keys were generic placeholders of the form “proposed execution key for concept N; needs review.” They did not express a practical, technical, or methodological success key and contained no source evidence.

- `APPROVE`: 0
- `KEEP_DRAFT`: 0
- `REFINE`: 0
- `MERGE`: 0
- `SPLIT`: 0
- `REJECT`: 7

The P1A release therefore publishes no ObjectiveKey. The type and validator remain available for future evidence-backed keys.

## 13 Requirement set status

`complete`

The approved set is the smallest non-redundant set found that preserves all distinct meanings evidenced by the frozen components, official/reference resources, and current semantic objectives. Completeness describes semantic requirements, not the number of objectives or sessions.

## 14 Coverage Engine result

The canonical seven ObjectiveConcepts cover all four required meanings:

- status: `complete`
- required: 4
- covered: 4
- missing: 0
- unmapped: 0
- explanatory percentage: 100%

The set relationship, not the percentage, is authoritative.

## 15 Objective count equivalence

| Fixture | Semantic construction | Result |
|---:|---|---|
| 6 | Omits a redundant concept while Concept 7 still integrates the complete set | `complete`, 4/4 |
| 7 | Canonical concepts 1–7 | `complete`, 4/4 |
| 8 | Canonical seven plus posture reinforcement | `complete`, 4/4 |
| 10 | Canonical seven plus posture, movement, and comprehensive reinforcement | `complete`, 4/4 |

## 16 Integration semantic audit

Current Teacher Learning Plan seeding derives integration anchors from the operational session sequence:

| Integration | Current anchor | Derived objectives | Requirement union | New requirement introduced |
|---|---|---|---|---|
| Integration 1 | after Objective 3 | Objectives 1–3 | All requirements reached by those concepts | None |
| Integration 2 | fallback after Objective 6 | Objectives 4–6 | All requirements reached by those concepts | None |

The engine derives each cycle from ordered objectives and anchors. It does not persist LearningCycle and cannot add a requirement absent from preceding ObjectiveConcepts.

Mismatch reported without production change: Objective 7 currently comes after the second integration anchor and is therefore outside both derived integration cycles. It adds no new requirement because it reinforces all four already-built meanings, but its placement means it is not integrated by the current second integration entry.

## 17 Diagnostic semantic scope

Diagnostic scope is the FinalCompetency plus all four approved LearningRequirements. It is not mapped to one TeacherObjective. Entry observation should be capable of revealing initial evidence or gaps in posture variety, limb integration/balance, spatial movement adaptation, and rules/safety. P1A creates no DiagnosticObservation and changes no assessment behavior.

## 18 Summative semantic scope

Summative scope is the FinalCompetency plus the same complete four-requirement set. Evidence must be broad enough to observe the comprehensive competency rather than only ObjectiveConcept 7. P1A changes neither CriterionResult nor Gradebook scoring.

## 19 Criteria and indicator reconciliation

### Criteria

| Source representation | Classification | Recommended future canonical ID | Status |
|---|---|---|---|
| Appropriate posture/posture selection for the situation | `OFFICIAL_OR_SOURCE_DERIVED`; operational source is a semantic match | `criterion:lvl_p1:f_locomotion:posture-suitability` | `MISSING_IDENTITY` |
| Appropriate use and integration of body limbs | `OFFICIAL_OR_SOURCE_DERIVED`; wording differs across sources | `criterion:lvl_p1:f_locomotion:limb-integration` | `WORDING_DIFFERENCE` |
| Maintaining balance during execution/movement | `SEMANTIC_MATCH` across Annual Plan and operational indicator | `criterion:lvl_p1:f_locomotion:balance-control` | `MISSING_IDENTITY` |
| Adapting/correcting unsuitable positions and movement | Annual Plan source-derived; operational directions/transitions partially match | `criterion:lvl_p1:f_locomotion:situational-adjustment` | `UNRESOLVED` pending review |
| Respect for activity space and its rules | Present as an operational criterion but distributed across source component/resources | `criterion:lvl_p1:f_locomotion:rules-and-space` | `CONFLICT` on canonical placement |

### Indicators

| Evidence meaning | Classification | Recommended future canonical ID | Status |
|---|---|---|---|
| Correct execution of standing and sitting positions | `OFFICIAL_OR_SOURCE_DERIVED` | `indicator:lvl_p1:f_locomotion:posture-execution` | `MISSING_IDENTITY` |
| Limb integration in prone and four-support positions | `OFFICIAL_OR_SOURCE_DERIVED` | `indicator:lvl_p1:f_locomotion:limb-integration` | `MISSING_IDENTITY` |
| Organized transition between positions | `SEMANTIC_MATCH` in operational reference | `indicator:lvl_p1:f_locomotion:organized-transition` | `WORDING_DIFFERENCE` |
| Movement in different directions | `SEMANTIC_MATCH` in operational reference | `indicator:lvl_p1:f_locomotion:directional-movement` | `WORDING_DIFFERENCE` |
| Balance during walking/movement | `SEMANTIC_MATCH` across sources | `indicator:lvl_p1:f_locomotion:movement-balance` | `MISSING_IDENTITY` |
| Graded walking/jogging pace individually and in pairs | `OFFICIAL_OR_SOURCE_DERIVED` | `indicator:lvl_p1:f_locomotion:pace-adjustment` | `MISSING_IDENTITY` |

No CriterionDefinition or IndicatorDefinition is populated in P1A. The IDs above are recommendations, not active identities, and are not linked to runtime `C1`–`C4`.

## 20 Resource taxonomy

| Concept | Precise semantic role | Must not be treated as |
|---|---|---|
| LearningRequirement | Stable essential meaning required for competency completeness | Lesson, wording, exercise, or equipment |
| `learningContent` | Teacher/document description of what is learned in a lesson or section | Canonical requirement identity |
| `pedagogicalKnowledge` / mobilized knowledge | Knowledge the learner mobilizes during execution | Complete learning requirement by default |
| `executionContent` | Observable activity or execution expected in a lesson | ObjectiveConcept or requirement identity |
| ResourceDefinition | Versioned reference resource supporting one or more requirements | Generic container for every production field |
| equipment | Physical material used to organize execution | Pedagogical knowledge or requirement |
| ObjectiveKey | Evidence-backed practical, technical, or methodological success key for one ObjectiveConcept | Restatement of concept, requirement, content, or guidance |
| guidance | Teacher-facing safety, organization, or facilitation direction | Learner semantic identity by itself |
| EducationalSituation | Organized pedagogical context in which learning/evidence occurs | Resource, objective, or duplicated text fragment |

P1A does not normalize or migrate any production field.

## 21 Remaining unresolved pedagogical questions

1. Verbatim official source citation for the adopted CompetencyComponent wording.
2. Approval of canonical CriterionDefinition and IndicatorDefinition identities.
3. The relationship between future canonical criteria and runtime `C1`–`C4` results.
4. Evidence-backed practical/technical/methodological ObjectiveKeys.
5. Whether the second production integration anchor should include Objective 7.
6. Governed SituationAlignment evidence and relevance rules.

## 22 Exact P1B recommendation

Build an internal, read-only Teacher Learning Plan semantic adapter behind a disabled/internal feature boundary. It should resolve existing `sourceReferenceId` aliases to P1A ObjectiveConcept IDs, calculate coverage with the existing pure engine, and emit diagnostics for unmapped custom objectives without persisting semantic IDs or showing/blocking anything in the teacher UI. Validate the adapter against historical plans and the 6/7/8/10 fixtures. Keep Prisma, APIs, production plan writes, situation behavior, and Gradebook unchanged.
