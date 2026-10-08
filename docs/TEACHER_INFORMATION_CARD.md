# Teacher Information Card and supervision dossier

The digital card is available to Teachers at `/information-card`. The existing
Inspector Teacher detail page embeds the supervision dossier. All APIs require
the existing authenticated, approved, unexpired account middleware.

## Authoritative sources

| Information | Source |
| --- | --- |
| First/surname, birth date, phone, personal email, photo | Existing `User` fields; email and photo are read-only in this card |
| Mother institution, directorate, district | Current `User` geography and its existing School/Directorate/InspectionDistrict records; legacy IDs take precedence, newer relations are fallbacks |
| Academic year | Existing `currentAcademicYearId()` policy; captured on submission |
| Additional personal, appointment, administrative, qualification, inspection and signature place/date fields | `TeacherInformationCard.extra`, a strictly validated object; no duplicate canonical geography/contact fields |
| Current annual plan | Teacher-owned `AnnualPlan`, current selected year, `kind=annual_plan_new`; existing reference/read presentation and Teacher overrides |
| Weekly timetable | `TeacherWeeklySlot`, filtered by Teacher and selected academic year |
| Groups | Teacher-owned `StudentClass` |
| Pupil counts | `Student.groupBy(classId)` restricted to the Teacher; only counts leave this endpoint |

Weekly workload is the sum of each selected-year slot's end time minus start
time, using the existing `durationMinutes` helper. It represents recorded
weekly teaching minutes, not an invented statutory workload. With no recorded
slots the value is `null` and the UI says the timetable/workload is unavailable.
Group counts include all registered Teacher groups, since StudentClass has no
academic-year field. Total pupils are all Student records owned by that Teacher.
No pupil names, identifiers, assessment results or medical details are returned.

## Ownership and workflow

Teachers read/edit only self. Requests cannot supply another Teacher ID,
assignment/geography, role, approval state or submission review metadata.
Inspectors read/review/print only currently accepted (`Active`/`Changed`)
assignments through `canInspectorAccessTeacher`, inside the same Serializable
transaction as each action. This keeps review decisions consistent with
PO-INS-02 transfers. Old Inspectors lose card/dossier/print access after accepted
transfer; destination Inspectors gain it. Existing Admin account-management
policy remains unchanged; no new Admin card editing/review privilege is added.

Workflow: DRAFT -> SUBMITTED -> VERIFIED, or SUBMITTED -> NEEDS_CORRECTION ->
Teacher save -> SUBMITTED -> VERIFIED. A correction requires a nonempty reason.
Submitted content cannot be edited while awaiting review. Editing a verified
card creates a new DRAFT; the previous submission remains unchanged. The UI
requires saving before submission. Submission requires first/surname, birth
date, mother institution, cadre and administrative status, plus a current
accepted Inspector assignment. Other fields remain optional where inapplicable.

`TeacherInformationCard.revision` provides optimistic save protection.
`TeacherInformationCardSubmission` stores a full submission-time snapshot of
canonical identity/geography and extra fields, with unique Teacher/revision.
Review only updates status, reviewer ID/time and correction reason. Snapshots
are never overwritten by Teacher edits or later changes to User records.
The Teacher and current Inspector can inspect submission history. Printing
defaults to the last submitted snapshot; an explicit current-data option and
historical submission selection are available to the current Inspector only.
Records cascade only when the existing authorized account-deletion policy
deletes the owning Teacher; this feature adds no independent delete API.

## Official print

The supplied local reference `استمارة معلومات.pdf` was visually inspected:
one A4 portrait page; SHA-256
`932243fd2f162467d6cd0cd10bc9430bfc3273d1639578bafb3dd0024ac6a05e`.
`OfficialInformationCardPrint` reproduces its ordered headings, personal rows,
right appointment/inspection boxes, five qualification rows, photo area,
notes and signature area. Directorates, districts and academic years come from
the selected authoritative data, not the reference's example Sétif/District 7.
Empty values remain blank. The signature itself is left for handwritten signing.
Photo uses the existing User avatar if its image URI is safe; no upload/storage
system is introduced. Text size adapts within fill areas. Printing waits for
fonts/photo, then invokes `window.print()`. CSS defines a named A4 portrait page
with zero printer margins and hides the entire application and preview toolbar.
Qualification entries are limited to five and 60 characters per certificate/
issuer, to fit the official five-row table. Dates and inspection mark /20 are
validated on the server. No server PDF generation is introduced.

## Validation

`tests/informationCard.test.tsx` tests strict field validation and official print
structure. `tests/postgresInformationCard.test.ts` uses the real services,
routes, auth middleware and PostgreSQL, testing ownership, transitions, snapshots,
concurrent review, transfer integration and canonical dossier counts/schedule.

Run the explicit disposable PostgreSQL gate from the repository root:

```powershell
./scripts/test-postgres-transfer-gate.ps1 -TestFile tests/postgresInformationCard.test.ts
```

The script creates a new loopback-only PostgreSQL cluster on 55482 with a new
empty disposable database, verifies the cluster directory, overrides both
Prisma URLs, applies a schema-generated pre-card baseline then the exact new
migration through Prisma migrate deploy, and drops the DB/stops the cluster.
It never connects to repository .env database targets or existing services.
It preserves ignored evidence/logs under node_modules/.cache. The transfer gate
remains the script's default test. Ordinary Vitest runs skip DB-backed gates
unless the dedicated gate URL/root variables are explicitly provided.

Print QA inspected the whole page and measured 793.70 x 1122.51 CSS pixels
(210 x 297 mm), RTL, correct table/photo/signature positions, and no overflowing
synthetic fill values. Browser PDF export was blocked by automatic execution
review; actual Save-as-PDF pagination and printer-driver output remain unverified.
