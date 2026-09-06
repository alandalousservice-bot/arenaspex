# ArenaSPEX P1A Precheck Grade 1 Domain 1 Reference Identity

## Decision

Freeze one canonical identity for Grade 1 / Domain 1 without changing any production reference, historical Teacher Learning Plan, API, UI, or runtime behavior.

- Canonical Grade ID: `lvl_p1`
- Canonical Domain ID: `f_locomotion`
- Canonical FinalCompetency ID: `fc_lvl_p1_f_locomotion`
- Canonical FinalCompetency wording: `يتخذ وضعيات وهيآت طبيعية لها علاقة مع محيطه المباشر.`

The ID is independent from wording. Alternate and conflicting source wording remains preserved in its original source and is resolved through source-identity aliases.

## Grade identity

All audited repository sources use `lvl_p1`. No collision, ambiguity, or legacy Grade alias was found. `lvl_p1` remains canonical.

## Domain identity

All audited repository sources use `f_locomotion`. Labels vary between `الوضعيات والتنقلات` and `الميدان الأول: الوضعيات والتنقلات`, but the prefix is presentation metadata rather than a distinct domain. No additional Domain alias is required.

## FinalCompetency representations

| Source | Source identity or ID | Wording | Semantic meaning | Status |
|---|---|---|---|---|
| Attached Pedagogical Knowledge Core reference v1.0 | Grade 1 / Domain 1 source slot | يتخذ وضعيات وهيآت طبيعية لها علاقة مع محيطه المباشر. | Taking natural positions and postures related to the learner's immediate environment | `MATCH` — selected canonical wording |
| `src/data/annualPlanReference.ts` | implicit `lvl_p1` + `f_locomotion` slot | يتخذ وضعيات وهيئات طبيعية لها علاقة مع محيطه المباشر. | Same meaning; orthographic form “هيئات” | `SEMANTIC_MATCH_WORDING_DIFFERS` |
| `src/data/domainOneLearningSectionReference.ts` | implicit `lvl_p1` + `f_locomotion` slot | يتخذ وضعيات وهيئات طبيعية لها علاقة مع محيطه المباشر. | Same meaning; orthographic form “هيئات” | `SEMANTIC_MATCH_WORDING_DIFFERS` |
| `src/data/algerianCurriculum.ts` | implicit `lvl_p1` + `f_locomotion` slot | التحكم في الوضعيات الأساسية للجسم والتنقلات البسيطة في فضاء محدد. | Narrower operational emphasis on body control and simple movement in a bounded space | `CONFLICT` — retained as operational wording, not canonical text |
| P0 knowledge catalog | `fc_lvl_p1_f_locomotion` | يتخذ وضعيات وهيآت طبيعية لها علاقة مع محيطه المباشر. | Canonical semantic identity for this grade/domain slot | `MATCH` after precheck correction |

## Canonical FinalCompetency selection

`fc_lvl_p1_f_locomotion` remains the canonical ID because it is already compatible with the Teacher Learning Plan's stable final-competency identity and has no collision. The attached reference's exact source wording is frozen in the code-hosted catalog. The production source files retain their current text.

The `algerianCurriculum.ts` wording is not silently discarded or treated as an equivalent canonical phrase. It remains explicitly classified as a conflicting, narrower operational representation of the same grade/domain competency slot.

## FinalCompetency source aliases

| Alias | Canonical target |
|---|---|
| `source:annual-plan-reference:lvl_p1:f_locomotion:final-competency` | `fc_lvl_p1_f_locomotion` |
| `source:domain-one-learning-section-reference:lvl_p1:f_locomotion:final-competency` | `fc_lvl_p1_f_locomotion` |
| `source:algerian-curriculum:lvl_p1:f_locomotion:final-competency` | `fc_lvl_p1_f_locomotion` |

These aliases resolve source slots, not wording equivalence. They do not rewrite stored data and do not make the narrower operational wording canonical.

## CompetencyComponent identity

| Stable ID | Adopted wording | Relation | Provenance | Review status |
|---|---|---|---|---|
| `learning-section:lvl_p1:f_locomotion:component:1` | يتعرف على مختلف الوضعيات الطبيعية المألوفة وغير المألوفة في محيطه المباشر. | `fc_lvl_p1_f_locomotion` | `reviewed_derived` | `approved` |
| `learning-section:lvl_p1:f_locomotion:component:2` | يوظف تكامل أطرافه ويستثمرها في الوضعيات المألوفة وغير المألوفة حسب الموقف. | `fc_lvl_p1_f_locomotion` | `reviewed_derived` | `approved` |
| `learning-section:lvl_p1:f_locomotion:component:3` | يحترم القواعد العامة عند أخذ مختلف الوضعيات. | `fc_lvl_p1_f_locomotion` | `reviewed_derived` | `approved` |

All three IDs are preserved exactly. No component was added, removed, renumbered, or regenerated.

The adopted Domain 1 wording is semantically supported by the Annual Plan component transcription, but it is not reproduced verbatim in the attached reference and differs slightly from the Annual Plan string. The correct conservative provenance is therefore approved `reviewed_derived`, with `sourceRef = domain-one-learning-section-reference:lvl_p1:f_locomotion`.

## Conflicts found

1. The operational `algerianCurriculum.ts` final-competency wording is materially narrower than the attached and Annual Plan reference meaning.
2. The attached reference writes `هيآت`; the two repository reference sources write `هيئات`. This is an orthographic difference, not a second competency identity.
3. Annual Plan component wording differs from the adopted Domain 1 wording in grammar, pronouns, punctuation, and the presence of `العامة`. It supports the semantic components but not a verbatim-official classification for the adopted strings.

## Unresolved identity items

- No unresolved collision exists for Grade, Domain, FinalCompetency, or the three component IDs.
- The repository does not currently retain a versioned verbatim citation to the original official page containing the three component wordings. Until that evidence is linked, their provenance remains `reviewed_derived`.
- The conflicting operational final-competency wording remains intentionally present outside the knowledge-core boundary for runtime compatibility.

## Scope confirmation

This precheck does not change LearningRequirements, ObjectiveConcepts, ObjectiveVariants, ObjectiveKeys, criteria, indicators, situation alignment, diagnostic observations, Teacher Learning Plan persistence, or any production behavior.

## Recommendation for full P1A

Proceed with full P1A using the frozen Grade, Domain, FinalCompetency, and component identities above. Treat `fc_lvl_p1_f_locomotion` as the only canonical FinalCompetency identity. Use the source aliases for reconciliation, preserve alternate wording as source evidence, and do not promote component text to `official_source` until a verbatim official citation is linked. Full P1A may then review LearningRequirements separately without reopening these identities.
