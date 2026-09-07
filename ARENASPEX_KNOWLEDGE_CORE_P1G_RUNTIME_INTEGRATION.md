# ArenaSPEX Knowledge Core P1G Runtime Integration

## 1–4. Architecture, boundary, registry, and configuration

The dependency direction is `Teacher Learning Plan → KnowledgeCoreRuntime → explicit release registry → P1F-C → official source`. Feature code has no direct candidate/source import. The registry accepts only `knowledge-core:v1.5-combined-2023`. Configuration keys are `ARENASPEX_KNOWLEDGE_CORE_MODE`, `ARENASPEX_KNOWLEDGE_CORE_RELEASE_ID`, and `ARENASPEX_KNOWLEDGE_CORE_PRODUCT_APPROVED`.

## 5–8. Default mode, validation, fail-closed, and approval

Default mode is `legacy`; product approval defaults to false. Unknown modes/releases, failed validation, or unapproved candidate requests fall back to legacy with a structured reason. Registry validation is computed once at module initialization. Candidate authority requires both a valid registered release and explicit approval.

## 9–12. Read-only contract, shadow mode, integration surface, regression

The boundary exposes status, release metadata, Grade × Domain cells, historical resolution, internal coverage, and legacy comparison. It has no mutation API. The sole feature integration is the existing Teacher Learning Plan reference read. Its return value remains the legacy value; shadow output is discarded and cannot alter Teacher-visible content. Legacy output and plan shape remain unchanged.

## 13. Fifteen-cell shadow matrix

| Grade | Domain | Legacy FC | Candidate FC | Components | Semantic reference | Expected correction | Risk |
|---|---|---|---|---|---|---|---|
| G1 | D1 | PRESENT | PRESENT | LEGACY_UNSTRUCTURED | EXPECTED_CORRECTION | yes | REVIEWED |
| G1 | D2 | PRESENT | PRESENT | LEGACY_UNSTRUCTURED | EXPECTED_CORRECTION | yes | REVIEWED |
| G1 | D3 | PRESENT | PRESENT | LEGACY_UNSTRUCTURED | EXPECTED_CORRECTION | yes | REVIEWED |
| G2 | D1 | PRESENT | PRESENT | LEGACY_UNSTRUCTURED | EXPECTED_CORRECTION | yes | REVIEWED |
| G2 | D2 | PRESENT | PRESENT | LEGACY_UNSTRUCTURED | EXPECTED_CORRECTION | yes | REVIEWED |
| G2 | D3 | PRESENT | PRESENT | LEGACY_UNSTRUCTURED | EXPECTED_CORRECTION | yes | REVIEWED |
| G3 | D1 | PRESENT | PRESENT | LEGACY_UNSTRUCTURED | EXPECTED_CORRECTION | yes | REVIEWED |
| G3 | D2 | PRESENT | PRESENT | LEGACY_UNSTRUCTURED | EXPECTED_CORRECTION | yes | REVIEWED |
| G3 | D3 | PRESENT | PRESENT | LEGACY_UNSTRUCTURED | EXPECTED_CORRECTION | yes | REVIEWED |
| G4 | D1 | PRESENT | PRESENT | LEGACY_UNSTRUCTURED | EXPECTED_CORRECTION | yes | REVIEWED |
| G4 | D2 | PRESENT | PRESENT | LEGACY_UNSTRUCTURED | EXPECTED_CORRECTION | yes | REVIEWED |
| G4 | D3 | PRESENT | PRESENT | LEGACY_UNSTRUCTURED | EXPECTED_CORRECTION | yes | REVIEWED |
| G5 | D1 | PRESENT | PRESENT | LEGACY_UNSTRUCTURED | EXPECTED_CORRECTION | yes | REVIEWED |
| G5 | D2 | PRESENT | PRESENT | LEGACY_UNSTRUCTURED | EXPECTED_CORRECTION | yes | REVIEWED |
| G5 | D3 | PRESENT | PRESENT | LEGACY_UNSTRUCTURED | EXPECTED_CORRECTION | yes | REVIEWED |

## 14–15. Expected and unexpected differences

All 15 legacy summaries differ from the reviewed official semantic wording and are classified as `EXPECTED_CORRECTION`, not regressions. The legacy layer has no equivalent 15-cell component structure, hence `LEGACY_UNSTRUCTURED`. Unexpected differences are never normalized away: `AMBIGUOUS` and `CONFLICT` block Gate I. Current critical unexpected conflict count is zero.

## 16–17. Historical references and coverage versus authority

Historical resolution is informational: canonical, superseded, moved-domain, split-review, unmapped, ambiguous, or unknown. G3 speed and G5 obstacle remain moved-domain; the G5 split remains review-required. Candidate semantic coverage is complete while runtime authority remains legacy.

## 18–20. Privacy, rollback, and performance

Diagnostics contain mode, release ID, validation status, comparison status, and fallback reason only. Teacher free text and personal/student data are not logged. Switching to legacy immediately removes candidate participation; no database rollback exists or is needed. The static release is validated once per module lifecycle.

## 21–23. Gates and blockers

Gate I: **PASS** — legacy remains authoritative, candidate validation and 15-cell shadow comparison pass, rollback works, no writes occur, and unexpected critical conflicts are zero.

Gate J: **PENDING_PRODUCT_APPROVAL**. P1G does not self-approve activation.

Overall decision: **GATE_I_PASS_GATE_J_PENDING**. The sole activation blocker is explicit product approval.

## 24. Exact activation recommendation

Run a separate product-approval sprint that reviews the 15 expected corrections, approves Gate J explicitly, verifies deployment configuration in staging, and then enables candidate authority through configuration with immediate legacy rollback retained. P1E migration must remain a separate, later decision.
