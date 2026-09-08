# ArenaSPEX Knowledge Core P2A.2C Source-Fidelity Release

## Authority and scope

The authoritative source is `docs/EPS.pdf`, the 2023 Ministry of National Education curriculum, _منهاج التربية البدنية والرياضية - مرحلة التعليم الابتدائي_. The source-fidelity artifact is implemented separately from the historical source artifact so the approved `knowledge-core:v1.5-combined-2023` release remains immutable.

The new release identity is `knowledge-core:v1.5.1-source-fidelity-2023`. Its status is `activation_candidate`; registration does not make it the default candidate and does not grant product approval.

## Nine verified source corrections

- Grade 2 overall competency removes the inserted conjunction in `طبيعية وبسيطة`.
- Grade 2 / Domain 2 restores `وضعيات متنوعة`.
- Grade 5 / Domain 2 restores `مرتبطة بالجري والوثب للرمي`.
- Grade 1 / Domain 1 component 2 restores `تكامل أطرافه` and `في الوضعيات`.
- Grade 1 / Domain 2 component 1 restores `التحولات`.
- Grade 5 / Domain 1 component 1 restores `في وضعيات الجري والوثب للرمي`.
- Grade 5 / Domain 2 components 1-3 are replaced by their exact Grade 5 official components and receive superseding canonical identities.

## Resource boundary correction

The historical artifact represented 52 label-only resource records. The official tables contain 55 resource groups. The corrected matrix is:

| Grade | D1 | D2 | D3 | Total |
| --- | ---: | ---: | ---: | ---: |
| G1 | 2 | 1 | 3 | 6 |
| G2 | 5 | 3 | 4 | 12 |
| G3 | 3 | 4 | 3 | 10 |
| G4 | 4 | 6 | 3 | 13 |
| G5 | 3 | 7 | 4 | 14 |
| **Total** | **17** | **21** | **17** | **55** |

Every corrected group preserves grade, domain, order, PDF page traceability, an official boundary label, and non-empty official structured content. Structured records retain `official_structured_extraction`; reviewed semantic requirements and concepts remain `reviewed_derived`.

## Identity and compatibility

Historical merges resolve deterministically to one canonical identity. Historical records that split across multiple corrected identities resolve as `SPLIT_REQUIRES_REVIEW`; Teacher free text is never used to choose a child. Materially wrong G5/D2 component identities are explicitly superseded. Existing moved-domain and split safeguards remain present.

The audited identity treatment manifest remains:

- `KEEP_ID_CONTENT_CORRECTION`: 48
- `SUPERSEDE_ID`: 5
- `SPLIT_ID`: 4
- `MERGE_IDS`: 2
- `NEW_ID_REQUIRED`: 4
- `REMOVE_FALSE_OFFICIAL_RECORD`: 2
- `REVIEW_IDENTITY`: 0

## Ownership and persistence safety

The release performs no database access, migration, backfill, or Teacher-data rewrite. Teacher wording, overrides, objective order/count, manual integration anchors, executed history, snapshots, and lesson memos remain unchanged. Compatibility is read-only semantic resolution.

## Validation and activation

Validation requires five grades, 15 Grade × Domain cells, 15 final competencies, 45 competency components, 55 resource requirements, unique identities, complete source traceability, and complete semantic requirement coverage. Focused tests also simulate Annual Plan reads through the runtime boundary.

Activation is intentionally deferred. `knowledge-core:v1.5-combined-2023` remains the default and production-approved release. The P1E migration remains `reviewed_not_activated`. A separate approval sprint must review and explicitly approve `knowledge-core:v1.5.1-source-fidelity-2023` before any production selection change.

## Rollback implications

Because no persistence is changed, rollback remains a release-selection operation. Returning to the approved v1.5 release requires no database migration, Teacher-data rewrite, or Knowledge Core backfill.
