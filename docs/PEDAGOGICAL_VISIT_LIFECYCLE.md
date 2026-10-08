# Pedagogical Visit lifecycle

## Discovery before implementation (2026-10-07)

Baseline: main, 30d7e5441b5dafa652f070e21f1f990fd767a5af; 41 modified tracked files, 2044 untracked files, zero staged files. Prior work is preserved.

- `InspectionVisitRecord`: id, inspectorId, teacherId, optional institutionId, JSON data, createdAt. No lifecycle/status columns, time, year or communication state. JSON carries Arabic visitType, visitDate, optional pedagogicalGrade, lessonObservedTitle, positives/improvements/recommendations and officialReportGenerated.
- `POST /api/inspection-visits` checks accepted assignment, sanitizes actor/institution, preserves explicit marks including zero, forces new officialReportGenerated=false. Existing InspectorReportsView mixes recording with report observation inputs, supports a legacy evaluation option, and lists/prints historical JSON. InspectorModals is dormant. No report finalization endpoint/model.
- `assignmentRouter`: Inspector visits, summary, roster, follow-up and authored archive use InspectionVisitRecord. Teacher inspection-feed returns visits for the current accepted inspector, including full legacy JSON and counts. No generic Visit collection or direct object endpoint was found.
- TeacherDashboard / InspectorFeedPanel read the Teacher-specific feed; platform store separately hydrates Inspector visits. Teacher-facing legacy visits need server filtering when lifecycle rows are added.
- `CommunityNotification` already persists recipient/sender/type/title/message/read/readAt/data/createdAt. `/communication/notifications` is recipient-scoped; `/db/community-notifications` supports recipient/sender scoped JSON compatibility. ProfessionalHub renders the persisted notification feed. Reuse this table and recipient feed; do not build another subsystem.
- `TeacherWeeklySlot`: Teacher + class + academicYear + weekday/start/end; Teacher owns edits. Existing Inspector timetable endpoint and InspectorSupervisionDossier expose authorized read-only slots, groups and aggregate workload. No individual pupil assessments are needed.
- AcademicCalendarView and AnnualDistributionCalendar describe curricular dates; no reusable Visit calendar business model. Native date/time controls and date-grouped Visit agenda fit the existing RTL design without a Calendar table.
- `canInspectorAccessTeacher` checks Active/Changed assignment. PO-INS-02 updates the unique current head in a Serializable transaction, preserving transfer source history. Historical old-inspector visit actor remains intact. Old Inspector archive uses authored records and transfer cutoff; current access must continue to use the unique accepted head.

## Compatibility and report boundary

New optional typed lifecycle columns identify new visits. Null lifecycle status means a legacy record, not an inferred COMPLETED status. No backfill, historical JSON rewriting or historical mark conversion. Legacy recording remains API-compatible; its UI is read-only history in the current workspace. New scheduling has exactly GUIDANCE, TENURE, MONITORING and no mark/report inputs. New JSON contains no identity snapshot or report narrative. Future VisitReport must authorize its own finalized publication; this task never publishes newly completed surprise visits or their report content.

## Implementation contract

Scheduling and every action use the existing Serializable assignment transaction and a client revision CAS. Current accepted Inspector can manage lifecycle rows even if an older Inspector created them; original inspectorId is never rewritten. Old Inspector retains authorized historical read-only archive, not future management. Terminal states cannot recover. Postponement/cancellation reasons and actors/times, reschedules and explicit communication are recorded in per-visit transition history (not a generic audit subsystem).

Timetable/class IDs are validated against the Teacher/year when scheduled. They are optional source references; they intentionally have no deletion FK, so edits/deletion of timetable/class do not remove or rewrite the Visit's own time. Existing institution reference is server-derived. Date-times are explicit ISO with zone; UI uses Algeria (+01:00).

TENURE is hidden until an explicit communicate action. Communication is separate from lifecycle status. A stable existing CommunityNotification per visit is upserted atomically with communication and subsequent appointment changes; unrelated/no-op actions do not generate notifications. Teacher appointment payload contains only appointment state, not report JSON, private history or private reasons. GUIDANCE/MONITORING have no communication action and are excluded from all Teacher visit reads/counts, including after completion pending future report publication policy.

No production/remote DB access. Migration and tests use fresh proven disposable loopback PostgreSQL. Prior migrations and closed card/print architecture remain intact.

## API and visibility details

- POST `/api/pedagogical-visits`: Teacher ID, one approved type, explicit zoned future scheduledAt, academicYearId, optional classId/weeklySlotId. Unknown fields are rejected. No mark, report or Teacher identity fields.
- POST `/api/pedagogical-visits/:id/actions`: action and current revision; POSTPONE/CANCEL require reason, RESCHEDULE requires new future date-time. COMPLETE cannot happen before the appointment time. Completed/Cancelled are terminal.
- GET `/api/inspector/visit-planning`: current accepted Teacher scope, optionally a Teacher/year filter. The creator actor remains unchanged after transfer; the new current Inspector controls non-terminal supervision.
- GET `/api/teacher/visit-appointments[/:id]`: own communicated TENURE appointments only; minimal appointment fields, no report/private history/reasons. Counts use only this visible set. Already communicated completed appointments retain their appointment status; there is no newly published report or uncommunicated completed Visit.
- Legacy recording endpoint is retained for retrospective compatibility only, restricted to approved types/aliases and non-future dates. It now locks/checks assignment inside the existing Serializable transaction. Current UI displays legacy records read-only. Known future-dated legacy records are withheld from Teacher feed/counts while retained for Inspector/historical reading; no legacy status is inferred or backfilled.
- Teacher appointment UI refreshes on focus/visibility change and every 30 seconds. This uses existing HTTP APIs, not a new push/communication service.
- Visit notification ID/type namespace is protected from client JSON writes. Recipient, sender and communication metadata are server-derived. Communication and subsequent appointment updates upsert one existing CommunityNotification atomically, including rollback on notification failure.
- Prior Inspector archive includes new completed/cancelled events only when their terminal time predates the accepted-transfer cutoff, with type/date/lifecycle details and original actor. Pending/future supervision and post-transfer changes remain under current supervision.
- Service worker already bypasses API caching; authenticated API responses now receive private/no-store cache control. New planning records are not hydrated into legacy browser visit storage.

## Validation workflow

`./scripts/test-postgres-transfer-gate.ps1 -TestFile tests/postgresPedagogicalVisit.test.ts` creates/verifies a fresh dedicated loopback cluster and empty database before any write, deploys a schema-generated pre-visit baseline and the byte-identical new migration through Prisma migrate deploy, fingerprints all pre-existing data tables, validates final schema equality, and runs real HTTP/JWT/Prisma services. It drops the disposable database and stops that cluster afterward; the pre-existing PostgreSQL service is untouched. Historical migration files are not changed or replayed/repaired.

Visual QA uses the actual App and components with a local fixture-only Vite server (`envFile:false`, `configFile:false`, no DB imports), plus real persistence/security tests separately. Card/timetable regression checks are retained; closed A4 print is not reopened.
