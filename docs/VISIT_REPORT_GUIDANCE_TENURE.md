# VisitReport discovery and implementation contract

## Discovery before implementation — 2026-10-07

Repository D:/arenaspex, main, HEAD 30d7e5441b5dafa652f070e21f1f990fd767a5af; 42 modified tracked files, 2053 untracked files, no staged files. Previous work is preserved. No VisitReport model or finalized report workflow exists. InspectionVisitRecord is the accepted Visit lifecycle; legacy JSON still contains observations, pedagogicalGrade and officialReportGenerated. InspectorReportsView preserves legacy history/printing, including explicit marks; it is read-only in the active workspace. Its older generic print is not the official source for the new reports.

The existing print architecture uses React body portals, scoped print CSS and window.print, with no server PDF service. Teacher Information Card and its submissions/official print remain closed. Report data can reuse User, TeacherInformationCard.extra, School, Directorate, InspectionDistrict, StudentClass aggregate pupil counts and TeacherWeeklySlot. No detailed pupils or identity snapshots are copied while drafting. Existing assignment Serializable transactions and unique current head provide transfer concurrency protection. Visit completion actor is recorded in history separately from original visit creator; report author derives from the completion actor.

## Authoritative sources inspected

- Guidance page 1: C:/Users/ous/Documents/IMG_20260930_0001.pdf.
- Guidance page 2: C:/Users/ous/Documents/IMG_20260930_0002.pdf.
- Tenure: C:/Users/ous/Downloads/Telegram Desktop/محضر التثبيت (1).docx, explicitly supplied by the Product Owner. The XML text, committee structure, legal paragraph and paragraph/page structure are the source; neither legal references nor an external legal interpretation is substituted.

The Guidance source is a completed specimen. Its personal names, locality, year, observations, signatures and stamp are sample values, not defaults or reusable report content.

Guidance page 1 retains the national/ministerial header, directorate/inspection/district, institution/municipality/daira, title التقرير التربوي لأستاذ التعليم الابتدائي, academic year, subject and professional identity fields. Right column: ظروف التفتيش; inspection date/duration/class/pupil count; الميدان هل هو صالح من حيث (الأرضية، السلامة، التخطيط، الموقع); تحضير الدرس with independent الميدان and هدف الدرس; الوحدة التعليمية (existence/value); الوحدة التعلمية (existence/practical value); التوزيع السنوي (availability/compliance and official programme guidance). Left column: التدرج في التعلم ومراحل الحصة; تنظيم القسم (التفويج) and العمل بالبدلة التربوية الرياضية; استغلال المساحة والوسائل التعليمية; التطبيق على الدرس (existence/suitability); تقدير الإشراف على الحصة (الشرح والعرض، التصحيح والتوجيه، التنظيم والانضباط، تنشيط المشاركة، تقدير مشاركة التلاميذ); الوسائل التعليمية.

Guidance page 2 retains دفتر اليومي, مراقبة أعمال التلاميذ (attendance monitoring/continuous recording), الإرشادات التربوية, التوجيهات التربوية, الجانب الميداني العملي, الخلاصة, التقدير العام, العلامة بالحروف, بالأرقام, report author/date/signature. No "الميدان / موضوع الساعة" or invented pedagogical heading is used. A new report mark remains null unless explicitly entered, including zero; the historical card inspection mark is separate historical identity data, never the new mark.

Tenure retains header/reference, exact source legal paragraph, examination committee/date/place, candidate/probation/appointment/financial visa, practical and oral examinations, قيمة المترشح(ة) الثقافية, قيمة المترشح(ة) التربوية, خلاصة الملاحظات والتوجيهات, التقدير العام والتقييم النهائي, committee deliberation and signatures, and Director of Education decision. The approved PE adaptation replaces three multi-subject lessons with one or two PE lessons, removes per-lesson/practical/oral marks and /40, and introduces only one explicitly entered final /20 mark. Decisions ACCEPT/POSTPONE/REJECT are explicit and never calculated from a mark.

## Architecture contract

One VisitReport envelope, FK/unique visitId, GUIDANCE/TENURE type derived from a completed Visit, DRAFT/FINAL status, author, revision, nullable explicit mark, structured type-specific content, final snapshot, finalizing actor/time and timestamps. JSON is appropriate for distinct source document observations; identity, lifecycle, type, association, authorship, revision and mark remain relational/queryable. FINAL content and snapshot are immutable via normal endpoints. No reopen/version/audit subsystem.

Mutations require the completion actor/report owner and current accepted assignment. A former Inspector may read their completed pre-transfer historical document but cannot edit/finalize after transfer; the current Inspector cannot edit another Inspector's report. Historical reads must use frozen FINAL values and cannot reveal the current Teacher profile. Snapshot resolution and finalization share a Serializable transaction and assignment-head lock. Creation is explicit, one per completed visit, with no Visit JSON/mark/report-flag rewriting and no notifications/publication.

Drafts are incomplete and resolve current authoritative values. FINAL freezes only official identity/geography/institution, visit/class aggregates, Inspector and document values. Missing optional values remain blank. Guidance finalization requires its domain/objective/conclusion/general assessment and available identity; its mark remains optional. Tenure finalization requires one or two identified PE lessons, oral content, committee members, professional assessment, explicit final /20 mark and explicit decision. Unknown content keys and scoring fields are rejected server-side.

MONITORING remains a functional Visit lifecycle, with report creation explicitly unsupported because no authoritative report source was found. Teacher report publication, reopening, FollowUpAction and professional communication redesign remain separate Product Owner tasks. Existing TENURE appointment communication is preserved.

Print uses scoped browser A4 RTL pages. Guidance follows its two supplied pages. The supplied Tenure DOCX was opened read-only and rendered by Microsoft Word to verify its layout: Word paginates it as two pages (one stored rendered-page break), despite the task overview describing three. The adapted PE form follows that verified two-page layout: examination and practical/oral assessment on page one; observations, final evaluation, deliberation and decisions on page two. Both one-lesson and two-lesson PE test documents print to two A4 pages. Content is never clipped/hidden to enforce pagination; unusually long observations may continue onto additional sheets. No specimen signatures or stamps are copied.

## Close-out verification — 2026-10-07

- UI inspection used local synthetic teacher/inspector records. GUIDANCE preserved the source's two-page RTL structure and independent `الميدان`; no `الميدان / موضوع الساعة` field or invented heading was present. The saved print rendered to two A4 pages.
- TENURE print rendered to two A4 pages for both one and two PE lessons. It includes the oral exam, committee, cultural/pedagogical assessments, observations, final /20, and explicit ACCEPT/POSTPONE/REJECT deliberation. It has no per-lesson marks, /40 total, or automatic score. Monitoring remains complete-able but has no report-creation action.
- Report listing shows only the Inspector's own saved report metadata, including historical reports after transfer; viewing the historical report remains read-only.
- VisitReport integration ran on disposable PostgreSQL 18 at `127.0.0.1:55482` against `arenaspex_po_ins_02_disposable`: 32 tests passed, the additive migration applied, legacy table fingerprints were preserved, and the gate cleaned up the disposable database.
- Unit/component regression: 150 tests across 25 suites. PostgreSQL regressions: 22 pedagogical-visit, 9 information-card, 15 transfer, 5 inspector-integrity, and 32 VisitReport tests. Total: 233 passing tests across 30 suites.
- Prisma validate, TypeScript typecheck, ESLint (0 errors; 432 repository warnings), production build, and `git diff --check` passed. No production or remote database was accessed; no commit or push was made.
