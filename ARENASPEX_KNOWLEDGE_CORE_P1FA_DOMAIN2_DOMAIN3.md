# ArenaSPEX Knowledge Core P1F-A — Domain 2 and Domain 3

## 1. Scope and release strategy

P1F-A adds one reviewed semantic release, `knowledge-core:v1.3-domain2-domain3`, covering ten Grade×Domain units for `f_fundamentals` and `f_structuring`. One release was chosen because both domains derive from the same immutable `dz-primary-pe-2023` source release, use the same provenance policy, and share the existing coverage and read-only adapter contracts. It remains isolated from the production index and runtime.

Every official FinalCompetency and CompetencyComponent identity is reused without rewriting. LearningRequirements and ObjectiveConcepts are approved `reviewed_derived` nodes traced to the source artifact, official resource group, and official component. No criteria, indicators, ObjectiveKeys, ObjectiveVariants, session rules, or situation alignments are introduced.

## 2. Domain 2 source basis and semantic models

Domain 2 treats motor actions through technical execution, coordination, pace, progression, safety, and source-backed gymnastics. It does not absorb Domain 1 posture/adaptation identities.

| Unit | Official focus | Reviewed requirement model | Requirements | Status | Concepts | Complexity progression |
|---|---|---|---:|---|---:|---|
| G1/D2 | integrated basic actions and transitions | pace-based walking/running; gradual and directional transitions | 2 | complete | 2 | distinguish and connect simple locomotor actions |
| G2/D2 | natural actions in varied postures | actions from varied starting postures; limb integration and coordinated execution | 2 | complete | 2 | adapt integrated action to starting posture |
| G3/D2 | running and throwing | pace; running paths; throwing forms; safety | 4 | complete | 4 | choose and execute run/throw forms safely |
| G4/D2 | jumping, throwing, gymnastics | jump forms; throw forms; gymnastics jumps; balance; rotation/safe fall; rolling | 6 | complete | 6 | coordinate multi-stage foundational techniques |
| G5/D2 | technically sound running, jumping, throwing | sprint dynamics; jump technique; throw technique; gymnastics jumps; balance; rotation; rolling | 7 | complete | 7 | refine technical phases and connect advanced execution |

Domain 2 progression: integrated simple actions → adaptation to posture → paced running/throwing with safety → coordinated jump/throw/gymnastics → technically structured running/jumping/throwing and gymnastics.

## 3. Domain 3 source basis and semantic models

Domain 3 follows the official progression through practice space, formations, tools, landmarks, organized intervention, safety, and collective sport. It is not represented as generic group activity.

| Unit | Official focus | Reviewed requirement model | Requirements | Status | Concepts | Complexity progression |
|---|---|---|---:|---|---:|---|
| G1/D3 | practice space and formations | places; boundaries/shared space; organized formations | 3 | complete | 3 | identify and use bounded shared space |
| G2/D3 | tools and suitable use | tools; pass/receive; directional throw/roll; storage | 4 | complete | 4 | select, use, exchange, and preserve tools |
| G3/D3 | organized interventions | situation behavior; landmarks/target throw; competition safety/rules | 3 | complete | 3 | organize intervention through landmarks and rules |
| G4/D3 | movement in available safe space | spatial relation; throwing area; jumping path | 3 | complete | 3 | regulate movement, throw, and jump through spatial constraints |
| G5/D3 | collective games | mini-games/rules; initial tactics; ball techniques | 3 | complete | 3 | coordinate tactical and technical collective play |

Domain 3 progression: space and formations → tool use and preservation → landmark-based organized intervention → safe spatial regulation of movement → collective games, tactics, and techniques.

## 4. Counts, variants, and keys

- Domain 2 requirements/concepts by G1–G5: `2, 2, 4, 6, 7`.
- Domain 3 requirements/concepts by G1–G5: `3, 4, 3, 3, 3`.
- Total requirements: 37. Total ObjectiveConcepts: 37.
- ObjectiveVariants: 0. The source evidence does not justify duplicate wording sets yet.
- ObjectiveKeys: 0 approved and 0 draft. No weak or generic keys were manufactured.
- All ten requirement sets are `complete`; canonical concept coverage is complete. Partial and unmapped plans remain partial/unmapped, and merged versus split objective shapes produce equivalent requirement coverage.

## 5. Cross-domain safeguards and known contaminations

Identity is always grade/domain scoped. The same words may occur in different domains without sharing semantic identity. Grade 5 Domain 1 retains body-posture/adaptation/transition meaning around running, jumping, and throwing; Domain 2 owns their technical execution. Throwing in Domain 3 remains tied to target, tool, practice space, rules, or collective-game technique.

The semantic release does not reproduce the six audited contaminations. In particular, G1–G4 Domain 3 retain their official space, tool, landmark, and spatial-regulation meanings rather than a generic group-activity label. The G5 obstacle/jump concept is not introduced into Domain 1.

## 6. Traceability, adapter, and coverage

Every LearningRequirement and ObjectiveConcept stores `sourceArtifactId: dz-primary-pe-2023`, one or more official resource-group IDs, and official component IDs. The existing Coverage Engine is reused unchanged. The existing Teacher Plan semantic adapter resolves P1F-A’s reviewed source mappings read-only in tests; no API, persistence, UI, or production import was added.

## 7. Unresolved semantic questions

- Whether future reviewed variants are needed for Teacher-friendly wording without multiplying concepts.
- Whether selected technical success conditions justify ObjectiveKeys after evidence review.
- Whether some broad resource groups should remain one requirement or be split after classroom validation.
- How future Domain 1 corrections should reconcile the G3 speed overlap and G5 obstacle/jump legacy identity without rewriting Teacher history.
- Criteria and indicators remain unresolved because EPS 2023 has no explicit per-cell sets.

## 8. Exact P1F-B recommendation

P1F-B should correct Domain 1 semantic boundaries only: reconcile G3 speed meaning with Domain 2, keep G5 run/jump/throw posture-adaptation distinct from Domain 2 technique, move or preserve-unmapped the G5 obstacle/jump legacy concept, and apply the seven approved P1E audit decisions as a new reviewed Domain 1 release. It must preserve historical Teacher wording and order, keep P1E migration inactive until a separate dry-run approval, and introduce no criteria, session algorithm, situation alignment, API, UI, or persistence change.
