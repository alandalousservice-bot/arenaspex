import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  calculateExecutionProgress,
  DAILY_NOTEBOOK_STATUS_META,
  toDailyNotebookSessionDto,
} from '../src/services/dailyNotebook.service';

const notebook = readFileSync('src/components/notebook/DailyNotebookView.tsx', 'utf8');
const dashboard = readFileSync('src/components/dashboard/TeacherDashboard.tsx', 'utf8');
const planning = readFileSync('src/components/planning/TeacherPlanningWorkspace.tsx', 'utf8');

const session = {
  id: 'session-1',
  teacherId: 'teacher-1',
  classId: 'class-a',
  academicYearId: '2026-2027',
  referenceSessionId: 'reference-1',
  plannedDate: '2026-09-07',
  durationMinutes: 60,
  status: 'مبرمجة' as const,
  startTime: null,
  venue: null,
  operationalNote: null,
  createdAt: '',
  updatedAt: '',
};

describe('Daily Notebook P1 execution workflow', () => {
  it('supports every reversible execution transition', () => {
    const transitions = [
      ['مبرمجة', 'منجزة'],
      ['مبرمجة', 'غير منجزة'],
      ['مبرمجة', 'مؤجلة'],
      ['منجزة', 'مبرمجة'],
      ['غير منجزة', 'مبرمجة'],
      ['مؤجلة', 'مبرمجة'],
    ] as const;
    expect(transitions.every(([, next]) => next in DAILY_NOTEBOOK_STATUS_META)).toBe(true);
    expect(notebook).toContain("updateStatus(session, 'مبرمجة')");
    expect(notebook).toContain("updateStatus(session, 'مؤجلة')");
    expect(notebook).toContain('statusRequestVersions');
  });

  it('derives progress from canonical session status and handles all boundary values', () => {
    expect(calculateExecutionProgress([])).toEqual({ completed: 0, total: 0, percentage: 0 });
    expect(
      calculateExecutionProgress(Array.from({ length: 10 }, () => ({ status: 'مبرمجة' as const })))
    ).toEqual({
      completed: 0,
      total: 10,
      percentage: 0,
    });
    expect(calculateExecutionProgress([{ status: 'منجزة' }])).toEqual({
      completed: 1,
      total: 1,
      percentage: 100,
    });
    expect(
      calculateExecutionProgress([
        ...Array.from({ length: 5 }, () => ({ status: 'منجزة' as const })),
        ...Array.from({ length: 5 }, () => ({ status: 'مبرمجة' as const })),
      ])
    ).toEqual({ completed: 5, total: 10, percentage: 50 });
    expect(notebook).toContain('التقدم في تنفيذ البرنامج');
    expect(notebook).toContain('calculateExecutionProgress(filteredSessions)');
  });

  it('keeps progress independent for separate classes and same-grade sections', () => {
    const classA: Array<{ status: 'منجزة' | 'مبرمجة' }> = [
      ...Array.from({ length: 5 }, () => ({ status: 'منجزة' as const })),
      ...Array.from({ length: 5 }, () => ({ status: 'مبرمجة' as const })),
    ];
    const classB: Array<{ status: 'منجزة' | 'مبرمجة' }> = [
      ...Array.from({ length: 2 }, () => ({ status: 'منجزة' as const })),
      ...Array.from({ length: 8 }, () => ({ status: 'مبرمجة' as const })),
    ];
    expect(calculateExecutionProgress(classA)).toMatchObject({ completed: 5, total: 10 });
    expect(calculateExecutionProgress(classB)).toMatchObject({ completed: 2, total: 10 });
    expect(notebook).toContain('selectedClassId');
    expect(notebook).toContain('academicYearId');
    expect(notebook).not.toContain('levelId === selectedClassId');
  });

  it('does not invent a replacement session for postponed lessons', () => {
    const postponed = toDailyNotebookSessionDto({ ...session, status: 'مؤجلة' }, {});
    expect(postponed.plannedDate).toBe(session.plannedDate);
    expect(postponed.status).toBe('مؤجلة');
    expect(DAILY_NOTEBOOK_STATUS_META.مؤجلة.description).toContain('إعادة البرمجة');
    expect(notebook).toContain('statusMeta.description');
    expect(notebook).toContain('إعادة البرمجة');
    expect(notebook).toContain('section=annual-distribution');
  });

  it('keeps memo, attendance, and assessment actions as links to canonical workspaces', () => {
    expect(notebook).toContain('المذكرة:');
    expect(notebook).toContain("'/gradebook?classId='");
    expect(notebook).toContain("'/attendance?classId='");
    expect(notebook).toContain('classPlannedSessionId');
    expect(notebook).toContain('academicYearId');
  });

  it('uses typed session DTO fields and keeps Dashboard status semantics canonical', () => {
    const dto = toDailyNotebookSessionDto(session, {
      sessionNumber: 4,
      sessionType: 'تعلمية',
      objective: 'هدف الحصة',
      domain: 'الميدان الأول: الوضعيات والتنقلات',
      section: 'المقطع التعليمي',
      executionNote: 'ملاحظة التنفيذ',
      memoExists: true,
    });
    expect(dto).toMatchObject({
      sessionId: 'session-1',
      sessionNumber: 4,
      sessionType: 'تعلمية',
      objective: 'هدف الحصة',
      executionNote: 'ملاحظة التنفيذ',
      memoExists: true,
    });
    expect(dashboard).toContain("session.status === 'منجزة'");
    expect(planning).toContain('fetchTeacherPlanningSessions');
  });
});
