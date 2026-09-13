import { describe, expect, it } from 'vitest';
import {
  generatePedagogicalSituation,
  localPedagogicalSituationProvider,
  PedagogicalSituationGenerationProvider,
} from '../src/services/pedagogicalSituationGeneration.service';

const context = {
  grade: 4,
  fieldId: 'f_locomotion',
  fieldName: 'الوضعيات والتنقلات',
  finalCompetency: 'ينجز وضعيات حركية منظمة.',
  objective: 'يغير اتجاهه استجابة للإشارة.',
  lessonType: 'LEARNING' as const,
  equipment: ['أقماع'],
  durationMinutes: 45,
};

describe('طبقة التوليد البيداغوجي للمواقف', () => {
  it('تعيد مخرجًا منظمًا قابلًا للمراجعة وفق سياق الهدف', () => {
    const result = generatePedagogicalSituation(context);
    expect(result.title).toContain('يغير اتجاهه');
    expect(result.description).toBeTruthy();
    expect(result.organization).toBeTruthy();
    expect(result.instructions).toBeTruthy();
    expect(result.executionConditions).toBeTruthy();
    expect(result.successCriteria).toBeTruthy();
    expect(result.observationIndicators).toBeTruthy();
    expect(result.durationMinutes).toBe(45);
  });

  it('تفصل عقد المزود عن الواجهة وتقبل مزودًا بديلًا', () => {
    const provider: PedagogicalSituationGenerationProvider = {
      generate: () => ({
        ...localPedagogicalSituationProvider.generate(context),
        title: 'موقف مزود بديل',
      }),
    };
    expect(generatePedagogicalSituation(context, provider).title).toBe('موقف مزود بديل');
  });

  it('ترفض السياق غير الصالح بدل توليد موقف غير مرتبط', () => {
    expect(() => generatePedagogicalSituation({ ...context, objective: ' ' })).toThrow(
      'SITUATION_GENERATION_OBJECTIVE_REQUIRED'
    );
  });
});
