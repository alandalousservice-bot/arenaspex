import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  annualDistributionMeetingLabel,
  annualDistributionMonthLabel,
  annualDistributionWeekFieldLabel,
  annualDistributionWeekDateRange,
  annualDistributionWeekTypeLabel,
  buildAnnualDistributionRows,
} from '../src/components/curriculum/AnnualDistributionCalendar';
import {
  annualDistributionUnitSummary,
  buildAnnualDistributionWeeks,
  canonicalPlanningSessions,
  generateAllPrimaryLevelDistributions,
} from '../src/services/teacherPlanning.service';

const read = (file: string) => fs.readFileSync(file, 'utf8');

describe('weekly level-based annual distribution', () => {
  it('renders weekly pedagogical rows without operational date or class controls', () => {
    const source = read('src/components/curriculum/AnnualDistributionCalendar.tsx');
    expect(source).toContain('buildAnnualDistributionRows');
    expect(source).toContain('التاريخ');
    expect(source).not.toContain('التعلمات / الهدف');
    expect(source).not.toContain('لقاءان: 1/2 و 2/2');
    expect(source).toContain('(أ - ب)');
    expect(source).toContain('الشهر');
    expect(source).toContain('الفترة / التاريخ');
    expect(source).not.toContain('الأحد إلى الخميس');
    expect(source).not.toContain('تاريخ الحصة');
    expect(source).not.toContain('classPlannedSessionId');
    expect(source).not.toContain('selectedClass');
    expect(source).not.toContain('onUpdateDate');
    expect(source).not.toContain('BookOpen');
    expect(source).not.toContain('NotebookPen');
  });

  it('creates one distribution per level and an intro week marker', () => {
    const annual = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21');
    expect(annual.levels).toHaveLength(5);
    for (const level of annual.levels) {
      const weeks = buildAnnualDistributionWeeks(level);
      expect(weeks[0]).toMatchObject({
        weekIndex: 1,
        weekLabel: 'الأسبوع الأول',
        isIntro: true,
      });
      expect(weeks[0].pedagogicalUnits[0]).toMatchObject({
        fieldId: 'intro',
        sessionType: 'تعارف وتنظيم',
      });
      expect(buildAnnualDistributionRows(weeks)).toHaveLength(weeks.length);
    }
  });

  it.each(['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5'])(
    'keeps one diagnostic at the beginning of every field for %s',
    (levelId) => {
      const sessions = canonicalPlanningSessions(levelId, '2026-09-21', '2026-2027');
      const diagnostics = sessions.filter((session) => session.sessionType === 'تقويم تشخيصي');
      expect(diagnostics).toHaveLength(3);
      expect(new Set(diagnostics.map((session) => session.domainId))).toEqual(
        new Set(['f_locomotion', 'f_fundamentals', 'f_structuring'])
      );
      expect(sessions.some((session) => session.objectiveGroupId === 'diagnostic_prelude')).toBe(
        false
      );
    }
  );

  it('keeps each Grade 1–4 learning pair as one annual weekly unit', () => {
    const annual = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21');
    for (const level of annual.levels.filter((item) => item.grade <= 4)) {
      const weeks = buildAnnualDistributionWeeks(level);
      const learningUnits = weeks.flatMap((week) =>
        week.pedagogicalUnits.filter((unit) => unit.sessionType === 'تعلمية')
      );
      expect(learningUnits.length).toBeGreaterThan(0);
      expect(learningUnits.every((unit) => unit.meetingCount === 2)).toBe(true);
      expect(
        learningUnits.every((unit) => unit.meetings.length === 2 && unit.objectiveGroupId !== null)
      ).toBe(true);
      expect(new Set(learningUnits.map((unit) => unit.referenceSessionId)).size).toBe(
        learningUnits.length
      );
    }
  });

  it('keeps Grade 5 at one pedagogical meeting with no pairing', () => {
    const level = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21').levels.find(
      (item) => item.levelId === 'lvl_p5'
    )!;
    const weeks = buildAnnualDistributionWeeks(level);
    const units = weeks.flatMap((week) => week.pedagogicalUnits);
    expect(
      units.filter((unit) => unit.sessionType === 'تعلمية').every((unit) => unit.meetingCount === 1)
    ).toBe(true);
    expect(units.every((unit) => unit.meetings.length === 0)).toBe(true);
    expect(weeks.slice(1).every((week) => week.slots.length === 1)).toBe(true);
    expect(
      weeks.flatMap((week) => week.slots).some((slot) => /\(أ|ب\)/u.test(slot.displayLabel))
    ).toBe(false);
  });

  it('calculates user-facing summaries from weekly pedagogical units', () => {
    const level = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21').levels[0];
    const summary = annualDistributionUnitSummary(buildAnnualDistributionWeeks(level));
    expect(summary.weekCount).toBe(28);
    expect(summary.pedagogicalUnitCount).toBe(34);
    expect(summary.meetingCount).toBe(55);
    expect(summary.pedagogicalUnitCount).toBeGreaterThan(0);
    expect(summary.learningUnitCount).toBeGreaterThan(0);
  });

  it('inserts only the platform seasonal holidays into the annual rows', () => {
    const level = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21').levels[0];
    const rows = buildAnnualDistributionRows(
      buildAnnualDistributionWeeks(level),
      '2026-09-21',
      '2026-2027'
    );
    expect(
      rows
        .filter((row) => row.kind === 'holiday')
        .map((row) => (row.kind === 'holiday' ? row.holiday.name : ''))
    ).toEqual(['عطلة الخريف', 'عطلة الشتاء', 'عطلة الربيع']);
  });

  it('places the next pedagogical unit in the remaining Grade 1–4 weekly meeting', () => {
    const level = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21').levels[0];
    const weeks = buildAnnualDistributionWeeks(level);
    const firstFieldWeek = weeks.find((week) =>
      week.pedagogicalUnits.some((unit) => unit.sessionType === 'تقويم تشخيصي')
    );
    expect(firstFieldWeek?.pedagogicalUnits.map((unit) => unit.sessionType)).toEqual([
      'تقويم تشخيصي',
      'تعلمية',
    ]);
    expect(firstFieldWeek?.pedagogicalUnits[0].meetingCount).toBe(1);
    expect(firstFieldWeek?.pedagogicalUnits[1].meetingCount).toBe(2);
  });

  it('formats each annual row as a Sunday-to-Thursday numeric date range', () => {
    expect(annualDistributionWeekDateRange('2026-09-21', 1)).toBe('20/09/2026 – 24/09/2026');
    expect(annualDistributionWeekDateRange('2026-09-21', 2)).toBe('27/09/2026 – 01/10/2026');
  });

  it('uses pedagogical A/B labels without numerical meeting fractions', () => {
    const level = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21').levels[0];
    const weeks = buildAnnualDistributionWeeks(level);
    expect(annualDistributionMeetingLabel(weeks[2].pedagogicalUnits[0], 1)).toBe(
      'حصة تعلمية 1 (أ - ب)'
    );
    expect(annualDistributionMeetingLabel(weeks[1].pedagogicalUnits[0])).toBe('تقويم تشخيصي');
  });

  it('represents all three domains with 18 sequential slots each', () => {
    const level = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21').levels[0];
    const weeks = buildAnnualDistributionWeeks(level);
    const slots = weeks.flatMap((week) => week.slots);
    const domains = ['f_locomotion', 'f_fundamentals', 'f_structuring'];

    expect(slots.filter((slot) => slot.fieldId === 'intro')).toHaveLength(1);
    for (const domain of domains) {
      const domainSessions = level.sessions.filter((session) => session.domainId === domain);
      const domainSlots = slots.filter((slot) => slot.fieldId === domain);
      expect(
        domainSessions.filter((session) => session.sessionType === 'تقويم تشخيصي')
      ).toHaveLength(1);
      expect(
        new Set(
          domainSessions
            .filter((session) => session.sessionType === 'تعلمية')
            .map((session) => session.objectiveGroupId)
        ).size
      ).toBe(7);
      expect(domainSessions.filter((session) => session.sessionType === 'إدماجية')).toHaveLength(2);
      expect(
        domainSessions.filter((session) => session.sessionType === 'تقويم تحصيلي')
      ).toHaveLength(1);
      expect(domainSlots).toHaveLength(18);
      expect(
        new Set(
          domainSlots
            .filter((slot) => slot.sessionType === 'تعلمية')
            .map((slot) => slot.objectiveGroupId)
        ).size
      ).toBe(7);
    }
    expect(slots.filter((slot) => slot.fieldId !== 'intro')).toHaveLength(54);
  });

  it('packs two sequential pedagogical slots without exposing meeting columns', () => {
    const level = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21').levels[0];
    const weeks = buildAnnualDistributionWeeks(level);
    expect(annualDistributionWeekTypeLabel(weeks[1])).toBe('تقويم تشخيصي - تعلمية 1 (أ)');
    expect(annualDistributionWeekTypeLabel(weeks[2])).toBe('تعلمية 1 (ب) - تعلمية 2 (أ)');
    expect(annualDistributionWeekTypeLabel(weeks[3])).toBe('تعلمية 2 (ب) - تعلمية 3 (أ)');
    expect(annualDistributionWeekTypeLabel(weeks[4])).toBe('تعلمية 3 (ب) - إدماجية 1');
    expect(annualDistributionWeekTypeLabel(weeks[5])).toBe('تعلمية 4 (أ - ب)');
    expect(annualDistributionWeekTypeLabel(weeks[8])).toBe('تعلمية 7 (أ - ب)');
    expect(annualDistributionWeekTypeLabel(weeks[9])).toBe('إدماجية 2 - تقويم تحصيلي');
    expect(annualDistributionWeekTypeLabel(weeks[8])).not.toContain('إدماجية 2 - تعلمية');
    expect(annualDistributionWeekTypeLabel(weeks[10])).toBe('تقويم تشخيصي - تعلمية 1 (أ)');
  });

  it('derives month and field labels from the same weekly slots as the table', () => {
    const level = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21').levels[0];
    const weeks = buildAnnualDistributionWeeks(level);
    expect(annualDistributionMonthLabel('2026-09-21', 2, '2026-2027')).toBe('سبتمبر / أكتوبر');
    expect(annualDistributionWeekFieldLabel(weeks[1])).toBe('الوضعيات والتنقلات');
    expect(annualDistributionWeekFieldLabel(weeks[10])).toBe('الحركات القاعدية');
  });

  it('does not expose operational fields in the weekly read model', () => {
    const level = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21').levels[0];
    const weeks = buildAnnualDistributionWeeks(level);
    const unit = weeks[1].pedagogicalUnits[0];
    expect(Object.keys(unit)).not.toContain('plannedDate');
    expect(Object.keys(unit)).not.toContain('classId');
    expect(Object.keys(unit)).not.toContain('startTime');
    expect(Object.keys(unit)).not.toContain('endTime');
    expect(Object.keys(unit)).not.toContain('classPlannedSessionId');
  });

  it('keeps legacy annual dates from changing weekly unit identity', () => {
    const router = read('src/server/apiRouter.ts');
    const initializeRoute = router.slice(
      router.indexOf("'/teacher/planning/annual-distribution/initialize'"),
      router.indexOf(
        "'/teacher/planning/annual-distribution/levels/:levelId/sessions/:referenceSessionId'"
      )
    );
    expect(initializeRoute).toContain('annualDistributionPersistenceData');
    expect(initializeRoute).not.toContain('annualDistributionOverrides(level)');
    expect(router).toContain('buildAnnualDistributionWeeks');
    expect(router).toContain('res.status(410).json({');
  });
});
