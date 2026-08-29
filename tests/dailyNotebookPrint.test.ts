import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { TeacherPlanningSession } from '../src/services/api';
import type { ClassRoom, LessonPlan, User } from '../src/types/spex';
import { getLocalWeekDates } from '../src/services/localDate';
import {
  buildDailyNotebookPrintModel,
  type DailyNotebookPrintInput,
} from '../src/services/dailyNotebookPrint.service';

const printDocument = readFileSync(
  'src/components/notebook/DailyNotebookPrintDocument.tsx',
  'utf8'
);
const notebook = readFileSync('src/components/notebook/DailyNotebookView.tsx', 'utf8');
const css = readFileSync('src/index.css', 'utf8');

const user = {
  id: 'teacher-1',
  firstName: 'محمد',
  lastName: 'الأستاذ',
  schoolName: 'مدرسة النور',
} as User;

const selectedClass = {
  id: 'class-a',
  institutionId: 'institution-1',
  teacherId: 'teacher-1',
  levelId: 'lvl_p1',
  name: '1 أ',
  studentCount: 3,
} as ClassRoom;

function session(
  id: string,
  date: string,
  overrides: Partial<TeacherPlanningSession> = {}
): TeacherPlanningSession {
  return {
    id,
    teacherId: 'teacher-1',
    classId: 'class-a',
    academicYearId: '2026-2027',
    referenceSessionId: `reference-${id}`,
    plannedDate: date,
    durationMinutes: 60,
    status: 'مبرمجة',
    startTime: null,
    venue: null,
    operationalNote: null,
    createdAt: '',
    updatedAt: '',
    reference: {
      referenceSessionId: `reference-${id}`,
      grade: 1,
      domainId: 'f_locomotion',
      fieldName: 'الوضعيات والتنقلات',
      finalCompetency: 'كفاءة',
      learningSectionId: 'lvl_p1:f_locomotion',
      objectiveId: null,
      objectiveGroupId: null,
      objective: 'ينجز تنقلات أمامية مع التحكم في الجسم.',
      sessionType: 'تعلمية',
      sessionTypeLabel: 'تعلمية',
      sequenceIndex: 1,
      fieldSessionNumber: 1,
    },
    ...overrides,
  };
}

function input(overrides: Partial<DailyNotebookPrintInput> = {}): DailyNotebookPrintInput {
  return {
    currentUser: user,
    selectedClass,
    academicYearId: '2026-2027',
    weekDates: getLocalWeekDates('2026-05-27'),
    sessions: [],
    notebookEntries: [],
    lessonPlans: [],
    ...overrides,
  };
}

describe('Daily Notebook dedicated print document', () => {
  it('filters the selected local week and formats dates without UTC conversion', () => {
    const model = buildDailyNotebookPrintModel(
      input({
        sessions: [
          session('before', '2026-05-23'),
          session('in-1', '2026-05-24'),
          session('in-2', '2026-05-27'),
          session('in-3', '2026-05-30'),
          session('after', '2026-05-31'),
        ],
      })
    );
    expect(model.rows.map((row) => row.plannedDate)).toEqual([
      '2026-05-24',
      '2026-05-27',
      '2026-05-30',
    ]);
    expect(model.rows[0]).toMatchObject({
      dayLabel: 'الأحد',
      dayNumber: '24',
      monthLabel: 'ماي',
      year: '2026',
    });
    expect(printDocument).not.toContain('toISOString');
  });

  it('sorts sessions by date, start time, then canonical sequence', () => {
    const model = buildDailyNotebookPrintModel(
      input({
        sessions: [
          session('late', '2026-05-27', {
            startTime: '10:00',
            reference: { ...session('ref', '2026-05-01').reference!, sequenceIndex: 1 },
          }),
          session('early', '2026-05-27', {
            startTime: '08:00',
            reference: { ...session('ref', '2026-05-01').reference!, sequenceIndex: 2 },
          }),
          session('next-day', '2026-05-28', { startTime: '07:00' }),
        ],
      })
    );
    expect(model.rows.map((row) => row.sessionId)).toEqual(['early', 'late', 'next-day']);
  });

  it('maps real identity and pedagogical data while isolating class and year', () => {
    const plan = {
      teacherId: 'teacher-1',
      classId: 'class-a',
      academicYearId: '2026-2027',
      classPlannedSessionId: 'good',
      equipmentNeeded: ['كرات', 'كرات', 'أقماع'],
      mainPhase: {
        problemSituation: 'مسار حركي',
        learningSituation1: { title: 'الموقف الأول', description: 'وصف' },
        learningSituation2: { title: 'الموقف الثاني', description: '' },
      },
    } as unknown as LessonPlan;
    const model = buildDailyNotebookPrintModel(
      input({
        sessions: [
          session('good', '2026-05-27', {
            status: 'منجزة',
            durationMinutes: 90,
            startTime: '08:00',
            venue: 'الملعب',
          }),
          { ...session('other-class', '2026-05-27'), classId: 'class-b' },
          { ...session('other-year', '2026-05-27'), academicYearId: '2025-2026' },
        ],
        notebookEntries: [
          {
            id: 'entry-1',
            teacherId: 'teacher-1',
            classPlannedSessionId: 'good',
            academicYearId: '2026-2027',
            classId: 'class-a',
            className: '1 أ',
            executionDate: '2026-05-27',
            timeSlot: '08:00',
            status: 'منجزة',
            note: 'تم تنفيذ الحصة.',
          },
        ],
        lessonPlans: [plan],
      })
    );
    expect(model.header).toMatchObject({
      institution: 'مدرسة النور',
      teacher: 'محمد الأستاذ',
      academicYear: '2026 / 2027',
      level: 'السنة الأولى ابتدائي',
      className: '1 أ',
      domain: 'الميدان الأول: الوضعيات والتنقلات',
    });
    expect(model.rows).toHaveLength(1);
    expect(model.rows[0]).toMatchObject({
      durationMinutes: 90,
      startTime: '08:00',
      venue: 'الملعب',
      memoExists: true,
      learningContent: expect.stringContaining('الموقف الأول'),
      executionStatus: 'منجزة',
      executionNote: 'تم تنفيذ الحصة.',
    });
  });

  it('prints memo absence neutrally and keeps textual status semantics', () => {
    const model = buildDailyNotebookPrintModel(
      input({
        sessions: [
          session('scheduled', '2026-05-27', { status: 'مبرمجة' }),
          session('postponed', '2026-05-28', { status: 'مؤجلة' }),
          session('not-done', '2026-05-29', { status: 'غير منجزة' }),
        ],
      })
    );
    expect(model.rows.map((row) => row.executionStatus)).toEqual(['مبرمجة', 'مؤجلة', 'غير منجزة']);
    expect(model.rows.every((row) => row.learningContent === null && !row.memoExists)).toBe(true);
    expect(printDocument).toContain('تحتاج إعادة برمجة');
    expect(printDocument).toContain('غير منشأة');
  });

  it('keeps long objectives and notes as printable wrapping text', () => {
    const objective = 'هدف تعلمي طويل '.repeat(30).trim();
    const note = 'ملاحظة تنفيذية طويلة '.repeat(30).trim();
    const model = buildDailyNotebookPrintModel(
      input({
        sessions: [
          session('long', '2026-05-27', {
            reference: { ...session('ref', '2026-05-01').reference!, objective },
          }),
        ],
        notebookEntries: [
          {
            id: 'long-entry',
            teacherId: 'teacher-1',
            classPlannedSessionId: 'long',
            academicYearId: '2026-2027',
            classId: 'class-a',
            className: '1 أ',
            executionDate: '2026-05-27',
            timeSlot: '08:00',
            status: 'منجزة',
            note,
          },
        ],
      })
    );
    expect(model.rows[0].objective).toBe(objective);
    expect(model.rows[0].executionNote).toBe(note);
    expect(css).toContain('overflow-wrap: anywhere');
    expect(css).toContain('white-space: pre-line');
  });

  it('preserves canonical paired-session indicators and avoids G4 artificial pairs', () => {
    const pairReference = {
      ...session('ref', '2026-05-01').reference!,
      objectiveGroupId: 'group-1',
    };
    const pair = buildDailyNotebookPrintModel(
      input({
        sessions: [
          session('pair-1', '2026-05-27', { reference: { ...pairReference, sequenceIndex: 4 } }),
          session('pair-2', '2026-05-28', { reference: { ...pairReference, sequenceIndex: 5 } }),
        ],
      })
    );
    expect(pair.rows.map((row) => row.pairPosition)).toEqual([1, 2]);

    const gradeFour = buildDailyNotebookPrintModel(
      input({
        selectedClass: { ...selectedClass, levelId: 'lvl_p4' },
        sessions: [
          session('g4-1', '2026-05-27', { reference: { ...pairReference, grade: 4 } }),
          session('g4-2', '2026-05-28', { reference: { ...pairReference, grade: 4 } }),
        ],
      })
    );
    expect(gradeFour.rows.map((row) => row.pairPosition)).toEqual([null, null]);
  });

  it('exposes a dedicated print-only document and scoped landscape CSS', () => {
    expect(notebook).toContain('طباعة الكراس اليومي');
    expect(notebook).toContain('window.print()');
    expect(notebook).toContain('DailyNotebookPrintDocument');
    expect(printDocument).toContain('daily-notebook-print-root');
    expect(printDocument).not.toContain('<button');
    expect(printDocument).not.toContain('فتح المذكرة');
    expect(printDocument).not.toContain('توليد المذكرة');
    expect(printDocument).toContain('التاريخ');
    expect(printDocument).toContain('القسم / التوقيت');
    expect(printDocument).toContain('التعلمات');
    expect(printDocument).toContain('محتوى التعلم');
    expect(printDocument).toContain('المذكرة');
    expect(printDocument).toContain('الملاحظات');
    expect(css).toContain('@page daily-notebook');
    expect(css).toContain('size: A4 landscape');
    expect(css).toContain('body:has(.daily-notebook-print-root)');
    expect(css).toContain('-webkit-print-color-adjust: exact');
    expect(css).toContain('print-color-adjust: exact');
    expect(css).toContain('page-break-inside: avoid');
  });
});
