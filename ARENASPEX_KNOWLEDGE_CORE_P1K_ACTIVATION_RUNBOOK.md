# ArenaSPEX Knowledge Core P1K Activation Runbook

## 1–2. Approved candidate and evidence

`knowledge-core:v1.5-combined-2023` is approved for controlled runtime activation. Evidence: official source PASS; 15/15 cells and semantic coverage PASS; Gate I PASS; 15 expected corrections reviewed as 6 APPROVE and 9 APPROVE_WITH_NOTE; zero HOLD, REJECT, AMBIGUOUS, CONFLICT, or critical contamination; Teacher ownership, executed history, fail-closed behavior, and rollback PASS; explicit product-owner approval recorded by P1K.

## 3–4. Scope and default

Approval covers **Teacher Learning Plan reference reads only** through `KnowledgeCoreRuntime`. Code default remains `legacy`; no environment or hosting configuration is changed by this commit.

## 5. Exact activation configuration

Set these non-secret deployment variables:

```text
ARENASPEX_KNOWLEDGE_CORE_MODE=candidate
ARENASPEX_KNOWLEDGE_CORE_RELEASE_ID=knowledge-core:v1.5-combined-2023
```

Do not add an approval bypass. Approval is release-specific in the repository artifact.

## 6. Pre-activation checks

Confirm deployed commit includes the approved record; selected release ID matches exactly; source/release/15-cell/coverage validation passes; Gate I and Gate J are PASS; direct feature imports remain zero; Teacher Learning Plan remains the sole consumer; and rollback access is available.

## 7–8. Expected authority and smoke tests

Runtime status must report requested/effective mode `candidate`, authority `candidate`, approved release ID, approval `approved`, and validation `PASS`. Query all 15 Grade × Domain cells and complete coverage. Verify G1–G5 D1/D2/D3, G3 speed and G5 obstacle as `MOVED_DOMAIN`, G5 split as `SPLIT_REQUIRES_REVIEW`, successful Teacher reference reads, unchanged Teacher-owned content, and zero persistence writes.

## 9–10. Rollback and verification

Set `ARENASPEX_KNOWLEDGE_CORE_MODE=legacy` and redeploy/restart configuration. Verify authority is `legacy`, candidate participation stops, Teacher Learning Plan reads remain healthy, and no data rollback or migration is attempted.

## 11. Fail-closed scenarios

Unknown/unregistered release, unapproved release, invalid candidate, failed validation, missing approval, or invalid mode must all yield legacy authority with a structured fallback reason.

## 12–14. Ownership, history, and P1E

Teacher wording, custom objectives, count/order, situations, notes, execution content, guidance, and manual integration placement remain Teacher-owned. No operational or historical record is rewritten. Runtime activation is not migration; P1E remains inactive.

## 15. Excluded subsystems

Annual Distribution, Daily Notebook, Lesson Memo, Gradebook, Assessment, Situation Bank, public APIs, Admin UI, and Teacher UI activation controls are excluded.

## 16. Post-activation observation checklist

Observe structured runtime mode/authority/release/approval/validation/fallback metadata; verify Teacher Learning Plan reference reads and latency; confirm no fallback events or unexpected errors; sample all 15 cells; confirm no changes to Teacher-authored content or persistence; and retain immediate legacy rollback. Do not log Teacher free text, student data, or personal information.
