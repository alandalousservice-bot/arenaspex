# ArenaSPEX P2A — Annual Plan Read Model Integration

## Previous and new data flow

Previously, `AnnualPlanView` read all curriculum reference text directly from `ANNUAL_PLAN_REFERENCE`, then layered persisted `annual_plan_new` Teacher overrides over selected editable fields.

P2A introduces `annualPlanReferenceReadModel`: Annual Plan → `KnowledgeCoreRuntime.getAnnualPlanReference()` → approved runtime release. Candidate reads additionally require the explicit `annual_plan_reference_reads` approval scope. When runtime authority is candidate, Grade identity, Overall Competency, the three domains, Final Competencies, and Competency Components come from the Knowledge Core. When runtime authority is legacy—including shadow and every fail-closed state—the existing `ANNUAL_PLAN_REFERENCE` remains authoritative.

The browser receives only the safe mode and release identifiers as build constants. No secret or general environment object is exposed, and no endpoint is added.

## Authority and Teacher precedence

Runtime decides reference authority. The feature neither imports a candidate release nor implements its own activation decision. Persisted Teacher customization remains a separate layer and wins over the active reference value. Reading candidate data performs no save, reset, rewrite, migration, or backfill. Existing clear behavior remains explicit, and the existing reset action deletes the Teacher override before resolving the currently active reference.

## Domain identity and 15-cell coverage

All five grades resolve the exact identities `f_locomotion`, `f_fundamentals`, and `f_structuring`. The historical `f_structure` spelling is normalized only to `f_structuring`; no text or keyword matching is used. Tests verify all 15 Grade × Domain cells and explicitly separate G5/D1, G5/D2, and G5/D3.

## Provenance and criteria/indicators

Canonical Grade, Overall Competency, Domain, Final Competency, and Component nodes retain their Knowledge Core provenance. Existing Annual Plan knowledge resources, transversal resources, time, criteria, and indicators remain from the legacy presentation reference because the approved source does not provide a complete official set for every cell. They are recorded as preserved derived fields and are not relabeled as official.

G3 speed and G5 obstacle remain `MOVED_DOMAIN`; G5 split remains `SPLIT_REQUIRES_REVIEW`. P2A creates no alias for these cases.

## Modes, rollback, and exclusions

- `legacy`: previous Annual Plan reference output.
- `shadow`: legacy-authoritative output; candidate remains observational.
- valid approved `candidate`: Knowledge Core Annual Plan reference fields.
- unknown, unapproved, or invalid candidate: runtime fails closed and the read model uses legacy output.
- rollback: set runtime mode to `legacy` and rebuild/redeploy the client artifact.

P1E remains `reviewed_not_activated`. Annual Distribution, Weekly Timetable, Daily Notebook, Lesson Memo, Gradebook, Assessment, Attendance, Students Book, Situation Bank, Inspector, Admin, Teacher Learning Sections, objectives, integrations, and executed history are intentionally unchanged.
