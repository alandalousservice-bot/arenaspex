# ArenaSpex Platform Audit

Audit date: 2026-09-05. This is a source-code and local-validation audit of the baseline below, before cleanup or theme refactoring. Findings are not evidence of a production incident. No production database, authenticated browser session, screen-reader session, or physical print preview was tested. Browser geometry, deployed migration history, exploitability in a live environment, and real-user performance remain unverified.

## 1. Executive Summary

**Overall: needs attention; proceed with restrictions.** The platform has recognizable domain services, server-side authentication, teacher ownership checks, dynamic learning plans, dedicated print renderers, and a substantial regression suite. However, the audit found concrete authorization and account-isolation gaps, plus a fresh-database migration dependency problem. Passing unit tests alone cannot establish production readiness.

Four P0 items require focused correction and verification before declaring production security/deployment readiness: account isolation of offline data, pending-account API access, inspector scope on generic document reads, and attendance migration ordering. Six P1 items address query correctness, shared state, print isolation, accessibility, theme cascade, and error reporting. Four P2 items cover typography, cleanup, bundle organization, and server bootstrap duplication. Counts refer only to the unique rows in section 19, not repeated mentions elsewhere.

The green identity and Alexandria screen typography already exist; a rebrand is unnecessary. The greatest UI maintenance risk is broad `!important` color remapping in `src/index.css`. The Learning Section signature task is still outstanding: this audit does not implement it or claim that browser pagination is fixed.

## 2. Repository Baseline

| Item | Audited state |
|---|---|
| Branch | `main` |
| Commit | `bf2991867ec605ac4fc91b96062efa8c197da438` |
| Origin | `origin/main` matched that SHA after successful `git fetch origin` |
| Working tree before audit | Clean |
| Node / npm | `v24.19.0` / `11.17.0` |
| Package version | `0.0.0`; this is package metadata, not a readiness rating |
| UI | React 19, React Router 7, TypeScript, Tailwind 4, Vite 6 |
| Server | Express 4, Zod, JWT cookies, bcrypt; esbuild server bundle |
| Persistence | PostgreSQL via Prisma; installed Prisma `6.19.3`, package range `^6.3.1` |
| Tests | Vitest 2, Node environment, `tests/**/*.test.ts` |
| Hooks | `.husky/pre-commit` runs `npx lint-staged`; staged Markdown is formatted |
| Baseline validation | Current-run results are recorded in section 18; historical results are not substituted |

Evidence: `package.json`, `vitest.config.ts`, `vite.config.ts`, `server.ts`, `.husky/pre-commit`, `prisma/schema.prisma`, and Git commands above. No repository `AGENTS.md` or `.openai/hosting.json` was found in the searched project files.

## 3. Architecture Overview

| Area | Active implementation and responsibility |
|---|---|
| Authentication | `src/server/auth.ts`, `authRouter.ts`, `middleware/requireAuth.ts`; signed HTTP-only cookies, password hashing, Google verification, database lookup on authenticated requests |
| Roles | `src/lib/routes.ts` maps allowed UI tabs; `requireRole` and resource checks enforce server operations. UI routing is not an authorization boundary |
| Teacher workspace | `src/App.tsx`, `hooks/usePlatformStore.ts`; lazy-loaded books and planning workspace share application state |
| Inspector workspace | `InspectorDashboard.tsx`, `InspectorWorkspacePage.tsx`, `src/server/assignmentRouter.ts`; assignments and accepted-teacher follow-up |
| Admin workspace | `AdminWorkspacePage.tsx`, administrative pages, admin-gated routes in `assignmentRouter.ts` and `apiRouter.ts` |
| Planning | `TeacherPlanningWorkspace.tsx`, `teacherPlanning.service.ts`, `primaryLevel.service.ts`; canonical levels, academic-year context, pedagogical references and operational realization |
| Teacher Learning Plan | `teacherLearningPlan.service.ts` validates/normalizes dynamic objectives and integration anchors; `/api/teacher/learning-plan` persists `AnnualPlan.kind = teacher_learning_plan` per teacher/year/level |
| Annual Distribution | `AnnualDistributionCalendar.tsx`, `buildAnnualDistributionWeeks`, `/api/teacher/planning/annual-distribution`; level/week view derived from canonical references and teacher plans |
| TeacherWeeklySlot | Relational timetable model; teacher/year/weekday/start-time uniqueness; `/api/teacher/weekly-timetable` owns actual timetable slots |
| ClassPlannedSession | Class/year/reference uniqueness; dates, duration and operational state; materialization and protected-session handling in planning service/API |
| Daily Notebook | `DailyNotebookView.tsx`, `dailyNotebook.service.ts`, JSON-backed `NotebookEntry`; session normalization and operational links, with mutation-version protection during hydration |
| Lesson Memo | `LessonPlanView.tsx`, `lessonPlanWorkflow.service.ts`, `lessonPlan.generator.service.ts`; eligibility and session ownership, JSON-backed `LessonPlan`, HTML/Word export service |
| Gradebook | `GradebookView.tsx` re-exports `SmartGradebookView`; assessment routes persist `AssessmentSession`, `StudentAssessment`, `CriterionResult` |
| Attendance | `attendance/AttendanceBookView.tsx`, `attendanceRouter.ts`; independent teacher/class/student/year/date records and compatibility session endpoints |
| Students | `StudentsBookView.tsx`, roster parser/persistence/read-model services; `StudentClass` is the class entity, and `Student.classId` holds membership, not a separate join table |
| Educational situations | `KnowledgeEngineView.tsx`, `educationalSituation.selector.service.ts`, `EducationalSituation` and `PedagogicalGame`; reused by learning-section editors |
| Print | Dedicated Annual Plan, Daily Notebook, Learning Section documents; Annual Distribution markup/CSS; Lesson Memo HTML and Word export. They do not share one geometry model |

Keep pedagogical references distinct from class execution. Preserve the grade/type occurrence rules and dynamic objective/integration ordering tested by `sessionOccurrenceRules.test.ts` and `dynamicTeacherLearningPlanAnnualDistribution.test.ts`.

## 4. Active Routes

Routes below are source-reachable, not browser-tested. Source: `src/lib/routes.ts`, `src/App.tsx`, `TeacherPlanningWorkspace.tsx`. Role abbreviations: T Teacher, I Inspector, A Admin, D Director.

| Route | Role | Active component | Status | Notes |
|---|---|---|---|---|
| `/` | Public | Landing screen selected in App | ACTIVE | Authentication entry |
| `/login` | Professional accounts | Authentication screen in App | ACTIVE | Server checks professional/admin portal distinction |
| `/admin/login` | A | Admin authentication branch in App | ACTIVE | Separate entry, same server auth core |
| `/dashboard` | T | TeacherDashboard | ACTIVE | Role fallback enforced by router |
| `/planning?section=annual-plan` | T | TeacherPlanningWorkspace → AnnualPlanView | ACTIVE | Official annual plan |
| `/planning?section=segments` | T | LearningSegmentsView | ACTIVE | Dynamic learning plan/editor/print preview |
| `/planning?section=annual-distribution` | T | AnnualDistributionCalendar | ACTIVE | Level/week distribution |
| `/planning?section=weekly` | T | WeeklyTimetableView | ACTIVE | Class timetable |
| `/planning?section=calendar` | T | AcademicCalendarView | ACTIVE | Calendar source |
| `/annual-plan` | T | Planning annual-plan section | COMPATIBILITY | App replaces URL with canonical planning section |
| `/annual-schedule` | T | Planning annual-distribution section | COMPATIBILITY | Does not render AnnualScheduleView |
| `/weekly-schedule` | T | Planning weekly section | COMPATIBILITY | Does not render WeeklyScheduleView |
| `/learning-segments` | T | Planning segments section | COMPATIBILITY | Preserve deep links |
| `/daily-notebook` | T | DailyNotebookView | ACTIVE | Operational daily view |
| `/lesson-plans` | T | LessonPlanView | ACTIVE | Saved/session-linked memos |
| `/lesson-command-center` | T | LessonCommandCenterView | ACTIVE | Execution/timing |
| `/knowledge-engine` | T/I/A/D | KnowledgeEngineView | ACTIVE | Unified knowledge bank |
| `/educational-situations` | T/I/A/D | KnowledgeEngineView via pathToTab | COMPATIBILITY | Legacy standalone-bank URL |
| `/gradebook` | T | SmartGradebookView via GradebookView | ACTIVE | Canonical assessment book |
| `/assessment` | T | Gradebook redirect | COMPATIBILITY | No standalone combined renderer |
| `/assessment-notebook` | T | Gradebook or attendance redirect | COMPATIBILITY | Attendance query selects attendance in App |
| `/attendance` | T | AttendanceBookView | ACTIVE | Date-based attendance |
| `/students`, `/students/:id` | T | StudentsBookView | ACTIVE | List and student deep links |
| `/community` | T/I/A/D | ProfessionalHub | ACTIVE | Professional community |
| `/inspector` | I | InspectorDashboard | ACTIVE | Not dead; App renders it |
| `/inspector/teachers`, `/inspector/teachers/:id` | I | InspectorWorkspacePage | ACTIVE | Assigned teachers/details |
| `/inspector/approvals` | I | InspectorWorkspacePage | ACTIVE | Assignment approvals |
| `/inspector/visits` | I | InspectorWorkspacePage | ACTIVE | Visits |
| `/inspector/curriculum-audit` | I | InspectorWorkspacePage | ACTIVE | Curriculum review |
| `/inspector/guidance` | I | InspectorWorkspacePage | ACTIVE | Guidance |
| `/inspector/communication` | I | InspectorWorkspacePage | ACTIVE | Communication |
| `/director` | D | DirectorDashboard | ACTIVE | Retain role routing |
| `/admin` | A | AdminWorkspacePage | ACTIVE | Admin dashboard |
| `/admin/accounts`, `/admin/accounts/:id` | A | AdminWorkspacePage/account pages | ACTIVE | Account management |
| `/admin/pending-users` | A | AdminWorkspacePage/pending users | ACTIVE | Approval workflow |
| `/admin/inspectors` | A | AdminWorkspacePage/inspectors | ACTIVE | Inspector administration |
| `/admin/services` | A | AdminWorkspacePage/services | ACTIVE | Service administration |
| `/admin/approvals` | A | AdminWorkspacePage/approvals | ACTIVE | Resource approvals |
| `/admin/curriculum` | A | AdminWorkspacePage/curriculum | ACTIVE | Curriculum administration |
| `/admin/reports` | A | AdminWorkspacePage/reports | ACTIVE | Administrative reporting |
| `/reports` | T/I/A/D | ReportsView | ACTIVE | General reports |
| `/settings` | T/I/A/D | SettingsView | ACTIVE | Account/settings |
| No current route | — | AnnualScheduleView, WeeklyScheduleView | SUSPECTED DEAD | Source search found declarations only; old URLs are routed elsewhere |
| No current route | — | AssessmentNotebookView | LEGACY | Runtime entry removed; source is still inspected by tests |

Unknown or disallowed tabs fall back to the role's default; this is intentional compatibility behavior, not evidence of an extra public workspace.

## 5. Dead Code Findings

Counts: **3 HIGH-confidence candidates**, counted as two symbols and one unreachable JSX branch. No files or symbols were deleted.

| File / Symbol | Why it appears dead | Confidence | Recommended action |
|---|---|---|---|
| `src/server/apiRouter.ts`: `annualDistributionOverrides` | Local, unexported function; no invocation found. A test only asserts its absence from the initialize route | HIGH | Remove in a separate cleanup patch after rechecking references |
| `src/server/apiRouter.ts`: `annualDistributionSessionView` | Local, unexported function; declaration only | HIGH | Remove after focused planning tests |
| `TeacherPlanningWorkspace.tsx`: empty-class branch near line 345 | `operationalView` equals `section === 'weekly'`, but branch also requires `section !== 'weekly'`; unsatisfiable | HIGH | Remove unreachable JSX or deliberately restore intended UX after review |
| `curriculum/AnnualScheduleView.tsx` | No source consumers found; old URL resolves to AnnualDistributionCalendar | MEDIUM | Compare export/print capabilities before deleting file |
| `schedule/WeeklyScheduleView.tsx` | No source consumers found; canonical route uses WeeklyTimetableView | MEDIUM | Confirm no needed editor/export behavior remains |
| `hooks/useInspectorDashboardStats.ts` | Search found only its declaration; underlying service is separate | MEDIUM | Remove hook only after checking consumers; retain stats service |
| `assessment/AssessmentNotebookView.tsx` | No active renderer, but multiple tests read this file | LOW | Retain until tests target canonical assessment behavior |

Reference searches covered `src`, `tests` and project files excluding dependencies/build output. This is not proof against external consumers or future product requirements; do not convert MEDIUM/LOW candidates into automatic deletions.

## 6. Legacy Code That Must Be Retained

Ten retained compatibility groups are explicitly identified:

1. `src/lib/routes.ts` and App legacy planning redirects: preserve old URLs/bookmarks.
2. App `/assessment` and `/assessment-notebook` redirects: preserve deep links without a fourth book.
3. `GradebookView.tsx` re-export: stable component/type boundary used by App.
4. `AssessmentNotebookView.tsx`: tests still inspect it; move test authority first.
5. `legacyWordingObjectives` and `section_wording` fallback in `apiRouter.ts`: seed existing teacher wording into the dynamic plan.
6. `resolveTeacherLearningPlan` fallback/normalization: compatible reads of saved plans; do not force a fixed objective count.
7. `dailyNotebook.service.ts` normalization and `lessonPlanWorkflow.service.ts` historical/session-link compatibility: preserve stored operational documents.
8. Session-based compatibility endpoints in `attendanceRouter.ts`: coexist with date-based records and require ownership checks.
9. Applied migrations, including roster and attendance repair files: preserve deployed history/checksums; resolve ordering through a reviewed migration strategy.
10. `primaryLevel.service.ts` aliases and roster identity/reassociation logic: historic level labels, leading-zero matricules and legitimate ownership conflicts are not obsolete data.

## 7. Duplicate / Overlapping Implementations

| Area | Current state | Risk | Recommended consolidation |
|---|---|---|---|
| Server setup | `server.ts` and `vite.config.ts` each mount Express API/auth/assignment/geo routers; only server.ts installs the full hardening/rate-limit stack | Dev/production behavior drift | Extract shared router assembly while preserving environment-specific serving/security |
| State/API | `usePlatformStore.ts` and individual workspaces maintain local fetching/loading/error patterns | Inconsistent empty-response handling and cross-user state lifetime | Domain-specific typed state boundaries; replace data authoritatively, with explicit offline handling |
| Date helpers | `AttendanceBookView.localDateValue`, planning date helpers, `localDate.ts` | Time-zone and academic-boundary regressions if casually unified | Compare semantics before reusing local-date utilities |
| Planning views | Retired AnnualScheduleView/WeeklyScheduleView coexist with canonical components | Two apparent authorities for future maintainers | Document active entry points; review medium-confidence files later |
| Print | Inline export CSS in `lessonPlanExport.service.ts`, global named-page CSS, legacy `planning-print-document` markup | Style leakage and divergent physical margins | Share isolation primitives only; keep each pedagogical document's geometry/content |
| UI | Repeated utility-heavy cards/buttons/modals in StudentsBookView, SmartGradebookView and admin pages | Different focus, contrast and typography contracts | Introduce semantic button/form/card primitives incrementally |
| Curriculum types | Prisma AnnualPlan comments describe only plan/schedule, while API uses additional kinds | Misleading maintenance model | Correct documentation/type discriminants without migrating existing data |

## 8. Unused Imports / Exports / Helpers

Significant candidates include the two server helpers in section 5, `RefreshCw` in `TeacherPlanningWorkspace.tsx`, and `handleToggleSound`/`handleDeleteNotebookEntry` destructured but unused in App. Their underlying store functions are exported; an unused consumer does not prove the underlying feature removable.

The baseline has widespread `any`, unused variables and hook-dependency warnings. Consolidate low-risk import removals in small batches, not a platform-wide auto-fix. The exact current warning total is in section 18. Keep compatibility tests and architecture services even where individual wrappers appear unused.

## 9. Technical Debt

### Critical

| ID / location | Problem and impact | Recommended correction | Regression risk |
|---|---|---|---|
| P0-1 `public/sw.js`, `src/lib/offline.ts`, `src/services/api.ts:logoutRequest` | One API cache and one outbox serve all accounts. Logout removes only current-user storage. Outbox entries have no user ID and replay using current cookies. Cached GETs can survive logout; queued new documents may be attributed to a later account | Partition caches/outbox by authenticated identity; guard replay and account changes; quarantine ambiguous old entries rather than discarding unsynced work | High: offline work and shared devices |
| P0-2 `authRouter.ts` registration; `middleware/requireAuth.ts` | Registration issues a session to `pending_approval`; middleware rejects only `inactive`, and `requireRole` checks role only. Direct teacher API requests can bypass the pending viewer | Central approved-account guard for operational APIs, preserving explicitly allowed pending-account/profile flows | High: onboarding and reactivation |
| P0-3 `apiRouter.ts:jsonCollectionRoutes` registrations for lesson-plans/notebook | `isStaff` includes every inspector, so `visibleTo` grants all inspectors all owners' documents, unlike assignment-scoped follow-up routes | Enforce accepted assignment scope on generic reads, consistently with `assignmentRouter.ts` | High: inspector supervision and legacy reads |
| P0-4 attendance migration chain | `20260825091000_repair_teacher_attendance_session_fk` precedes `20260825_teacher_attendance_exemptions` lexicographically. Its regclass lookup/ALTER requires StudentAttendance, which the later file creates. Fresh deployment therefore has an unmet dependency | Reproduce on an isolated empty database; design migration-history-aware repair before any deployment change | High: applied checksums and live records |

These are source-confirmed unsafe paths/dependencies; no live account exploit or database replay was executed. P0-4 is a fresh-install/rebuild blocker, not a claim that the current production database is down.

### High

- `apiRouter.ts:jsonCollectionRoutes` executes `findMany` with optional limit/offset **before** ownership filtering. With limits, another user's records consume the page; without limits, all rows are loaded. Move visibility predicates into database queries before pagination (P1-1). Risk: compatibility response shapes.
- `usePlatformStore.ts` hydration merges nonempty lesson/message responses into old state and ignores empty arrays; the effect depends on authentication but not user identity. Deleted records can persist locally and account changes require explicit isolation (P1-2). Risk: optimistic edits/offline state.
- Learning Section print remains nested in the planning workspace; its shell is absolute and the parent workspace header is outside the direct-child hide rule (P1-3). This contradicts complete document isolation. Browser page count and signature placement need actual verification.
- Smart Gradebook weight modal has unassociated range labels, an unnamed icon close button, and no dialog semantics or visible focus management in that implementation (P1-4). Small-height viewport handling is also absent.

### Medium

- Broad theme remapping changes component semantics and depends on cascade order (P1-5).
- `jsonCollectionRoutes` DELETE catches every error and returns success, while batch writes skip invalid/unauthorized items yet return the original input count (P1-6). This masks failure and partial persistence. Preserve idempotent not-found behavior but distinguish real database errors.
- Screen headings/metadata still contain font-black/extrabold and 10px text despite the Alexandria hierarchy (P2-1).
- Node-only/source-string tests cannot prove browser pagination, focus trapping or responsive fit; integrate targeted browser checks into relevant fixes.

### Low

- Unused imports, unreachable JSX and stale schema comments (P2-2).
- All non-chart/non-icon dependencies go into one vendor chunk in Vite; review measured export/parser costs before splitting (P2-3).
- Duplicate development router assembly (P2-4).

## 10. Theme & UI Audit

| Surface | Evidence / finding |
|---|---|
| Palette | `src/index.css :root` defines emerald primary `#047857`, darker hover `#065f46`, white surfaces and neutral text. Retain identity |
| Typography | Alexandria 400/500/600/700 is loaded in `index.html`; screen variable stack includes Tajawal/Noto Sans Arabic/system fallback. Cairo is also loaded for print |
| Hierarchy | Title/body/control/table/metadata tokens exist. Header and StudentsBookView still use explicit 10px metadata and 800/900-weight utility classes; computed impact varies with later selectors |
| Cards/spacing | Repeated rounded-3xl/p-6/p-8 markup coexists with shared radius/spacing rules. Source sizes and computed sizes are not reliably the same |
| Buttons/forms | Semantic workspace button rules exist, alongside broad `bg-blue-*` remapping. Migrate one component at a time |
| Tables | SmartGradebookView uses minimum-width columns and scroll wrappers; Learning Section uses fixed print column proportions. These serve different purposes |
| Badges/status | Attendance returns purple for exempt status, but workspace purple text/background selectors remap it toward emerald. Status remains textual, but intended visual distinction is weakened |
| Sidebar/navbar | Sidebar is explicitly dark emerald. Header carries 10px secondary text and utility-specific overrides; examine real contrast at all states |
| Dashboards | Semantic hero selectors and gradebook philosophy overrides protect dark surfaces. Their order after global remapping matters; preserve regression tests |
| Empty/loading/error states | Planning has local loaders/errors and an unreachable empty-class branch; common ErrorBoundary/OfflineBanner exist but are not a complete state-component system |
| RTL/BIDI | `dir=rtl` roots, AcademicYearLabel and LTR input rules are present. Preserve isolated identifiers/dates; no actual BIDI regression was reproduced |
| Device coverage | Responsive utilities and horizontal scrolling exist; no desktop/tablet/mobile browser matrix was executed |

No computed contrast ratio or screenshot-based compliance claim is made. Concrete selector risk: `.workspace-page [class*='text-blue-']`, `text-indigo-`, `text-purple-`, and matching background/border rules in `src/index.css` override foreground/background with `!important`.

## 11. Proposed ArenaSpex Theme

### Color Tokens

Extend the existing token system, keeping values and emerald identity. Proposed semantic aliases (not implemented):

```css
:root {
  --surface-default: var(--color-surface);
  --surface-muted: var(--color-surface-elevated);
  --surface-brand: #064e3b;
  --text-default: var(--color-text);
  --text-muted: var(--color-text-muted);
  --text-on-brand: #ffffff;
  --border-default: var(--color-border);
  --action-primary: var(--color-primary);
  --action-primary-hover: var(--color-primary-hover);
  --focus-ring: #047857;
}
```

Components should choose semantic surfaces/foregrounds directly. Do not add another wildcard remapping layer.

### Typography

Retain Alexandria screen stack and loaded weights 400–700. Use existing title 28px, section 24px, card 17px, body 15px, controls 14px, table/metadata 13px, badge 12px tokens. Prefer 400/500 body and 600 controls; 700 for headings. Retain each official print font independently.

### Spacing Scale

Use 4/8/12/16/24/32px for screen spacing; choose smaller control spacing for dense books. Do not convert millimeter print spacing to screen tokens.

### Radius Scale

Use existing 8/12/16px token scale. Keep pills for badges, not every control.

### Shadow Scale

Retain existing small/medium shadows; reserve stronger overlay shadow for dialogs. Do not apply shadows in physical print.

### Button Variants

Primary emerald, secondary neutral, outline, danger, and text actions; define hover, focus, loading and disabled styles per variant, including dark surfaces.

### Form Controls

One shared label/help/error contract, associated IDs, sensible touch height, and visible focus. Numeric/date direction stays explicit.

### Cards

Default/compact/semantic-dark variants with explicit foregrounds; avoid modifying color by matching utility names.

### Tables

Keep scrolling screen containers, clear captions/headers and readable editable cells; do not force screen table geometry on official documents.

### Status Colors

Preserve success/warning/error/info distinctions and use text/icons in addition to color. Exemption and attendance states must remain distinguishable after theming.

### Focus / Accessibility

Retain global focus-visible behavior, verify its contrast on white and emerald, associate labels, name icon buttons, and provide dialog focus entry/containment/restoration and Escape handling. Validate before claiming accessibility conformance.

## 12. Responsive Audit

| Location | Source evidence | Required verification / recommendation |
|---|---|---|
| LearningSectionPrintDocument / index.css | Screen article width 297mm while root max-width is 100%; preview shell scrolls | Intentional paper canvas needs usable horizontal navigation on phones; do not shrink printed font to fix screen fit |
| SmartGradebookView weight modal | Centered overlay, p-6/sm:p-8, multiple sliders, no height limit/vertical scrolling in modal markup | Test short landscape mobile and 200% zoom; provide bounded scroll region |
| SmartGradebookView table | 140px name and 150px reason minimums plus assessment columns | Horizontal overflow is expected; verify reachable controls and retained row identity |
| StudentsBookView | Dense class chips, 10px badges, action rows, tables | Test 320/375/768/1280px and long Arabic names; adjust only observed failures |
| App main | `max-h-[calc(100vh-60px)]` while header CSS minimum is 4.25rem | Potential viewport mismatch; measure scrolling/keyboard behavior on mobile |
| LearningSegmentsView | Horizontally scrolling level/field selectors and expanded editors | Verify focus visibility, scroll position and action wrapping |
| Admin/Inspector workspaces | Lazy pages contain dense controls and lists | No browser fit verdict; include accounts, teacher follow-up and approvals in QA matrix |

These are static risk findings, not claims of measured overflow on every viewport.

## 13. Accessibility Audit

- `SmartGradebookView.tsx` weight modal: close button contains only `X`; add an accessible name. Range labels are separate from inputs and lack `htmlFor`/ID linkage. The wrapper lacks dialog semantics. These are source-confirmed issues.
- `LearningSegmentsView.tsx` print preview has `role=dialog` and `aria-modal=true` but no accessible dialog title linkage, focus trap/restoration, or Escape handler visible in this implementation. Add behavior without changing document content.
- `TeacherPlanningWorkspace` navigation uses labeled buttons, but selected section is expressed through classes only; consider `aria-current` for navigation rather than adding incomplete tab semantics.
- `src/index.css` has a shared focus-visible outline; do not remove it during theme cleanup. Actual contrast/focus on dark surfaces remains unmeasured.
- `StudentsBookView` and Header use 10px metadata; increase toward existing metadata tokens where readable density allows.
- Existing labeled Learning Section edit/move/delete buttons and AcademicYearLabel are positive examples to preserve.

## 14. Print System Audit

| Document | Current source / geometry | Risks and protected behavior |
|---|---|---|
| Annual Plan | AnnualPlanPrintDocument/Table; named A4 landscape page, 4mm margins, 289×202mm content | Fixed canvas may be deliberate; inspect overflow on long content. Visibility-based app isolation still retains hidden DOM layout. Preserve official content/hours |
| Annual Distribution | AnnualDistributionCalendar; root/global CSS uses visibility hiding and absolute positioning; unnamed A4 portrait rule has 12mm margins | Hidden application layout can affect pagination; validate this document separately. Preserve level/week meaning and holiday rows |
| Learning Sections | LearningSectionPrintDocument + mapper; named landscape margin 0; natural root/article height after bf29918; shell still `position:absolute; inset:0` | Parent TeacherPlanningWorkspace header remains outside hidden editor siblings. Shell participates differently from normal flow; exact source of current signature spill needs browser inspection. Footer has 2mm gap/padding and break-inside avoid; no forced break-before |
| Daily Notebook | Dedicated document/mapper; named landscape margin 0, full-size page/body rules | Body 297×210mm and overflow-hidden are deliberately different from flowing section documents; do not share sizing indiscriminately |
| Lesson Memo | lessonPlanExport.service.ts generates escaped HTML and DOCX; HTML @page landscape/10mm, compact overrides | Screen/HTML/Word must be checked separately; preserve five-column pedagogy, signatures and colors |
| Gradebook / Students / Reports | Active `window.print()` calls in respective components | No dedicated isolation root identified for these in reviewed global CSS; verify app chrome and control suppression separately |
| Attendance | Active AttendanceBookView has no window.print entry found | Do not invent an active export pathway; browser print may still be invoked manually |
| Weekly Timetable | WeeklyTimetableView, named landscape/10mm page | Preserve timetable-specific geometry and ownership |

Shared risks: broad `body:has(...)` selectors, legacy `.planning-print-document` markup inside LearningSegmentsView, different page names and margins, visibility hiding, and absolute print roots. Print-color-adjust rules exist. Unit source assertions cannot establish real paper orientation or page counts.

Learning Sections must continue to omit criteria, indicators and overall competency. Keep final competency and seven columns. Empty optional fields are already blank in the mapper; no pedagogical print structures were changed in this audit.

## 15. Performance Findings

1. `jsonCollectionRoutes` defaults to unbounded reads, then filters ownership in JavaScript. This causes avoidable data transfer/work and incorrect limited-page behavior. Fix query scoping first, not indexes guessed without query plans.
2. `usePlatformStore.ts` hydration awaits notebook, roster, users, lesson plans and messages sequentially. Some requests are independent; profile and parallelize only safe dependencies with explicit error handling.
3. Store message polling runs every 2500ms. Its merge returns previous state whenever map size is unchanged, even if existing records changed. Correctness precedes polling optimization; measure idle/hidden-tab work before tuning frequency.
4. `studentRosterImport.service.ts` statically imports xlsx; `lessonPlanExport.service.ts` statically imports docx. Vite's general vendor bucket may reduce route-level isolation of these dependencies. Use the build artifact sizes and a bundle inspection before recommending specific splitting.
5. App lazy-loads major workspaces, which is beneficial. Do not label all retired files as shipped code without a bundle/import graph.

No LCP, render timings, memory profile, query EXPLAIN, or production load test was collected.

## 16. Security & Ownership Audit

Positive controls: authenticated API router mounting; database-backed current user/role lookup; HTTP-only, production-secure, SameSite=Lax cookies; production secret-length checks; bcrypt; sanitized user responses; AES-GCM provider-key encryption; login rate limits; role-gated admin routers; teacher/class predicates in attendance and planning; transaction-client roster persistence with explicit foreign-owner conflict reporting.

Confirmed concerns:

- **Approval gate:** register returns a session for pending accounts; operational middleware does not check approval. Login denial and a pending UI screen do not close that direct API path (P0-2).
- **Inspector scope:** generic lesson-plan/notebook visibility accepts all inspectors via `isStaff`, while follow-up/visit routes in assignmentRouter check accepted assignment. Align the broader path with the established assignment policy (P0-3).
- **Offline identity:** service-worker API cache is URL-based and shared; logout does not purge it. Outbox entries lack identity and use current cookies on replay. Emergency kill-switch cache cleanup exists but is not normal logout cleanup; it deliberately preserves the outbox (P0-1).
- **Generic batch reporting:** skipped records and database failures must be observable (P1-6). JSON payloads also warrant per-collection schemas when addressed; do not infer client-provided teacher fields are authoritative.
- `server.ts` disables Helmet CSP and keeps the process alive after uncaught exceptions. These are hardening/reliability review items, not proof of an exploitable vulnerability. Design CSP and supervised shutdown with environment tests.

No credentials, account data, or production records were printed or changed. This review is not a penetration test or an exhaustive certification of every endpoint. No ownership rules were weakened.

## 17. Database / Prisma Audit

Schema review only; no live migrate status, database reads, seeds or schema changes were run.

- Relational attendance/assessment/timetable models have ownership references and relevant composite uniqueness/indexes. JSON document models (`AnnualPlan`, `LessonPlan`, `NotebookEntry`) are active compatibility/storage structures, not dead models.
- **P0-4:** native ordinal sorting of migration directory names gives class-planned sessions → attendance FK repair → assessment → `20260825_teacher_attendance_exemptions`. Only the last file creates StudentAttendance. The repair's `'"StudentAttendance"'::regclass` dependency is unmet on an empty database. Verify and repair through a separate history-aware task; never automatically rename applied migrations or resolve them as applied.
- `Student.classId` is a String without a Prisma relation to StudentClass. `AnnualPlan.teacherId` and JSON document owner IDs similarly rely on application enforcement. This is an integrity review candidate, not permission to add foreign keys or delete orphan data.
- `Student` has `@@unique([institutionId, matricule])` with nullable institutionId. Review null-institution identity/concurrency on isolated fixtures before changing constraints; roster persistence already treats conflicts explicitly.
- Attendance optional planned-session FK cascades on deletion, whereas assessment's optional FK uses SetNull. Class deletion and planning rebuild must preserve their established protected-history logic; do not change cascade behavior during cleanup.
- `AnnualPlan.kind/data` comments lag active dynamic kinds. Documentation correction is preferable to a schema rewrite.
- No model is proven unused with enough evidence for deletion. No index change is justified without workload/query evidence.

**Prisma changes recommended now: no.** A separate migration-chain recovery investigation is required; it is not a recommendation to alter schema/data during this audit.

## 18. Test & Build Health

Validation was run on 2026-09-05 after creating this report, with no application-source modifications. Each command below completed with exit code 0. Tests were run separately from the heavy build/typechecking commands.

| Command | Result |
|---|---|
| `npm test` | PASS: 85 test files, 591 tests; 11.17s; no failures |
| `npm run lint` | PASS: 0 errors, 314 existing warnings; includes TypeScript check |
| `npm run typecheck` | PASS: no TypeScript errors |
| `npm run build` | PASS: Vite 6.4.3, 1813 modules, 9.73s; esbuild server bundle succeeded |
| `npm run diff-check` | PASS; staged report is also checked separately with `git diff --cached --check` |

Build output: CSS 184.99 kB (25.44 kB gzip), main client chunk 500.13 kB (92.27 kB gzip), vendor-framework 639.42 kB (187.55 kB gzip), server 558.7 kB. No build warning was emitted. These are artifact sizes, not browser performance measurements. Tailwind scans project text, including documentation, so output differences from earlier builds do not alone prove an application-source change.

Lint warnings include `no-explicit-any`, unused variables, React hook dependencies, console use and refresh-export boundaries. No lint auto-fix was run on application source. Google-auth tests emitted expected mocked verification/fallback diagnostics; all passed. The current auth hashing tests passed without timeout.

Coverage includes domain/session occurrence, dynamic plans, roster transactions, assignment permissions, attendance and print-source contracts. `vitest.config.ts` uses a Node environment; many UI tests inspect source text. There is no evidence here of end-to-end browser, service-worker account-switch, fresh-database replay or physical-pagination coverage. A previous task experienced an auth hashing timeout under concurrent heavy commands and passed on isolated rerun; that remains a test-resource sensitivity to monitor, not a failure of this audit run.

Browser print QA: **BROWSER PRINT QA NOT RUN**. No page count, screenshot validation, accessibility conformance or production migration success is claimed.

## 19. REQUIRED CHANGES

Unique priority counts: **P0 = 4, P1 = 6, P2 = 4**. P0 means correctness/security/deployment blocker, not confirmed current downtime. Scope estimates describe relative work, not delivery promises.

| Priority | Change | Reason | Files/areas | Risk | Estimated scope |
|---|---|---|---|---|---|
| P0-1 | Bind offline cache, queued writes and account transitions to identity | Cross-account read/replay risk | public/sw.js, offline.ts, api logout, store | High | Medium; identity and offline tests |
| P0-2 | Enforce approval before operational API access | Pending registration cookie bypasses UI gate | requireAuth.ts, authRouter.ts, route gates | High | Small/medium; pending-flow matrix |
| P0-3 | Scope inspector document reads to accepted assignments | Generic reads exceed follow-up scope | apiRouter.ts collection queries, assignment rules | High | Medium; cross-district fixtures |
| P0-4 | Correct/test fresh migration dependency order safely | FK repair references not-yet-created attendance table | prisma/migrations, deployment validation | High | Medium; history audit and isolated replay |
| P1-1 | Filter collection queries before pagination; bound reads | Empty/short pages and unbounded data fetch | jsonCollectionRoutes | Medium | Medium; API contract tests |
| P1-2 | Make hydration account-aware and honor empty/updated results | Stale retained records; unchanged-size message updates lost | usePlatformStore.ts | High | Medium; hydration/optimistic-state tests |
| P1-3 | Complete document-only print isolation and verify signatures | Parent chrome and absolute shell remain | LearningSegmentsView, TeacherPlanningWorkspace, index.css | Medium | Small/medium plus browser print matrix |
| P1-4 | Fix modal labels, names, focus and short-screen scrolling | Keyboard/screen-reader access gaps | SmartGradebookView, LearningSegmentsView | Low/medium | Small/medium |
| P1-5 | Replace broad color remapping with semantic component contracts | Known fragile dark/light/status cascade | index.css and targeted UI components | Medium | Phased, not one global rewrite |
| P1-6 | Report actual batch/deletion outcomes | False success hides skipped records/errors | apiRouter.ts collection factory, client feedback | Medium | Medium; fault-injection tests |
| P2-1 | Apply existing typography hierarchy consistently | 10px metadata and heavy utility weights persist | Header, StudentsBookView, gradebook | Low | Small incremental changes |
| P2-2 | Remove proven unused symbols; update stale comments | Maintenance clarity | Two API helpers, unreachable planning branch, imports | Low | Small; reference recheck |
| P2-3 | Inspect and reduce parser/export loading cost where measured | Static heavy imports/general vendor grouping | vite config, import/export boundaries | Medium | Medium; artifact comparison |
| P2-4 | Share server router assembly | Development/production mount drift | server.ts, vite.config.ts | Medium | Small/medium; route smoke tests |

## 20. RECOMMENDED CHANGES

| Improvement | Benefit | Effort | Risk | Dependencies |
|---|---|---|---|---|
| Separate domain routers from the large apiRouter | Easier ownership and transaction review | Medium/high | Medium | Preserve route contracts and current authorization fixes |
| Typed per-collection payload schemas | Catch data-shape drift before persistence | Medium | Medium | Inventory historical payload variants first |
| Browser fixtures for each official print document | Detect clipping/blank pages/signature regressions | Medium | Low | Representative short/long Arabic fixtures and browser runtime |
| Shared dialog/loading/error primitives | Consistent focus and feedback | Medium | Medium | P1 accessibility contract |
| Warning baseline ratchet | Prevent new debt without blocking on every old warning | Small | Low | Record current lint counts/categories |
| Review CSP and fatal-error shutdown policy | More predictable hardened production behavior | Medium | Medium | Auth/font/provider domains and deployment supervisor tests |

## 21. OPTIONAL / FUTURE IMPROVEMENTS

- Bundle visualization and client performance budgets after measured baselines.
- Visual regression gallery for Teacher/Inspector/Admin surfaces after semantic tokens stabilize.
- Documentation of API/domain boundaries and a maintained compatibility inventory.
- Expanded print accessibility/export consistency checks.

These are engineering improvements, not new pedagogical product features or prerequisites for cleanup approval.

## 22. CHANGES THAT MUST NOT BE MADE

- Do not redesign official curriculum structure or alter canonical criteria/indicators for cosmetic work.
- Do not hard-code objective counts or remove teacher-defined integration anchors.
- Do not break Teacher Learning Plan dynamic architecture or level/week Annual Distribution.
- Do not confuse TeacherWeeklySlot with ClassPlannedSession or duplicate rows per class in the level view.
- Do not rewrite operational history, delete unsynced work, or silently move protected sessions.
- Do not casually change Prisma, rename applied migrations, reset a database or mark migrations applied without evidence.
- Do not remove compatibility code without proof and replacement coverage.
- Do not change role/ownership product policy; close mismatches through explicit, tested enforcement.
- Do not merge print and screen styles carelessly or globally scale official documents.
- Do not restore criteria, indicators or overall competency to Learning Section print.
- Do not expose AI/provider/API terminology to Teachers as part of theme work.
- Do not commit cleanup/refactor changes under this audit-only task.

## 23. Cleanup Plan

P0 remediation is a prerequisite to a production-readiness claim and requires separately reviewed fixes. Product-owner review of this report precedes all cleanup.

### Phase 1 — Safe cleanup

Recheck references; remove the two unused helpers and unreachable JSX; clean unused imports and stale comments in small patches. Do not delete MEDIUM/LOW-confidence files or compatibility tests automatically.

### Phase 2 — Shared UI consolidation

Map current tokens to explicit semantic surfaces; introduce button/form/card/table contracts and preserve dark-panel exceptions until consumers migrate.

### Phase 3 — Workspace theme polish

Apply contracts incrementally to Teacher, Inspector, then Admin, maintaining Arabic hierarchy and ownership workflows. Review screen snapshots after each slice.

### Phase 4 — Responsive/accessibility

Fix the named modal/label issues, then verify 320/375/768/1280px, long Arabic content, keyboard navigation and zoom. Avoid broad layout rewrites.

### Phase 5 — Final regression

Run domain/auth/ownership tests, full tests, lint/typecheck/build/diff-check, browser QA and separate print sanity for every official document. Record actual paper/page results. Verify clean Git scope before publishing.

## 24. Proposed File Changes

Only `docs/ARENASPEX_PLATFORM_AUDIT.md` is changed by this task. The following are proposals for later approval:

| Disposition | Files/areas | Conditions |
|---|---|---|
| MODIFY | public/sw.js; src/lib/offline.ts; src/services/api.ts; usePlatformStore.ts | Identity-safe cache/replay/hydration work; protect queued records |
| MODIFY | src/server/middleware/requireAuth.ts; authRouter.ts; apiRouter.ts | Approval/scope/query/result contracts with regression tests |
| MODIFY | src/index.css; LearningSegmentsView; SmartGradebookView; Header; StudentsBookView | Scoped print/accessibility/semantic-token fixes |
| MODIFY | server.ts; vite.config.ts | Shared route assembly after behavior parity tests |
| DELETE | Only proven unused helper declarations and unsatisfiable JSX from section 5 | Recheck immediately before a separate cleanup; no whole file approved for deletion |
| RETAIN | routes.ts compatibility, GradebookView re-export, AssessmentNotebookView, normalization/fallback services, canonical curriculum | Active behavior, test dependencies and historical compatibility |
| RETAIN | prisma/schema.prisma and applied migration history | Audit-only; no automatic destructive correction |
| DEFER | AnnualScheduleView.tsx, WeeklyScheduleView.tsx, useInspectorDashboardStats.ts file deletion | MEDIUM-confidence candidates need behavior comparison |
| DEFER | Schema relations/index additions; migration repair implementation; bundle restructuring | Isolated validation and separate product/technical review |

## 25. Final Recommendation

**Proceed with restrictions.** Review this report and prioritize the four P0 corrections before claiming production readiness. Theme cleanup can be planned, but must not obscure unresolved authorization, offline identity or migration issues. The source audit provides concrete targets; live migration state, browser behavior and real print pagination still require dedicated verification.

Stop after delivering this report and validation results. No cleanup, theme refactor, schema modification or signature implementation is included.
