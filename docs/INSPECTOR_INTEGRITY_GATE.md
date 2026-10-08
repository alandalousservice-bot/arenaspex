# Inspector integrity gate

Scope: cleanup of the existing Inspector workspace before the future Visit
Lifecycle task. Information Card, supervision dossier and their print layout
remain closed. The Product Owner confirmed acceptable one-page A4 browser
printing; this gate does not reopen that print validation.

## Findings from current source

| Path | Finding before this gate |
| --- | --- |
| `src/hooks/usePlatformStore.ts`, `handleAddInspectionVisit` | `pedagogicalGrade || 16.0` replaced both absence and explicit zero with 16; every new visit forced `officialReportGenerated: true` |
| `InspectorReportsView.tsx` | Empty component inputs were summed with zero fallbacks; partial entry synthesized a total; new records and UI/print labels implied official reports. Boilerplate observations were prefilled or used as fallbacks |
| `InspectorModals.tsx` (not imported by current workspace) | Initial mark 16.5 and fallback 16, required mark input and automatic official flag |
| `src/server/apiRouter.ts`, POST `/api/inspection-visits` | Missing mark already became null, but arbitrary numeric marks and a client-supplied official flag were accepted; no real report-finalization endpoint was found |
| `InspectorCurriculumAuditView.tsx` | School/level/domain rates and district percentage were static zeros; a fourth-grade delay warning was static and not derived from the provided lesson plans |
| `Sidebar.tsx` | Active audit entry and a static 100% compliance claim in the Inspector footer |
| `InspectorDashboard.tsx` | Real server-backed counts were displayed as zero while loading or after a failed request |
| `InspectorDirectChat.tsx` -> `handleAddDirectMessageFromInspector` | Only local React state changed. The shared direct-message state also had browser cache/cross-tab synchronization; this legacy sender never called a persistence API. UI claimed encryption/connection without backing evidence |
| `InspectorBroadcastsView.tsx` -> `handleAddBroadcast` | Only React broadcast state changed; the UI claimed all district Teachers received the broadcast |

## Reusable communication infrastructure preserved

`src/services/api.ts` already provides `syncDirectMessageToDB` /
`fetchDirectMessagesFromDB` and `syncDistrictMessageToDB` /
`fetchDistrictMessagesFromDB`. The endpoints are `/api/db/direct-messages` and
`/api/db/district-messages`, backed by existing Prisma `DirectMessage` and
`DistrictMessage` records. `jsonCollectionRoutes` in `apiRouter.ts` and
`collectionAuth.ts` implement their current read/write boundaries. The real
community `handleSendDirectMessage` uses the shared API; Inspector's obsolete
`handleAddDirectMessageFromInspector` did not. These APIs and shared handlers
are preserved for the future communication design, not replaced or newly wired.

Teacher-specific guidance is different: `handleAddInspectorNote` waits for
`syncInspectorNoteToDB` before updating state, using the existing authorized
InspectorNote collection. This functional guidance remains available. The
obsolete district broadcast and private-chat composers cannot send, mutate
message state, claim delivery or invoke replacement communication callbacks.
No district/Inspector groups, moderation/reporting, message tables or new
notification/chat subsystem are introduced.

## Corrected interim behavior

- `inspectionVisitIntegrity.ts` constructs new recorded visits with a null mark
  unless a finite /20 number is explicitly provided; zero is preserved.
- Existing three mark input ranges remain unchanged. Their total is absent
  unless all three parts are entered; no missing part is treated as zero.
  Marks reset when opening the next visit. Numeric placeholders and default
  assessment narratives are removed; persisted historical content is retained.
- Recording always creates `officialReportGenerated: false`, including when a
  direct client request forges true. No new Draft/Final model or status workflow
  is invented. Existing historical true flags/marks are not rewritten.
- Visit screens, Teacher feed and visit print label new records as recorded
  visits; existing flagged historical reports remain readable/printable.
  Follow-up `reports` contains flagged historical reports, while `visits`
  retains every authorized record. New visit print does not imply a final seal.
- Fake audit results and remediation actions are neutralized. The active
  sidebar/legacy Hero entry is removed; old route compatibility remains, but
  Inspector role navigation resolves the retired audit to Inspector home.
  Rendering the compatibility audit component yields only an unavailable notice.
- The Inspector footer makes no invented percentage/compliance claim. Genuine
  server summary counts remain; missing counts render unavailable and the
  unused uncomputed pending-approvals count is null.

## Boundaries and validation

No Prisma/schema changes or repository migrations. No historical-data cleanup.
Current assignment checks, actor identity and transfer revocation remain in
place. The old unused InspectorPedagogicalProfile still contains legacy static
planning/workload displays; it is not imported/mounted by the current workspace
and must not be reintroduced as authoritative analytics. Its mark-zero display
and visit labels are corrected without rebuilding those dormant modules.

New suites:

- `tests/inspectorIntegrity.test.tsx`: real component render and value-builder
  checks for absent/explicit marks, incomplete rubric, inert audit/communication,
  retained real InspectorNote UI, historical report display and missing counts.
- `tests/postgresInspectorIntegrity.test.ts`: real auth/routers/Prisma against a
  newly created, directory-verified, loopback-only disposable PostgreSQL cluster;
  marks, rejection of invalid input, no automatic officialization, historical
  preservation, transfer authorization, archive, card and dossier access.

Run the existing local gate script with
`-TestFile tests/postgresInspectorIntegrity.test.ts`. This test bootstraps the
unchanged schema on a proven empty test database using Prisma db push; it creates
no migration history. The script drops the test database and stops its cluster.
Existing Information Card and PO-INS-02 PostgreSQL gates are also regression-run
on fresh disposable databases. Production/remote DB/persistent UAT are untouched.
The existing note-refresh test's stale one-argument source assertion is updated
to match the already-existing teacher/year refresh call; no dossier code changes.

Visual QA uses the actual App/Inspector components with synthetic loopback API
fixtures and no DB/client import in the UI harness. Backend persistence and
authorization are independently tested against real local PostgreSQL. Official
Information Card print is not revalidated here.
