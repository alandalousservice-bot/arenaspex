# ArenaSPEX Knowledge Core — Gate J Product Review

## 1. P1G evidence summary

Candidate `knowledge-core:v1.5-combined-2023` passed source, release, 15-cell, semantic-coverage, cross-domain, historical-compatibility, Teacher-ownership, executed-history, rollback, and Gate I checks. Shadow comparison found 15 reviewed corrections and zero unexpected conflicts. Runtime authority remains legacy.

## 2. Candidate identity

- Source: `dz-primary-pe-2023`, version 2023
- Semantic candidate: `knowledge-core:v1.5-combined-2023`
- Coverage: five grades × three domains = 15 cells
- Runtime default: `legacy`

## 3–4. Product review matrix and cell decisions

| Grade/domain | Legacy behavior | Candidate official/reviewed behavior | What is corrected and why | Basis | Risk | Decision | Recommendation |
|---|---|---|---|---|---|---|---|
| G1/D1 | Basic postures and simple movement | Natural postures related to the immediate environment | Restores the official contextual posture progression | Official 2023 + reviewed D1 correction | Controlled | APPROVE_WITH_NOTE | Activate with historical safeguards |
| G1/D2 | Initial control of walk/run/jump/throw | Fundamental movements based on integrated body functions | Replaces a broad skills list with the official functional formulation | Official 2023 + reviewed D2 semantics | Low | APPROVE | Guarded reference activation |
| G1/D3 | Generic simple group participation | Uses practice space and landmarks for formation and orderly movement | Removes group-activity contamination; restores space/formations | Official 2023 + critical D3 review | Controlled | APPROVE_WITH_NOTE | Activate and monitor expected correction |
| G2/D1 | Diverse postures and movement | Timely adjustment of posture and movement between situations | Restores adaptation and timing as the grade progression | Official 2023 + reviewed D1 correction | Controlled | APPROVE_WITH_NOTE | Activate with historical safeguards |
| G2/D2 | Fundamental movements in varied situations | Executes simple natural movements in different situations | Aligns wording to the official execution level | Official 2023 + reviewed D2 semantics | Low | APPROVE | Guarded reference activation |
| G2/D3 | Generic group organization and roles | Selects suitable method and space for using a tool | Replaces unrelated group meaning with tools/use progression | Official 2023 + critical D3 review | Controlled | APPROVE_WITH_NOTE | Activate and monitor expected correction |
| G3/D1 | General effective movement in space | Composes and executes a sequence required by the situation | Restores operation sequencing; speed legacy remains moved-domain | Official 2023 + G3 reconciliation | Controlled | APPROVE_WITH_NOTE | Keep moved identity non-covering |
| G3/D2 | Mastery and linking of fundamental movements | Fundamental movements related to running and throwing | Clarifies the official motor family without aliasing D1 speed | Official 2023 + reviewed D2 semantics | Low | APPROVE | Guarded reference activation |
| G3/D3 | Generic collective activity under rules | Organizes interventions according to the situation | Restores interventions, landmarks, and rules progression | Official 2023 + critical D3 review | Controlled | APPROVE_WITH_NOTE | Activate and monitor expected correction |
| G4/D1 | Complex movement and adaptation | Individual/collective movement with maintained continuity | Restores continuity and coordinated execution | Official 2023 + reviewed D1 correction | Controlled | APPROVE_WITH_NOTE | Activate with historical safeguards |
| G4/D2 | Fundamental movements in sporting situations | Jump/throw movements coordinated within available space | Adds official coordination and spatial constraints | Official 2023 + reviewed D2 semantics | Low | APPROVE | Guarded reference activation |
| G4/D3 | Generic shared-goal group organization | Builds movements that safely address the situation in available space | Replaces group outcome with safe available-space progression | Official 2023 + critical D3 review | Controlled | APPROVE_WITH_NOTE | Activate and monitor expected correction |
| G5/D1 | Integrated posture and complex movement | Contextual posture/movement across individual and collective sports | Preserves body-position adaptation; obstacle legacy remains moved-domain and split remains review-only | Official 2023 + G5 reconciliation | Controlled | APPROVE_WITH_NOTE | Retain non-covering and split safeguards |
| G5/D2 | Fundamental actions in varied sports | Correct running, jumping, and throwing technique | Keeps technique distinct from D1 contextual body control | Official 2023 + reviewed D2 semantics | Low | APPROVE | Guarded reference activation |
| G5/D3 | Collective solutions and activity organization | Collective games under game principles and basic techniques | Completes the official D3 progression into collective games | Official 2023 + reviewed D3 semantics | Low | APPROVE | Guarded reference activation |

Review totals: 6 `APPROVE`, 9 `APPROVE_WITH_NOTE`, 0 `HOLD`, 0 `REJECT`.

## 5. Special G3/G5 review

- G3 D1 speed: `MOVED_DOMAIN`; it cannot satisfy corrected D1 coverage.
- G5 D1 obstacle: `MOVED_DOMAIN`; it cannot satisfy corrected D1 coverage.
- G5 split identity: `SPLIT_REQUIRES_REVIEW`; no child is selected automatically.
- G5 D1 versus D2: D1 governs contextual body posture and movement adaptation; D2 governs running/jumping/throwing technique. No false alias exists.

## 6. Domain 3 critical corrections

G1–G4 replace generic/group-oriented legacy summaries with the official sequence: space/formations → tools/use → interventions/landmarks/rules → safe available space. G5 advances coherently to collective games. All are expected corrections, not unexplained conflicts.

## 7–8. Teacher ownership and executed history

Teacher wording, custom content, objective count/order, and integration placement remain unchanged. No `ClassPlannedSession`, `NotebookEntry`, `LessonPlan`, assessment, or other execution history is rewritten.

## 9. Activation scope

Any later candidate authority is limited initially to Teacher Learning Plan reference reads. Annual Distribution, Daily Notebook, Lesson Memo, Gradebook, Assessment, and Situation Bank remain outside scope.

## 10–12. Fail closed, rollback, and activation ≠ migration

Unset/invalid mode, unknown/invalid release, failed validation, or missing approval returns to legacy with a structured reason. Rollback is configuration-only: set mode to `legacy`. Runtime activation does not migrate Teacher plans or history; P1E remains inactive.

## 13. Gate J final decision

The 15-cell product review is complete and contains no HOLD/REJECT decision. However, the task context does not provide a separate explicit human approval grant. The machine-readable record therefore remains `pending`.

**Result: `GATE_J_REVIEW_COMPLETE_APPROVAL_REQUIRED`.**

## 14. Production activation recommendation

Obtain an explicit product-owner approval statement for this candidate. In a subsequent controlled activation step, mark the approval record `approved`, deploy with `ARENASPEX_KNOWLEDGE_CORE_MODE=candidate`, the exact release ID, and approval enabled, while retaining legacy as the code fallback.

## 15. Remaining risks

The reviewed semantic corrections may change reference wording after future activation. Historical moved/split identities require their existing safeguards. Reverse shadow (candidate authority while legacy is compared diagnostically) remains a future enhancement; it is not required for this pending-approval state.
