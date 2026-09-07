# ArenaSPEX Knowledge Core P1F-C — Activation Readiness

## 1. Executive result

`knowledge-core:v1.5-combined-2023` is a deterministic `activation_candidate` containing the corrected Domain 1 release and the closed Domain 2/3 release. Result: **READY_FOR_RUNTIME_INTEGRATION_SPRINT**, not runtime active. Gates A–H pass; Gate I runtime integration and Gate J explicit product approval remain pending.

## 2. Identity, lineage, and totals

- Source: `dz-primary-pe-2023`, version `2023`.
- Included semantics: `knowledge-core:v1.4-domain1-correction` and `knowledge-core:v1.3-domain2-domain3`.
- Scope: 5 grades, 3 domains, 15 cells, 15 FinalCompetencies, 45 CompetencyComponents.
- Derived totals: 57 LearningRequirements, 72 ObjectiveConcepts, 35 ObjectiveVariants, 0 ObjectiveKeys.
- The release is curriculum-versioned and has no academic-year binding.

## 3. Fifteen-cell matrix and coverage

| Grade | D1 requirements/concepts | D2 requirements/concepts | D3 requirements/concepts | Cell gate |
|---|---:|---:|---:|---|
| G1 | 4 / 7 | 2 / 2 | 3 / 3 | 3/3 PASS |
| G2 | 4 / 7 | 2 / 2 | 4 / 4 | 3/3 PASS |
| G3 | 4 / 7 | 4 / 4 | 3 / 3 | 3/3 PASS |
| G4 | 4 / 7 | 6 / 6 | 3 / 3 | 3/3 PASS |
| G5 | 4 / 7 | 7 / 7 | 3 / 3 | 3/3 PASS |

All 15 cells have exactly one FC, three components, scoped requirements/concepts, unique IDs, complete provenance, source-artifact traceability, and semantic-release lineage. Every approved requirement is represented by a canonical concept.

Semantic completeness and activation authority are separate. The assembly validator reports complete semantic coverage. The existing Coverage Engine reports `indeterminate` because `activation_candidate` is intentionally not `active`. No validation was weakened and no runtime activation was used to obtain semantic completeness.

## 4. Cross-domain collision result

Running, walking, pace, jumping, landing, throwing, receiving, balance, posture, direction, coordination, space, time, rhythm, organization, rules, group synchronization, and collective games were checked. Repeated motor terms are `VALID_CONTEXTUAL_OVERLAP` when grade/domain identities and pedagogical lenses differ. False equivalence: 0. Ambiguous critical cases: 0. Critical unresolved contamination: 0.

G5 D1 keeps posture/adaptation/transition around run-jump-throw; G5 D2 keeps technical execution. D3 remains tied to space, tools, landmarks, rules, and collective-game context. The six known contamination patterns are absent.

## 5. Historical identity map

The read-only map currently contains eight audited entries: 4 `CANONICAL` approved replacements, 1 `SUPERSEDED` G3 concept, 2 `MOVED_DOMAIN` legacy meanings, and 1 `SPLIT_REQUIRES_REVIEW`. No entry is silently forced to `AMBIGUOUS` or false alias. Unrecognized identifiers resolve conceptually to `UNKNOWN`; future evidenced but intentionally detached identifiers may use `LEGACY_UNMAPPED`.

- G3 speed legacy: `MOVED_DOMAIN`; does not satisfy corrected D1.
- G5 obstacle legacy: `MOVED_DOMAIN`; does not satisfy corrected D1.
- G5 split legacy: `SPLIT_REQUIRES_REVIEW`; two candidate meanings, no one-to-one alias.
- Approved replacements resolve read-only through the existing adapter.

## 6. Teacher-plan dry run and ownership

De-identified fixtures cover canonical and legacy references, Teacher-edited wording, custom objectives, custom count/order, and manual integration placement. Semantic projection does not mutate input. Wording, count, order, custom objectives, integration anchors, notes, situations, execution content, and Teacher guidance remain Teacher-owned. Unknown or moved references remain unmapped rather than rewritten.

## 7. Executed history

`ClassPlannedSession`, `NotebookEntry`, `LessonPlan`, and assessment/session history are protected. The candidate declares no historical rewrite, no Teacher-plan rewrite, and read-only semantic resolution only. Knowledge Core activation and Teacher-plan migration remain separate operations.

## 8. Release selection and fail-closed policy

Future configuration may use `ACTIVE_KNOWLEDGE_CORE_RELEASE_ID`. When unset, invalid, unsupported, unapproved, incomplete, provenance-invalid, or collision-blocked, selection must preserve existing runtime authority. It must never partially fall forward into the candidate.

Rollback is release-level, not Teacher-data rollback: deselect the candidate, restore the previous release marker, verify legacy authority health, and verify that Teacher data stayed unchanged. Runtime wiring is not implemented in P1F-C.

## 9. Activation gates

| Gate | Result |
|---|---|
| A — official source validation | PASS |
| B — 15-cell semantic validation | PASS |
| C — semantic coverage validation | PASS |
| D — cross-domain validation | PASS |
| E — historical reconciliation | PASS |
| F — Teacher-plan dry-run safety | PASS |
| G — executed-history safety | PASS |
| H — rollback policy | PASS |
| I — runtime integration tests | PENDING; deliberately not wired |
| J — explicit product approval | PENDING |

## 10. P1E separation, blockers, and readiness

P1E remains `reviewed_not_activated`. Candidate activation would not authorize Teacher-plan migration, sourceReferenceId rewrites, or historical anchor repair. The only readiness blockers are Gate I and Gate J. Overall result is `READY_FOR_RUNTIME_INTEGRATION_SPRINT`, not `RUNTIME_ACTIVE`.

## 11. Exact P1G recommendation

P1G should implement a guarded, read-only runtime integration behind an explicit disabled-by-default release selector. It should validate the candidate at startup, fail closed to existing authority, expose no write path, run shadow comparison and route-level integration tests, preserve Teacher and executed-history data, and provide an immediate release-marker rollback. Product approval must be a separate explicit gate before enabling the selector in production; P1E migration must remain a later independent decision.
