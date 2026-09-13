import { describe, expect, it } from 'vitest';
import { matchesSituationFilters } from '../src/components/educationalSituations/EducationalSituationsBankView';
import {
  classifySituationTaxonomy,
  situationDomainLabel,
  situationLessonTypeLabel,
  teacherFacingSituationSkillOptions,
} from '../src/services/pedagogicalSituationReadModel.service';

const leakedValues = [
  'authored-direct',
  'DIAGNOSTIC',
  'f_fundamentals',
  'f_locomotion',
  'f_structuring',
  'grade-4',
  'grade-5',
  'INTEGRATIVE',
  'LEARNING',
];

describe('تصنيف Taxonomy بنك المواقف قبل العرض للمعلم', () => {
  const source = {
    fieldId: 'f_fundamentals',
    gradeId: 'grade-4',
    lessonTypes: ['LEARNING', 'DIAGNOSTIC', 'INTEGRATIVE'],
    motorActions: [
      'fast-running',
      'jump-takeoff',
      'jump-landing',
      'object-control',
      'running-coordination',
      'gymnastics-balance',
      'gymnastics-basic',
      'gymnastics-rolling',
      'gymnastics-rotation',
      'safe-fall',
    ],
    pedagogicalTags: ['authored-direct', 'grade-4', 'f_locomotion'],
    requirements: ['الانتباه'],
  } as const;

  it.each(['f_fundamentals', 'f_locomotion', 'f_structuring'])(
    '%s لا يتحول إلى مهارة',
    (fieldId) => {
      const options = teacherFacingSituationSkillOptions([{ ...source, fieldId }]);
      expect(options.map((option) => option.label)).not.toContain(fieldId);
    }
  );

  it.each(['grade-4', 'grade-5', 'LEARNING', 'DIAGNOSTIC', 'INTEGRATIVE', 'authored-direct'])(
    '%s لا يظهر في خيارات المهارات',
    (value) => {
      const options = teacherFacingSituationSkillOptions([
        { ...source, pedagogicalTags: [value], motorActions: [], requirements: [] },
      ]);
      expect(options.map((option) => option.label)).not.toContain(value);
    }
  );

  it('يبقي المهارات المنظمة ويعرض لها تسميات عربية مركزية', () => {
    const options = teacherFacingSituationSkillOptions([source]);
    const byValue = new Map(options.map((option) => [option.value, option.label]));
    expect(byValue.get('fast-running')).toBe('الجري السريع وتواتر الخطوات');
    expect(byValue.get('gymnastics-basic')).toBe('الحركات القاعدية للجمباز');
    expect(byValue.get('safe-fall')).toBe('السقوط الآمن');
  });

  it('يفصل الميدان ونوع الحصة ويعرضهما بالعربية', () => {
    const taxonomy = classifySituationTaxonomy(source);
    expect(taxonomy.domainLabel).toBe('الحركات القاعدية');
    expect(taxonomy.lessonTypeLabels).toEqual(['حصة تعلمية', 'تقويم تشخيصي', 'حصة إدماجية']);
    expect(situationDomainLabel('f_locomotion')).toBe('الوضعيات والتنقلات');
    expect(situationLessonTypeLabel('SUMMATIVE')).toBe('تقويم تحصيلي');
  });

  it('لا يسرّب أي slug أو enum خام إلى label المعلم', () => {
    const options = teacherFacingSituationSkillOptions([source]);
    const labels = options.map((option) => option.label);
    for (const value of leakedValues) expect(labels).not.toContain(value);
    expect(labels).not.toContain('gymnastics-basic');
    expect(labels).not.toContain('fast-running');
  });

  it('يبقي القيم الداخلية ثابتة للفلترة دون إعادة كتابة المصدر', () => {
    const input = { ...source, motorActions: [...source.motorActions] };
    const before = JSON.stringify(input);
    const options = teacherFacingSituationSkillOptions([input]);
    expect(options.some((option) => option.value === 'fast-running')).toBe(true);
    expect(JSON.stringify(input)).toBe(before);
    expect(
      matchesSituationFilters({ ...input, durationMinutes: 45 } as any, {
        skill: 'fast-running',
        lessonType: '',
        equipment: '',
        duration: 'medium',
      })
    ).toBe(true);
  });

  it('يصنف الوسوم غير الموثوقة داخليًا ولا يجعلها مهارات', () => {
    const taxonomy = classifySituationTaxonomy({
      ...source,
      motorActions: [],
      pedagogicalTags: ['unknown-internal-tag', 'f_structuring', 'authored-direct'],
    });
    expect(taxonomy.motorSkills).toEqual([]);
    expect(taxonomy.internalTags).toEqual([
      'unknown-internal-tag',
      'f_structuring',
      'authored-direct',
    ]);
  });
});
