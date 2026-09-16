import { describe, expect, it } from 'vitest';
import {
  buildClassPlannedSessionSeedsFromCanonicalSessions,
  canonicalPlanningSessions,
  materializeClassPlannedSessionSeedsFromTimetable,
} from '../src/services/teacherPlanning.service';
import {
  generateLessonMemoDraft,
  loadLessonMemoForSession,
  regenerateLessonMemo,
} from '../src/services/lessonMemoGeneration.service';
import {
  AutoGenerateSessionSource,
  getUnifiedLessonRows,
} from '../src/services/lessonPlan.generator.service';
import type { EducationalSituation, User } from '../src/types/spex';

const slots = [
  { weekday: 1, startTime: '08:00', endTime: '09:30' },
  { weekday: 3, startTime: '10:00', endTime: '11:30' },
];

const user = {
  id: 'teacher-g3b',
  username: 'teacher-g3b',
  spexId: 'SPX-G3B',
  firstName: 'QA',
  lastName: 'Teacher',
  email: 'qa-g3b@example.test',
  role: 'teacher',
  directorateId: '',
  districtId: '',
  status: 'active',
} as User;

function situation(id: string, objectiveId: string, objective: string): EducationalSituation {
  return {
    id,
    name: id,
    grade: 4,
    gradeId: 'lvl_p4',
    fieldId: 'f_locomotion',
    domainId: 'f_locomotion',
    fieldName: 'التنقل',
    objectiveIds: [objectiveId],
    objectiveTexts: [objective],
    sourceGoal: objective,
    organization: 'أفواج متوازية',
    equipment: ['أقماع'],
    executionConditions: 'يمر المتعلم عبر مسار منظم.',
    successCriteria: 'ينجز المسار وفق التعليمات.',
    observationIndicators: ['يحافظ على الاتجاه'],
    origin: 'REFERENCE_SEED',
    status: 'APPROVED',
    approvalStatus: 'APPROVED',
    productionEligibility: 'AUTO_GENERATION_ELIGIBLE',
    objectiveRelations: [{ objectiveId, relationType: 'DIRECT' }],
  };
}

function source(
  reference: ReturnType<typeof canonicalPlanningSessions>[number]
): AutoGenerateSessionSource {
  return {
    referenceSessionId: reference.referenceSessionId,
    fieldId: reference.domainId,
    fieldName: reference.fieldName || reference.domainId,
    finalCompetency: reference.finalCompetency || '',
    segmentGoal: reference.objective,
    sessionNumber: reference.fieldSessionNumber,
    globalNumber: reference.sequenceIndex,
    weekNumber: Math.ceil(reference.sequenceIndex / 2),
    type: reference.sessionType as AutoGenerateSessionSource['type'],
    typeLabel: reference.sessionTypeLabel,
    objective: reference.objective,
    objectiveId: reference.objectiveId,
    objectiveGroupId: reference.objectiveGroupId,
    tools: ['أقماع'],
  };
}

describe('MEMO-G3B planned session integration', () => {
  it('materializes Grade 4 as two 45-minute sessions or one 90-minute session', () => {
    const canonical = canonicalPlanningSessions('lvl_p4', '2025-09-21', '2025-2026');
    const two45 = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher',
      'class-two45',
      '2025-2026',
      canonical,
      slots,
      'TWO_45'
    );
    const one90 = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher',
      'class-one90',
      '2025-2026',
      canonical,
      slots,
      'ONE_90'
    );
    const two45Learning = two45.seeds.filter(
      (seed) => !seed.referenceSessionId.includes(':intro:')
    );
    const one90Learning = one90.seeds.filter(
      (seed) => !seed.referenceSessionId.includes(':intro:')
    );

    expect(two45Learning).toHaveLength(54);
    expect(new Set(two45Learning.map((seed) => seed.referenceSessionId)).size).toBe(54);
    expect(two45Learning.every((seed) => seed.durationMinutes === 45)).toBe(true);
    expect(one90Learning).toHaveLength(33);
    expect(new Set(one90Learning.map((seed) => seed.referenceSessionId)).size).toBe(33);
    expect(one90Learning.every((seed) => seed.durationMinutes === 90)).toBe(true);
    expect(one90Learning.some((seed) => seed.referenceSessionId.includes(':meeting:2'))).toBe(
      false
    );
  });

  it('preserves both pedagogical parts in one coherent 90-minute memo', () => {
    const canonical = canonicalPlanningSessions('lvl_p4', '2025-09-21', '2025-2026');
    const first = canonical.find(
      (item, index) =>
        item.sessionType === 'تعلمية' &&
        canonical[index + 1]?.sessionType === 'تعلمية' &&
        item.objectiveGroupId &&
        item.objectiveGroupId === canonical[index + 1]?.objectiveGroupId
    );
    expect(first).toBeDefined();
    const second = canonical[canonical.indexOf(first!) + 1];
    const firstSource = source(first!);
    const secondSource = source(second);
    const plan = generateLessonMemoDraft({
      teacher: user,
      classId: 'class-one90',
      academicYearId: '2025-2026',
      classPlannedSessionId: 'cps-one90',
      source: firstSource,
      pedagogicalParts: [firstSource, secondSource],
      className: '4A',
      levelName: 'السنة الرابعة ابتدائي',
      plannedDate: '2025-09-29',
      durationMinutes: 90,
      situations: [
        situation('combined-a', first!.objectiveId || 'objective-a', first!.objective),
        situation('combined-b', second.objectiveId || 'objective-b', second.objective),
      ],
    });
    const rows = getUnifiedLessonRows(plan);
    const situations = rows.filter((row) => row.phase === 'المرحلة الرئيسية');
    expect(plan.durationMinutes).toBe(90);
    expect(plan.pedagogicalPartReferences).toHaveLength(2);
    expect(plan.sessionTitle).toContain(first!.objective);
    expect(plan.sessionTitle).toContain(second.objective);
    expect(rows.filter((row) => row.id === 'preparation')).toHaveLength(1);
    expect(rows.filter((row) => row.id === 'closing')).toHaveLength(1);
    expect(rows.reduce((sum, row) => sum + row.durationMinutes, 0)).toBe(90);
    expect(situations.length).toBeGreaterThan(0);
  });

  it('does not combine incompatible pedagogical lesson types', () => {
    const learning = {
      referenceSessionId: 'ref-learning',
      fieldId: 'f_locomotion',
      fieldName: 'التنقل',
      finalCompetency: '',
      segmentGoal: '',
      sessionNumber: 1,
      globalNumber: 1,
      weekNumber: 1,
      type: 'تعلمية' as const,
      typeLabel: 'تعلمية',
      objective: 'هدف 1',
      objectiveId: 'obj-1',
      tools: [],
    };
    const diagnostic = { ...learning, type: 'تقويم تشخيصي' as const, objective: 'تشخيص' };
    expect(() =>
      generateLessonMemoDraft({
        teacher: user,
        classId: 'class-one90',
        academicYearId: '2025-2026',
        classPlannedSessionId: 'cps-conflict',
        source: learning,
        pedagogicalParts: [learning, diagnostic],
        levelName: 'السنة الرابعة ابتدائي',
        plannedDate: '2025-09-29',
        durationMinutes: 90,
      })
    ).toThrowError('Combined pedagogical parts must use one lesson type.');
  });

  it('keeps Grade 5 at one 60-minute operational session per reference', () => {
    const canonical = canonicalPlanningSessions('lvl_p5', '2025-09-21', '2025-2026');
    const result = buildClassPlannedSessionSeedsFromCanonicalSessions(
      'teacher',
      'class-five',
      '2025-2026',
      canonical,
      [slots[0]],
      null
    );
    expect(result.every((seed) => seed.durationMinutes === 60)).toBe(true);
    expect(result.filter((seed) => !seed.referenceSessionId.includes(':intro:'))).toHaveLength(33);
  });

  it('supports multi-target selection without changing snapshot identity', () => {
    const first = situation('situation-a', 'obj-a', 'هدف أ');
    const second = situation('situation-b', 'obj-b', 'هدف ب');
    const plan = generateLessonMemoDraft({
      teacher: user,
      classId: 'class-one90',
      academicYearId: '2025-2026',
      classPlannedSessionId: 'cps-snapshot',
      source: {
        referenceSessionId: 'ref-a',
        fieldId: 'f_locomotion',
        fieldName: 'التنقل',
        finalCompetency: '',
        segmentGoal: '',
        sessionNumber: 1,
        globalNumber: 1,
        weekNumber: 1,
        type: 'تعلمية',
        typeLabel: 'تعلمية',
        objective: 'هدف أ',
        objectiveId: 'obj-a',
        tools: [],
      },
      pedagogicalParts: [
        {
          referenceSessionId: 'ref-a',
          fieldId: 'f_locomotion',
          fieldName: 'التنقل',
          finalCompetency: '',
          segmentGoal: '',
          sessionNumber: 1,
          globalNumber: 1,
          weekNumber: 1,
          type: 'تعلمية',
          typeLabel: 'تعلمية',
          objective: 'هدف أ',
          objectiveId: 'obj-a',
          tools: [],
        },
        {
          referenceSessionId: 'ref-b',
          fieldId: 'f_locomotion',
          fieldName: 'التنقل',
          finalCompetency: '',
          segmentGoal: '',
          sessionNumber: 2,
          globalNumber: 2,
          weekNumber: 1,
          type: 'تعلمية',
          typeLabel: 'تعلمية',
          objective: 'هدف ب',
          objectiveId: 'obj-b',
          tools: [],
        },
      ],
      situations: [first, second],
      levelName: 'السنة الرابعة ابتدائي',
      plannedDate: '2025-09-29',
      durationMinutes: 90,
    });
    const snapshots = getUnifiedLessonRows(plan)
      .map((row) => row.situationSnapshot)
      .filter(Boolean);
    expect(snapshots.length).toBeGreaterThan(0);
    expect(snapshots.every((snapshot) => snapshot?.situationId)).toBe(true);
    expect(
      snapshots.some((snapshot) => snapshot?.successCriteria === 'ينجز المسار وفق التعليمات.')
    ).toBe(true);
  });

  it('loads by the complete operational identity and protects manual regeneration', () => {
    const existing = {
      id: 'lp-existing',
      teacherId: user.id,
      classId: 'class-one90',
      academicYearId: '2025-2026',
      classPlannedSessionId: 'cps-manual',
      manualEdits: true,
    } as import('../src/types/spex').LessonPlan;
    expect(
      loadLessonMemoForSession([existing], {
        teacher: user,
        classId: 'class-one90',
        academicYearId: '2025-2026',
        classPlannedSessionId: 'cps-manual',
      })
    ).toBe(existing);
    expect(() =>
      regenerateLessonMemo(
        {
          teacher: user,
          classId: 'class-one90',
          academicYearId: '2025-2026',
          classPlannedSessionId: 'cps-manual',
          source: {
            referenceSessionId: 'ref-manual',
            fieldId: 'f_locomotion',
            fieldName: 'التنقل',
            finalCompetency: '',
            segmentGoal: '',
            sessionNumber: 1,
            globalNumber: 1,
            weekNumber: 1,
            type: 'تعلمية',
            typeLabel: 'تعلمية',
            objective: 'هدف',
            tools: [],
          },
          levelName: 'السنة الرابعة ابتدائي',
          plannedDate: '2025-09-29',
          durationMinutes: 90,
        },
        existing
      )
    ).toThrowError('REGENERATION_CONFIRMATION_REQUIRED');
  });
});
