import { describe, expect, it } from 'vitest';
import { generateAnnualTimeDistribution } from '../src/data/algerianCurriculum';
import { mergeSchedule } from '../src/services/schedule/scheduleMerge';
import {
  autoGenerateLessonPlan,
  lessonDurationForLevel,
  rebalanceLessonRows,
} from '../src/services/lessonPlan.generator.service';

const source = (objective: string) => ({
  fieldId: 'f_locomotion',
  fieldName: 'الوضعيات والتنقلات',
  finalCompetency: 'كفاءة معتمدة',
  segmentGoal: 'هدف المقطع',
  sessionNumber: 2,
  globalNumber: 7,
  weekNumber: 4,
  type: 'تعلمية' as const,
  typeLabel: 'تعلمية 2',
  objective,
  tools: ['صفارة'],
});

describe('مولد مذكرة الحصة الموحد', () => {
  it('يبني صفوف القالب الثلاثة ويحتفظ بالهدف المعتمد', () => {
    const plan = autoGenerateLessonPlan(source('ينجز تنقلات أمامية مع التحكم في الجسم.'), {
      levelName: 'السنة الأولى ابتدائي',
    });
    expect(plan.sessionTitle).toBe('ينجز تنقلات أمامية مع التحكم في الجسم.');
    expect(plan.lessonRows?.map((row) => row.phase)).toEqual([
      'المرحلة التحضيرية',
      'المرحلة الرئيسية',
      'المرحلة الختامية',
    ]);
    expect(plan.lessonRows?.reduce((total, row) => total + row.durationMinutes, 0)).toBe(60);
    expect(plan.equipmentNeeded).toContain('سلم أرضي');
  });

  it('لا يفرض موقفين: الهدف البسيط ينتج موقفاً واحداً والهدف المركب ينتج موقفين', () => {
    const simple = autoGenerateLessonPlan(source('ينجز تنقلات أمامية.'), {
      levelName: 'السنة الثانية ابتدائي',
    });
    const complex = autoGenerateLessonPlan(source('يربط بين الجري والقفز في مسار حركي.'), {
      levelName: 'السنة الثانية ابتدائي',
    });
    expect(simple.lessonRows?.filter((row) => row.phase === 'المرحلة الرئيسية')).toHaveLength(1);
    expect(complex.lessonRows?.filter((row) => row.phase === 'المرحلة الرئيسية')).toHaveLength(2);
  });

  it('يطبق 90 دقيقة للسنة الرابعة و60 دقيقة لبقية المستويات', () => {
    expect(lessonDurationForLevel('السنة الرابعة ابتدائي')).toBe(90);
    expect(lessonDurationForLevel('السنة الخامسة ابتدائي')).toBe(60);
    const plan = autoGenerateLessonPlan(source('ينجز تنقلات أمامية.'), {
      levelName: 'السنة الرابعة ابتدائي',
    });
    expect(plan.lessonRows?.reduce((total, row) => total + row.durationMinutes, 0)).toBe(90);
  });

  it('يعيد توزيع زمن المرحلة الرئيسية عند إضافة أو إزالة موقف', () => {
    const plan = autoGenerateLessonPlan(source('ينجز تنقلات أمامية.'), {
      levelName: 'السنة الأولى ابتدائي',
    });
    const first = plan.lessonRows!;
    const second = {
      ...first.find((row) => row.phase === 'المرحلة الرئيسية')!,
      id: 'main-2',
      situationSnapshot: {
        situationId: 's2',
        name: 'موقف ثان',
        organization: 'أفواج',
        equipment: ['كرات'],
      },
    };
    const withTwo = rebalanceLessonRows([...first, second], 60);
    expect(withTwo.reduce((total, row) => total + row.durationMinutes, 0)).toBe(60);
    expect(withTwo.filter((row) => row.phase === 'المرحلة الرئيسية')).toHaveLength(2);
    const withOne = rebalanceLessonRows(withTwo.filter((row) => row.id !== 'main-2'), 60);
    expect(withOne.reduce((total, row) => total + row.durationMinutes, 0)).toBe(60);
  });

  it('يحتفظ بهدف التوزيع السنوي المعدل للحصتين المقترنتين في السنوات 1-3', () => {
    const base = generateAnnualTimeDistribution('lvl_p1', '2025-09-21', 0, '');
    const pair = base.find((session) => !session.isIntro && session.objectiveGroupId);
    expect(pair).toBeTruthy();
    const override = pair!.objectiveGroupId!;
    const merged = mergeSchedule(base, {}, { [override]: { objective: 'هدف معدل من التوزيع' } });
    const paired = merged.filter((session) => session.objectiveGroupId === override);
    expect(paired.length).toBeGreaterThanOrEqual(1);
    expect(paired.every((session) => session.wordingOverride === 'هدف معدل من التوزيع')).toBe(true);
  });
});
