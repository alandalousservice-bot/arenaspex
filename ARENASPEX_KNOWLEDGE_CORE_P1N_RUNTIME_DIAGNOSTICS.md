# ArenaSPEX P1N — Safe Runtime Activation Diagnostics

## Purpose and scope

P1N adds one read-only startup diagnostic proving which Knowledge Core authority is active. It observes the existing runtime decision and does not alter candidate semantics, activation guards, Teacher data, persistence, or the approved scope of Teacher Learning Plan reference reads.

## Diagnostic fields and privacy

The event has an explicit seven-field allowlist: `requestedMode`, `effectiveMode`, `authority`, `releaseId`, `approvalStatus`, `validationStatus`, and `fallbackReason`. It contains no Teacher, student, school, district, free-text, session, authentication, token, secret, cookie, URL, or API-key data.

## Examples

Healthy candidate:

`[KnowledgeCoreRuntime] {"requestedMode":"candidate","effectiveMode":"candidate","authority":"candidate","releaseId":"knowledge-core:v1.5-combined-2023","approvalStatus":"approved","validationStatus":"PASS","fallbackReason":null}`

Legacy default:

`[KnowledgeCoreRuntime] {"requestedMode":"legacy","effectiveMode":"legacy","authority":"legacy","releaseId":"knowledge-core:v1.5-combined-2023","approvalStatus":"approved","validationStatus":"NOT_REQUESTED","fallbackReason":null}`

Fail-closed unknown candidate release:

`[KnowledgeCoreRuntime] {"requestedMode":"candidate","effectiveMode":"legacy","authority":"legacy","releaseId":null,"approvalStatus":"approved","validationStatus":"FAIL","fallbackReason":"UNKNOWN_RELEASE"}`

## Frequency and production verification

The server emits the structured line once for the singleton runtime during startup. A per-runtime weak identity guard prevents duplicate emission within the same initialization lifecycle.

After deploying, inspect Render startup logs and require the healthy-candidate line above. A candidate request showing legacy authority and a non-null fallback reason is a fail-closed state, not successful activation.

## Rollback and unchanged guarantees

Rollback remains configuration-only: select `legacy` and confirm the next startup line reports legacy requested/effective mode and authority. The default remains legacy, shadow remains legacy-authoritative, candidate scope is not broadened, and P1E remains `reviewed_not_activated`.
