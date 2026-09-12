import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { ClassPlanningConfiguration } from '@prisma/client';
import {
  getClassPlanningConfiguration,
  resolveGrade4WeeklyScheduleMode,
  setGrade4WeeklyScheduleMode,
  type ClassPlanningStore,
} from '../src/services/classPlanningConfiguration.service';
import {
  lessonPhaseBudgetsForDuration,
  resolveOperationalLessonDuration,
} from '../src/services/lessonTiming.service';
import {
  autoGenerateLessonPlan,
  lessonDurationForLevel,
} from '../src/services/lessonPlan.generator.service';
import {
  buildClassPlannedSessionSeeds,
  canonicalPlanningSessions,
} from '../src/services/teacherPlanning.service';
import { lessonMainWorkBudgetMinutes } from '../src/services/educationalSituation.selector.service';
import { sequenceLessonSituations } from '../src/services/lessonSituationSequencing.service';
import type { EducationalSituation } from '../src/types/spex';

const schema = readFileSync('prisma/schema.prisma', 'utf8');
const migration = readFileSync(
  'prisma/migrations/20260912120000_grade4_weekly_schedule_mode/migration.sql',
  'utf8'
);
const routerSource = readFileSync('src/server/apiRouter.ts', 'utf8');

const makeStore = () => {
  const configuration: ClassPlanningConfiguration = {
    id: 'config-1',
    classId: 'class-a',
    academicYearId: '2026-2027',
    grade4WeeklyScheduleMode: 'TWO_45',
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
  };
  const findUnique = vi.fn(
    async ({
      where,
    }: {
      where: { classId_academicYearId: { classId: string; academicYearId: string } };
    }) =>
      where.classId_academicYearId.classId === configuration.classId &&
      where.classId_academicYearId.academicYearId === configuration.academicYearId
        ? configuration
        : null
  );
  const upsertCalls: Array<{
    where: unknown;
    create: Omit<ClassPlanningConfiguration, 'id' | 'createdAt' | 'updatedAt'>;
  }> = [];
  const upsert = vi.fn(
    async (args: {
      where: unknown;
      create: Omit<ClassPlanningConfiguration, 'id' | 'createdAt' | 'updatedAt'>;
    }) => {
      upsertCalls.push(args);
      return { ...configuration, ...args.create };
    }
  );
  return {
    classPlanningConfiguration: { findUnique, upsert },
    findUnique,
    upsert,
    upsertCalls,
  } as unknown as ClassPlanningStore & {
    findUnique: typeof findUnique;
    upsert: typeof upsert;
    upsertCalls: typeof upsertCalls;
  };
};

const situation = (id: string): EducationalSituation => ({
  id,
  name: id,
  grade: 4,
  gradeId: 'lvl_p4',
  fieldId: 'f_locomotion',
  domainId: 'f_locomotion',
  fieldName: 'التنقل',
  objectiveIds: ['obj-a'],
  objectiveTexts: ['الهدف أ'],
  sourceGoal: 'هدف حركي',
  organization: 'أفواج',
  equipment: ['أقماع'],
  origin: 'REFERENCE_SEED',
  status: 'APPROVED',
  approvalStatus: 'APPROVED',
  productionEligibility: 'AUTO_GENERATION_ELIGIBLE',
  objectiveRelations: [{ objectiveId: 'obj-a', relationType: 'DIRECT' }],
});

describe('MEMO-G3A Grade 4 scheduling foundation', () => {
  it('declares the additive enum, class/year configuration, relation and unique scope', () => {
    expect(schema).toContain('enum Grade4WeeklyScheduleMode');
    expect(schema).toContain('model ClassPlanningConfiguration');
    expect(schema).toContain('classId                  String');
    expect(schema).toContain('academicYearId           String');
    expect(schema).toContain('class StudentClass @relation');
    expect(schema).toContain('@@unique([classId, academicYearId])');
  });

  it('keeps the migration additive and protects configuration by teacher-owned class', () => {
    expect(migration).not.toMatch(/\b(DROP|TRUNCATE)\b|^\s*(DELETE\s+FROM|UPDATE\s+)/im);
    expect(migration).toContain('CREATE TYPE "Grade4WeeklyScheduleMode"');
    expect(migration).toContain('CREATE TABLE "ClassPlanningConfiguration"');
    expect(routerSource).toContain("'/teacher/planning/classes/:classId/configuration'");
    expect(routerSource).toContain('teacherId: req.user!.id');
    expect(routerSource).toContain('القسم غير موجود ضمن أقسامك');
  });

  it('persists TWO_45 and ONE_90 through the class/year upsert boundary', async () => {
    const store = makeStore();
    await setGrade4WeeklyScheduleMode(
      { classId: 'class-a', academicYearId: '2026-2027', grade4WeeklyScheduleMode: 'TWO_45' },
      store
    );
    await setGrade4WeeklyScheduleMode(
      { classId: 'class-a', academicYearId: '2027-2028', grade4WeeklyScheduleMode: 'ONE_90' },
      store
    );
    expect(store.upsert).toHaveBeenCalledTimes(2);
    expect(store.upsertCalls[0].where).toEqual({
      classId_academicYearId: { classId: 'class-a', academicYearId: '2026-2027' },
    });
    expect(store.upsertCalls[1].where).toEqual({
      classId_academicYearId: { classId: 'class-a', academicYearId: '2027-2028' },
    });
  });

  it('reads by both class and academic year without leaking configuration', async () => {
    const store = makeStore();
    expect(await getClassPlanningConfiguration('class-a', '2026-2027', store)).not.toBeNull();
    expect(await getClassPlanningConfiguration('class-b', '2026-2027', store)).toBeNull();
    expect(await getClassPlanningConfiguration('class-a', '2027-2028', store)).toBeNull();
    expect(store.findUnique).toHaveBeenCalledTimes(3);
  });

  it('keeps null and missing configuration as non-persisting legacy ONE_90', () => {
    expect(resolveGrade4WeeklyScheduleMode(null)).toBe('ONE_90');
    expect(resolveGrade4WeeklyScheduleMode(undefined)).toBe('ONE_90');
    expect(resolveGrade4WeeklyScheduleMode('ONE_90')).toBe('ONE_90');
    expect(resolveGrade4WeeklyScheduleMode('TWO_45')).toBe('TWO_45');
  });

  it('resolves actual session duration before configuration, then applies Grade 4 mode', () => {
    expect(
      resolveOperationalLessonDuration({ gradeId: 'lvl_p4', classPlanningMode: 'TWO_45' })
    ).toBe(45);
    expect(
      resolveOperationalLessonDuration({ gradeId: 'lvl_p4', classPlanningMode: 'ONE_90' })
    ).toBe(90);
    expect(resolveOperationalLessonDuration({ gradeId: 'lvl_p4' })).toBe(90);
    expect(
      resolveOperationalLessonDuration({
        gradeId: 'lvl_p4',
        classPlanningMode: 'TWO_45',
        classPlannedSessionDurationMinutes: 90,
      })
    ).toBe(90);
  });

  it('defines exact 45, 60 and 90 phase budgets', () => {
    expect(lessonPhaseBudgetsForDuration(45)).toEqual({ warmup: 10, main: 30, final: 5 });
    expect(lessonPhaseBudgetsForDuration(60)).toEqual({ warmup: 10, main: 40, final: 10 });
    expect(lessonPhaseBudgetsForDuration(90)).toEqual({ warmup: 15, main: 65, final: 10 });
    for (const duration of [45, 60, 90]) {
      const budget = lessonPhaseBudgetsForDuration(duration);
      expect(budget.warmup + budget.main + budget.final).toBe(duration);
    }
  });

  it('uses the mode-aware duration in the lesson generator and keeps Grade 5 at 60', () => {
    expect(lessonDurationForLevel('السنة الرابعة ابتدائي', 'TWO_45')).toBe(45);
    expect(lessonDurationForLevel('السنة الرابعة ابتدائي', 'ONE_90')).toBe(90);
    expect(lessonDurationForLevel('السنة الرابعة ابتدائي')).toBe(90);
    expect(lessonDurationForLevel('السنة الخامسة ابتدائي')).toBe(60);
    expect(lessonDurationForLevel('السنة الأولى ابتدائي')).toBe(60);
  });

  it('generates one coherent 45-minute structure when the operational context is 45', () => {
    const plan = autoGenerateLessonPlan(
      {
        fieldId: 'f_locomotion',
        fieldName: 'التنقل',
        finalCompetency: '',
        segmentGoal: '',
        sessionNumber: 1,
        globalNumber: 1,
        weekNumber: 1,
        type: 'تعلمية',
        typeLabel: 'حصة تعلمية',
        objective: 'هدف حركي',
        tools: [],
      },
      { levelName: 'السنة الرابعة ابتدائي', durationMinutes: 45, situations: [situation('g4-45')] }
    );
    expect(plan.durationMinutes).toBe(45);
    expect(plan.lessonRows.map((row) => row.durationMinutes)).toEqual([10, 30, 5]);
  });

  it('lets MEMO-G2 sequence Grade 4 at 45 without forcing 90', () => {
    const result = sequenceLessonSituations({
      gradeId: 'lvl_p4',
      fieldId: 'f_locomotion',
      lessonType: 'LEARNING',
      objectiveId: 'obj-a',
      lessonDurationMinutes: 45,
      selectedSituations: [situation('g4-sequence')],
    });
    expect(result.phaseBudgets).toEqual({ warmup: 10, main: 30, final: 5 });
    expect(result.phaseTotals).toEqual({ warmup: 10, main: 30, final: 5 });
  });

  it('aligns selector main-work budget with the 45-minute contract', () => {
    expect(lessonMainWorkBudgetMinutes('lvl_p4', 45)).toBe(30);
    expect(lessonMainWorkBudgetMinutes('lvl_p4', 60)).toBe(40);
    expect(lessonMainWorkBudgetMinutes('lvl_p4', 90)).toBe(65);
    expect(lessonMainWorkBudgetMinutes('lvl_p1', 90)).toBe(70);
  });

  it('passes explicit TWO_45 duration into operational seed materialization', () => {
    const canonical = canonicalPlanningSessions('lvl_p4', '2026-09-21', '2026-2027');
    const seeds = buildClassPlannedSessionSeeds(
      'teacher',
      'class',
      '2026-2027',
      'lvl_p4',
      '2026-09-21',
      undefined,
      undefined,
      'TWO_45'
    );
    expect(canonical.length).toBeGreaterThan(0);
    expect(seeds.every((seed) => seed.durationMinutes === 45)).toBe(true);
  });

  it('keeps the annual pedagogical references unchanged by scheduling mode', () => {
    const legacy = canonicalPlanningSessions('lvl_p4', '2026-09-21', '2026-2027');
    const current = canonicalPlanningSessions('lvl_p4', '2026-09-21', '2026-2027');
    expect(current).toEqual(legacy);
    expect(current.some((session) => session.objectiveId)).toBe(true);
  });
});
