# ArenaSPEX P1M — D2/D3 Teacher Plan Compatibility Hotfix

## Production incident

With explicit candidate configuration, `seedTeacherLearningPlan()` correctly selected candidate competency components for Domains 2 and 3. `normalizeTeacherLearningPlan()` then invoked the strict Zod schema, which rejected every selected ID with `مركب الكفاءة غير تابع للمرجع الرسمي للمستوى والميدان.` The failure covered seven objectives, two integrations, diagnostic, and summative in both domains for every grade.

## Exact root cause and IDs

The validator built `officialComponentIds` only through `getLearningSectionComponents()`. That legacy helper contains Domain 1 data exclusively, so its D2/D3 allowed sets were empty. The candidate source was correct; the validation reference boundary was incomplete.

Representative Grade 1 values:

- D2 actual/canonical: `learning-section:lvl_p1:f_fundamentals:component:1..3`
- D3 actual/canonical: `learning-section:lvl_p1:f_structuring:component:1..3`
- Pre-hotfix validator expected for D2: empty set
- Pre-hotfix validator expected for D3: empty set
- D1 actual and expected: `learning-section:lvl_p1:f_locomotion:component:1..3`

Grades 2–5 use the same canonical pattern with `lvl_p2` through `lvl_p5`. D1 was unaffected because candidate D1 component identities intentionally match the established Domain 1 reference IDs.

Classification: **C** — candidate official component IDs existed for D2/D3 while the existing runtime validator had no corresponding reference IDs. This was not a copied D1 ID, domain-index error, or `f_structure`/`f_structuring` alias error.

## Compatibility strategy

`KnowledgeCoreRuntime` now resolves competency-component identities read-only as `CANONICAL`, `MOVED_DOMAIN`, or `UNKNOWN`. Strict Teacher-plan validation accepts only the established legacy IDs or candidate IDs proven canonical for the same Grade × Domain. Arbitrary IDs remain rejected.

Historical reads use a dedicated compatible schema mode: unknown/noncanonical IDs are preserved without crashing or rewriting the plan. This tolerance exists only at the read boundary; mutation/save validation remains strict. Moved-domain identities remain non-covering, and no wildcard alias is introduced.

## Validation and data guarantees

- New candidate seeds use the correct three component identities for each of all 15 cells.
- D2/D3 objectives, integrations, diagnostic, and summative pass strict validation.
- Teacher wording, custom content, count/order, and integration placement remain unchanged.
- No component, source-reference, historical, or persisted Teacher data is rewritten.
- No Prisma, database, migration, API, or UI change exists.
- G3 speed and G5 obstacle remain `MOVED_DOMAIN`; G5 split remains `SPLIT_REQUIRES_REVIEW`.
- P1E remains `reviewed_not_activated`.

## Tests and rollback

The incident test proves the old D2 allowed set was empty while the candidate supplied canonical IDs, then exercises the corrected seed/normalize path. The matrix covers all grades and domains plus strict/compatible validation, unknown/moved/split behavior, ownership, mode regressions, import direction, and zero persistence.

Production must stay in or return to `legacy` until this commit is deployed and smoke-tested. Rollback remains configuration-only: set `ARENASPEX_KNOWLEDGE_CORE_MODE=legacy`; no data or migration rollback is required.

## Reactivation requirements

Deploy this hotfix first, then manually restore the exact approved candidate configuration. Verify all 15 cells, D2/D3 plan sections, Teacher-owned content, structured diagnostics, and zero Zod errors/writes before declaring production candidate activation healthy.
