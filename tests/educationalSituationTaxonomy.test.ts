import { describe, expect, it } from 'vitest';
import {
  matchesSituationFilters,
  situationSearchText,
} from '../src/components/educationalSituations/EducationalSituationsBankView';
import {
  classifySituationTaxonomy,
  situationDifficultyLabel,
  situationEquipmentOptions,
  situationDomainLabel,
  situationLessonTypeLabel,
  situationProvenanceLabel,
  situationRelationTypeLabel,
  teacherFacingSituationSkillOptions,
  situationVisual,
} from '../src/services/pedagogicalSituationReadModel.service';
import type { EducationalSituation } from '../src/types/spex';

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
      matchesSituationFilters(
        { ...input, durationMinutes: 45 } as unknown as EducationalSituation,
        {
          skill: 'fast-running',
          lessonType: '',
          equipment: '',
          duration: 'medium',
        }
      )
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

  it('يعرض علاقات الأهداف بالعربية ويفلتر بالقيم الداخلية الثابتة', () => {
    expect(situationRelationTypeLabel('DIRECT')).toBe('يخدم الهدف مباشرة');
    expect(situationRelationTypeLabel('SUPPORTIVE')).toBe('موقف داعم');
    expect(situationRelationTypeLabel('INTEGRATIVE')).toBe('موقف إدماجي');
    expect(situationRelationTypeLabel('ASSESSMENT')).toBe('موقف تقويمي');
    const item = {
      ...source,
      relationTypes: ['DIRECT', 'SUPPORTIVE'],
      durationMinutes: 30,
    } as unknown as EducationalSituation;
    expect(
      matchesSituationFilters(item, {
        skill: '',
        lessonType: '',
        relationType: 'DIRECT',
        equipment: '',
        duration: 'medium',
      })
    ).toBe(true);
    expect(
      matchesSituationFilters(item, {
        skill: '',
        lessonType: '',
        relationType: 'ASSESSMENT',
        equipment: '',
        duration: 'all',
      })
    ).toBe(false);
  });

  it('يعتمد الوسيط الصحيح أولًا ثم أيقونة المشروع ثم البديل المحايد', () => {
    expect(
      situationVisual({
        fieldId: 'f_fundamentals',
        motorActions: [],
        media: [{ id: 'm1', mediaRef: '/media/situation.png', mediaType: 'image' }],
      })
    ).toEqual({
      kind: 'media',
      media: { id: 'm1', mediaRef: '/media/situation.png', mediaType: 'image' },
    });
    expect(situationVisual({ fieldId: 'f_fundamentals', motorActions: [], media: [] })).toEqual({
      kind: 'project-icon',
      iconKey: 'fundamentals',
    });
    expect(situationVisual({ motorActions: [], media: [] })).toEqual({
      kind: 'fallback',
      iconKey: 'neutral',
    });
    expect(
      situationVisual({
        motorActions: ['balance'],
        media: [{ id: 'm1', mediaRef: 'not-a-url', mediaType: 'image' }],
      })
    ).toEqual({
      kind: 'skill-icon',
      iconKey: 'balance',
    });
  });

  it('يعرض provenance والصعوبة والوسائل المنظمة فقط عند توفر قيم مدعومة', () => {
    expect(situationProvenanceLabel('REFERENCE_SEED')).toBe('من بنك المنصة');
    expect(situationProvenanceLabel('TEACHER')).toBe('موقف شخصي');
    expect(situationProvenanceLabel('AUTHORED_FOR_ARENASPEX')).toBeUndefined();
    expect(situationDifficultyLabel('basic')).toBe('أساسي');
    expect(situationDifficultyLabel('unknown-internal-value')).toBeUndefined();
    expect(situationEquipmentOptions(['أقماع', 'أقماع', 'cones', 'internal-equipment'])).toEqual([
      { value: 'أقماع', label: 'أقماع' },
      { value: 'cones', label: 'أقماع' },
    ]);
  });

  it('يبحث في الهدف والمهارة والوسائل دون استعمال الوسوم التقنية المخفية', () => {
    const item = {
      ...source,
      objectiveTexts: ['هدف الرمي'],
      equipment: ['أقماع'],
    } as unknown as EducationalSituation;
    expect(situationSearchText(item)).toContain('هدف الرمي');
    expect(situationSearchText(item)).toContain('الجري السريع');
    expect(situationSearchText(item)).toContain('أقماع');
    expect(situationSearchText(item)).not.toContain('f_locomotion');
    expect(situationSearchText(item)).not.toContain('authored-direct');
  });
});
