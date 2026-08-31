import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  resolveOperationalDate,
  toDailyNotebookSessionDto,
} from '../src/services/dailyNotebook.service';

const notebook = readFileSync('src/components/notebook/DailyNotebookView.tsx', 'utf8');
const printDocument = readFileSync(
  'src/components/notebook/DailyNotebookPrintDocument.tsx',
  'utf8'
);

const session = {
  id: 'session-1',
  teacherId: 'teacher-1',
  classId: 'class-a',
  academicYearId: '2026-2027',
  referenceSessionId: 'reference-1',
  plannedDate: '2026-09-21',
  durationMinutes: 60,
  status: 'مبرمجة' as const,
  startTime: null,
  venue: null,
  operationalNote: null,
  createdAt: '',
  updatedAt: '',
};

describe('Daily Notebook pedagogical screen model', () => {
  it('keeps academic year and grade level distinct', () => {
    expect(notebook).toContain('السنة الدراسية');
    expect(notebook).toContain('المستوى');
    expect(notebook).toContain('formatAcademicYearLabel(academicYearId)');
    expect(notebook).toContain('levelLabel(sessionClass.levelId)');
  });

  it('uses the authenticated teacher and institution in the page header', () => {
    expect(notebook).toContain('currentUser.schoolName');
    expect(notebook).toContain('teacherDisplayName(currentUser)');
    expect(notebook).not.toContain('اسم المؤسسة التجريبي');
    expect(notebook).not.toContain('اسم الأستاذ التجريبي');
  });

  it('shows a common domain only when displayed sessions agree', () => {
    expect(notebook).toContain('const commonDomain = useMemo');
    expect(notebook).toContain('new Set(domainNames).size === 1');
    expect(notebook).toContain('الميدان');
    expect(notebook).not.toContain('الميدان غير محدد');
  });

  it('renders each all-classes entry from its own class and session', () => {
    expect(notebook).toContain('const sessionClass = classForSession(session);');
    expect(notebook).toContain('sessionClass.name');
    expect(notebook).toContain('classPlannedSessionId: session.id');
    expect(notebook).toContain('session.id');
  });

  it('uses the persisted planned date and local display formatting', () => {
    expect(notebook).toContain('displayDate(sessionDto.plannedDate)');
    expect(notebook).toContain('session.plannedDate');
    expect(notebook).not.toContain('new Date(session.plannedDate)');
  });

  it('renders an authoritative timetable end time without fabricating one', () => {
    expect(notebook).toContain('sessionDto.startTime');
    expect(notebook).toContain('sessionDto.endTime');
    expect(notebook).not.toContain('08:00 - 10:00');
    expect(toDailyNotebookSessionDto(session).startTime).toBeNull();
    expect(toDailyNotebookSessionDto(session).endTime).toBeNull();
  });

  it('uses the canonical planning objective for التعلمات', () => {
    expect(notebook).toContain('>التعلمات</h2>');
    expect(notebook).toContain('objective: reference?.objective');
    expect(notebook).toContain('sessionDto.objective');
  });

  it('uses saved lesson rows for learning content without fake fallback text', () => {
    expect(notebook).toContain('const lessonContent =');
    expect(notebook).toContain('plan?.lessonRows');
    expect(notebook).toContain('>محتوى التعلم</h2>');
    expect(notebook).not.toContain('محتوى تعليمي افتراضي');
  });

  it('keeps memo-ready and memo-missing states tied to the exact session', () => {
    expect(notebook).toContain('>المذكرة</h2>');
    expect(notebook).toContain('المذكرة جاهزة');
    expect(notebook).toContain('لم تُنشأ بعد');
    expect(notebook).toContain('openMemo(session, entry)');
    expect(notebook).toContain('sessionRef(session, reference, sessionClass)');
  });

  it('preserves the introductory no-memo rule', () => {
    expect(notebook).toContain('isLessonMemoEligible(reference || {})');
    expect(notebook).toContain('حصة تنظيمية بدون مذكرة');
    expect(notebook).toContain('!memoEligible ?');
  });

  it('keeps notes visibly editable and persisted through the existing callback', () => {
    expect(notebook).toContain('aria-label="الملاحظات"');
    expect(notebook).toContain('<textarea');
    expect(notebook).toContain('onChange={(event) =>');
    expect(notebook).toContain('onClick={() => saveNote(session)}');
    expect(notebook).toContain('await onPersistNotebookEntry({');
  });

  it('keeps operational status controls and persistence semantics', () => {
    expect(notebook).toContain('إجراءات التنفيذ');
    expect(notebook).toContain("updateStatus(session, 'منجزة')");
    expect(notebook).toContain("updateStatus(session, 'مؤجلة')");
    expect(notebook).toContain("updateStatus(session, 'غير منجزة')");
    expect(notebook).toContain("updateStatus(session, 'مبرمجة')");
    expect(notebook).toContain('title={statusMeta.description}');
  });

  it('shows session type once as a compact badge', () => {
    expect(notebook).toContain('sessionDto.sessionType &&');
    expect(notebook).toContain('{sessionDto.sessionType}');
    expect(notebook).not.toContain('نوع الحصة: {sessionDto.sessionType');
  });

  it('keeps the primary five pedagogical areas explicit', () => {
    for (const label of [
      'التاريخ / القسم / التوقيت',
      'التعلمات',
      'محتوى التعلم',
      'المذكرة',
      'الملاحظات',
    ]) {
      expect(notebook).toContain(label);
    }
    expect(notebook).toContain('lg:grid-cols-[1.05fr_1.2fr_1.35fr_1.1fr_1.55fr]');
  });

  it('does not expose technical placeholders or raw planning identifiers', () => {
    expect(notebook).not.toContain('المقطع غير محدد');
    expect(notebook).not.toContain('الميدان غير محدد');
    expect(notebook).not.toContain('sessionDto.referenceSessionId');
  });

  it('preserves exact Assessment and Attendance context', () => {
    expect(notebook).toContain("'/gradebook?classId='");
    expect(notebook).toContain("'/attendance?classId='");
    expect(notebook).toContain('encodeURIComponent(session.classId)');
    expect(notebook).toContain('encodeURIComponent(session.id)');
  });

  it('preserves the operational date boundary and local navigation', () => {
    expect(
      resolveOperationalDate({
        requestedDate: '2026-08-31',
        localToday: '2026-08-31',
        firstPlannedDate: '2026-09-21',
      })
    ).toBe('2026-09-21');
    expect(notebook).toContain('min={operationalMinimumDate || undefined}');
    expect(notebook).toContain('setSelectedDate(resolveDate(shiftLocalDate(selectedDate, days))');
    expect(notebook).not.toContain('21/09/2026');
  });

  it('does not impose a four- or six-session screen limit', () => {
    expect(notebook).not.toContain('slice(0, 4)');
    expect(notebook).not.toContain('slice(0, 6)');
    expect(notebook).not.toContain('pageSize');
    expect(notebook).toContain('displayed.map((session) =>');
  });

  it('does not alter the existing print renderer', () => {
    expect(notebook).toContain('<DailyNotebookPrintDocument model={printModel} />');
    expect(notebook).not.toContain('DailyNotebookPrintDocument.tsx');
    expect(printDocument).toContain('DailyNotebookPrintDocument');
  });

  it('does not add schema or migration work for unsupported end times', () => {
    expect(notebook).not.toContain('endTime:');
    expect(readFileSync('prisma/schema.prisma', 'utf8')).not.toContain('dailyNotebookStartTime');
  });
});
