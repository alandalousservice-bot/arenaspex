# ArenaSPEX Knowledge Core P1F-B — Domain 1 Correction

## 1. Baseline, identity, and source

P1F-B publishes the isolated reviewed release `knowledge-core:v1.4-domain1-correction` (`1.4.0`, status `reviewed`). It derives from the immutable `dz-primary-pe-2023` artifact and the historical P1A/P1C Domain 1 releases. It does not replace or mutate those releases and is not exported through the production index.

The five official FinalCompetency IDs and fifteen official CompetencyComponent IDs are preserved. Their official wording and grade/domain ownership remain unchanged. All 20 reviewed LearningRequirement identities are retained and classified `KEEP`; no requirement is refined, split, moved, or deprecated.

## 2. ObjectiveConcept audit

Of 35 previous concepts, 34 remain unchanged in meaning and identity. G3’s two-hand stationary-throw concept is refined under the new stable identity `objective-concept:lvl_p3:f_locomotion:stationary-two-hand-throw`, explicitly superseding `objective-concept:lvl_p3:f_locomotion:5`. Its wording now binds body organization, two-hand stationary throwing, safe throwing area, and instructions. The corresponding variant is superseded rather than silently retargeted.

ObjectiveConcept counts remain seven per grade because the reviewed meaning happens to support that count, not because seven sessions are prescribed. ObjectiveKeys remain absent.

## 3. Curriculum decisions and reconciliation

| Legacy case | Decision | New-release behavior |
|---|---|---|
| G3 `f_locomotion__7` | MOVE_TO_OTHER_DOMAIN | Recognized in reconciliation metadata, excluded from D1 canonical coverage; no false alias. D1 retains official progressive running concepts. |
| G4 `f_locomotion__6` | APPROVE_REPLACEMENT | Resolves read-only to body/limb control during curve running. |
| G4 `f_locomotion__7` | APPROVE_REPLACEMENT | Resolves read-only to pace adaptation and group synchronization. |
| G5 `f_locomotion__2` | APPROVE_REPLACEMENT | Resolves read-only to balanced jump posture and safe landing. |
| G5 `f_locomotion__3` | SPLIT_REQUIRED | Reconciles to two distinct meanings: running body-position/coordination and balanced jump posture/safe landing. It receives no one-to-one alias and does not automatically count for D1 coverage. |
| G5 `f_locomotion__6` | MOVE_TO_OTHER_DOMAIN | Obstacle/jump technical meaning remains legacy-unmapped for D1; it cannot satisfy D1 requirements. |
| G5 `f_locomotion__7` | APPROVE_REPLACEMENT | Resolves read-only to transition among running, jumping, and throwing. |

The G3 speed legacy wording is not equated with the official D1 progression. Specific pace technique belongs to D2 review; D1 preserves walk→jog→light→fast progression and operation sequencing. Grade 5 D1 remains posture/adaptation/transition; Grade 5 D2 remains technical execution. Identical motor words never imply shared identity.

## 4. Variants, coverage, and historical compatibility

Variant audit: 34 KEEP, 1 SUPERSEDE, 0 LEGACY_ONLY inside the new canonical release. Historical releases continue to retain their original variants. ObjectiveKeys: 0 approved, 0 draft.

Each grade retains four complete LearningRequirements and seven ObjectiveConcepts. Canonical concepts cover all four requirements. Because the isolated release status is `reviewed`, the existing Coverage Engine deliberately reports `indeterminate` rather than treating it as an active release. This is a safety property, not missing semantic coverage.

Approved replacement references resolve through the existing read-only adapter without mutating input. Teacher wording remains unchanged. Custom objectives remain preserved and unmapped. Moved or split legacy references are recognizable in reconciliation metadata but do not falsely satisfy new D1 coverage.

## 5. Cross-domain collision and 15-cell gate

The combined P1F-B D1 and closed P1F-A D2/D3 catalogs provide 15 unique Grade×Domain cells. FCs, components, requirements, and concepts remain scoped to their cells. Collision review for running, pace, jumping, landing, throwing, balance, posture, direction change, coordination, space, organization, and rules produced contextual overlaps but no false equivalence and no unresolved critical contamination.

The six known contamination patterns are not reproduced. D3 continues to represent space, tools, landmarks, safety, and collective-game progression; D2 retains technical action; D1 retains posture, locomotion, adaptation, and source-backed progression.

## 6. P1E implications and release readiness

P1E remains `reviewed_not_activated`. P1F-B reconciliation metadata is non-active and performs no migration, database write, Teacher-plan rewrite, reference replacement, API call, or runtime activation. The release is ready for isolated semantic review and test-fixture use only.

## 7. Unresolved issues and exact next sprint

Remaining decisions concern whether evidence-backed Teacher-friendly variants or ObjectiveKeys are needed, and whether a later migration should preserve moved legacy concepts unmapped or associate them with a separately reviewed D2 reconciliation identity.

The next sprint should be **P1F-C: combined semantic release assembly and activation-readiness audit**. It should assemble the reviewed D1 correction with the closed D2/D3 release behind a non-production catalog boundary, validate all 15 cells and historical mappings in a dry run, define explicit release selection/rollback policy, and produce a migration-impact report. It must not activate runtime imports, P1E migration, Teacher-plan writes, criteria, session algorithms, or situation alignment.
