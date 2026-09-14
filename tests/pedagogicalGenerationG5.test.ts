import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { getObjectiveBank } from '../src/data/objectiveBankRegistry';
import {
  buildPedagogicalGenerationContext,
  deterministicPedagogicalGenerationProvider,
  generatePedagogicalSituation,
  normalizePedagogicalCandidate,
  validatePedagogicalCandidate,
  type PedagogicalGenerationProvider,
  type PedagogicalSituationGenerationRequest,
} from '../src/services/pedagogicalGeneration.service';

const gradeId = 'lvl_p4';
const domainId = 'f_locomotion';
const objectiveId = getObjectiveBank(gradeId, domainId)[0].id;

const request = (overrides: Partial<PedagogicalSituationGenerationRequest> = {}) => ({
  intent: 'GENERATE_FOR_OBJECTIVE' as const,
  gradeId,
  domainId,
  finalCompetencyId: `fc_${gradeId}_${domainId}`,
  objectiveIds: [objectiveId],
  lessonType: 'LEARNING' as const,
  motorSkills: ['الجري المنظم'],
  requirements: ['الاستجابة للإشارة'],
  equipment: ['أقماع'],
  availableEquipment: ['أقماع'],
  durationMinutes: 45,
  studentCount: 24,
  recentSituationIds: ['situation-previous'],
  recentSituationTitles: ['موقف سابق'],
  ...overrides,
});

describe('طبقة التوليد التربوي المحايدة للمزوّد — G5', () => {
  it('يبني السياق من المراجع الحالية ويحمي الهدف والكفاءة والميدان', () => {
    const result = generatePedagogicalSituation(request());
    expect(result.context.objectiveIds).toEqual([objectiveId]);
    expect(result.context.domainId).toBe(domainId);
    expect(result.context.finalCompetencyId).toBe(`fc_${gradeId}_${domainId}`);
    expect(result.candidate.servedObjectiveIds).toEqual([objectiveId]);
    expect(result.candidate.governance).toMatchObject({
      visibility: 'PERSONAL',
      approvalStatus: 'PERSONAL',
      productionEligibility: 'REVIEW_ONLY',
      autoPublic: false,
      autoApproved: false,
    });
  });

  it('يدعم نوايا التعلم والإدماج والبديل دون تغيير المرجع', () => {
    const learning = generatePedagogicalSituation(request());
    const integrative = generatePedagogicalSituation(
      request({ intent: 'GENERATE_SITUATION', lessonType: 'INTEGRATIVE' })
    );
    const alternative = generatePedagogicalSituation(
      request({ intent: 'GENERATE_ALTERNATIVE', sourceSituationId: 'source-1' })
    );
    expect(learning.candidate.proposedRelationType).toBe('DIRECT');
    expect(integrative.candidate.proposedRelationType).toBe('INTEGRATIVE');
    expect(alternative.candidate.title).toContain('بديل');
    expect(alternative.context.recentSituationIds).toEqual(['situation-previous']);
  });

  it('يبني نطاق التشخيص والتقويم التحصيلي من محول الكفاءة الحالي', () => {
    for (const lessonType of ['DIAGNOSTIC', 'SUMMATIVE'] as const) {
      const result = generatePedagogicalSituation(
        request({ lessonType, objectiveIds: [], intent: 'GENERATE_SITUATION' })
      );
      expect(result.context.assessmentScope?.kind).toBe(
        lessonType === 'DIAGNOSTIC' ? 'diagnostic' : 'summative'
      );
      expect(result.context.assessmentScope?.criteria.length).toBeGreaterThan(0);
      expect(result.candidate.proposedRelationType).toBe('ASSESSMENT');
    }
  });

  it('يرفض المستوى والميدان والهدف غير القانوني', () => {
    expect(() => buildPedagogicalGenerationContext(request({ gradeId: 'grade-9' }))).toThrow(
      'GENERATION_GRADE_UNSUPPORTED'
    );
    expect(() => buildPedagogicalGenerationContext(request({ domainId: 'unknown' }))).toThrow(
      'GENERATION_DOMAIN_UNSUPPORTED'
    );
    expect(() =>
      buildPedagogicalGenerationContext(request({ objectiveIds: ['not-canonical'] }))
    ).toThrow('GENERATION_OBJECTIVE_NOT_CANONICAL');
    expect(() => buildPedagogicalGenerationContext(request({ objectiveIds: [] }))).toThrow(
      'GENERATION_OBJECTIVE_REQUIRED'
    );
  });

  it('يرفض نطاق الكفاءة غير المتسق والمصدر الناقص للبديل', () => {
    expect(() =>
      buildPedagogicalGenerationContext(request({ finalCompetencyId: 'other' }))
    ).toThrow('GENERATION_FINAL_COMPETENCY_SCOPE_INVALID');
    expect(() =>
      buildPedagogicalGenerationContext(request({ intent: 'GENERATE_ALTERNATIVE' }))
    ).toThrow('GENERATION_SOURCE_REQUIRED');
  });

  it('يضمن أن المخرج منظم وقابل للتعديل، ويزيل التكرار', () => {
    const context = buildPedagogicalGenerationContext(request());
    const candidate = deterministicPedagogicalGenerationProvider.generate(context);
    const normalized = normalizePedagogicalCandidate({
      ...candidate,
      equipment: ['أقماع', 'أقماع'],
      executionSteps: [...candidate.executionSteps, candidate.executionSteps[0]],
      variants: '  ',
    });
    expect(normalized.executionSteps).toHaveLength(3);
    expect(normalized.equipment).toEqual(['أقماع']);
    expect(normalized.variants).toBe('');
    expect(normalized.executionSteps.length).toBeGreaterThan(0);
    expect(normalized.successCriteria).toBeTruthy();
    expect(normalized.observationIndicators).toBeTruthy();
  });

  it('يحافظ على عقد مزوّد قابل للاستبدال مع ثبات النتيجة المحلية', () => {
    let captured: string[] = [];
    const provider: PedagogicalGenerationProvider = {
      generate(context) {
        captured = [...context.recentSituationIds];
        return deterministicPedagogicalGenerationProvider.generate(context);
      },
    };
    const first = generatePedagogicalSituation(request(), provider);
    const second = generatePedagogicalSituation(request(), provider);
    expect(first.candidate).toEqual(second.candidate);
    expect(captured).toEqual(['situation-previous']);
  });

  it('يمرر وصف المصدر للبديل ويرفض تكرار محتوى المصدر', () => {
    const source = {
      id: 'source-1',
      title: 'موقف مصدر',
      executionContent: 'تنفيذ المصدر نفسه',
    };
    const context = buildPedagogicalGenerationContext(
      request({
        intent: 'GENERATE_ALTERNATIVE',
        sourceSituationId: source.id,
        sourceSituation: source,
      })
    );
    expect(context.sourceSituation?.id).toBe(source.id);
    const candidate = deterministicPedagogicalGenerationProvider.generate(context);
    expect(validatePedagogicalCandidate(context, candidate).status).toBe('VALID');
    expect(
      validatePedagogicalCandidate(context, {
        ...candidate,
        title: source.title,
      }).errors
    ).toContain('GENERATION_ALTERNATIVE_NOT_DISTINCT');
  });

  it('يحوّل فشل المزود إلى خطأ تطبيقي عام دون تسريب تفاصيله', () => {
    expect(() =>
      generatePedagogicalSituation(request(), {
        generate: () => {
          throw new Error('internal provider credentials leaked');
        },
      })
    ).toThrow('GENERATION_PROVIDER_FAILED');
  });

  it('لا يسمح بالمخرج غير المرتبط أو بنشر/اعتماد تلقائي', () => {
    const context = buildPedagogicalGenerationContext(request());
    const candidate = deterministicPedagogicalGenerationProvider.generate(context);
    expect(
      validatePedagogicalCandidate(context, {
        ...candidate,
        domainId: 'f_structuring',
      }).status
    ).toBe('INVALID');
    expect(candidate.governance.approvalStatus).toBe('PERSONAL');
    expect(candidate.governance.autoPublic).toBe(false);
    expect(candidate.governance.autoApproved).toBe(false);
  });

  it('يستخدم مسارا تربويا موحدا في نقاط الواجهة ولا يعيد ربط التوليد ببنك ألعاب', () => {
    const knowledgeView = readFileSync(
      new URL('../src/components/knowledge/KnowledgeEngineView.tsx', import.meta.url),
      'utf8'
    );
    const lessonView = readFileSync(
      new URL('../src/components/lesson/LessonPlanView.tsx', import.meta.url),
      'utf8'
    );
    expect(knowledgeView).toContain('requestPedagogicalSituationGeneration');
    expect(lessonView).toContain('requestPedagogicalSituationGeneration');
    expect(knowledgeView).not.toContain('/api/ai/suggest-games');
    expect(knowledgeView).not.toContain('AI_GENERATED');
    expect(lessonView).not.toContain('generatePedagogicalSituation(');
  });
});
