# ArenaSPEX Official Curriculum Source Artifact 2023

## Purpose and authority

`OFFICIAL_CURRICULUM_2023` is the immutable, typed source-layer transcription of the official Algerian primary Physical Education and Sport curriculum published in 2023 (`docs/EPS.pdf`). Its identity is `dz-primary-pe-2023`, version `2023`; its deterministic FNV-1a hash is computed from normalized artifact content and is independent of academic year.

The artifact is evidence for future reviewed Knowledge Core releases. It is not production runtime authority and is not imported through the pedagogical-knowledge production index.

## Schema and coverage

The hierarchy is `OfficialCurriculumSourceArtifact → OfficialCurriculumGrade → OfficialGradeDomainCell`. It contains exactly five grade-level OverallCompetencies and 15 Grade×Domain cells. Every cell contains one FinalCompetency, exactly three CompetencyComponents, structured resource groups, source page/heading provenance, and readiness metadata. Across the artifact there are 15 FinalCompetencies, 45 components, and 52 resource groups.

Every source record identifies `EPS-2023`, its PDF page and source heading. Verbatim competency wording uses `official_verbatim`; regrouped resource material uses `official_structured_extraction`. The source layer cannot contain `reviewed_derived` records.

## Identity and cross-domain rules

Stable identity is grade- and domain-scoped, never inferred from display wording. Existing Domain 1 FinalCompetency and component IDs are preserved. The same motor term may legitimately occur in multiple domains with distinct identities. In Grade 5, Domain 1 records posture, adaptation, propulsion and transition involving running/jumping/throwing; Domain 2 records their technical execution. These contexts are not collapsed.

## Resource-group treatment

The 52 groups are `OfficialResourceGroup` source items. They are not LearningRequirements, ObjectiveConcepts, TeacherObjectives, lessons, or sessions. Their `content` preserves the source grouping without manufacturing an entity for every comma-separated example.

## Evaluation limitation

EPS 2023 provides a general evaluation framework and a blank evaluation grid on pages 27–28. It does not provide complete criteria or indicator strings for all 15 cells. The artifact therefore records `perCellCriteriaAvailable: false` and `perCellIndicatorsAvailable: false`; it does not promote existing ArenaSPEX criteria to official source status.

## Source, semantic, and operational separation

- Official source layer: the artifact in `src/domain/pedagogicalKnowledge/source/`.
- Reviewed semantic layer: LearningRequirements, ObjectiveConcepts, and ObjectiveVariants in reviewed releases.
- Operational layer: Teacher Learning Plans, Annual Distribution, and realized sessions.

The official curriculum supports formative regulation but does not prescribe ArenaSPEX’s diagnostic/learning/integration/summative sequence, A/B meeting rules, integration placement, or remediation algorithm. Those remain reviewed platform decisions.

## Compatibility and future work

The artifact does not overwrite the current Domain 1 reviewed core. P1E mappings and migration remain inactive. The next safe sprint is reviewed Domain 2 and Domain 3 semantic derivation from this source artifact, followed by explicit review of the known cross-domain decisions before any runtime release or Teacher-plan migration.
