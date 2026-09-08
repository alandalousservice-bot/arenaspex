# ArenaSPEX Knowledge Core P1L Deployment Activation

## 1–3. Target, revision, and pre-activation state

- Target: production Render web service `spex-platform`
- Repository evidence: `render.yaml`, `render:build`, `render:start`, and `/health`
- Approved repository revision: `28ea8c840f1c35aa598dba6533ca9973854d594c`
- Public health baseline: `https://spexeps19-067c.onrender.com/health` returned HTTP 200 with `ok: true`, service `spex`, environment `production`
- Effective Knowledge Core mode/authority/release are not exposed publicly and could not be observed before activation

## 4–5. Required variables and deployment method

In Render Dashboard, open `spex-platform` → Environment and set exactly:

```text
ARENASPEX_KNOWLEDGE_CORE_MODE=candidate
ARENASPEX_KNOWLEDGE_CORE_RELEASE_ID=knowledge-core:v1.5-combined-2023
```

Save the environment changes and allow Render's normal restart/redeploy. Do not add secrets or alter application defaults. The attempted dashboard session was not authenticated, so these variables were **not applied** by this task.

## 6. Effective runtime state

Deployment activation is unverified. Expected after successful configuration: requested/effective mode `candidate`, authority `candidate`, release `knowledge-core:v1.5-combined-2023`, approval `approved`, validation `PASS`, and no fallback reason. Current externally observable authority remains unknown; code default remains legacy.

## 7–8. Fifteen-cell and coverage smoke

Local approved-runtime tests query all 15 Grade × Domain cells and report complete semantic coverage for 15/15. These are repository tests, not production smoke evidence.

## 9. Teacher reference-read smoke

Local tests prove the Teacher Learning Plan reference-read path uses `KnowledgeCoreRuntime`, preserves Teacher wording/custom objectives/count/order/integration placement, and performs no persistence. Live authenticated Teacher smoke could not be performed without deployment access and a safe authenticated test context.

## 10–11. Safeguards and Domain 3

Local runtime verification preserves G3 speed and G5 obstacle as `MOVED_DOMAIN`, and G5 split as `SPLIT_REQUIRES_REVIEW`. Corrected Domain 3 cells G1–G5 are available in the approved candidate. Production verification remains pending deployment.

## 12–13. Writes and P1E

The runtime boundary has no persistence methods or database coupling. No Teacher plan, objective, source reference, integration, or historical write was performed. Telemetry was unavailable, so production zero-write verification is limited to static/service tests. P1E remains inactive; no migration command was run.

## 14–15. Health and fallback diagnostics

Public application health passed with HTTP 200. Internal mode/authority/fallback diagnostics have no public endpoint by design, so no live fallback frequency could be observed. No public API was added for this task.

## 16. Rollback verification

Local tests prove candidate → legacy rollback by configuration only. A live rollback drill was not attempted because production environment access was unavailable. Manual rollback is:

```text
ARENASPEX_KNOWLEDGE_CORE_MODE=legacy
```

Save and restart/redeploy, then verify authority is legacy and Teacher reference reads remain healthy. No DB, Teacher-data, historical, or migration rollback is required.

## 17–19. Final mode, blockers, and result

- Final deployed mode: not changed/unknown; code default remains legacy
- Blocker: Render Dashboard authentication/platform access unavailable
- Final result: `MANUAL_DEPLOYMENT_CONFIGURATION_REQUIRED`

Do not claim production activation until the Render variables are saved, the service redeploys successfully, internal authority is observed as candidate, and the 15-cell plus Teacher reference-read smoke checks pass.

## 20. Next integration scope

After production activation is verified and observed without fallback or Teacher-content changes, keep the scope stable for an observation window. The next integration should be separately approved; Annual Distribution is the logical next read-only consumer, but must not be enabled as part of P1L.
