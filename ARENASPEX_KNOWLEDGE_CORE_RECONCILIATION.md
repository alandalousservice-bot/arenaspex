# ArenaSPEX Knowledge Core P0 Reconciliation

## Purpose and scope

This report reconciles the three existing curriculum/reference sources for the P0 pilot only:

- Grade: `lvl_p1`
- Domain: `f_locomotion`
- Knowledge-core release: `knowledge-core:v1.0-pilot`

It does not overwrite any source, declare uncertain text official, or rewrite historical Teacher Learning Plans. The classifications used below are:

- `MATCH`
- `SEMANTIC_MATCH_WORDING_DIFFERS`
- `CONFLICT`
- `MISSING`
- `ALIAS_REQUIRED`
- `UNRESOLVED`

## Source roles

| Source | Current role | P0 provenance treatment |
|---|---|---|
| `src/data/annualPlanReference.ts` | Transcription of the annual-plan reference, including overall/final competencies, components, resources, criteria, and indicators | `official_source` where text can be reused without reinterpretation |
| `src/data/domainOneLearningSectionReference.ts` | Reviewed Domain 1 Learning Section content with the only current stable component IDs | Final-competency wording is source-supported; normalized component wording is `reviewed_derived` until a verbatim official source is linked |
| `src/data/algerianCurriculum.ts` | Operational curriculum/session sequence used by current planning | Platform reference; session objectives become reviewed applied-knowledge candidates, not official identity by themselves |
| Attached Pedagogical Knowledge Core reference v1.0 | Verification reference that explicitly separates source knowledge, platform decisions, derived proposals, and unresolved items | Its Grade 1 / Domain 1 final-competency wording verifies the canonical source text; it does not verify the three component wordings verbatim |

## Identity and text reconciliation

| Concept | Source file | Existing ID | Existing text/shape | Equivalent catalog record | Classification | Conflict / alias requirement | Canonical recommendation | Provenance | Safe to reuse |
|---|---|---|---|---|---|---|---|---|---|
| Grade | all three | `lvl_p1` | السنة الأولى ابتدائي | `curriculum-grade:lvl_p1` with `gradeId=lvl_p1` | `MATCH` | None | Preserve `lvl_p1` as the external grade identity | `official_source` | Yes |
| Domain | all three | `f_locomotion` | الوضعيات والتنقلات; some UI text includes “الميدان الأول” | `curriculum-domain:lvl_p1:f_locomotion` | `SEMANTIC_MATCH_WORDING_DIFFERS` | Display-prefix difference only | Preserve `f_locomotion`; keep display labels separate from identity | `official_source` | Yes |
| Overall competency | `annualPlanReference.ts` | implicit under `lvl_p1` | يقوم بحركات باتّخاذ وضعيات وهيئات طبيعية… | `overall-competency:lvl_p1` | `MISSING` in the other two sources | No historical ID exists | Introduce a stable catalog ID without changing source text | `official_source` | Yes |
| Final competency | Attached Pedagogical Knowledge Core reference v1.0 | source slot: Grade 1 / Domain 1 | يتخذ وضعيات وهيآت طبيعية لها علاقة مع محيطه المباشر. | `fc_lvl_p1_f_locomotion` | `MATCH` | Source slot receives a deterministic alias | Freeze this wording as canonical | `official_source` | Yes |
| Final competency | `annualPlanReference.ts` | implicit by grade/domain | يتخذ وضعيات وهيئات طبيعية لها علاقة مع محيطه المباشر. | `fc_lvl_p1_f_locomotion` | `SEMANTIC_MATCH_WORDING_DIFFERS` | Orthographic variant “هيئات”; source slot receives an alias | Preserve as an alternate source wording | `official_source` | Yes, as alternate wording |
| Final competency | `domainOneLearningSectionReference.ts` | grade/domain lookup | يتخذ وضعيات وهيئات طبيعية لها علاقة مع محيطه المباشر. | `fc_lvl_p1_f_locomotion` | `SEMANTIC_MATCH_WORDING_DIFFERS` | Orthographic variant “هيئات”; source slot receives an alias | Preserve runtime source unchanged and resolve its source slot to canonical identity | `official_source` | Yes, as alternate wording |
| Final competency | `algerianCurriculum.ts` | implicit under grade/domain | التحكم في الوضعيات الأساسية للجسم والتنقلات البسيطة في فضاء محدد. | `fc_lvl_p1_f_locomotion` | `CONFLICT` | This is narrower operational wording, not an exact transcription | Retain for current runtime; do not silently replace canonical reference wording | `platform_reference` | No, not as canonical wording |
| Component 1 | `domainOneLearningSectionReference.ts` | `learning-section:lvl_p1:f_locomotion:component:1` | يتعرف على مختلف الوضعيات الطبيعية… | Same ID | `MATCH` | None | Preserve exact stable ID and wording | `reviewed_derived` / approved | Yes |
| Component 1 | `annualPlanReference.ts` | no ID | يتعرف على مختلف الوضعيات الطبيعية المألوفة والغير المألوفة… | Component 1 | `SEMANTIC_MATCH_WORDING_DIFFERS` | “الغير” versus normalized “غير” and punctuation | Retain as source evidence; do not replace the adopted component | `official_source` | Yes, as source evidence |
| Component 2 | `domainOneLearningSectionReference.ts` | `learning-section:lvl_p1:f_locomotion:component:2` | يوظف تكامل أطرافه ويستثمرها… | Same ID | `MATCH` | None | Preserve exact stable ID and wording | `reviewed_derived` / approved | Yes |
| Component 2 | `annualPlanReference.ts` | no ID | يوظف تكامل الأطراف ويستثمرها… | Component 2 | `SEMANTIC_MATCH_WORDING_DIFFERS` | Pronoun/punctuation normalization | Retain as source evidence; do not replace the adopted component | `official_source` | Yes, as source evidence |
| Component 3 | `domainOneLearningSectionReference.ts` | `learning-section:lvl_p1:f_locomotion:component:3` | يحترم القواعد العامة عند أخذ مختلف الوضعيات. | Same ID | `SEMANTIC_MATCH_WORDING_DIFFERS` | Annual Plan omits “العامة”; no verbatim component wording exists in the attached reference | Preserve reviewed wording and stable ID | `reviewed_derived` / approved | Yes |
| Learning requirements | none as first-class records | none | Meanings are implicit in competency components/resources | Three P0 requirement IDs | `MISSING` | Complete reviewed set is not yet established | Add only three safely reconciled `reviewed_derived` requirements and mark the final-competency requirement set `incomplete` | `reviewed_derived` | Yes, with incompleteness guard |
| Resource knowledge | `annualPlanReference.ts` | none | Functions/integration of limbs, positions, and movement patterns | Two P0 `ResourceDefinition` records | `SEMANTIC_MATCH_WORDING_DIFFERS` with Domain 1 defaults | Existing `learningContent`, `executionContent`, equipment, and resources are not interchangeable | Define taxonomy/catalog records only; do not migrate existing fields | `official_source` | Yes, limited catalog use |
| Criteria/indicators | `annualPlanReference.ts` | none | Four criteria with embedded indicators in one text field | No P0 populated records | `UNRESOLVED` | Parsing and canonical identity require pedagogical review | Define types now; populate only after reviewed mapping | unresolved | No |
| Criteria/indicators | `algerianCurriculum.ts` | array positions only | Three criteria and four indicators with materially different wording | No P0 populated records | `CONFLICT` | Not demonstrably identical to Annual Plan criteria; not current runtime `C1`–`C4` identity | Keep separate until curriculum/runtime linkage is approved | `platform_reference` | No |
| Runtime criterion result | assessment services/schema | contextual `C1`–`C4` | Runtime result attached to an assessment/student | No P0 canonical link | `UNRESOLVED` | Runtime criterion is not assumed to equal curriculum criterion | Preserve current Gradebook/assessment model unchanged | runtime data | Yes, unchanged only |

## Objective reconciliation and aliases

The operational learning objectives in `algerianCurriculum.ts` have stable historical references generated by the Teacher Learning Plan. P0 introduces semantic concept IDs and resolves the old references through aliases without changing saved data.

Final-competency source slots now resolve to the same canonical identity:

| Source identity alias | Canonical ID | Treatment of source wording |
|---|---|---|
| `source:annual-plan-reference:lvl_p1:f_locomotion:final-competency` | `fc_lvl_p1_f_locomotion` | Preserved as the “هيئات” orthographic variant |
| `source:domain-one-learning-section-reference:lvl_p1:f_locomotion:final-competency` | `fc_lvl_p1_f_locomotion` | Preserved unchanged in its production source |
| `source:algerian-curriculum:lvl_p1:f_locomotion:final-competency` | `fc_lvl_p1_f_locomotion` | Preserved as a narrower operational wording and explicitly classified `CONFLICT` |

| Existing source reference | Existing objective wording | Canonical ObjectiveConcept | Classification | Canonical recommendation | Safe to reuse |
|---|---|---|---|---|---|
| `f_locomotion__2` | يتعرف على وضعيات الجسم الأساسية… | `objective-concept:lvl_p1:f_locomotion:1` | `ALIAS_REQUIRED` | Keep old ID as alias; concept identity survives future wording variants | Yes |
| `f_locomotion__3` | ينتقل من وضعية إلى أخرى بطريقة منظمة… | `objective-concept:lvl_p1:f_locomotion:2` | `ALIAS_REQUIRED` | Same | Yes |
| `f_locomotion__4` | ينجز تنقلات بسيطة… في اتجاهات مختلفة | `objective-concept:lvl_p1:f_locomotion:3` | `ALIAS_REQUIRED` | Same | Yes |
| `f_locomotion__6` | يتحكم في التنقل الأمامي والخلفي… | `objective-concept:lvl_p1:f_locomotion:4` | `ALIAS_REQUIRED` | Same | Yes |
| `f_locomotion__7` | ينجز تنقلات جانبية وتغيير الاتجاه… | `objective-concept:lvl_p1:f_locomotion:5` | `ALIAS_REQUIRED` | Same | Yes |
| `f_locomotion__8` | يربط بين وضعيات الجسم والتنقلات… | `objective-concept:lvl_p1:f_locomotion:6` | `ALIAS_REQUIRED` | Same | Yes |
| `f_locomotion__9` | ينجز سلسلة حركية تجمع بين عدة وضعيات… | `objective-concept:lvl_p1:f_locomotion:7` | `ALIAS_REQUIRED` | Same | Yes |

Diagnostic, integration, and summative session references are not converted to ObjectiveConcepts in P0. They retain their current operational identity and behavior.

## Explicit conflicts and non-actions

1. The operational final-competency wording in `algerianCurriculum.ts` differs materially from the source wording. The catalog records the conflict and chooses the attached reference wording; no runtime source is edited.
2. `annualPlanReference.ts` and `domainOneLearningSectionReference.ts` use the orthographic variant “هيئات”, while the attached reference uses “هيآت”. Both alternates remain documented; identity does not depend on spelling.
3. The three adopted component wordings are approved `reviewed_derived`, not verbatim `official_source`, because the attached reference does not reproduce their text and the Annual Plan transcription differs.
4. Criteria and indicator lists differ in count, wording, and structure. P0 defines their types but leaves the pilot arrays empty.
5. Domain 1 pedagogical defaults summarize several kinds of content. They are not normalized into `ResourceDefinition` automatically.
6. Objective keys are draft reviewed-derived placeholders only. They are not authoritative and do not participate in coverage.
7. The three approved pilot requirements are individually supported, but the complete requirement set is still unverified. Consequently the pilot Coverage Engine result remains `indeterminate`, even at 100% coverage of the currently encoded subset.

## Stable identity decision

- Preserve external grade/domain IDs: `lvl_p1`, `f_locomotion`.
- Preserve current Teacher Learning Plan final-competency identity: `fc_lvl_p1_f_locomotion`.
- Preserve all three current Domain 1 CompetencyComponent IDs.
- Resolve the seven existing source references deterministically through aliases.
- Never use Arabic display text as identity.
- Never rewrite saved teacher plans or educational situations during P0.
