# ArenaSPEX Knowledge Core - Next Architecture after Official Curriculum Audit

## Executive recommendation

Do not activate P1E or migrate plans next. The safest sequence is to establish a source-oriented 15-cell curriculum layer, correct provenance and cross-domain defects, then create reviewed semantic releases domain by domain. Runtime catalogs and Teacher plans remain untouched until those releases and decisions are approved.

## Proposed layers

1. **Official source layer:** immutable grade/domain cells containing verbatim FinalCompetency and components plus structured resource groups, each with PDF page/heading provenance.
2. **Reviewed semantic layer:** LearningRequirements and ObjectiveConcepts explicitly marked `reviewed_derived`, linked to one or more source items without pretending to be verbatim.
3. **Platform operational layer:** Teacher defaults, sessions and distributions linked by stable IDs; it never becomes source authority.
4. **Historical snapshot layer:** ClassPlannedSession, NotebookEntry, LessonPlan and assessment records remain immutable historical realizations.

## Recommended implementation sequence

### Phase P1E.6 - source artifact and provenance tests

- Add a non-runtime typed audit artifact for all 15 cells.
- Require exactly 5 grades × 3 domains, 15 FCs, 45 components and traceable resource groups.
- Encode page/heading provenance and distinguish verbatim from structured extraction.
- Do not export it through a production index yet.

### Phase P1F-A - Domain 2 and Domain 3 reviewed core design

- Build LearningRequirement proposals from the official cell resources.
- Review cross-domain concepts by context, especially run/jump/throw, tools, space and collective games.
- Produce new draft releases; no Teacher-plan or runtime activation.

### Phase P1F-B - Domain 1 correction release

- Keep the five source-backed FCs and 15 components.
- Preserve 20 LRs as reviewed derivations subject to source-link audit.
- Refine the G3 two-hand-throw concept and G5 posture-adaptation boundary.
- Resolve the seven P1E decisions using the reevaluation report.

### Phase P1F-C - reference reconciliation only

- Correct `algerianCurriculum.ts` cross-domain FinalCompetencies in a dedicated reviewed change.
- Keep Annual Plan UI/persistence untouched.
- Keep criteria/indicators provisional until their external source is attached and verified.
- Publish a version/hash and rollback marker before any runtime switch.

### Phase P1F-D - Teacher-plan dry run

- Run the existing side-effect-free detector against de-identified snapshots.
- Separate untouched defaults, edited defaults, custom objectives, custom ordering/integration, and executed history.
- Produce review reports only. No write operation in this phase.

### Phase P1F-E - optional migration

- Requires explicit product approval, snapshot, audit log, idempotency marker and per-plan transaction.
- Remap identity only where safe; preserve Teacher wording, count, order, situations, resources, notes and execution history.
- Never rewrite materialized historical sessions/documents.

## Source gaps blocking full activation

- The PDF has no explicit grade/domain criterion and indicator sets; the source behind existing detailed strings must be supplied.
- The PDF does not provide seven session ObjectiveConcepts per cell; those remain reviewed derivations.
- Exact Diagnostic/Learning/Integration/Summative sequencing and integration placement are platform decisions, not source algorithms.
- No official wording establishes an independent remediation session type.
- G3 speed adaptation and G5 obstacle movement require domain-level product decisions even after source review.

## Readiness decision

Ready for a source-artifact sprint and Domain 2/3 semantic design. Blocked for production P1E activation, reference replacement, or Teacher-plan migration until provenance gaps and the reevaluated product decisions are closed.
