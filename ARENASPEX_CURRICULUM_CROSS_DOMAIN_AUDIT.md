# ArenaSPEX - Curriculum Cross-Domain Audit

## Audit basis

Primary evidence is `docs/EPS.pdf`: domain definitions p.8, final-competency matrix p.10, resource matrix p.11–12, and grade programmes p.13–24. Existing `annualPlanReference.ts` is a generally faithful Level-2 transcription. `algerianCurriculum.ts`, current defaults, and Knowledge Core are Level-3 interpretations.

## Confirmed contamination and conflicts

| # | Current grade/domain | Current item/type | Official domain/context | Evidence | Severity | Finding |
|---|---|---|---|---|---|---|
| 1 | G1/D3 | Runtime FinalCompetency: participation in simple group activities | G1/D3 is practice space, landmarks, formations and organized movement | PDF p.10 and p.14 | `CRITICAL` | Collective-game wording displaces the official spatial/organizational competency. |
| 2 | G2/D3 | Runtime FinalCompetency: organizing a simple group activity | G2/D3 is selecting method/space for using and preserving tools | PDF p.10 and p.16 | `CRITICAL` | Group-activity content belongs to a later collective-sport progression, not this cell. |
| 3 | G3/D3 | Runtime FinalCompetency: building/organizing group activities | G3/D3 is organizing interventions by situation, landmarks, target throw and competition rules | PDF p.10 and p.18 | `CRITICAL` | The current item imports a generic collective-organization idea and loses the official intervention structure. |
| 4 | G4/D3 | Runtime FinalCompetency: organizing activity to achieve a shared goal | G4/D3 relates movement, throwing and jumping to available/safe space | PDF p.10 and p.21 | `CRITICAL` | Shared-goal/group wording replaces the official space-regulation competency. |
| 5 | G3/D1 | Runtime FinalCompetency emphasizes varied locomotion and effective use of space | G3/D1 composes running/throwing operations; space/landmark organization is D3 context | PDF p.10, p.17–18 | `MAJOR` | Partial cross-domain drift plus omission of throwing. |
| 6 | G5/D1 legacy `f_locomotion__6`: movement over paths/obstacles with balance | Obstacle clearance/jump technique is established under G5/D2; D1 addresses posture/transition but does not state obstacles | PDF p.22–24 | `MAJOR` | The obstacle-specific legacy meaning is better located in D2 or preserved pending redesign. |

Confirmed count: 6; critical count: 4. Other generic runtime wordings are conflicts or narrowing, but are not labeled cross-domain without positive source evidence.

## Concept-location audit

| Concept | Official placement and context |
|---|---|
| walking/jogging | G1–G2 D1/D2 as posture, transition and pace; G3 D1 as progression into running. |
| running | D1 when posture, adaptation, linkage or group pace is central; D2 when technique, pace, path or basic-action execution is central. |
| speed | G2 D1 adaptation; G3 D2 paces; G4 D1 maximal/group pace; G5 D2 sprint dynamics. Context must be retained. |
| direction change | G2 D1 path adaptation; G3 D3 competition behavior; not a universal D1 objective. |
| posture/balance | D1 for body suitability/adaptation; D2 for technical balance/gymnastics; domain depends on purpose. |
| jumping/landing | G4–G5 D2 for technique; G5 D1 for suitable body posture, balance and safe landing in the situation. |
| throwing/receiving | G2 D3 tool use; G3 D1 linkage/progression and D2 technique; G3–G4 D3 space/rules; G5 D1 posture and D2 technique; G5 D3 ball-game technique. |
| coordination | Appears transversally; domain identity follows the competency/resource row, not the motor word alone. |
| group synchronization | G4 D1 running pace/group cohesion; G5 D3 team-game communication/tactics. |
| space/time/rhythm | Space is central in D3 but also constrains D1/D2; pace/rhythm appears in D1/D2 according to adaptation versus execution. |
| construction/organization/rules | Progresses in D3 from formations/space to tools, interventions, safe space, then collective games. Rules also appear as safety resources in D1/D2. |

## Grade 5 run/jump/throw audit

- D1 FinalCompetency is about linked postures/locomotion in individual and team sports and adapting body posture. Its resources explicitly name running, jumping, throwing, propulsion sequence, and suitable transition (PDF p.22–23).
- D2 FinalCompetency is the technically sound execution of basic movements related to running, jumping and throwing. Its resources detail sprint, jump, throw and gymnastics technique (PDF p.23–24).
- The actions are therefore combined in both domains, but under different pedagogical lenses. They are resources/components rather than the complete literal wording of the D1 FinalCompetency.
- Existing D1 concept “الانتقال بين الجري والوثب والرمي”: `DERIVED_NOT_VERBATIM`, supported in D1 by the transition and propulsion resources. It must not be claimed as an official verbatim objective.

## Existing Domain 1 Knowledge Core audit

| Grade | FinalCompetency | Components | LearningRequirements | ObjectiveConcepts | ObjectiveVariants |
|---|---|---|---|---|---|
| G1 | `KEEP` with orthographic normalization (`هيآت/هيئات`) | `KEEP` | 4: `KEEP_AS_DERIVED`; safety/spatial expansion must remain derived | 7: mostly `KEEP_AS_DERIVED`; direction/path details require explicit derived labels | none |
| G2 | `KEEP` | `KEEP` | 4: `KEEP_AS_DERIVED` | 7: `KEEP_AS_DERIVED`; not official session objectives | none |
| G3 | `KEEP` | `KEEP` | 4: `KEEP_AS_DERIVED`, strongly grounded in p.17 | concepts 1–4,6–7 `KEEP_AS_DERIVED`; concept 5 needs `REFINE` because exact two-hand throw identity is source-backed but legacy mapping is unresolved | none |
| G4 | `KEEP` | `KEEP` | 4: `KEEP_AS_DERIVED` | 1–7 `KEEP_AS_DERIVED`; group synchronization wording is supported at D1 | none |
| G5 | `KEEP` | `KEEP` | 4: `KEEP_AS_DERIVED`; D1/D2 contextual boundary must be documented | 1–7 `KEEP_AS_DERIVED`; run/jump/throw transition is supported but not verbatim | none |

Summary counts: FinalCompetencies 5 KEEP; CompetencyComponents 15 KEEP; LearningRequirements 20 KEEP_AS_DERIVED; ObjectiveConcepts 34 KEEP_AS_DERIVED and 1 REFINE; ObjectiveVariants 0.

## Criteria/indicator discrepancy

The attached PDF supports the evaluation architecture but not the detailed per-cell criterion/indicator strings currently present in `annualPlanReference.ts` or `algerianCurriculum.ts`. Those strings require their own source document before official provenance can be assigned. This is a provenance gap, not authority to delete them.
