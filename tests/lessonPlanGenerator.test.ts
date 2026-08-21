import { describe, expect, it } from 'vitest';
import { autoGenerateLessonPlan, lessonDurationForLevel } from '../src/services/lessonPlan.generator.service';

const source = (objective: string) => ({
  fieldId: 'f_locomotion', fieldName: 'الوضعيات والتنقلات', finalCompetency: 'كفاءة معتمدة',
  segmentGoal: 'هدف المقطع', sessionNumber: 2, globalNumber: 7, weekNumber: 4,
  type: 'تعلمية' as const, typeLabel: 'تعلمية 2', objective, tools: ['صفارة']
});

describe('مولد مذكرة الحصة الموحد', () => {
  it('يبني صفوف القالب الثلاثة ويحتفظ بالهدف المعتمد', () => {
    const plan = autoGenerateLessonPlan(source('ينجز تنقلات أمامية مع التحكم في الجسم.'), { levelName: 'السنة الأولى ابتدائي' });
    expect(plan.sessionTitle).toBe('ينجز تنقلات أمامية مع التحكم في الجسم.');
    expect(plan.lessonRows?.map((row) => row.phase)).toEqual(['المرحلة التحضيرية', 'المرحلة الرئيسية', 'المرحلة الختامية']);
    expect(plan.lessonRows?.reduce((total, row) => total + row.durationMinutes, 0)).toBe(60);
    expect(plan.equipmentNeeded).toContain('سلم أرضي');
  });

  it('لا يفرض موقفين: الهدف البسيط ينتج موقفاً واحداً والهدف المركب ينتج موقفين', () => {
    const simple = autoGenerateLessonPlan(source('ينجز تنقلات أمامية.'), { levelName: 'السنة الثانية ابتدائي' });
    const complex = autoGenerateLessonPlan(source('يربط بين الجري والقفز في مسار حركي.'), { levelName: 'السنة الثانية ابتدائي' });
    expect(simple.lessonRows?.filter((row) => row.phase === 'المرحلة الرئيسية')).toHaveLength(1);
    expect(complex.lessonRows?.filter((row) => row.phase === 'المرحلة الرئيسية')).toHaveLength(2);
  });

  it('يطبق 90 دقيقة للسنة الرابعة و60 دقيقة لبقية المستويات', () => {
    expect(lessonDurationForLevel('السنة الرابعة ابتدائي')).toBe(90);
    expect(lessonDurationForLevel('السنة الخامسة ابتدائي')).toBe(60);
    const plan = autoGenerateLessonPlan(source('ينجز تنقلات أمامية.'), { levelName: 'السنة الرابعة ابتدائي' });
    expect(plan.lessonRows?.reduce((total, row) => total + row.durationMinutes, 0)).toBe(90);
  });
});
