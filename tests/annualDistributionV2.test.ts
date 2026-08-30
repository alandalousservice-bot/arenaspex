import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyPersistedAnnualDistributionDates,
  buildClassPlannedSessionSeedsFromCanonicalSessions,
  decideClassSessionRebuild,
  generateAllPrimaryLevelDistributions,
} from '../src/services/teacherPlanning.service';
import { calendarEventForDate, getAcademicCalendar } from '../src/data/academicCalendars';

const levelIds = ['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5'] as const;

describe('academic-year annual distribution generation v2', () => {
  it('generates all five canonical level distributions from one start date', () => {
    const result = generateAllPrimaryLevelDistributions('2025-2026', '2025-09-21');
    expect(result.levels.map((level) => level.levelId)).toEqual(levelIds);
    expect(result.levels.map((level) => level.sessionCount)).toEqual([56, 56, 56, 34, 34]);
    expect(result.levels.map((level) => level.durationMinutes)).toEqual([60, 60, 60, 90, 60]);
    expect(result.levels.every((level) => level.status === 'generated')).toBe(true);
  });

  it('keeps every generated date inside the selected academic-year calendar', () => {
    const result = generateAllPrimaryLevelDistributions('2025-2026', '2025-09-21');
    const calendar = getAcademicCalendar(result.academicYearId);
    for (const level of result.levels) {
      expect(level.sessions.every((session) => session.plannedDate >= calendar.schoolStart)).toBe(
        true
      );
      expect(level.sessions.every((session) => session.plannedDate <= result.endDate)).toBe(true);
      expect(
        level.sessions.every(
          (session) => !calendarEventForDate(session.plannedDate, result.academicYearId)
        )
      ).toBe(true);
    }
  });

  it('uses the selected academic-year end boundary when the calendar has a provisional end', () => {
    const result = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21');
    expect(result.endDate).toBe('2027-08-31');
    expect(result.levels.map((level) => level.sessionCount)).toEqual([56, 56, 56, 34, 34]);
    expect(
      result.levels.every((level) =>
        level.sessions.every(
          (session) =>
            session.plannedDate >= result.planningStartDate && session.plannedDate <= result.endDate
        )
      )
    ).toBe(true);
  });

  it('uses the 2026-2027 calendar bounds for launch-year generation', () => {
    const result = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21');
    const calendar = getAcademicCalendar('2026-2027');
    expect(result.academicYearId).toBe('2026-2027');
    expect(result.planningStartDate).toBe('2026-09-21');
    expect(
      result.levels.every((level) =>
        level.sessions.every(
          (session) =>
            session.plannedDate >= calendar.schoolStart && session.plannedDate <= result.endDate
        )
      )
    ).toBe(true);
  });

  it('uses the selected school start as the first session anchor', () => {
    const result = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21');
    expect(new Date('2026-09-21T00:00:00').getDay()).toBe(1);
    expect(result.levels.every((level) => level.firstSessionDate === '2026-09-21')).toBe(true);
    expect(
      result.levels.every((level) => level.sessions.every((s) => s.plannedDate >= '2026-09-21'))
    ).toBe(true);
  });

  it('preserves the existing weekly and paired-session cadence from the selected anchor', () => {
    const result = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21');
    const gradeOne = result.levels.find((level) => level.levelId === 'lvl_p1')!;
    const gradeFour = result.levels.find((level) => level.levelId === 'lvl_p4')!;

    expect(gradeOne.sessions.slice(0, 3).map((session) => session.plannedDate)).toEqual([
      '2026-09-21',
      '2026-09-23',
      '2026-09-28',
    ]);
    expect(gradeFour.sessions.slice(0, 2).map((session) => session.plannedDate)).toEqual([
      '2026-09-21',
      '2026-09-28',
    ]);
  });

  it('anchors a rebuilt distribution to a changed selected start date', () => {
    const firstBuild = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21');
    const secondBuild = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-28');

    expect(firstBuild.levels.map((level) => level.firstSessionDate)).toEqual([
      '2026-09-21',
      '2026-09-21',
      '2026-09-21',
      '2026-09-21',
      '2026-09-21',
    ]);
    expect(secondBuild.levels.map((level) => level.firstSessionDate)).toEqual([
      '2026-09-28',
      '2026-09-28',
      '2026-09-28',
      '2026-09-28',
      '2026-09-28',
    ]);
  });

  it('skips a selected start date only when the academic calendar excludes it', () => {
    const result = generateAllPrimaryLevelDistributions('2026-2027', '2026-10-29');

    expect(result.levels.every((level) => level.firstSessionDate === '2026-11-09')).toBe(true);
  });

  it('uses the persisted level distribution as the editable source without a class', () => {
    const result = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21');
    const level = result.levels.find((item) => item.levelId === 'lvl_p5')!;
    const first = level.sessions[0];
    const changed = applyPersistedAnnualDistributionDates(
      level,
      { [first.referenceSessionId]: { date: '2026-09-28' } },
      (value) => value >= '2026-09-21'
    );
    expect(changed.sessions).toHaveLength(34);
    expect(changed.sessions[0].plannedDate).toBe('2026-09-28');
  });

  it('rebuilds completed pre-launch setup rows but protects executed rows', () => {
    const oldDate = new Date('2026-09-27T00:00:00.000Z');
    const nextDate = new Date('2026-10-04T00:00:00.000Z');
    expect(
      decideClassSessionRebuild({ status: 'منجزة', plannedDate: oldDate }, nextDate, false, true)
    ).toBe('update');
    expect(
      decideClassSessionRebuild({ status: 'منجزة', plannedDate: oldDate }, nextDate, true, true)
    ).toBe('conflict');
    expect(
      decideClassSessionRebuild({ status: 'منجزة', plannedDate: oldDate }, nextDate, false, false)
    ).toBe('conflict');
    expect(decideClassSessionRebuild(null, nextDate, false, true)).toBe('create');
  });

  it('materializes separate same-level class execution rows from one level structure', () => {
    const result = generateAllPrimaryLevelDistributions('2025-2026', '2025-09-21');
    const gradeTwo = result.levels.find((level) => level.levelId === 'lvl_p2')!;
    const gradeFour = result.levels.find((level) => level.levelId === 'lvl_p4')!;
    const classA = buildClassPlannedSessionSeedsFromCanonicalSessions(
      'teacher-1',
      'class-2a',
      '2025-2026',
      gradeTwo.sessions
    );
    const classB = buildClassPlannedSessionSeedsFromCanonicalSessions(
      'teacher-1',
      'class-2b',
      '2025-2026',
      gradeTwo.sessions
    );
    const classC = buildClassPlannedSessionSeedsFromCanonicalSessions(
      'teacher-1',
      'class-4a',
      '2025-2026',
      gradeFour.sessions
    );

    expect(classA).toHaveLength(56);
    expect(classB).toHaveLength(56);
    expect(classC).toHaveLength(34);
    expect(classA.every((session) => session.classId === 'class-2a')).toBe(true);
    expect(classB.every((session) => session.classId === 'class-2b')).toBe(true);
    expect(classA.map((session) => session.referenceSessionId)).toEqual(
      classB.map((session) => session.referenceSessionId)
    );
    expect(classA[0].id).not.toBe(classB[0].id);
    expect(classC.every((session) => session.durationMinutes === 90)).toBe(true);
  });

  it('keeps materialized class sessions synchronized with the level first date', () => {
    const result = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21');
    for (const level of result.levels) {
      const seeds = buildClassPlannedSessionSeedsFromCanonicalSessions(
        'teacher-1',
        `class-${level.levelId}`,
        '2026-2027',
        level.sessions
      );
      expect(seeds[0].plannedDate.toISOString().slice(0, 10)).toBe(level.firstSessionDate);
    }
  });

  it('keeps missing levels as distributions and never creates fake classes', () => {
    const result = generateAllPrimaryLevelDistributions('2025-2026', '2025-09-21');
    expect(result.levels.find((level) => level.levelId === 'lvl_p5')?.sessionCount).toBe(34);
    const router = fs.readFileSync('src/server/apiRouter.ts', 'utf8');
    const globalRoute = router.slice(
      router.indexOf("'/teacher/planning/annual-distribution/initialize'"),
      router.indexOf("'/teacher/planning/classes/:classId/sessions/initialize'")
    );
    expect(router).toContain("'/teacher/planning/annual-distribution/initialize'");
    expect(globalRoute).toContain('classLinkViews(classes, generation.levels)');
    expect(globalRoute).toContain('executionDependencyIds');
    expect(globalRoute).toContain('prisma.studentClass.findMany');
    expect(globalRoute).not.toContain('prisma.studentClass.create');
    expect(router).toContain("'/teacher/planning/annual-distribution'");
    expect(router).toContain('ANNUAL_DISTRIBUTION_KIND');
  });

  it('preserves safe regeneration and completed-session protection contracts', () => {
    const router = fs.readFileSync('src/server/apiRouter.ts', 'utf8');
    expect(router).toContain('decideClassSessionRebuild');
    expect(router).toContain('executionDependencyIds');
    expect(router).toContain('preLaunchRebuild');
    expect(router).toContain('res.status(409)');
    expect(router).toContain('prisma.$transaction([...distributionRecords, ...operations])');
    expect(router).toContain('createdOrUpdatedSessions');
    expect(router).toContain('conflicts');
  });

  it('recalculates future dates from a changed start date without changing identities', () => {
    const startDateA = generateAllPrimaryLevelDistributions('2025-2026', '2025-09-21');
    const startDateB = generateAllPrimaryLevelDistributions('2025-2026', '2025-09-28');

    expect(startDateB.levels.map((level) => level.sessionCount)).toEqual([56, 56, 56, 34, 34]);
    for (const levelId of levelIds) {
      const first = startDateA.levels.find((level) => level.levelId === levelId)!;
      const second = startDateB.levels.find((level) => level.levelId === levelId)!;
      expect(second.sessions.map((session) => session.referenceSessionId)).toEqual(
        first.sessions.map((session) => session.referenceSessionId)
      );
      expect(second.sessions[0].plannedDate).not.toBe(first.sessions[0].plannedDate);
      expect(second.sessions.map((session) => session.plannedDate)).not.toEqual(
        first.sessions.map((session) => session.plannedDate)
      );
    }
  });

  it('keeps same-date regeneration idempotent and protects executed rows', () => {
    const first = generateAllPrimaryLevelDistributions('2025-2026', '2025-09-21');
    const second = generateAllPrimaryLevelDistributions('2025-2026', '2025-09-21');
    expect(second.levels).toEqual(first.levels);

    const router = fs.readFileSync('src/server/apiRouter.ts', 'utf8');
    expect(router).toContain("if (decision === 'preserve') return []");
    expect(router).toContain('plannedDate: seed.plannedDate');
    expect(router).toContain('annual_distribution');
  });
});
