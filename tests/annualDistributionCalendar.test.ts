import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  annualDistributionMeetingLabel,
  annualDistributionWeekDateRange,
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
    expect(source).toContain('(أ) / حصة تعلمية');
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
    'normalizes %s to one diagnostic and no diagnostic prelude',
    (levelId) => {
      const sessions = canonicalPlanningSessions(levelId, '2026-09-21', '2026-2027');
      expect(sessions.filter((session) => session.sessionType === 'تقويم تشخيصي')).toHaveLength(1);
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
  });

  it('calculates user-facing summaries from weekly pedagogical units', () => {
    const level = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21').levels[0];
    const summary = annualDistributionUnitSummary(buildAnnualDistributionWeeks(level));
    expect(summary.weekCount).toBe(summary.pedagogicalUnitCount);
    expect(summary.pedagogicalUnitCount).toBeGreaterThan(0);
    expect(summary.learningUnitCount).toBeGreaterThan(0);
  });

  it('formats each annual row as a Sunday-to-Thursday numeric date range', () => {
    expect(annualDistributionWeekDateRange('2026-09-21', 1)).toBe('20/09/2026 – 24/09/2026');
    expect(annualDistributionWeekDateRange('2026-09-21', 2)).toBe('27/09/2026 – 01/10/2026');
  });

  it('uses pedagogical A/B labels without numerical meeting fractions', () => {
    const level = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21').levels[0];
    const weeks = buildAnnualDistributionWeeks(level);
    expect(annualDistributionMeetingLabel(weeks[2].pedagogicalUnits[0], 1)).toBe(
      'حصة تعلمية 1 (أ) / حصة تعلمية 1 (ب)'
    );
    expect(annualDistributionMeetingLabel(weeks[1].pedagogicalUnits[0])).toBe('حصة واحدة');
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
